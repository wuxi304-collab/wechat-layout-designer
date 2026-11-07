import { markdownStyles, themes, type FontProfile, type LayoutMode, type MarkdownStyleKey, type ThemeKey } from "./design-system.ts";

export const DRAFT_KEY = "wechat-layout-designer-draft-v2";
export const MAX_CHECKPOINTS = 12;
export type DraftSnapshot = {
  markdown: string; markdownStyle: MarkdownStyleKey; theme: ThemeKey; layoutMode: LayoutMode;
  fontProfile: FontProfile; fontSize: number; lineHeight: number; titleScale: number; articleTracking: number;
};
export type DraftCheckpoint = { id: string; label: string; createdAt: number; snapshot: DraftSnapshot };
export type DraftArchive = DraftSnapshot & { schemaVersion: 8; updatedAt: number; versions: DraftCheckpoint[] };

const bounded = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

function snapshotFrom(value: Record<string, unknown>, defaults: DraftSnapshot, schemaVersion: number): DraftSnapshot {
  if (typeof value.markdown !== "string") throw new Error("本机草稿内容不完整，已暂停覆盖。请先下载当前原稿。");
  const fontSize = typeof value.fontSize === "number" && schemaVersion < 7 ? value.fontSize + 1 : value.fontSize;
  return {
    markdown: value.markdown,
    markdownStyle: typeof value.markdownStyle === "string" && Object.hasOwn(markdownStyles, value.markdownStyle) ? value.markdownStyle as MarkdownStyleKey : defaults.markdownStyle,
    theme: schemaVersion >= 6 && typeof value.theme === "string" && Object.hasOwn(themes, value.theme) ? value.theme as ThemeKey : defaults.theme,
    layoutMode: ["calm", "balanced", "editorial"].includes(String(value.layoutMode)) ? value.layoutMode as LayoutMode : defaults.layoutMode,
    fontProfile: ["classic", "literary", "clear"].includes(String(value.fontProfile)) ? value.fontProfile as FontProfile : defaults.fontProfile,
    fontSize: bounded(fontSize, defaults.fontSize, 15, 20), lineHeight: bounded(value.lineHeight, defaults.lineHeight, 1.6, 2.12),
    titleScale: bounded(value.titleScale, defaults.titleScale, .86, 1.1), articleTracking: bounded(value.articleTracking, defaults.articleTracking, 0, .04),
  };
}

export function readDraftArchive(raw: string, defaults: DraftSnapshot): DraftArchive {
  let value: Record<string, unknown>;
  try { value = JSON.parse(raw); } catch { throw new Error("本机草稿无法读取，已暂停覆盖。请先下载当前原稿。"); }
  if (!value || typeof value !== "object" || ![2, 3, 4, 5, 6, 7, 8].includes(Number(value.schemaVersion))) {
    throw new Error("本机草稿版本暂不支持，已暂停覆盖。请先下载当前原稿。");
  }
  const snapshot = snapshotFrom(value, defaults, Number(value.schemaVersion));
  const versions: DraftCheckpoint[] = [];
  if (value.schemaVersion === 8 && Array.isArray(value.versions)) {
    for (const entry of value.versions) {
      if (!entry || typeof entry.id !== "string" || typeof entry.label !== "string" || !Number.isFinite(entry.createdAt) || !Number.isFinite(new Date(entry.createdAt).getTime())) continue;
      try { versions.push({ id: entry.id, label: entry.label, createdAt: entry.createdAt, snapshot: snapshotFrom(entry.snapshot, defaults, 8) }); }
      catch { /* One malformed checkpoint must not hide the current draft. */ }
    }
  }
  return { ...snapshot, schemaVersion: 8, updatedAt: bounded(value.updatedAt, 0, 0, Number.MAX_SAFE_INTEGER), versions: versions.slice(-MAX_CHECKPOINTS) };
}

export function appendCheckpoint(versions: DraftCheckpoint[], snapshot: DraftSnapshot, label: string, now = Date.now()): DraftCheckpoint[] {
  const last = versions.at(-1);
  if (last && JSON.stringify(last.snapshot) === JSON.stringify(snapshot)) return versions;
  return [...versions, { id: `${now}-${Math.random().toString(36).slice(2, 9)}`, label, createdAt: now, snapshot: { ...snapshot } }].slice(-MAX_CHECKPOINTS);
}
