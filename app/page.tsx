"use client";
/* eslint-disable @next/next/no-img-element -- 微信稿件预览必须保留用户原始图片 URL，复制适配器会输出微信富文本。 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  fontProfiles,
  markdownStyleOrder,
  markdownStyles,
  themeCssVariables,
  themes,
  titleBaseSizes,
  type FontProfile,
  type LayoutMode,
  type MarkdownStyleKey,
  type ThemeKey,
} from "@/lib/editor/design-system";
import {
  analyzeCoverContent,
  buildCoverHarness,
  buildCoverProtocol,
  buildCoverPrompt,
  coverSignature,
  coverStyleCategories,
  coverStyles,
  recommendCoverStyles,
  type CoverStyle,
  type CoverStyleCategory,
} from "@/lib/editor/cover-design";
import { detectPlainTextTitle } from "@/lib/editor/title-detection";
import { closesFence, findMarkdownTitle, readAtxHeading, readFence, readMarkdownListItem, readMarkdownTable, readSetextHeading } from "@/lib/editor/markdown-structure";
import { importDocumentFile } from "@/lib/editor/document-import";
import { readSourceLineRanges, type SourceRange } from "@/lib/editor/source-navigation";
import { writeRichClipboard } from "@/lib/editor/wechat-adapter";
import { auditWechatArticle, summarizeWechatAudit, type WechatAuditIssue } from "@/lib/editor/wechat-audit";
import { prepareWechatDelivery, type WechatDelivery } from "@/lib/editor/wechat-export";
import { WechatHtmlDialog } from "./wechat-html-dialog";
import { SourceWorkspace } from "./source-workspace";
import { writePlainClipboard } from "@/lib/editor/clipboard";
import { markdownFromRichClipboard } from "@/lib/editor/clipboard-import";
import { styleEditorialGuides } from "@/lib/editor/style-guides";
import type { DraftSnapshot } from "@/lib/editor/draft-storage";
import { useDraftArchive } from "./use-draft-archive";
import { DraftHistoryDialog } from "./draft-history-dialog";
import { spreadsheetFromClipboard } from "@/lib/editor/spreadsheet-paste";

type IconName =
  | "brand" | "document" | "structure" | "style" | "assets" | "check"
  | "spark" | "phone" | "desktop" | "undo" | "redo" | "copy" | "publish"
  | "chevron" | "close" | "brush" | "history" | "warning" | "search" | "plus" | "moon";

function isGitHubPagesRuntime() {
  return typeof window !== "undefined" && window.location.hostname.endsWith(".github.io");
}

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    brand: <><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    document: <><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></>,
    structure: <><circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M9 6h6M8.5 7.5l2.5 8M15.5 7.5l-2.5 8"/></>,
    style: <><path d="M4 20h16M7 17l7-13 3 13"/><path d="M9.5 13h5"/></>,
    assets: <><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m6 17 4-4 3 3 2-2 3 3"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    spark: <><path d="m12 3 1.4 4.1 4.1 1.4-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></>,
    phone: <><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 6h4M11 18h2"/></>,
    desktop: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    undo: <path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6"/>,
    redo: <path d="m15 7 5 5-5 5M19 12h-8a6 6 0 0 0-6 6"/>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    publish: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 14v6h14v-6"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    brush: <><path d="m14 4 6 6-8 8-6-6z"/><path d="m9 15-2 5-4 1 1-4 5-2"/></>,
    history: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6M12 7v5l3 2"/></>,
    warning: <><path d="M12 3 2.8 20h18.4z"/><path d="M12 9v4M12 17h.01"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    moon: <path d="M20 15.4A8.5 8.5 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function CoverStyleSpecimen({ style, index, compact = false }: { style: CoverStyle; index: number; compact?: boolean }) {
  return <span
    className={`cover-style-specimen ${compact ? "compact" : ""}`}
    data-category={style.category}
    data-motif={index % 6}
    style={{
      "--specimen-paper": style.palette[0],
      "--specimen-ink": style.palette[1],
      "--specimen-accent": style.palette[2],
    } as React.CSSProperties}
    aria-hidden="true"
  ><i/><b/><em/><small>{style.category}</small></span>;
}

const coverEditorialLabels: Record<string, [name: string, short: string]> = {
  "minimal-cold": ["静域极简", "留白成势"],
  "minimal-information": ["信息主义", "结论先行"],
  apple: ["精密产品", "理性柔光"],
  "classical-chinese": ["浅绛古意", "古意入纸"],
  "modern-chinese": ["当代东方", "东方新序"],
  "low-poly": ["晶面结构", "几何建模"],
  nod: ["怪趣寓言", "隐喻叙事"],
  "paper-cut": ["层纸东方", "纸艺景深"],
  cyber: ["数字断层", "系统张力"],
  vaporwave: ["旧日未来", "镭射怀旧"],
  "op-art": ["光学秩序", "几何错视"],
  "light-overlay": ["透光介质", "氤氲通透"],
  "synesthetic-deconstruction": ["感知解构", "拆解重组"],
  memphis: ["几何乐章", "明快秩序"],
  pop: ["编辑波普", "强烈传播"],
  steampunk: ["机械纪事", "工业怀旧"],
  maximalism: ["丰盛编辑", "有序繁复"],
  cubism: ["多维拼构", "多面观察"],
  hyperreal: ["证据写实", "细节为证"],
  "three-d-solid": ["单色空间", "仪式建模"],
  mbe: ["轻量图解", "友好科普"],
  "heavy-industrial": ["钢铁叙事", "工业有骨"],
  pixel: ["像素纪元", "数字颗粒"],
  gothic: ["暗影结构", "克制寓言"],
};

function coverStyleLabel(style: CoverStyle) {
  const [name = style.name, short = style.short] = coverEditorialLabels[style.id] ?? [];
  return { name, short };
}

function loadCoverImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(source);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error(`无法读取图片：${file.name}`));
    };
    image.src = source;
  });
}

function drawImageCover(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
}

function colorWithAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3 ? normalized.split("").map((item) => item + item).join("") : normalized, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function breakCoverTitle(context: CanvasRenderingContext2D, title: string, maxWidth: number) {
  const prohibitedLineStart = /^[，。！？；：、）】》”’]/;
  const chars = Array.from(title);
  const lines: string[] = [];
  let line = "";
  chars.forEach((char) => {
    const candidate = line + char;
    if (line && context.measureText(candidate).width > maxWidth && !prohibitedLineStart.test(char)) {
      lines.push(line);
      line = char;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function safeDownloadName(title: string) {
  return title.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim().slice(0, 48) || "公众号封面";
}

const sampleMarkdown = `# 当成本拼不过青拓之后，我们还能卖什么？

价格战从来没有真正的赢家。对不锈钢贸易商而言，低价曾是最直接的武器，也正在成为最危险的依赖。

## 一、低价不是能力，只是阶段性结果

真正决定客户是否长期留下来的，从来不是某一吨便宜了五十元，而是材料是否选对、交期是否可靠、问题能否有人负责。

> 当产品越来越接近，专业判断本身就会成为产品。

## 二、从卖材料转向交付确定性

- 把牌号讲明白
- 把标准边界说清楚
- 把加工风险提前暴露
- 把售后责任写进流程`;

type InspectorTab = "步骤" | "规范" | "品牌";
type StageKey = "稿件" | "编排" | "版式" | "封面" | "交付";
type MobilePane = "canvas" | "inspector";
type AlertKind = "note" | "tip" | "important" | "warning" | "caution";
type BlockType = "title" | "paragraph" | "heading" | "subheading" | "quote" | "list" | "code" | "divider" | "table" | "alert" | "image";
type ArticleBlock = (
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; ordered: boolean; start: number; items: { text: string; checked?: boolean }[] }
  | { type: "table"; headers: string[]; alignments: ("left" | "center" | "right")[]; rows: string[][] }
  | { type: "alert"; kind: AlertKind; text: string }
  | { type: "image"; alt: string; src: string; caption: string }
  | { type: "code"; language: string; code: string }
  | { type: "divider" }
) & { sourceRange?: SourceRange };
type ArticleReference = { id: string; title: string; url: string; domain: string };
type ArticleFootnote = { id: string; text: string };

const wechatFontStacks: Record<FontProfile, string> = {
  classic: '"Source Han Serif SC","Noto Serif CJK SC","Noto Serif SC","Songti SC","STSong",SimSun,serif',
  literary: '"FangSong","FangSong_GB2312","LXGW WenKai Screen","LXGW WenKai","Source Han Serif SC","Noto Serif CJK SC",serif',
  clear: '"HarmonyOS Sans SC",MiSans,"PingFang SC","Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei UI","Microsoft YaHei",sans-serif',
};

const wechatUiFontStack = '"PingFang SC","Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei UI","Microsoft YaHei",sans-serif';

const stageItems: { icon: IconName; title: StageKey; meta: string; heading: string; goal: string }[] = [
  { icon: "document", title: "稿件", meta: "原稿与提纲", heading: "校对稿件", goal: "导入或粘贴原稿，核对标题、署名和章节。" },
  { icon: "structure", title: "编排", meta: "结构与节奏", heading: "安排阅读节奏", goal: "选择段落疏密，按需补入导读、观点和证据。" },
  { icon: "style", title: "版式", meta: "版型与字阶", heading: "挑选正文版式", goal: "先选版型，再微调字体、行距和纸墨。" },
  { icon: "assets", title: "封面", meta: "方向与素材", heading: "设计文章封面", goal: "选定封面方向，备齐标题和必要素材。" },
  { icon: "check", title: "交付", meta: "预检与复制", heading: "检查并交付", goal: "依次复制标题、作者和正文，粘贴后核对草稿。" },
];

const components = [
  { kind: "开场导读", phase: "开场", mark: "导", detail: "三句话交代主线与阅读收益", signals: /导读|摘要|看懂|本文|为什么/, snippet: "\n\n> [!NOTE]\n> **三句话看懂本文**\n> 第一，写清文章要回答的问题。第二，交代最关键的证据。第三，说明读者能得到什么。" },
  { kind: "核心判断", phase: "观点", mark: "判", detail: "用一句话收住长段论述", signals: /认为|本质|真正|关键|结论|判断/, snippet: "\n\n> 在这里写下需要被记住的核心判断。" },
  { kind: "数据证据", phase: "证据", mark: "据", detail: "把数字、口径与结论放在一起", signals: /\d|同比|环比|增长|下降|产量|成本|价格/, snippet: "\n\n| 关键指标 | 数据 | 说明 |\n| --- | ---: | --- |\n| 指标名称 | 72% | 补充统计口径与来源 |" },
  { kind: "双栏对照", phase: "证据", mark: "比", detail: "并排解释差异、边界与选择", signals: /对比|区别|相比|选择|优缺点|但是|而是|vs/i, snippet: "\n\n| 对照项 | 方案一 | 方案二 |\n| --- | --- | --- |\n| 适用场景 | 补充说明 | 补充说明 |\n| 主要边界 | 补充说明 | 补充说明 |" },
  { kind: "步骤清单", phase: "过程", mark: "序", detail: "把方法拆成可执行的顺序", signals: /如何|步骤|流程|先|再|最后|方法|建议/, snippet: "\n\n1. 第一步：明确目标与边界\n2. 第二步：补足证据与细节\n3. 第三步：复核结论与行动" },
  { kind: "结语行动", phase: "收尾", mark: "结", detail: "总结判断，并给出下一步", signals: /建议|下一步|行动|结语|总结|交流/, snippet: "\n\n---\n\n## 结语\n\n在这里重申文章结论，并写下读者下一步可以做什么。" },
];

type DecodedSource = { text: string; encoding: string };

const htmlEntities: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ",
  hellip: "……", mdash: "—", ndash: "–", middot: "·", bull: "•",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", laquo: "《", raquo: "》",
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] !== "#") return htmlEntities[body.toLowerCase()] ?? entity;
    const codePoint = body[1]?.toLowerCase() === "x" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return entity;
    return String.fromCodePoint(codePoint);
  });
}

function normalizeMarkdownInput(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b\u2060\ufeff]/g, "")
    .replace(/[\u202a-\u202e\u2066-\u2069\ufff9-\ufffb]/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, "")
    .normalize("NFC");
}

function hasLoneSurrogate(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

function findEncodingIssues(value: string) {
  const issues: string[] = [];
  if (value.includes("\uFFFD")) issues.push("编码异常：存在无法识别的替换字符 �");
  if (hasLoneSurrogate(value)) issues.push("编码异常：存在不完整的 Unicode 字符");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value)) issues.push("编码异常：存在不可见控制字符");
  const mojibakeCount = value.match(/(?:Ã.|Â.|â[€™œ”“]|ä¸|æ–|çš|å®|è¿|é—)/g)?.length ?? 0;
  if (mojibakeCount >= 3) issues.push("疑似 UTF-8 与 GBK 编码错位，请重新导入原文件");
  const escapedUnicodeCount = value.match(/\\u(?:\{[\da-f]+\}|[\da-f]{4})/gi)?.length ?? 0;
  if (escapedUnicodeCount >= 2) issues.push("检测到未解码的 Unicode 转义序列");
  return issues;
}

function scoreDecodedText(value: string) {
  const replacement = value.match(/\uFFFD/g)?.length ?? 0;
  const controls = value.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g)?.length ?? 0;
  const mojibake = value.match(/(?:Ã.|Â.|â[€™œ”“]|ä¸|æ–|çš|å®|è¿|é—)/g)?.length ?? 0;
  const cjk = value.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  return Math.min(cjk, 80) - replacement * 500 - controls * 80 - mojibake * 35;
}

function decodeImportedBuffer(buffer: ArrayBuffer): DecodedSource {
  const bytes = new Uint8Array(buffer);
  const decode = (encoding: string, source = bytes, fatal = true) => new TextDecoder(encoding, { fatal }).decode(source);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { text: normalizeMarkdownInput(decode("utf-8", bytes.slice(3))), encoding: "UTF-8 · BOM 已清理" };
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: normalizeMarkdownInput(decode("utf-16le", bytes.slice(2))), encoding: "UTF-16 LE" };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: normalizeMarkdownInput(decode("utf-16be", bytes.slice(2))), encoding: "UTF-16 BE" };

  const evenZeros = bytes.filter((byte, index) => index % 2 === 0 && byte === 0).length;
  const oddZeros = bytes.filter((byte, index) => index % 2 === 1 && byte === 0).length;
  if (bytes.length >= 8 && Math.max(evenZeros, oddZeros) / bytes.length > 0.12) {
    const encoding = oddZeros > evenZeros ? "utf-16le" : "utf-16be";
    try { return { text: normalizeMarkdownInput(decode(encoding)), encoding: encoding === "utf-16le" ? "UTF-16 LE · 无 BOM" : "UTF-16 BE · 无 BOM" }; }
    catch { /* 进入中文编码候选 */ }
  }

  try { return { text: normalizeMarkdownInput(decode("utf-8")), encoding: "UTF-8" }; }
  catch { /* 继续判断中文旧编码 */ }

  const candidates: DecodedSource[] = [];
  for (const [codec, label] of [["gb18030", "GB18030 / GBK"], ["big5", "Big5"]] as const) {
    try { candidates.push({ text: normalizeMarkdownInput(decode(codec)), encoding: label }); }
    catch { /* 当前编码不匹配 */ }
  }
  if (candidates.length) return candidates.sort((left, right) => scoreDecodedText(right.text) - scoreDecodedText(left.text))[0];
  return { text: normalizeMarkdownInput(decode("utf-8", bytes, false)), encoding: "UTF-8 · 已尽力修复" };
}

function cleanUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.replace(/[>）)。，；;]+$/, ""));
    [...url.searchParams.keys()].forEach((key) => {
      if (/^utm_/i.test(key) || ["spm", "from", "source"].includes(key.toLowerCase())) url.searchParams.delete(key);
    });
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function urlDomain(rawUrl: string) {
  try { return new URL(rawUrl).hostname.replace(/^www\./, ""); }
  catch { return "外部资料"; }
}

function unescapeMarkdown(value: string) {
  return value.replace(/\\([=\\`*_[\]{}()#+\-.!><|])/g, "$1");
}

function plainInline(text: string) {
  return decodeHtmlEntities(text)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\(\[([^\]]+)\]\[(\d+)\]\)/g, "〔$2〕")
    .replace(/\[([^\]]+)\]\[(\d+)\]/g, "$1〔$2〕")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/(?<![\p{L}\p{N}_])(__?)([^_]+)\1(?![\p{L}\p{N}_])/gu, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(?: |x|X)\]\s*/g, "")
    .replace(/\\([\\`*_[\]{}()#+\-.!>|])/g, "$1")
    .trim();
}

function renderInline(text: string) {
  const normalized = decodeHtmlEntities(text)
    .replace(/\(\[([^\]]+)\]\[(\d+)\]\)/g, "〔ref:$2〕")
    .replace(/\[([^\]]+)\]\[(\d+)\]/g, "$1〔ref:$2〕")
    .replace(/\[\^([^\]]+)\]/g, "〔foot:$1〕");
  const tokenPattern = /((?<!\\)==[^=\n]+==|(?<!\\)<u>[^\n]*?<\/u>|(?<!\\)\*\*\*[^*]+\*\*\*|(?<!\\)\*\*[^*]+\*\*|(?<![\\*])\*[^*]+\*(?!\*)|(?<![\\\p{L}\p{N}_])__(?!_)[^_\n]+__(?![\p{L}\p{N}_])|(?<![\\\p{L}\p{N}_])_(?!_)[^_\n]+_(?![\p{L}\p{N}_])|(?<!\\)~~[^~]+~~|(?<!\\)`[^`\n]+`|<br\s*\/?>|〔ref:\d+〕|〔foot:[^〕]+〕|\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s，。；！？、）)]+)/giu;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(normalized))) {
    if (match.index > cursor) parts.push(unescapeMarkdown(normalized.slice(cursor, match.index)));
    const token = match[0];
    if (token.startsWith("==")) parts.push(<mark className="article-highlight" key={`${match.index}-mark`}>{renderInline(token.slice(2, -2))}</mark>);
    else if (token.startsWith("<u>")) parts.push(<u className="article-underline" key={`${match.index}-underline`}>{renderInline(token.slice(3, -4))}</u>);
    else if (token.startsWith("***")) parts.push(<strong key={`${match.index}-strong-em`}><em>{token.slice(3, -3).trim()}</em></strong>);
    else if (token.startsWith("**") || token.startsWith("__")) parts.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2).trim()}</strong>);
    else if (token.startsWith("*") || token.startsWith("_")) parts.push(<em key={`${match.index}-em`}>{token.slice(1, -1).trim()}</em>);
    else if (token.startsWith("~~")) parts.push(<s key={`${match.index}-strike`}>{token.slice(2, -2)}</s>);
    else if (token.startsWith("`")) parts.push(<code className="inline-code" key={`${match.index}-code`}>{token.slice(1, -1).replace(/\\\|/g, "|")}</code>);
    else if (/^<br/i.test(token)) parts.push(<br key={`${match.index}-break`}/>);
    else if (token.startsWith("〔ref:")) parts.push(<sup className="inline-citation" key={`${match.index}-ref`}>〔{token.slice(5, -1)}〕</sup>);
    else if (token.startsWith("〔foot:")) parts.push(<sup className="inline-citation footnote-mark" key={`${match.index}-foot`}>〔{token.slice(6, -1)}〕</sup>);
    else if (token.startsWith("[")) {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (link) parts.push(<a className="inline-link" href={cleanUrl(link[2])} key={`${match.index}-link`}>{link[1]}</a>);
    } else {
      const cleaned = cleanUrl(token);
      parts.push(<a className="inline-link bare-link" href={cleaned} key={`${match.index}-url`}>{urlDomain(cleaned)}</a>);
    }
    cursor = match.index + token.length;
  }
  if (cursor < normalized.length) parts.push(unescapeMarkdown(normalized.slice(cursor)));
  return parts.length ? parts : text;
}

function joinParagraph(lines: string[]) {
  return lines.reduce((result, line) => {
    if (!result) return line;
    const chineseJoin = /[\u3400-\u9fff，。！？；：、“”‘’）]$/.test(result) && /^[\u3400-\u9fff“‘（]/.test(line);
    return `${result}${chineseJoin || result.endsWith("<br>") ? "" : " "}${line}`;
  }, "");
}

function parseArticle(markdown: string) {
  let source = normalizeMarkdownInput(markdown);
  let frontMatterTitle = "";
  let frontMatterAuthor = "";
  let subtitle = "";
  const frontMatter = source.match(/^---\n([\s\S]*?)\n---\s*\n?/);
  if (frontMatter && /^(?:title|author|byline|summary|description)\s*:/mi.test(frontMatter[1])) {
    frontMatter[1].split("\n").forEach((line) => {
      const field = line.match(/^([\w-]+)\s*:\s*["']?(.*?)["']?\s*$/);
      if (!field) return;
      const key = field[1].toLowerCase();
      if (key === "title") frontMatterTitle = field[2];
      if (key === "author" || key === "byline") frontMatterAuthor = field[2];
      if (key === "summary" || key === "description") subtitle = field[2];
    });
    source = source.slice(frontMatter[0].length);
  }
  const lines = source.split("\n");
  const sourceLines = readSourceLineRanges(source, normalizeMarkdownInput(markdown).length - source.length);
  const sourceSpan = (first: number, last: number): SourceRange => ({ start: sourceLines[first].start, end: sourceLines[last].end });
  const explicitTitle = findMarkdownTitle(lines);
  const inferredTitle = detectPlainTextTitle(source, frontMatterTitle || explicitTitle?.text);
  if (inferredTitle) [...inferredTitle.lineIndices, ...inferredTitle.preambleLineIndices].forEach((index) => { lines[index] = ""; });
  if (explicitTitle && (!frontMatterTitle || plainInline(explicitTitle.text) === plainInline(frontMatterTitle))) {
    explicitTitle.lineIndices.forEach((index) => { lines[index] = ""; });
  }
  const title = plainInline(frontMatterTitle || explicitTitle?.text || inferredTitle?.raw || "") || "未命名文章";
  let author = frontMatterAuthor || "钢铁私塾 唐淼";
  const blocks: ArticleBlock[] = [];
  const references: ArticleReference[] = [];
  const footnotes: ArticleFootnote[] = [];
  let paragraph: string[] = [];
  let paragraphBegin = -1, paragraphLast = -1;
  let quoteBegin = -1, quoteLast = -1;
  let listBegin = -1, listLast = -1;
  let list: Extract<ArticleBlock, { type: "list" }> | null = null;
  let quote: string[] = [];
  let quoteKind: AlertKind | null = null;
  let codeFence: (NonNullable<ReturnType<typeof readFence>> & { lines: string[]; startLine: number }) | null = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: joinParagraph(paragraph), sourceRange: sourceSpan(paragraphBegin, paragraphLast) });
    paragraph = []; paragraphBegin = -1; paragraphLast = -1;
  };
  const flushList = () => {
    if (list) blocks.push({ ...list, sourceRange: sourceSpan(listBegin, listLast) });
    list = null; listBegin = -1; listLast = -1;
  };
  const flushQuote = () => {
    if (quote.length) blocks.push(quoteKind
      ? { type: "alert", kind: quoteKind, text: joinParagraph(quote), sourceRange: sourceSpan(quoteBegin, quoteLast) }
      : { type: "quote", text: joinParagraph(quote), sourceRange: sourceSpan(quoteBegin, quoteLast) });
    quote = []; quoteBegin = -1; quoteLast = -1;
    quoteKind = null;
  };
  const flush = () => { flushParagraph(); flushList(); flushQuote(); };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    const line = rawLine.trim();
    if (codeFence) {
      if (closesFence(rawLine, codeFence)) {
        blocks.push({ type: "code", language: codeFence.language, code: codeFence.lines.join("\n"), sourceRange: sourceSpan(codeFence.startLine, lineIndex) });
        codeFence = null;
      } else codeFence.lines.push(rawLine);
      continue;
    }
    const fence = readFence(rawLine);
    if (fence) {
      flush();
      codeFence = { ...fence, lines: [], startLine: lineIndex };
      continue;
    }
    if (!line) { flush(); continue; }

    const table = readMarkdownTable(lines, lineIndex);
    if (table) {
      flush();
      blocks.push({ type: "table", headers: table.headers, alignments: table.alignments, rows: table.rows, sourceRange: sourceSpan(lineIndex, table.consumedUntil) });
      lineIndex = table.consumedUntil;
      continue;
    }
    const authorLine = !blocks.length && !paragraph.length ? plainInline(line).match(/^(?:主编|作者)\s*[：:]\s*(.+)$/) : null;
    if (authorLine) {
      flush();
      author = frontMatterAuthor || authorLine[1].trim();
      continue;
    }
    const reference = line.match(/^\[((?!\^)[^\]]+)\]:\s*(https?:\/\/\S+?)(?:\s+["“](.*?)["”])?\s*$/);
    if (reference) {
      flush();
      const url = cleanUrl(reference[2]);
      references.push({ id: reference[1], title: plainInline(reference[3] || urlDomain(url)), url, domain: urlDomain(url) });
      continue;
    }
    const footnote = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
    if (footnote) {
      flush();
      footnotes.push({ id: footnote[1], text: footnote[2] });
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+["']([^"']*)["'])?\)$/);
    if (image) {
      flush();
      blocks.push({ type: "image", alt: plainInline(image[1]) || "文章图片", src: cleanUrl(image[2]), caption: plainInline(image[3] || image[1]), sourceRange: sourceSpan(lineIndex, lineIndex) });
      continue;
    }
    const atx = readAtxHeading(rawLine);
    const setext = atx ? null : readSetextHeading(rawLine, lines[lineIndex + 1]);
    const heading = atx ?? setext;
    if (heading) {
      flush();
      blocks.push({ type: heading.level <= 2 ? "heading" : "subheading", text: heading.text, sourceRange: sourceSpan(lineIndex, lineIndex + (setext ? 1 : 0)) });
      if (setext) lineIndex++;
      continue;
    }
    if (/^(?:-{3,}|_{3,}|\*{3,})$/.test(line)) { flush(); blocks.push({ type: "divider", sourceRange: sourceSpan(lineIndex, lineIndex) }); continue; }
    const quoteLine = line.match(/^>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph(); flushList();
      const alert = quoteLine[1].match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
      if (alert) { flushQuote(); quoteKind = alert[1].toLowerCase() as AlertKind; quoteBegin = lineIndex; quoteLast = lineIndex; }
      else {
        if (quoteBegin < 0) quoteBegin = lineIndex;
        quoteLast = lineIndex;
        if (quoteLine[1]) quote.push(quoteLine[1]);
        else if (quote.length && quote.at(-1) !== "<br><br>") quote.push("<br><br>");
      }
      continue;
    }
    const listLine = readMarkdownListItem(rawLine);
    if (listLine) {
      flushParagraph(); flushQuote();
      if (list && list.ordered !== listLine.ordered) flushList();
      if (!list) { list = { type: "list", ordered: listLine.ordered, start: listLine.start, items: [] }; listBegin = lineIndex; }
      listLast = lineIndex;
      list.items.push(listLine.item);
      continue;
    }
    flushQuote(); flushList();
    const explicitBreak = rawLine.endsWith("  ") || /(?<!\\)\\$/.test(rawLine);
    if (paragraphBegin < 0) paragraphBegin = lineIndex;
    paragraphLast = lineIndex;
    paragraph.push(explicitBreak ? line.replace(/(?<!\\)\\$/, "") + "<br>" : line);
  }
  if (codeFence) blocks.push({ type: "code", language: codeFence.language, code: codeFence.lines.join("\n"), sourceRange: sourceSpan(codeFence.startLine, lines.length - 1) });
  flush();
  return { title, author, subtitle, blocks, references, footnotes, unclosedFence: Boolean(codeFence) };
}

function blockLabel(type: BlockType) {
  return ({ title: "标题", paragraph: "正文", heading: "章节", subheading: "小节", quote: "观点", list: "行动列表", code: "代码块", divider: "分隔", table: "数据表格", alert: "提示块", image: "图片" } as const)[type];
}

export default function Home() {
  const [theme, setTheme] = useState<ThemeKey>("national");
  const [markdownStyle, setMarkdownStyle] = useState<MarkdownStyleKey>("jiangnan");
  const [inspector, setInspector] = useState<InspectorTab>("步骤");
  const [stage, setStage] = useState<StageKey>("稿件");
  const [mobilePane, setMobilePane] = useState<MobilePane>("inspector");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [preview, setPreview] = useState<"phone" | "desktop">("phone");
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.94);
  const [fontProfile, setFontProfile] = useState<FontProfile>("classic");
  const [titleScale, setTitleScale] = useState(1);
  const [articleTracking, setArticleTracking] = useState(0.008);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("calm");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [sourceFocusRange, setSourceFocusRange] = useState<SourceRange | null>(null);
  const [htmlDelivery, setHtmlDelivery] = useState<WechatDelivery | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [darkPreview, setDarkPreview] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<"proof" | "final">("proof");
  const [typesetOpen, setTypesetOpen] = useState(false);
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [sourceEncoding, setSourceEncoding] = useState("UTF-8 · 编辑器");
  const [importingFile, setImportingFile] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<{ index: number; type: BlockType } | null>(null);
  const [capturedType, setCapturedType] = useState<BlockType | null>(null);
  const [syncedTypes, setSyncedTypes] = useState<BlockType[]>([]);
  const [componentQuery, setComponentQuery] = useState("");
  const [coverStyleId, setCoverStyleId] = useState("");
  const [coverCategory, setCoverCategory] = useState<"全部" | CoverStyleCategory>("全部");
  const [coverCompanyOverride, setCoverCompanyOverride] = useState<{ source: string; value: string } | null>(null);
  const [coverBackgroundAsset, setCoverBackgroundAsset] = useState<{ identity: string; file: File } | null>(null);
  const [coverLogoAsset, setCoverLogoAsset] = useState<{ company: string; file: File } | null>(null);
  const [coverLogoSourceEntry, setCoverLogoSourceEntry] = useState<{ company: string; value: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [wechatStatus, setWechatStatus] = useState<{ configured: boolean; connected: boolean; mode: string; appId: string | null; message: string }>({ configured: false, connected: false, mode: "未配置", appId: null, message: "尚未检查连接" });
  const [checkingWechat, setCheckingWechat] = useState(false);
  const studioRef = useRef<HTMLElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const inspectorPanelRef = useRef<HTMLElement>(null);
  const typesetRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const liveMarkdown = useRef(markdown);
  useLayoutEffect(() => { liveMarkdown.current = markdown; }, [markdown]);
  const previousStage = useRef(stage);
  const previousInspector = useRef(inspector);
  const previousArticleStyle = useRef(`${markdownStyle}-${theme}-${layoutMode}-${fontProfile}`);
  const draftSnapshot = useMemo(() => ({ markdown, markdownStyle, theme, layoutMode, fontProfile, fontSize, lineHeight, titleScale, articleTracking }), [markdown, markdownStyle, theme, layoutMode, fontProfile, fontSize, lineHeight, titleScale, articleTracking]);
  function applyDraftSnapshot(value: DraftSnapshot) {
    setMarkdown(value.markdown); setMarkdownStyle(value.markdownStyle); setTheme(value.theme);
    setLayoutMode(value.layoutMode); setFontProfile(value.fontProfile); setFontSize(value.fontSize);
    setLineHeight(value.lineHeight); setTitleScale(value.titleScale); setArticleTracking(value.articleTracking);
    setSourceEncoding("UTF-8 · 本机草稿"); setImportWarnings([]); setSelected(null);
  }
  const archive = useDraftArchive(draftSnapshot, applyDraftSnapshot);
  const { versions } = archive;
  const saveLabel = { loading: "正在读取草稿", saving: "正在保存", saved: "本机已保存", error: "本机保存需检查" }[archive.status];

  const currentTheme = themes[theme];
  const currentMarkdownStyle = markdownStyles[markdownStyle];
  const currentStageIndex = stageItems.findIndex((item) => item.title === stage);
  const currentStage = stageItems[currentStageIndex];
  const nextStage = stageItems[currentStageIndex + 1];
  const articleTitleSize = titleBaseSizes[markdownStyle] * titleScale;
  const safeMarkdown = useMemo(() => normalizeMarkdownInput(markdown), [markdown]);
  const encodingIssues = useMemo(() => findEncodingIssues(markdown), [markdown]);
  const wordCount = useMemo(() => safeMarkdown.replace(/[#>*`\-]/g, "").trim().length, [safeMarkdown]);
  const article = useMemo(() => parseArticle(safeMarkdown), [safeMarkdown]);
  const structure = useMemo(() => {
    const count = { chapter: 0, paragraph: 0, quote: 0, table: 0, code: 0, list: 0 };
    for (const block of article.blocks) {
      if (block.type === "heading") count.chapter++;
      if (block.type === "paragraph") count.paragraph++;
      if (block.type === "quote" || block.type === "alert") count.quote++;
      if (block.type === "table") count.table++;
      if (block.type === "list") count.list++;
      if (block.type === "code") count.code++;
    }
    return count;
  }, [article.blocks]);
  const suggestedStyle: MarkdownStyleKey = structure.table || structure.code ? "technical"
    : wordCount >= 1200 && structure.chapter >= 3 ? "essay"
    : structure.quote >= 2 ? "editorial"
    : wordCount < 450 && !structure.chapter ? "minimal" : "jiangnan";
  const styleReason = { technical: "稿件有表格或代码", essay: "长稿有多处章节", editorial: "稿件有多处引用或提示", minimal: "短稿、无独立章节", jiangnan: "适合用清晰章节与疏朗段落承载叙事" }[suggestedStyle];
  const firstParagraphIndex = article.blocks.findIndex((block) => block.type === "paragraph");
  const hasArticleBody = article.blocks.some((block) => block.type !== "divider") || Boolean(article.references.length || article.footnotes.length);
  const coverProfile = useMemo(() => analyzeCoverContent(article.title, safeMarkdown), [article.title, safeMarkdown]);
  const coverCompanySource = `${article.title}\u0000${coverProfile.companyName ?? ""}`;
  const suggestedCoverCompany = coverProfile.companyConfidence === "medium" ? coverProfile.companyName ?? "" : "";
  const autoConfirmedCoverCompany = coverProfile.companyConfidence === "high" ? coverProfile.companyName ?? "" : "";
  const effectiveCoverCompany = coverCompanyOverride?.source === coverCompanySource ? coverCompanyOverride.value : autoConfirmedCoverCompany;
  const hasPendingCoverCompany = !effectiveCoverCompany.trim() && Boolean(suggestedCoverCompany);
  const coverRecommendations = useMemo(() => recommendCoverStyles(article.title, safeMarkdown), [article.title, safeMarkdown]);
  const selectedCoverStyle = useMemo(() => coverStyles.find((item) => item.id === coverStyleId) ?? coverRecommendations[0].style, [coverRecommendations, coverStyleId]);
  const selectedCoverLabel = coverStyleLabel(selectedCoverStyle);
  const filteredCoverStyles = useMemo(() => coverCategory === "全部" ? coverStyles : coverStyles.filter((item) => item.category === coverCategory), [coverCategory]);
  const coverProtocol = useMemo(() => buildCoverProtocol(selectedCoverStyle, article.title, coverProfile, effectiveCoverCompany.trim() || null), [article.title, coverProfile, effectiveCoverCompany, selectedCoverStyle]);
  const coverHarness = useMemo(() => buildCoverHarness(article.title, effectiveCoverCompany.trim() || null), [article.title, effectiveCoverCompany]);
  const coverPrompt = useMemo(() => buildCoverPrompt(selectedCoverStyle, article.title, coverProfile, effectiveCoverCompany.trim() || null), [article.title, coverProfile, effectiveCoverCompany, selectedCoverStyle]);
  const coverBackgroundIdentity = `${article.title}\u0000${selectedCoverStyle.id}`;
  const coverBackgroundFile = coverBackgroundAsset?.identity === coverBackgroundIdentity ? coverBackgroundAsset.file : null;
  const coverLogoFile = coverLogoAsset?.company === effectiveCoverCompany.trim() ? coverLogoAsset.file : null;
  const coverLogoSource = coverLogoSourceEntry?.company === effectiveCoverCompany.trim() ? coverLogoSourceEntry.value : "";
  const coverLogoSourceValid = useMemo(() => {
    if (!effectiveCoverCompany.trim()) return true;
    try {
      const hostname = new URL(coverLogoSource).hostname.replace(/^www\./, "").toLowerCase();
      return coverHarness.company.officialDomainHints.length
        ? coverHarness.company.officialDomainHints.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
        : /^https?:\/\//i.test(coverLogoSource);
    } catch {
      return false;
    }
  }, [coverHarness.company.officialDomainHints, coverLogoSource, effectiveCoverCompany]);
  const canComposeCover = Boolean(coverBackgroundFile && (!effectiveCoverCompany.trim() || (coverLogoFile && coverLogoSourceValid)));
  const outline = useMemo(() => article.blocks.map((block, index) => block.type === "heading" || block.type === "subheading" ? { index, type: block.type, text: block.text } : null).filter((item): item is { index: number; type: "heading" | "subheading"; text: string } => Boolean(item)), [article.blocks]);
  const chapterNumbers = useMemo(() => new Map(outline.filter((item) => item.type === "heading").map((item, index) => [item.index, index + 1])), [outline]);
  const componentRecommendations = useMemo(() => {
    const source = `${article.title}\n${safeMarkdown}`;
    const matched = components.filter((item) => item.signals.test(source)).map((item) => item.kind);
    return [...new Set(["核心判断", ...matched, "结语行动"])].slice(0, 3);
  }, [article.title, safeMarkdown]);
  const filteredComponents = useMemo(() => components.filter((item) => `${item.phase}${item.kind}${item.detail}`.includes(componentQuery.trim())), [componentQuery]);
  const auditIssues = useMemo(() => auditWechatArticle({
    markdown: safeMarkdown, title: article.title, author: article.author,
    hasArticleBody, unclosedFence: article.unclosedFence, blocks: article.blocks,
    encodingIssues, importWarnings,
  }), [safeMarkdown, article, hasArticleBody, encodingIssues, importWarnings]);
  const auditSummary = useMemo(() => summarizeWechatAudit(auditIssues), [auditIssues]);
  const diagnostics = auditIssues.map((issue) => issue.message);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 840px)").matches) return;
    const timer = window.setTimeout(() => {
      setPreview("phone");
      setWorkspaceView("final");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (inspector !== "规范") return;
    if (isGitHubPagesRuntime()) {
      const timer = window.setTimeout(() => setWechatStatus({ configured: false, connected: false, mode: "静态托管", appId: null, message: "GitHub Pages 版不含公众号服务端接口；排版与复制功能不受影响" }), 0);
      return () => window.clearTimeout(timer);
    }
    fetch("/api/wechat")
      .then((response) => response.json())
      .then((payload) => setWechatStatus(payload))
      .catch(() => setWechatStatus((current) => ({ ...current, message: "连接状态暂不可用" })));
  }, [inspector]);

  useEffect(() => {
    if (inspectorPanelRef.current) inspectorPanelRef.current.scrollTop = 0;
  }, [inspector, stage]);

  useEffect(() => {
    if (!typesetOpen) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!typesetRef.current?.contains(event.target as Node)) setTypesetOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTypesetOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [typesetOpen]);

  useLayoutEffect(() => {
    if (!studioRef.current) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
        entrance
          .from(".topbar", { y: -7, opacity: 0.82, duration: 0.38 })
          .from(".paper-frame", { y: 22, scaleY: 0.986, transformOrigin: "center top", duration: 0.62, ease: "power3.out" }, "-=0.2")
          .from(".article-title-block h1", { y: 10, clipPath: "inset(0 0 100% 0)", duration: 0.52, ease: "power3.out" }, "-=0.38")
          .from(".workflow-item", { x: -7, duration: 0.26, stagger: 0.032 }, "-=0.5")
          .from(".inspector-content > *", { x: 6, duration: 0.28, stagger: 0.04 }, "-=0.42");

        gsap.to(".jiangnan-mist", { xPercent: 1.15, yPercent: -0.35, scale: 1.018, duration: 17, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.fromTo(".studio-waterline", { scaleX: 0.18, opacity: 0.18 }, { scaleX: 1, opacity: 0.62, duration: 6.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.fromTo(".water-ripples i", { scaleX: 0.2, opacity: 0, transformOrigin: "center" }, { scaleX: 1, opacity: 0.34, duration: 4.8, stagger: 1.15, repeat: -1, repeatDelay: 0.7, ease: "sine.inOut" });
        gsap.fromTo(".ink-scent", { y: 2, opacity: 0.5 }, { y: -3, opacity: 0.78, duration: 5.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to(".save-indicator i", { scale: 1.55, opacity: 0.38, duration: 1.9, repeat: -1, yoyo: true, ease: "sine.inOut" });
      }, studioRef);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);

  useLayoutEffect(() => {
    const root = studioRef.current;
    const stageElement = root?.querySelector<HTMLElement>(".canvas-stage");
    const mistElement = root?.querySelector<HTMLElement>(".jiangnan-mist");
    const paperElement = root?.querySelector<HTMLElement>(".paper-frame");
    if (!stageElement || !mistElement || !paperElement) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;

    const mistX = gsap.quickTo(mistElement, "x", { duration: 1.25, ease: "power3.out" });
    const mistY = gsap.quickTo(mistElement, "y", { duration: 1.25, ease: "power3.out" });
    const paperX = gsap.quickTo(paperElement, "x", { duration: 0.9, ease: "power3.out" });
    const paperY = gsap.quickTo(paperElement, "y", { duration: 0.9, ease: "power3.out" });

    const move = (event: PointerEvent) => {
      const bounds = stageElement.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      mistX(x * 10); mistY(y * 5);
      paperX(x * -1.1); paperY(y * -0.7);
    };
    const settle = () => { mistX(0); mistY(0); paperX(0); paperY(0); };
    stageElement.addEventListener("pointermove", move);
    stageElement.addEventListener("pointerleave", settle);
    return () => {
      stageElement.removeEventListener("pointermove", move);
      stageElement.removeEventListener("pointerleave", settle);
      gsap.killTweensOf([mistElement, paperElement]);
    };
  }, []);

  useLayoutEffect(() => {
    if (!studioRef.current || previousStage.current === stage) return;
    previousStage.current = stage;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(".editorial-stage-brief, .editorial-stage-content", { y: 4, opacity: .88 }, { y: 0, opacity: 1, duration: .22, ease: "power2.out", clearProps: "transform,opacity" });
    }, studioRef);
    return () => context.revert();
  }, [stage]);

  useLayoutEffect(() => {
    if (!studioRef.current || previousInspector.current === inspector) return;
    previousInspector.current = inspector;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      const transition = gsap.timeline({ defaults: { ease: "power2.out" } });
      transition
        .fromTo(".inspector-tabs button.active i", { scaleX: 0.18, opacity: 0, transformOrigin: "center center" }, { scaleX: 1, opacity: 1, duration: 0.46, ease: "sine.out", clearProps: "transform,opacity" })
        .fromTo(".inspector-content > *", { x: 7, y: 3, opacity: 0.55, scale: 0.994, filter: "blur(2px)" }, { x: 0, y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.5, stagger: 0.065, clearProps: "transform,opacity,filter" }, "-=0.3")
        .fromTo(".inspector-content li", { y: 4, opacity: 0.72 }, { y: 0, opacity: 1, duration: 0.34, stagger: 0.03, ease: "sine.out", clearProps: "transform,opacity" }, "-=0.42");
    }, studioRef);
    return () => context.revert();
  }, [inspector]);

  useLayoutEffect(() => {
    const articleStyle = `${markdownStyle}-${theme}-${layoutMode}-${fontProfile}`;
    if (!studioRef.current || previousArticleStyle.current === articleStyle) return;
    previousArticleStyle.current = articleStyle;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      // Animate the preview shell only; copied text must never capture transient opacity.
      gsap.fromTo(".paper-frame", { opacity: .94 }, { opacity: 1, duration: .20, ease: "power2.out", clearProps: "opacity" });
    }, studioRef);
    return () => context.revert();
  }, [fontProfile, layoutMode, markdownStyle, theme]);

  useLayoutEffect(() => {
    if (!studioRef.current || !selected || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(".block-toolbar", { y: -6, scale: 0.975, opacity: 0.55, filter: "blur(2px)" }, { y: 0, scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.42, ease: "power3.out", clearProps: "transform,opacity,filter" });
      gsap.fromTo(".selectable-block.is-selected", { backgroundColor: "rgba(159, 61, 47, 0.12)" }, { backgroundColor: "rgba(159, 61, 47, 0.035)", duration: 0.58, ease: "power2.out", clearProps: "backgroundColor" });
    }, studioRef);
    return () => context.revert();
  }, [selected]);

  useLayoutEffect(() => {
    if (!studioRef.current || !selected || !focusMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(".article-page.focus-active .selectable-block:not(.is-selected)", { opacity: 0.62 }, { opacity: 0.22, duration: 0.38, ease: "power2.out" });
      gsap.fromTo(".selectable-block.is-selected", { scale: 0.997 }, { scale: 1, duration: 0.42, ease: "power3.out", clearProps: "transform" });
    }, studioRef);
    return () => context.revert();
  }, [focusMode, selected]);

  useEffect(() => {
    if (!typewriterMode || !selected) return;
    const frame = window.requestAnimationFrame(() => articleRef.current?.querySelector<HTMLElement>(`[data-block-index="${selected.index}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    return () => window.cancelAnimationFrame(frame);
  }, [selected, typewriterMode]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2400); }

  function activateStage(nextStage: StageKey) {
    setStage(nextStage);
    setInspector("步骤");
    setTypesetOpen(false);
    setSelected(null);
    setMobilePane("inspector");
  }

  function toggleMobileSurface() {
    if (mobilePane === "canvas") {
      setMobilePane("inspector");
      return;
    }
    setPreview("phone");
    setWorkspaceView("final");
    setSelected(null);
    setFocusMode(false);
    setTypewriterMode(false);
    setMobilePane("canvas");
  }

  function editSelectedBlock() {
    // The AST uses normalized Markdown offsets. Never select an unrelated
    // source span if Unicode/line-ending normalization changed the raw text.
    if (markdown !== safeMarkdown) {
      setSourceFocusRange(null);
      setSourceOpen(true);
      notify("原稿含未规范化字符，已打开编辑器；请清理字符后再精确定位");
      return;
    }
    const range = selected && selected.index >= 0 ? article.blocks[selected.index]?.sourceRange : null;
    if (!range) {
      setSourceFocusRange(null);
      setSourceOpen(true);
      notify("已打开原稿；这一处暂无法精确定位");
      return;
    }
    setSourceFocusRange({ ...range });
    setSourceOpen(true);
  }

  function jumpToBlock(index: number, type: "title" | "heading" | "subheading") {
    if (stage === "封面") activateStage("稿件");
    setWorkspaceView("proof");
    setMobilePane("canvas");
    setSelected({ index, type });
    window.requestAnimationFrame(() => articleRef.current?.querySelector<HTMLElement>(`[data-block-index="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: typewriterMode ? "center" : "start" }));
  }


  function applyLayout(mode: LayoutMode) {
    setLayoutMode(mode);
    setLineHeight(mode === "calm" ? 2 : mode === "balanced" ? 1.88 : 1.78);
    notify("已更新行距与段距");
  }

  function applyMarkdownStyle(key: MarkdownStyleKey) {
    const style = markdownStyles[key];
    setMarkdownStyle(key);
    setTheme(style.theme);
    setLayoutMode(style.layout);
    setFontProfile(style.fontProfile);
    setFontSize(style.typography.bodySize);
    setLineHeight(style.typography.lineHeight);
    setTitleScale(style.typography.titleScale);
    setArticleTracking(style.typography.tracking);
    setSelected(null);
    notify(`已换为“${style.name}”，正文内容未改动`);
  }

  function cycleMarkdownStyle() {
    const currentIndex = markdownStyleOrder.indexOf(markdownStyle);
    applyMarkdownStyle(markdownStyleOrder[(currentIndex + 1) % markdownStyleOrder.length]);
  }

  function changeWorkspaceView(mode: "proof" | "final") {
    setWorkspaceView(mode);
    if (mode === "final") {
      setSelected(null);
      setFocusMode(false);
      setTypewriterMode(false);
    }
    notify(mode === "final" ? "已进入成稿视图，校订标记暂时收起" : "已返回校订视图，可继续选择内容块");
  }

  function insertComponent(snippet: string, kind: string) {
    archive.checkpoint(`插入${kind}前`);
    setMarkdown((value) => `${value.trimEnd()}${snippet}\n`);
    activateStage("编排");
    notify(`已插入${kind}组件，内容结构已更新`);
  }

  function captureStyle() {
    if (!selected) return notify("请先在画布中选择一个内容块");
    setCapturedType(selected.type);
    notify(`已采集“${blockLabel(selected.type)}”的编排规则`);
  }

  function applyCapturedStyle() {
    if (!capturedType) return notify("请先采集一个内容块的编排规则");
    setSyncedTypes((types) => types.includes(capturedType) ? types : [...types, capturedType]);
    notify(`同类${blockLabel(capturedType)}已统一，共 ${capturedType === "title" ? 1 : article.blocks.filter((item) => item.type === capturedType).length} 处`);
  }

  function saveVersion() {
    const id = archive.checkpoint("手动恢复点");
    notify("已保留当前原稿与版式，可在恢复记录中查看");
    return id;
  }

  function restoreVersion() {
    const last = versions.at(-1);
    if (!last) return notify("还没有可恢复版本");
    archive.restoreCheckpoint(last.id);
    notify(`已恢复${last.label}`);
  }

  async function copyMarkdown() {
    if (!markdown.trim()) return notify("原稿为空，请先补充稿件");
    try { await writePlainClipboard(markdown); notify("Markdown 原稿已复制"); }
    catch { notify("复制失败，请下载 Markdown 或在原稿编辑器中手动复制"); }
  }

  function downloadMarkdown() {
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    link.href = url; link.download = `${safeDownloadName(article.title)}.md`;
    document.body.append(link);
    try { link.click(); notify("已发起 Markdown 下载"); }
    finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  async function importFile(file?: File) {
    if (!file) return;
    const original = liveMarkdown.current;
    setImportingFile(true);
    setImportProgress("准备解析");
    try {
      if (/\.(md|markdown|txt)$/i.test(file.name)) {
        const decoded = decodeImportedBuffer(await file.arrayBuffer());
        const nextMarkdown = normalizeMarkdownInput(decoded.text);
        if (liveMarkdown.current !== original) throw new Error("解析期间原稿已改动，请重新导入；当前改动已保留");
        archive.checkpoint(`导入 ${file.name} 前`);
        setMarkdown(nextMarkdown);
        setSourceEncoding(`${decoded.encoding} · 文件`);
        setImportWarnings([]);
        const issues = findEncodingIssues(nextMarkdown);
        notify(issues.length ? `已按 ${decoded.encoding} 导入，仍有 ${issues.length} 项编码风险` : `已按 ${decoded.encoding} 导入，字符检查通过`);
      } else {
        const imported = await importDocumentFile(file, ({ currentPage, totalPages }) => setImportProgress(`PDF ${currentPage}/${totalPages} 页`));
        if (liveMarkdown.current !== original) throw new Error("解析期间原稿已改动，请重新导入；当前改动已保留");
        archive.checkpoint(`导入 ${file.name} 前`);
        setMarkdown(normalizeMarkdownInput(imported.markdown));
        setSourceEncoding(imported.sourceLabel);
        setImportWarnings(imported.warnings);
        notify(imported.warnings.length ? `${imported.summary}；有 ${imported.warnings.length} 项复核提示` : imported.summary);
      }
      activateStage("稿件");
      setSourceOpen(true);
    } catch (error) {
      notify(error instanceof Error ? error.message : "文件解析失败，请检查格式后重试");
    } finally {
      setImportingFile(false);
      setImportProgress("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function pasteMarkdown() {
    const original = liveMarkdown.current;
    try {
      let text = "";
      let richHtml = "";
      if (navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          const item = items.find((candidate) => candidate.types.includes("text/plain"));
          if (item) {
            text = await (await item.getType("text/plain")).text();
            if (item.types.includes("text/html")) richHtml = await (await item.getType("text/html")).text();
          }
        } catch { /* Some WebViews allow only readText. */ }
      }
      if (!text) text = await navigator.clipboard.readText();
      if (!text.trim()) return notify("剪贴板里没有可粘贴的文字");
      const table = spreadsheetFromClipboard(text, richHtml);
      const richMarkdown = table ? null : markdownFromRichClipboard(richHtml, text);
      const nextMarkdown = normalizeMarkdownInput(table?.markdown ?? richMarkdown ?? text);
      if (liveMarkdown.current !== original) return notify("读取剪贴板期间原稿已改动，请重新粘贴；当前改动已保留");
      const nextArticle = parseArticle(nextMarkdown);
      if (markdown.trim()) archive.checkpoint("粘贴前的稿件");
      setMarkdown(nextMarkdown);
      setSourceEncoding(table ? `表格 · ${table.rows}行×${table.columns}列` : richMarkdown ? "富文本 · 加粗已保留" : "Unicode · 剪贴板文字");
      setImportWarnings(table ? ["表格首行作为表头，请核对列名和数据" + (table.merged ? "；合并单元格已展开，空位保留" : "")] : !richMarkdown && !/\*\*[^*\n]+\*\*/.test(text) ? ["本次剪贴板仅含纯文字；若原文有加粗，请复制 Markdown 原稿"] : []);
      setSourceOpen(false);
      activateStage("编排");
      notify(nextArticle.title === "未命名文章" ? "原稿已粘贴并编排，请补充文章标题" : richMarkdown ? `已粘贴并编排：${nextArticle.title} · 加粗已保留` : `已粘贴并编排：${nextArticle.title}${/\*\*[^*\n]+\*\*/.test(text) ? "" : " · 剪贴板未提供加粗格式"}`);
    } catch (reason) {
      notify(reason instanceof Error && !["NotAllowedError", "SecurityError"].includes(reason.name) ? reason.message : "浏览器拦截了剪贴板；请在系统设置中允许此浏览器读取粘贴内容");
    }
  }

  function clearMarkdown() {
    if (!markdown.trim()) return notify("原稿已经是空的");
    archive.checkpoint("清空前的稿件");
    setMarkdown("");
    setSourceEncoding("UTF-8 · 空白稿");
    notify("原稿已清空，并保留一个恢复点");
  }

  function analyzeAndArrange() {
    setSourceOpen(false);
    activateStage("编排");
    notify(encodingIssues.length
      ? `已完成分析，发现 ${encodingIssues.length} 项编码风险`
      : article.title === "未命名文章"
        ? "正文已编排，但尚未识别标题"
        : `已识别标题：${article.title}`);
  }

  async function copyPlainField(value: string, label: string) {
    if (!value.trim() || (label === "标题" && value === "未命名文章")) {
      setSourceOpen(true);
      return notify(`请先在原稿中补充${label}`);
    }
    if (findEncodingIssues(value).length) return notify(`${label}含有异常字符，请先回到原稿修正`);
    try {
      await writePlainClipboard(normalizeMarkdownInput(value));
      setCopiedField(label);
      window.setTimeout(() => setCopiedField((current) => current === label ? null : current), 1800);
      notify(`${label}已复制，可粘贴到微信${label}栏`);
    } catch {
      notify(`复制${label}失败，请长按标题手动复制`);
    }
  }

  async function copyCoverPrompt() {
    try {
      await writePlainClipboard(coverPrompt);
      notify(`“${selectedCoverLabel.name}”成品封面指令 V8 已复制`);
    } catch {
      notify("复制封面任务失败，请检查浏览器剪贴板权限");
    }
  }

  async function composeFinalCover() {
    if (article.title === "未命名文章") return notify("缺少文章标题，无法生成最终封面");
    if (findEncodingIssues(article.title).length) return notify("标题含有异常字符，请先修正原稿");
    if (!coverBackgroundFile) return notify("请先导入无字底图文件");
    if (effectiveCoverCompany.trim() && !coverLogoFile) return notify("企业稿必须先导入官方 Logo 原图");
    if (effectiveCoverCompany.trim() && !coverLogoSourceValid) return notify("请填写可核验的官方 Logo 来源网址");

    try {
      const [background, logo] = await Promise.all([
        loadCoverImage(coverBackgroundFile),
        coverLogoFile ? loadCoverImage(coverLogoFile) : Promise.resolve(null),
      ]);
      await document.fonts?.ready;
      const canvas = document.createElement("canvas");
      canvas.width = 2350;
      canvas.height = 1000;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("浏览器无法创建 Canvas");

      drawImageCover(context, background, canvas.width, canvas.height);

      const wash = context.createLinearGradient(0, 0, 1700, 0);
      wash.addColorStop(0, colorWithAlpha(selectedCoverStyle.palette[0], 0.99));
      wash.addColorStop(0.58, colorWithAlpha(selectedCoverStyle.palette[0], 0.92));
      wash.addColorStop(0.82, colorWithAlpha(selectedCoverStyle.palette[0], 0.28));
      wash.addColorStop(1, colorWithAlpha(selectedCoverStyle.palette[0], 0));
      context.fillStyle = wash;
      context.fillRect(0, 0, 1800, canvas.height);

      context.fillStyle = selectedCoverStyle.palette[2];
      context.fillRect(96, 155, 14, 555);
      context.fillRect(150, 178, 160, 7);

      const title = normalizeMarkdownInput(article.title).trim();
      let titleSize = title.length > 42 ? 60 : title.length > 28 ? 70 : 82;
      let titleLines: string[] = [];
      do {
        context.font = `700 ${titleSize}px "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", sans-serif`;
        titleLines = breakCoverTitle(context, title, 1270);
        if (titleLines.length > 3) titleSize -= 2;
      } while (titleLines.length > 3 && titleSize > 48);

      context.fillStyle = selectedCoverStyle.palette[1];
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      const lineHeightPx = Math.round(titleSize * 1.34);
      const titleStartY = Math.max(330, 515 - ((titleLines.length - 1) * lineHeightPx) / 2);
      titleLines.forEach((line, index) => context.fillText(line, 150, titleStartY + index * lineHeightPx));

      if (logo) {
        const maxLogoWidth = 360;
        const maxLogoHeight = 128;
        const logoScale = Math.min(maxLogoWidth / logo.naturalWidth, maxLogoHeight / logo.naturalHeight, 1.6);
        const logoWidth = Math.round(logo.naturalWidth * logoScale);
        const logoHeight = Math.round(logo.naturalHeight * logoScale);
        const logoX = canvas.width - 100 - logoWidth;
        const logoY = 74;
        context.fillStyle = "rgba(255,255,255,.94)";
        context.beginPath();
        context.roundRect(logoX - 28, logoY - 22, logoWidth + 56, logoHeight + 44, 18);
        context.fill();
        context.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      }

      context.font = `600 42px "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", sans-serif`;
      context.textAlign = "right";
      context.fillStyle = selectedCoverStyle.palette[1];
      context.fillText(coverSignature, canvas.width - 105, 912);
      const signatureWidth = context.measureText(coverSignature).width;
      context.fillStyle = selectedCoverStyle.palette[2];
      context.fillRect(canvas.width - 105 - signatureWidth - 72, 893, 48, 4);

      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG 导出失败")), "image/png"));
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeDownloadName(article.title)}-2350x1000.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      notify("最终封面已生成：标题、唐淼署名与官方 Logo 均由本机精确合成");
    } catch (error) {
      notify(error instanceof Error ? error.message : "封面合成失败，请检查图片文件");
    }
  }

  function locateDeliveryIssue(issue: WechatAuditIssue) {
    if (issue.sourceRange && markdown === safeMarkdown) {
      setSourceFocusRange({ ...issue.sourceRange });
    } else {
      setSourceFocusRange(null);
      if (issue.sourceRange) notify("原稿经过字符规范化，定位已降级为打开全文，请人工查找。");
    }
    setSourceOpen(true);
  }

  function buildDelivery() {
    if (!auditSummary.canDeliver) {
      setInspector("步骤");
      setStage("交付");
      setMobilePane("inspector");
      notify(`有 ${auditSummary.blockers} 项阻断问题，请先在交付检查中定位修正`);
      return;
    }
    const source = articleRef.current;
    if (!source) {
      notify("请先进入交付步骤，等待正文预览加载");
      return;
    }
    try {
      return prepareWechatDelivery(source, {
        title: article.title, author: article.author,
        ink: currentTheme.palette.ink, accent: currentTheme.palette.accent,
        bodyFont: wechatFontStacks[fontProfile], uiFont: wechatUiFontStack,
        fontSize, lineHeight, warnings: diagnostics,
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : "生成排版正文失败，请重试");
    }
  }

  function openWechatHtml() {
    const delivery = buildDelivery();
    if (delivery) setHtmlDelivery(delivery);
  }

  async function copyArticle() {
    const delivery = buildDelivery();
    if (!delivery) return;
    try {
      await writeRichClipboard(delivery.html, delivery.plainText);
      notify("富文本正文已复制，请粘贴到公众号正文并预览核对");
    } catch {
      setHtmlDelivery(delivery);
      notify("无法写入富文本剪贴板，请尝试下载 HTML");
    }
  }

  async function checkWechatConnection() {
    if (isGitHubPagesRuntime()) {
      setWechatStatus({ configured: false, connected: false, mode: "静态托管", appId: null, message: "GitHub Pages 版不含公众号服务端接口；排版与复制功能不受影响" });
      notify("静态版不连接公众号服务端，排版与复制功能正常可用");
      return;
    }
    setCheckingWechat(true);
    try {
      const response = await fetch("/api/wechat?probe=1", { cache: "no-store" });
      const payload = await response.json();
      setWechatStatus(payload);
      notify(payload.connected ? "公众号后端连接正常" : payload.message);
    } catch {
      setWechatStatus((current) => ({ ...current, connected: false, message: "无法连接服务端模块" }));
      notify("无法连接服务端模块");
    } finally {
      setCheckingWechat(false);
    }
  }

  const selectProps = (index: number, type: BlockType) => ({
    className: `selectable-block ${workspaceView === "final" ? "is-readonly" : ""} ${selected?.index === index && selected.type === type ? "is-selected" : ""} ${syncedTypes.includes(type) ? "synced-style" : ""}`,
    "data-block-index": index,
    role: "button", tabIndex: 0,
    "aria-label": `选择${blockLabel(type)}，可进一步编辑原稿`,
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      if (workspaceView !== "proof") setWorkspaceView("proof");
      setSelected({ index, type });
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        if (workspaceView !== "proof") setWorkspaceView("proof");
        setSelected({ index, type });
      }
    },
  });

  function renderOutline() {
    return <div className="article-outline">
      <button type="button" className="outline-title" onClick={() => jumpToBlock(-1, "title")}><i>题</i><span>{article.title}</span></button>
      {outline.map((item) => <button type="button" key={item.index} className={item.type === "subheading" ? "outline-subheading" : ""} onClick={() => jumpToBlock(item.index, item.type)}><i>{item.type === "heading" ? "章" : "节"}</i><span>{plainInline(item.text)}</span></button>)}
    </div>;
  }

  return (
    <main ref={studioRef} className={`studio-shell editorial-studio mobile-pane-${mobilePane} ${focusMode ? "studio-focus-mode" : ""} ${typewriterMode ? "studio-typewriter-mode" : ""} ${workspaceView === "final" ? "studio-final-view" : ""}`} style={{ ...themeCssVariables(currentTheme, false), "--article-dark-accent": currentTheme.dark.accent, "--article-dark-ink": currentTheme.dark.ink, "--article-dark-paper": currentTheme.dark.paper, "--article-dark-muted": currentTheme.dark.muted, "--article-dark-line": currentTheme.dark.line, "--article-dark-soft": currentTheme.dark.soft, "--article-size": `${fontSize}px`, "--article-leading": lineHeight, "--article-title-size": `${articleTitleSize}px`, "--article-tracking": `${articleTracking}em` } as React.CSSProperties}>
      <header className="topbar">
        <div className="product-mark"><span className="mark-seal">排</span><div><strong><span className="brand-title-desktop">公众号排版设计师</span><span className="brand-title-mobile">钢铁私塾排版</span></strong><small>江南编辑书房 · 文章有骨</small></div></div>
        <div className="document-identity"><span className="save-indicator" data-save-state={archive.status} role="status"><i />{saveLabel}</span><span className="document-name">{article.title}</span><button className="icon-button" aria-label="编辑当前原稿" onClick={() => setSourceOpen(true)}><Icon name="chevron" size={15}/></button></div>
        <div className="top-actions">
          <button className="icon-button" aria-label="恢复上一版本" onClick={restoreVersion}><Icon name="undo"/></button>
          <button className="icon-button" aria-label="查看恢复记录" onClick={() => setHistoryOpen(true)}><Icon name="history"/></button>
          <span className="top-divider"/>
          <button type="button" className="mobile-surface-toggle" onClick={toggleMobileSurface}><Icon name={mobilePane === "canvas" ? "style" : stage === "封面" ? "assets" : "document"} size={15}/>{mobilePane === "canvas" ? "返回步骤" : stage === "封面" ? "看封面" : "看正文"}</button>
          <button className="quiet-action" onClick={() => activateStage("编排")}><Icon name="structure" size={15}/>阅读编排</button>
          <button className="primary-action" onClick={() => activateStage("交付")}><span className="delivery-label-desktop">交付检查</span><span className="delivery-label-mobile">检查</span><Icon name="publish" size={16}/></button>
        </div>
      </header>

      <aside className="left-panel">
        <section className={`left-input ${markdown.trim() ? "has-draft" : "is-empty"}`} aria-label="稿件输入">
          <div className="left-input-heading"><div><span>稿件输入</span><small>{article.title === "未命名文章" ? "标题待确认" : "标题已识别"}</small></div><i>{wordCount.toLocaleString()} 字</i></div>
          <button className="left-input-primary" onClick={() => setSourceOpen(true)}><Icon name="document" size={16}/><span><b>{markdown.trim() ? "编辑原稿" : "粘贴 Markdown"}</b><small>{markdown.trim() ? "查看、清空或继续修改" : "一键粘贴并自动编排"}</small></span><Icon name="chevron" size={14}/></button>
          <button className="left-input-import" onClick={() => fileRef.current?.click()} disabled={importingFile}><Icon name={importingFile ? "history" : "plus"} size={14}/>{importingFile ? "正在解析" : "导入本地稿件"} <small>{importingFile ? importProgress : "PDF≤500页 · ≤50MB"}</small></button>
          <input ref={fileRef} type="file" accept=".md,.markdown,.txt,.docx,.pdf,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" hidden onChange={(event) => importFile(event.target.files?.[0])}/>
        </section>
        <div className="panel-label"><span>设计流程</span><b>{String(currentStageIndex + 1).padStart(2, "0")} / 05</b></div>
        <nav className="workflow-nav" aria-label="设计流程">
          {stageItems.map((item, index) => <button key={item.title} className={`workflow-item ${stage === item.title ? "active" : ""}`} aria-current={stage === item.title ? "step" : undefined} onClick={() => activateStage(item.title)}>
            <span className="workflow-index">0{index + 1}</span><span className="workflow-icon"><Icon name={item.icon}/></span><span className="workflow-copy"><b>{item.title}</b><small>{item.meta}</small></span>
          </button>)}
        </nav>

        <div className="left-context">
          <div className="context-head"><span>稿件提纲</span><small>{structure.chapter} 章 · {outline.length} 处标题</small></div>
          {renderOutline()}
        </div>

        <div className="brand-kit-mini"><span className="brand-avatar">钢</span><div><b>钢铁私塾</b><small>品牌套件已启用</small></div><Icon name="check" size={16}/></div>
      </aside>

      <section className="canvas-area">
        <div className="canvas-toolbar">
          <div><span className="canvas-kicker">{stage === "封面" ? "封面预览" : currentMarkdownStyle.name}</span><strong>{stage === "封面" ? `${selectedCoverLabel.name} · 构图建议` : workspaceView === "final" ? `${preview === "phone" ? "手机" : "桌面"}成稿效果` : selected ? `正在校订 · ${blockLabel(selected.type)}` : "选择一段文字开始校订"}</strong></div>
          <div className="canvas-controls">
            {stage === "封面" ? <><span className="cover-ratio-tag">微信横幅 2.35:1</span><button onClick={() => activateStage("版式")}>返回正文设计</button></> : <>
            <div className="workspace-mode-switch" role="tablist" aria-label="工作视图"><i className={workspaceView === "final" ? "at-final" : ""}/><button role="tab" aria-selected={workspaceView === "proof"} className={workspaceView === "proof" ? "active" : ""} onClick={() => changeWorkspaceView("proof")}>校订</button><button role="tab" aria-selected={workspaceView === "final"} className={workspaceView === "final" ? "active" : ""} onClick={() => changeWorkspaceView("final")}>阅读</button></div>
            <div className="quick-typeset-wrap" ref={typesetRef}>
              <button className={`typeset-launch ${typesetOpen ? "selected" : ""}`} aria-label={`文章排版，当前为${currentMarkdownStyle.name}`} title="打开排版设置，可一键切换版式" aria-haspopup="dialog" aria-expanded={typesetOpen} onClick={() => setTypesetOpen((value) => !value)}><Icon name="style" size={15}/><span>排版</span><b>{currentMarkdownStyle.short}</b></button>
              {typesetOpen && <div className="quick-typeset-popover" role="dialog" aria-label="快速排版">
                <header><div><span>文章排版</span><strong>{currentMarkdownStyle.name}</strong></div><button aria-label="关闭快速排版" onClick={() => setTypesetOpen(false)}><Icon name="close" size={15}/></button></header>
                <section><div className="quick-typeset-label"><span>版式骨架</span><small>真实小样，而非主题名列表</small></div><div className="quick-style-grid">{markdownStyleOrder.map((key, index) => { const item = markdownStyles[key]; const palette = themes[item.theme].palette; return <button key={key} className={markdownStyle === key ? "active" : ""} aria-pressed={markdownStyle === key} onClick={() => applyMarkdownStyle(key)}><span className="quick-style-sheet" style={{ "--quick-paper": palette.paper, "--quick-ink": palette.ink, "--quick-accent": palette.accent } as React.CSSProperties}><i/><b/><b/><small/></span><span><b>{item.name}</b><small>{item.fit}</small></span><em>{markdownStyle === key ? "已用" : `0${index + 1}`}</em></button>; })}</div></section>
                <section><div className="quick-typeset-label"><span>阅读密度</span><small>字号、行距与段距联动</small></div><div className="quick-density-switch">{(["calm", "balanced", "editorial"] as LayoutMode[]).map((mode) => <button key={mode} className={layoutMode === mode ? "active" : ""} aria-pressed={layoutMode === mode} onClick={() => applyLayout(mode)}>{mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}<i/></button>)}</div></section>
                <section><div className="quick-typeset-label"><span>纸墨气质</span><small>只换颜色，不动章法</small></div><div className="quick-palette-row">{(Object.entries(themes) as [ThemeKey, typeof themes[ThemeKey]][]).map(([key, item]) => <button key={key} className={theme === key ? "active" : ""} aria-label={item.name} aria-pressed={theme === key} title={item.name} onClick={() => setTheme(key)} style={{ "--quick-paper": item.palette.paper, "--quick-ink": item.palette.ink, "--quick-accent": item.palette.accent } as React.CSSProperties}><i/><span>{item.name}</span></button>)}</div></section>
                <footer><button onClick={cycleMarkdownStyle}><Icon name="brush" size={14}/>换下一套</button><button className="strong" onClick={() => activateStage("版式")}>完整样式设置<Icon name="chevron" size={14}/></button></footer>
              </div>}
            </div><span/>
            {workspaceView === "proof" && <><button className={`writing-mode-toggle ${focusMode ? "selected" : ""}`} aria-pressed={focusMode} onClick={() => { setFocusMode((value) => !value); notify(focusMode ? "已退出专注校订" : "已进入专注校订，选择一个段落开始"); }} title="淡化当前内容块之外的文字"><Icon name="spark" size={14}/><b>专注</b></button>
            <button className={`writing-mode-toggle ${typewriterMode ? "selected" : ""}`} aria-pressed={typewriterMode} onClick={() => { setTypewriterMode((value) => !value); notify(typewriterMode ? "已退出居中阅读" : "已开启居中阅读，所选段落保持在视线中央"); }} title="让所选内容块保持在视线中央"><Icon name="structure" size={14}/><b>居中</b></button><span/></>}
            <button className={`writing-mode-toggle dark-preview-toggle ${darkPreview ? "selected" : ""}`} aria-pressed={darkPreview} onClick={() => { setDarkPreview((value) => !value); notify(darkPreview ? "已返回微信浅色预览" : "已切换微信语义深色预览"); }} title="按微信深色语义预览，不影响复制样式"><Icon name="moon" size={14}/><b>{darkPreview ? "浅色" : "深色"}</b></button><span/>
            <button className={preview === "phone" ? "selected" : ""} aria-pressed={preview === "phone"} onClick={() => setPreview("phone")} aria-label="手机预览"><Icon name="phone"/></button>
            <button className={preview === "desktop" ? "selected" : ""} aria-pressed={preview === "desktop"} onClick={() => setPreview("desktop")} aria-label="桌面预览"><Icon name="desktop"/></button><span/>
            <button className="source-view-button" onClick={() => setSourceOpen(true)}>查看原稿</button>
            </>}
          </div>
        </div>

        <div className="jiangnan-mist" aria-hidden="true" />
        <div className="studio-waterline" aria-hidden="true" />
        <div className={`canvas-stage ${preview}`} onClick={() => setSelected(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const snippet = event.dataTransfer.getData("text/plain"); if (snippet) insertComponent(snippet, "语义"); }}>
          <div className="typewriter-guide" aria-hidden="true" />
          <div className="water-ripples" aria-hidden="true"><i/><i/><i/></div>
          <div className="ink-scent" aria-hidden="true"><span>墨</span><i/><small>松烟入砚</small></div>
          <div className="canvas-atmosphere" aria-hidden="true"><span>烟水入纸</span><i/><small>字句成章</small></div>
          <div className="ruler top-ruler"><i>0</i><i>100</i><i>200</i><i>300</i></div><div className="ruler side-ruler"><i>0</i><i>200</i><i>400</i><i>600</i></div>
          {selected && <div className="block-toolbar" data-editor-ui onClick={(event) => event.stopPropagation()}><span>{blockLabel(selected.type)}</span><button type="button" onClick={editSelectedBlock}><Icon name="document" size={14}/>编辑本段</button><button onClick={captureStyle}><Icon name="brush" size={14}/>采集规则</button><button className={capturedType ? "ready" : ""} onClick={applyCapturedStyle}>同步同类</button><button aria-label="取消选择" onClick={() => setSelected(null)}><Icon name="close" size={14}/></button></div>}

          {stage === "封面" ? <section className="cover-workbench" onClick={(event) => event.stopPropagation()} style={{ "--cover-paper": selectedCoverStyle.palette[0], "--cover-ink": selectedCoverStyle.palette[1], "--cover-accent": selectedCoverStyle.palette[2] } as React.CSSProperties}>
            <header className="cover-workbench-head"><div><span>封面 · 版式草图</span><h2>{selectedCoverLabel.name}</h2><p>{selectedCoverStyle.direction}</p></div><span className="cover-proof-label">2.35:1</span></header>
            <div className="cover-concept-canvas" aria-label={`${selectedCoverLabel.name}封面构图草图`}>
              <span className="cover-concept-index">COVER / {String(coverStyles.findIndex((item) => item.id === selectedCoverStyle.id) + 1).padStart(2, "0")}</span>
              <div className="cover-concept-title"><small>{coverProfile.subject} · {coverProfile.tone}</small><h3>{article.title}</h3><p>{selectedCoverLabel.short} / 最终成品必须准确排印此标题</p></div>
              <div className="cover-concept-visual" aria-hidden="true"><i/><i/><i/><span>主视觉区</span>{effectiveCoverCompany && <div className="cover-logo-slot"><b>官方 LOGO 位</b><small>{effectiveCoverCompany}</small></div>}</div>
              <div className="cover-signature" aria-label={`固定署名：${coverSignature}`}><i/>{coverSignature}</div>
              <div className="cover-safe-line" aria-hidden="true"><span>标题安全线</span></div>
            </div>
            <div className="cover-protocol-strip cover-logo-first-strip"><header><span>只允许交付完整封面</span><small>底图是中间文件，不得冒充成品</small></header><div>{coverHarness.steps.map((step, index) => <p key={step}><em>0{index + 1}</em><span><b>{index === 0 ? "先验能力" : index === 1 ? "确定性合成" : "原子交付"}</b><small>{step}</small></span></p>)}</div></div>
            <div className="cover-analysis-grid"><div><span>构图</span><p>{selectedCoverStyle.composition}</p></div><div><span>材质与光线</span><p>{selectedCoverStyle.texture}</p></div><div><span>风格标签</span><p>{coverProtocol.styleTags.join(" · ")}</p></div><div><span>避坑</span><p>{selectedCoverStyle.avoid}</p></div></div>
            <footer className="cover-workbench-foot"><div className="cover-palette"><span>配色</span>{selectedCoverStyle.palette.map((color) => <i key={color} style={{ background: color }} title={color}/>)}</div><div className="cover-workbench-actions"><button onClick={copyCoverPrompt}><Icon name="copy" size={15}/>复制成品封面指令 V8</button><button className="secondary" onClick={() => { setInspector("步骤"); setMobilePane("inspector"); window.requestAnimationFrame(() => inspectorPanelRef.current?.querySelector(".cover-composer-card")?.scrollIntoView({ block: "nearest" })); }}><Icon name="assets" size={15}/>文字保险</button></div></footer>
          </section> : <div className="paper-frame">
            <div className="paper-folio" aria-hidden="true"><span>公众号预览</span><i/>01</div>
            <article lang="zh-CN" className={`article-page manuscript-page layout-${layoutMode} md-style-${markdownStyle} font-${fontProfile} ${darkPreview ? "wechat-dark-preview" : ""} ${focusMode && selected ? "focus-active" : ""}`} data-md-style={markdownStyle} ref={articleRef}>
            <header className="article-brandline" data-copy-exclude="wechat"><div className="article-account"><span>钢</span><div><b>钢铁私塾</b><small>材料 · 产业 · 人物</small></div></div><span className="article-category"><i/>产业观察</span></header>
            <section {...selectProps(-1, "title")} data-copy-exclude="wechat"><div className="article-title-block"><span className="article-eyebrow">{currentMarkdownStyle.name}</span><h1>{article.title}</h1>{article.subtitle && <p>{article.subtitle}</p>}<div className="article-byline"><span>主编：{article.author}</span><i/></div></div></section>
            <div className="article-body" data-copy-body>
              {article.blocks.map((block, index) => {
                if (block.type === "paragraph") return <div {...selectProps(index, "paragraph")} key={`${block.type}-${index}`}><p className={index === firstParagraphIndex ? "manuscript-lead" : undefined}>{renderInline(block.text)}</p></div>;
                if (block.type === "heading") {
                  const style = currentMarkdownStyle.components.heading;
                  const hasNumber = /^(?:[一二三四五六七八九十百]+[、．.]|\d+[.)、．]\s*|[（(][一二三四五六七八九十\d]+[）)])/u.test(plainInline(block.text));
                  return <div {...selectProps(index, "heading")} key={`heading-${index}`}>
                    <section className="manuscript-chapter" data-heading-style={style}>
                      <h2>{!hasNumber && style !== "plain" && <span className="manuscript-chapter-no" aria-hidden="true">{String(chapterNumbers.get(index)).padStart(2, "0")}</span>}{renderInline(block.text)}</h2>
                    </section>
                  </div>;
                }
                if (block.type === "subheading") return <div {...selectProps(index, "subheading")} key={`subheading-${index}`}><h3 className="manuscript-subheading">{renderInline(block.text)}</h3></div>;
                if (block.type === "quote") return <div {...selectProps(index, "quote")} key={`quote-${index}`}><blockquote className="manuscript-quote" data-quote-style={currentMarkdownStyle.components.quote}><p>{renderInline(block.text)}</p></blockquote></div>;
                if (block.type === "alert") { const labels: Record<AlertKind, string> = { note: "说明", tip: "提示", important: "重要", warning: "注意", caution: "谨慎" }; return <div {...selectProps(index, "alert")} key={`${block.type}-${index}`}><aside className={`article-alert alert-${block.kind}`}><header><i/>{labels[block.kind]}</header><p>{renderInline(block.text)}</p></aside></div>; }
                if (block.type === "table") return <div {...selectProps(index, "table")} key={`table-${index}`}>
                  <div className="article-table-wrap manuscript-table">
                    <table style={{ tableLayout: block.headers.length > 4 ? "fixed" : "auto" }}>
                      <thead><tr>{block.headers.map((header, cellIndex) => <th scope="col" style={{ textAlign: block.alignments[cellIndex] }} key={cellIndex}>{renderInline(header)}</th>)}</tr></thead>
                      <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{block.headers.map((_, cellIndex) => <td style={{ textAlign: block.alignments[cellIndex] }} key={cellIndex}>{renderInline(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </div>;
                if (block.type === "image") return <div {...selectProps(index, "image")} key={`${block.type}-${index}`}><figure className="article-figure"><img src={block.src} alt={block.alt}/>{block.caption && <figcaption><span>图</span>{block.caption}</figcaption>}</figure></div>;
                if (block.type === "code") return <div {...selectProps(index, "code")} key={`${block.type}-${index}`}><figure className="article-code"><figcaption><span>{block.language}</span><small>CODE NOTE</small></figcaption><pre><code>{block.code}</code></pre></figure></div>;
                if (block.type === "divider") return <div {...selectProps(index, "divider")} key={`divider-${index}`}><hr className="manuscript-divider" /></div>;
                const List = block.ordered ? "ol" : "ul";
                return <div {...selectProps(index, "list")} key={`list-${index}`}>
                  <List className="manuscript-list" data-list-style={currentMarkdownStyle.components.list} start={block.ordered ? block.start : undefined}>
                    {block.items.map((item, itemIndex) => <li key={itemIndex}>{item.checked !== undefined && <span className="manuscript-task">{item.checked ? "完成" : "待办"}</span>}{renderInline(item.text)}</li>)}
                  </List>
                </div>;

              })}
              {article.references.length > 0 && <section className="article-references" aria-label="参考资料"><header><span>参考资料</span><small>SOURCES</small></header><ol>{article.references.map((reference) => <li key={`${reference.id}-${reference.url}`}><span>{reference.id.padStart(2, "0")}</span><a href={reference.url}><b>{reference.title}</b><small>{reference.domain}</small></a></li>)}</ol></section>}
              {article.footnotes.length > 0 && <section className="article-footnotes" aria-label="文末注释"><header><span>文末注释</span><small>NOTES</small></header><ol>{article.footnotes.map((footnote) => <li key={footnote.id}><span>{footnote.id}</span><p>{renderInline(footnote.text)}</p></li>)}</ol></section>}
            </div>
            <footer className="article-footer" data-copy-footer>
              <div className="article-footer-brand">
                <span>钢铁私塾</span>
                <small>我们不贩卖焦虑，只研究变化。</small>
              </div>
              <p className="article-footer-note">笔者才疏学浅，有建议欢迎评论交流！</p>
            </footer>
            </article>
          </div>}
        </div>
        <div className="statusbar"><span><i className={diagnostics.length ? "status-warn" : "status-good"}/>{auditSummary.blockers ? `${auditSummary.blockers} 项阻断 · ${auditSummary.warnings} 项风险` : auditSummary.warnings ? `${auditSummary.warnings} 项风险待核对` : "本地预检无提醒"}</span><span>{wordCount.toLocaleString()} 字 · 预计阅读 {Math.max(1, Math.ceil(wordCount / 260))} 分钟</span><span>{focusMode ? "专注校订" : typewriterMode ? "居中阅读" : `${versions.length} 个恢复点`}</span></div>
      </section>

      <aside className="inspector-panel" ref={inspectorPanelRef}>
        <div className="inspector-tabs editorial-inspector-tabs" role="group" aria-label="工作台面板">
          {(["步骤", "规范", "品牌"] as InspectorTab[]).map((tab) => <button key={tab} type="button" aria-pressed={inspector === tab} className={inspector === tab ? "active" : ""} onClick={() => setInspector(tab)}><span>{tab === "步骤" ? stage : tab}</span><i aria-hidden="true"/></button>)}
        </div>
        {inspector === "步骤" && <header className="editorial-stage-brief" data-workflow-stage={stage}>
          <div className="editorial-stage-index"><Icon name={currentStage.icon} size={16}/><span>设计流程</span><b>{String(currentStageIndex + 1).padStart(2, "0")} / 05</b></div>
          <h2>{currentStage.heading}</h2>
          <p>{currentStage.goal}</p>
          {nextStage && <button type="button" className="workflow-next-action editorial-next" onClick={() => activateStage(nextStage.title)}><span>继续 · {nextStage.title}</span><Icon name="chevron" size={15}/></button>}
        </header>}

        {inspector === "步骤" && stage === "稿件" && <div className="inspector-content editorial-stage-content">
          <div className="editorial-source-actions">
            <button type="button" className="editorial-primary" onClick={() => setSourceOpen(true)}><Icon name="document" size={17}/>编辑原稿</button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={importingFile}><Icon name="plus" size={17}/>{importingFile ? importProgress || "正在导入" : "导入文件"}</button>
          </div>
          <p className="editorial-quiet-note">支持 Markdown、TXT、Word 和 PDF，本机解析。</p>
          <div className="draft-archive-summary"><span data-save-state={archive.status} role="status">{saveLabel}</span><button type="button" onClick={() => setHistoryOpen(true)}>恢复记录 · {versions.length}</button></div>
          {archive.error && <div className="draft-save-error" role="alert"><p>{archive.error}</p><div className="draft-error-actions"><button type="button" onClick={downloadMarkdown}>下载原稿备份</button><button type="button" onClick={archive.retry}>重试保存</button></div></div>}
          <section className="editorial-manuscript-card" aria-label="稿件识别结果">
            <span>{article.title === "未命名文章" ? "标题待确认" : "已识别标题"}</span>
            <strong>{article.title}</strong>
            <small>{article.author}</small>
            <dl className="editorial-metrics">
              <div><dt>字数</dt><dd>{wordCount.toLocaleString()}</dd></div>
              <div><dt>章节</dt><dd>{structure.chapter}</dd></div>
              <div><dt>段落</dt><dd>{structure.paragraph}</dd></div>
            </dl>
          </section>
          {[...encodingIssues, ...importWarnings].length > 0 && <ul className="editorial-warnings">{[...new Set([...encodingIssues, ...importWarnings])].map((item) => <li key={item}><Icon name="warning" size={15}/>{item}</li>)}</ul>}
          {outline.length > 0 && <details className="editorial-draft-outline"><summary>查看稿件提纲</summary>{renderOutline()}</details>}
        </div>}

        {inspector === "步骤" && stage === "编排" && <div className="inspector-content editorial-stage-content">
          <section className="inspector-section editorial-rhythm">
            <div className="section-heading"><div><span>阅读节奏</span><small>调整段落疏密，原稿与字号保持不动</small></div></div>
            <div className="editorial-rhythm-options">
              {([{ key: "calm", name: "舒展", hint: "长文慢读" }, { key: "balanced", name: "均衡", hint: "通用首选" }, { key: "editorial", name: "编辑部", hint: "观点密集" }] as const).map((mode) => <button key={mode.key} type="button" aria-pressed={layoutMode === mode.key} onClick={() => applyLayout(mode.key)}><b>{mode.name}</b><small>{mode.hint}</small></button>)}
            </div>
            <dl className="editorial-metrics">
              <div><dt>章节</dt><dd>{structure.chapter}</dd></div>
              <div><dt>引用／提示</dt><dd>{structure.quote}</dd></div>
              <div><dt>表格／列表</dt><dd>{structure.table + structure.list}</dd></div>
            </dl>
          </section>
          <section className="inspector-section editorial-components">
            <div className="section-heading"><div><span>结构组件</span><small>选用后追加到原稿末尾，可用恢复点撤回</small></div></div>
            <p className="editorial-quiet-note">推荐：{componentRecommendations.join(" · ")}</p>
            <label className="editorial-component-search"><Icon name="search" size={15}/><input aria-label="搜索结构组件" value={componentQuery} onChange={(event) => setComponentQuery(event.target.value)} placeholder="搜索导读、判断、证据、步骤"/></label>
            {filteredComponents.length ? <div className="editorial-component-list">{filteredComponents.map((item) => <button type="button" key={item.kind} onClick={() => insertComponent(item.snippet, item.kind)}><span aria-hidden="true">{item.mark}</span><span><b>{item.kind}</b><small>{item.detail}</small></span><Icon name="plus" size={16}/></button>)}</div> : <p className="editorial-quiet-note">未找到匹配的组件。</p>}
          </section>
        </div>}

        {inspector === "步骤" && stage === "交付" && <div className="inspector-content editorial-stage-content editorial-delivery">
          <section className="design-score"><div className="score-ring"><strong>{auditSummary.blockers ? auditSummary.blockers : auditSummary.warnings}</strong><small>{auditSummary.blockers ? "项阻断" : "项风险"}</small></div><div><span>微信交付预检</span><p>{auditSummary.blockers ? "阻断问题处理前不能复制正文。" : auditSummary.warnings ? "可交付，但需要核对风险项。" : "本地结构检查通过；真实微信粘贴仍须核验。"}</p></div></section>
          <div className="delivery-shortcuts" aria-label="微信标题与作者复制">
            <button type="button" className={copiedField === "标题" ? "copied" : ""} onClick={() => copyPlainField(article.title, "标题")}><Icon name={copiedField === "标题" ? "check" : "copy"} size={15}/><span><b>{copiedField === "标题" ? "标题已复制" : "01 复制标题"}</b><small>{article.title.length}/64 字</small></span></button>
            <button type="button" className={copiedField === "作者" ? "copied" : ""} onClick={() => copyPlainField(article.author, "作者")}><Icon name={copiedField === "作者" ? "check" : "copy"} size={15}/><span><b>{copiedField === "作者" ? "作者已复制" : "02 复制作者"}</b><small>{article.author.length}/8 字</small></span></button>
          </div>
          <button type="button" className="copy-delivery" onClick={copyArticle} disabled={!auditSummary.canDeliver} title={auditSummary.canDeliver ? "复制微信富文本正文" : "请先修正阻断问题"}><Icon name="copy"/>03 复制微信正文</button>
          <button type="button" className="wechat-html-launch" onClick={openWechatHtml} disabled={!auditSummary.canDeliver}><Icon name="document" size={17}/>微信 HTML 交付</button>
          <section className="draft-markdown-delivery" aria-label="Markdown 原稿交付"><strong>Markdown 原稿</strong><p>保留原文、强调和结构，便于继续修改与存档。</p><div><button type="button" disabled={!markdown.trim()} onClick={copyMarkdown}>复制 Markdown</button><button type="button" onClick={downloadMarkdown}>下载 .md</button></div></section>
          <section className="inspector-section compatibility-card" aria-label="微信交付检查结果">
              <div className="section-heading"><div><span>发布前复核</span><small>{auditSummary.blockers} 项阻断 · {auditSummary.warnings} 项风险 · {article.blocks.length} 个正文块</small></div></div>
              {auditIssues.length ? <ul className="wechat-audit-list">{auditIssues.map((issue) => <li key={issue.id} data-severity={issue.severity}>
                <span className="wechat-audit-severity">{issue.severity === "blocker" ? "阻断" : "风险"}</span>
                <div><strong>{issue.message}</strong><p>{issue.action}</p></div>
                <button type="button" onClick={() => locateDeliveryIssue(issue)} aria-label={`定位修正：${issue.message}`}>定位修正</button>
              </li>)}</ul> : <p className="editorial-quiet-note">本地语法与结构预检通过。无法替代微信后台粘贴及手机、朋友圈实测。</p>}
            </section>
        </div>}

        {inspector === "步骤" && stage === "版式" && <div className="inspector-content editorial-stage-content">
          <section className="style-craft-guide"><strong>{currentMarkdownStyle.name} · 用色与强调</strong><p>{styleEditorialGuides[markdownStyle]}</p><div className={`manuscript-page md-style-${markdownStyle}`}><p>{renderInline("**核心判断** · ==划重点== · <u>关键边界</u>")}</p></div><small>在原稿中选中文字，可添加高亮与下划线。字体按设备可用字库回退，发布前核对手机显示。</small></section>
          {hasArticleBody && <div className="editorial-style-advice"><span>版式建议</span><strong>{markdownStyles[suggestedStyle].name}</strong><small>{styleReason}</small></div>}
          <section className="inspector-section markdown-style-section"><div className="section-heading"><div><span>Markdown 版式</span><small>内容与皮肤分离，一次替换整套章法</small></div><span className="style-count">{String(markdownStyleOrder.length).padStart(2, "0")}</span></div><div className="markdown-style-gallery">{markdownStyleOrder.map((key, index) => { const item = markdownStyles[key]; const palette = themes[item.theme].palette; return <button key={key} className={markdownStyle === key ? "active" : ""} aria-pressed={markdownStyle === key} onClick={() => applyMarkdownStyle(key)}><span className={`md-style-preview preview-${key}`} style={{ "--preview-accent": palette.accent, "--preview-ink": palette.ink, "--preview-paper": palette.paper } as React.CSSProperties}><i/><b/><b/><small/><small/></span><span className="md-style-copy"><strong>{item.name}</strong><small>{item.description}</small><em>{item.fit}</em></span><span className="md-style-index">{markdownStyle === key ? "已应用" : `0${index + 1}`}</span></button>; })}</div></section><section className="inspector-section"><div className="section-heading"><div><span>纸墨配色</span><small>保留版式，只替换纸色与强调色</small></div></div><div className="theme-grid">{(Object.entries(themes) as [ThemeKey, typeof themes[ThemeKey]][]).map(([key, item]) => <button key={key} className={theme === key ? "active" : ""} aria-pressed={theme === key} onClick={() => setTheme(key)}><span className="theme-sample" style={{ background: item.palette.paper, color: item.palette.ink }}><i style={{ background: item.palette.accent }}/><b>Aa</b></span><small>{item.name}</small>{theme === key && <em>当前</em>}</button>)}</div></section><section className="inspector-section font-profile-section"><div className="section-heading"><div><span>字体气质</span><small>优先调用可用字库，缺字自动回退</small></div></div><div className="font-profile-grid">{fontProfiles.map((item) => <button key={item.key} className={fontProfile === item.key ? "active" : ""} aria-pressed={fontProfile === item.key} onClick={() => { setFontProfile(item.key); notify(`已切换为“${item.name}”字体气质`); }}><span>{item.sample}</span><div><b>{item.name}</b><small>{item.detail}</small></div><i>{fontProfile === item.key ? "正在使用" : "选择"}</i></button>)}</div></section><section className="inspector-section control-stack"><label><span><b>正文字号</b><small>建议 16—18px</small></span><output>{fontSize}px</output></label><input type="range" min="15" max="20" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))}/><label><span><b>正文行距</b><small>长文需要更多呼吸</small></span><output>{lineHeight.toFixed(2)}</output></label><input type="range" min="1.6" max="2.12" step="0.04" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))}/><label><span><b>标题尺度</b><small>避免标题压住正文</small></span><output>{Math.round(titleScale * 100)}%</output></label><input type="range" min="0.86" max="1.1" step="0.02" value={titleScale} onChange={(event) => setTitleScale(Number(event.target.value))}/><label><span><b>正文字距</b><small>密不逼仄，疏不散漫</small></span><output>{articleTracking.toFixed(3)}</output></label><input type="range" min="0" max="0.04" step="0.002" value={articleTracking} onChange={(event) => setArticleTracking(Number(event.target.value))}/></section><section className="inspector-section transfer-card"><div className="section-heading"><div><span>规则迁移</span><small>从一个内容块同步到所有同类</small></div><Icon name="brush" size={17}/></div><p>{capturedType ? `已采集：${blockLabel(capturedType)}` : "在画布中选择内容块，然后采集它的编排规则。"}</p><div><button onClick={captureStyle}>采集当前</button><button className="strong" onClick={applyCapturedStyle}>同步同类</button></div></section></div>}

        {inspector === "步骤" && stage === "封面" && <div className="inspector-content cover-inspector editorial-stage-content">
          <section className="editorial-cover-selection"><span>当前方向</span><strong>{selectedCoverLabel.name}</strong><small>{effectiveCoverCompany ? "企业稿 · 使用官方 Logo 原图" : "非企业稿 · 保留原题与署名"}</small></section>
          <section className="cover-reading-card"><header><span><Icon name="spark" size={15}/>文章画像</span><small>已分析标题与正文语义</small></header><div><b>{coverProfile.subject}</b><b>{coverProfile.tone}</b><b>{coverProfile.intent}</b></div><p>{coverProfile.signals.length ? `识别线索：${coverProfile.signals.join("、")}` : "当前稿件线索较少，先按深度观点类内容推荐。"}</p></section>
          <section className="inspector-section cover-recommend-section"><div className="section-heading"><div><span>首选方案</span><small>按题材、语气与传播目的推荐</small></div><span className="suggestion-count">03</span></div><div className="cover-recommend-list">{coverRecommendations.map((item, index) => { const styleIndex = coverStyles.findIndex((style) => style.id === item.style.id); const label = coverStyleLabel(item.style); return <button key={item.style.id} className={selectedCoverStyle.id === item.style.id ? "active" : ""} aria-pressed={selectedCoverStyle.id === item.style.id} onClick={() => setCoverStyleId(item.style.id)}><em>0{index + 1}</em><CoverStyleSpecimen style={item.style} index={styleIndex} compact/><span><strong>{label.name}</strong><small>{item.reason.replace(item.style.name, label.name)}</small></span><b>{item.score}</b></button>; })}</div></section>
          <section className="inspector-section cover-selected-card"><div className="section-heading"><div><span>当前设计建议</span><small>{selectedCoverLabel.short} · {selectedCoverStyle.fit}</small></div></div><dl><div><dt>标题</dt><dd>最终图片必须逐字出现“{article.title}”；缺标题即为失败。</dd></div><div><dt>构图</dt><dd>{selectedCoverStyle.composition}</dd></div><div><dt>材质</dt><dd>{selectedCoverStyle.texture}</dd></div><div><dt>避坑</dt><dd>{selectedCoverStyle.avoid}</dd></div></dl><button onClick={copyCoverPrompt}><Icon name="copy" size={15}/>复制成品封面指令 V8</button></section>
          <section className={`cover-brand-card ${effectiveCoverCompany ? "enterprise" : "generic"}`}>
            <div className="section-heading"><div><span>企业 Logo 素材</span><small>只有明确企业，才进入 Logo 流程</small></div><span className="cover-brand-state">{effectiveCoverCompany ? "企业已确认" : hasPendingCoverCompany ? "候选待确认" : "非企业文章"}</span></div>
            <label htmlFor="cover-company"><span>企业主体（高置信度自动识别）</span><small>行业词、月份、排产、价格不会被当成企业</small></label>
            <div className="cover-company-input"><input id="cover-company" value={effectiveCoverCompany} placeholder={hasPendingCoverCompany ? `候选：${suggestedCoverCompany}（确认后启用 Logo）` : "例如：中国天辰工程有限公司"} onChange={(event) => setCoverCompanyOverride({ source: coverCompanySource, value: event.target.value })}/>{hasPendingCoverCompany ? <button onClick={() => setCoverCompanyOverride({ source: coverCompanySource, value: suggestedCoverCompany })}>采用候选</button> : <button onClick={() => setCoverCompanyOverride(null)}>重置识别</button>}</div>
            <p><b>{effectiveCoverCompany ? `先去找：${effectiveCoverCompany}` : hasPendingCoverCompany ? `检测到候选：${suggestedCoverCompany}` : "当前按非企业文章处理"}</b><span>{effectiveCoverCompany ? `优先从官网${coverHarness.company.officialDomainHints.length ? `（${coverHarness.company.officialDomainHints.join(" / ")}）` : ""}复制 Logo 图片；官网没有可用原图，再去认证微信公众号。文件拿不到就停止，不让模型自己画。` : hasPendingCoverCompany ? "候选未经确认不会写入提示词，也不会触发 Logo 门禁；若它确实是企业，请点击“采用候选”。" : "不会擅自添加任何企业 Logo；若文章实际写某家企业，请手动填写正式名称。"}</span></p>
          </section>
          <section className="inspector-section cover-composer-card">
            <div className="section-heading"><div><span>成品封面指令</span><small>一次生成：构图、标题、署名、验收</small></div><span className="protocol-badge ready">V8 DIRECT</span></div>
            <button className="cover-asset-task" onClick={copyCoverPrompt}><Icon name="copy" size={15}/><span><b>复制成品封面指令 V8</b><small>短而明确，成品必须带标题</small></span></button>
            <div className="cover-fallback-heading"><b>文字保险</b><small>生图文字有误时，导入无字底图完成精确排印</small></div>
            <div className="cover-asset-inputs">
              <label className={coverBackgroundFile ? "ready" : ""} htmlFor="cover-background-file"><input id="cover-background-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; setCoverBackgroundAsset(file ? { identity: coverBackgroundIdentity, file } : null); }}/><Icon name="assets" size={16}/><span><b>导入无字底图</b><small>{coverBackgroundFile?.name ?? "PNG / JPG / WebP，必需"}</small></span><em>{coverBackgroundFile ? "已导入" : "必需"}</em></label>
              {effectiveCoverCompany && <label className={coverLogoFile ? "ready" : ""} htmlFor="cover-logo-file"><input id="cover-logo-file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; setCoverLogoAsset(file ? { company: effectiveCoverCompany.trim(), file } : null); }}/><Icon name="brand" size={16}/><span><b>导入官方 Logo 原图</b><small>{coverLogoFile?.name ?? "PNG / SVG / JPG / WebP，必需"}</small></span><em>{coverLogoFile ? "已导入" : "必需"}</em></label>}
            </div>
            {effectiveCoverCompany && <label className="cover-logo-source" htmlFor="cover-logo-source"><span>官方来源网址</span><input id="cover-logo-source" type="url" value={coverLogoSource} placeholder={coverHarness.company.officialDomainHints[0] ? `https://${coverHarness.company.officialDomainHints[0]}/…` : "https://企业官网/Logo来源页"} onChange={(event) => setCoverLogoSourceEntry({ company: effectiveCoverCompany.trim(), value: event.target.value })}/><small className={coverLogoSource && coverLogoSourceValid ? "valid" : ""}>{coverLogoSource ? (coverLogoSourceValid ? "来源格式已通过，仍请人工核对图形版本" : "网址无效，或与已知官网域名不一致") : "用于留存官方来源；搜索结果页与素材站不通过"}</small></label>}
            <button className="cover-compose-button" disabled={!canComposeCover} onClick={composeFinalCover}><Icon name="publish" size={16}/>生成最终封面 PNG</button>
            <p><Icon name="check" size={15}/><span>标题和“{coverSignature}”由本机 Canvas 逐字排印；Logo 直接读取上传原图，只做等比缩放，不经过生图模型。</span></p>
          </section>
          <section className="inspector-section cover-library"><div className="section-heading cover-library-heading"><div><span>视觉语言索引</span><small>24 种媒介气质，不是 24 张换色皮肤</small></div><span className="style-count">24</span></div><div className="cover-category-filter" aria-label="筛选封面视觉语言">{coverStyleCategories.map((category) => { const count = category === "全部" ? coverStyles.length : coverStyles.filter((item) => item.category === category).length; return <button key={category} className={coverCategory === category ? "active" : ""} aria-pressed={coverCategory === category} onClick={() => setCoverCategory(category)}><span>{category}</span><em>{String(count).padStart(2, "0")}</em></button>; })}</div><div className="cover-style-library">{filteredCoverStyles.map((item) => { const styleIndex = coverStyles.findIndex((style) => style.id === item.id); const label = coverStyleLabel(item); return <button key={item.id} className={selectedCoverStyle.id === item.id ? "active" : ""} aria-pressed={selectedCoverStyle.id === item.id} onClick={() => setCoverStyleId(item.id)}><CoverStyleSpecimen style={item} index={styleIndex}/><span className="cover-style-library-copy"><span><em>{item.category}</em><small>{String(styleIndex + 1).padStart(2, "0")}</small></span><b>{label.name}</b><p>{label.short}</p></span></button>; })}</div></section>
        </div>}

        {inspector === "规范" && <div className="inspector-content standards-panel">
          <section className="inspector-section"><div className="section-heading"><div><span>微信公众号排版规范</span><small>兼容策略与编辑部建议</small></div></div><ul className="rule-ledger">
            <li><i>01</i><p><b>正文基线</b><small>16—18px，行距 1.75—1.9；避免依赖外部 CSS。</small></p></li>
            <li><i>02</i><p><b>层级克制</b><small>每屏一个视觉重点，颜色不超过三种，列表不超过七项。</small></p></li>
            <li><i>03</i><p><b>图片与链接</b><small>图片进入微信素材体系；外链、热链与跳转发布前复核。</small></p></li>
            <li><i>04</i><p><b>标题与摘要</b><small>准确对应正文，不堆符号，不用无法兑现的悬念。</small></p></li>
            <li><i>05</i><p><b>编码与字符</b><small>识别 UTF-8、GB18030 与 UTF-16；交付前拦截替换字符、控制符及异常转义。</small></p></li>
          </ul></section>
          <section className="inspector-section"><div className="section-heading"><div><span>钢铁私塾内容要求</span><small>平台红线之上，再加编辑部标准</small></div></div><ul className="content-guardrails">
            <li><Icon name="check" size={14}/><span><b>作者置前</b><small>主编署名位于正文开头。</small></span></li>
            <li><Icon name="check" size={14}/><span><b>单篇建议不超过 2000 字</b><small>当前 {wordCount} 字。</small></span></li>
            <li><Icon name="check" size={14}/><span><b>事实可追溯</b><small>数据、标准、引语与图片来源可以复核。</small></span></li>
            <li><Icon name="warning" size={14}/><span><b>内容合规</b><small>杜绝虚假、侵权、低俗、诱导分享及夸大宣传；时政新闻注意资质边界。</small></span></li>
          </ul></section>
          <section className="inspector-section wechat-connection"><div className="section-heading"><div><span>公众号后端连接</span><small>AppSecret 永不进入浏览器</small></div><span className={wechatStatus.connected ? "pass-tag" : "warning-tag"}>{wechatStatus.connected ? "已连接" : "待配置"}</span></div>
            <div className="connection-state"><span className={wechatStatus.connected ? "online" : ""}/><div><b>{wechatStatus.mode}</b><small>{wechatStatus.message}</small></div></div>
            <dl><div><dt>AppID</dt><dd>{wechatStatus.appId ?? "未配置"}</dd></div><div><dt>AppSecret</dt><dd>{wechatStatus.configured ? "•••••••••••• · 服务端" : "未配置"}</dd></div></dl>
            <button className="connection-test" onClick={checkWechatConnection} disabled={checkingWechat}>{checkingWechat ? "正在检测…" : "检测公众号连接"}</button>
            <p className="security-note">生产环境优先使用固定出口 IP 的安全桥接服务；当前站点也支持直连模式，但仍须满足微信公众平台的接口权限与 IP 白名单要求。</p>
          </section>
        </div>}

        {inspector === "品牌" && <div className="inspector-content"><section className="brand-preview-card"><span className="brand-big-avatar">钢</span><div><small>当前品牌套件</small><strong>钢铁私塾</strong><p>工业理性 · 专业克制 · 有判断</p></div></section><section className="inspector-section brand-settings"><div className="section-heading"><div><span>品牌基因</span><small>每一篇内容自动继承</small></div></div><label><span>主色</span><i style={{ background: currentTheme.palette.accent }}/>当前主题<button onClick={() => activateStage("版式")}>修改</button></label><label><span>正文</span><i style={{ background: currentTheme.palette.ink }}/>墨黑<button onClick={() => activateStage("版式")}>修改</button></label><label><span>署名</span><b>主编：钢铁私塾 唐淼</b><button onClick={() => setSourceOpen(true)}>编辑</button></label><label><span>结尾</span><b>品牌宣言 + 交流声明</b></label></section><section className="inspector-section"><div className="section-heading"><div><span>品牌一致性</span><small>本稿与品牌套件对照</small></div></div><p className="editorial-quiet-note">当前用色：{currentTheme.name}；稿件署名：{article.author}。</p></section></div>}
      </aside>

      <nav className="mobile-dock" aria-label="手机设计流程">
        {stageItems.map((item) => <button key={item.title} type="button" className={stage === item.title ? "active" : ""} aria-current={stage === item.title ? "step" : undefined} onClick={() => activateStage(item.title)}><Icon name={item.icon} size={18}/><span>{item.title}</span></button>)}
      </nav>

      {historyOpen && <DraftHistoryDialog versions={versions} saveStatus={archive.error || saveLabel} onSave={saveVersion} onRestore={(id) => { archive.restoreCheckpoint(id); notify("已恢复原稿与版式，恢复前的稿件已保留"); }} onClose={() => setHistoryOpen(false)} />}
      {htmlDelivery && <WechatHtmlDialog delivery={htmlDelivery} filename={`${safeDownloadName(htmlDelivery.title)}-微信正文.html`} onClose={() => setHtmlDelivery(null)} />}
      <div hidden={!sourceOpen} className="source-overlay" role="dialog" aria-modal="true" aria-label="原稿编辑器"><div className="source-drawer"><header><div><span>内容源</span><strong>Markdown 原稿</strong></div><div className="source-actions"><button className="source-action clear-action" onClick={clearMarkdown} disabled={!markdown.trim()}><Icon name="close" size={14}/>清空</button><button className="source-action paste-action" onClick={pasteMarkdown}><Icon name="copy" size={14}/>一键粘贴并编排</button><button className="source-action analyze-action" onClick={analyzeAndArrange} disabled={!markdown.trim()}><Icon name="spark" size={14}/>重新分析</button><button className="source-action import-file" onClick={() => fileRef.current?.click()} disabled={importingFile} title="支持 Markdown、TXT、Word（.docx）和 PDF；PDF 最大 50MB、500页"><Icon name={importingFile ? "history" : "document"} size={14}/>{importingFile ? importProgress : "导入文件"}</button><button className="source-close" onClick={() => { setSourceOpen(false); setSourceFocusRange(null); }} aria-label="关闭原稿"><Icon name="close"/></button></div></header><SourceWorkspace value={markdown} active={sourceOpen} focusRange={sourceFocusRange} onCheckpoint={() => archive.checkpoint("替换或表格粘贴前的稿件")} onChange={(value) => { archive.beforeEdit(); setMarkdown(value); setSourceEncoding("UTF-8 · 手动编辑"); setImportWarnings([]); }}/><footer><span className="source-health"><small data-save-state={archive.status} role="status">{saveLabel}{archive.error ? ` · ${archive.error}` : ""}</small><b>{wordCount.toLocaleString()} 字</b><i className={encodingIssues.length ? "encoding-risk" : "encoding-safe"}>{sourceEncoding} · {encodingIssues.length ? `${encodingIssues.length} 项编码风险` : "编码正常"}</i><small className={article.title === "未命名文章" ? "title-missing" : "title-detected"}>{article.title === "未命名文章" ? "尚未识别标题" : `已识别：${article.title.length > 22 ? `${article.title.slice(0, 22)}…` : article.title}`} · 文件仅在本机解析</small>{importWarnings.length ? <small className="import-warning"><Icon name="warning" size={12}/>{importWarnings.join("；")}</small> : null}</span></footer></div></div>
      {toast && <div className="toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
    </main>
  );
}
