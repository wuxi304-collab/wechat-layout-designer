"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { appendCheckpoint, DRAFT_KEY, readDraftArchive, type DraftCheckpoint, type DraftSnapshot } from "@/lib/editor/draft-storage";

export function useDraftArchive(snapshot: DraftSnapshot, onRestore: (value: DraftSnapshot) => void) {
  const [versions, setVersions] = useState<DraftCheckpoint[]>([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState("");
  const latest = useRef(snapshot);
  const entries = useRef(versions);
  const restore = useRef(onRestore);
  const blocked = useRef(false);
  const lastSaved = useRef("");
  const lastAutomatic = useRef(0);

  useLayoutEffect(() => { latest.current = snapshot; restore.current = onRestore; });

  function persist() {
    if (blocked.current) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...latest.current, schemaVersion: 8, updatedAt: Date.now(), versions: entries.current }));
      lastSaved.current = JSON.stringify(latest.current);
      setStatus("saved"); setError("");
    } catch {
      setStatus("error"); setError("本机保存失败，可能是空间不足或浏览器限制。请下载 Markdown 备份。");
    }
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const archive = readDraftArchive(raw, latest.current);
        entries.current = archive.versions; setVersions(archive.versions);
        restore.current(archive);
      }
    } catch (reason) {
      blocked.current = true; setStatus("error");
      setError(reason instanceof Error ? reason.message : "本机草稿读取失败，请下载原稿备份。");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || blocked.current) return;
    setStatus("saving");
    const timer = window.setTimeout(persist, 450);
    return () => window.clearTimeout(timer);
    // Snapshot and checkpoint changes are the complete persistence inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, versions, ready]);

  useEffect(() => {
    if (!ready) return;
    const flush = () => { if (document.visibilityState === "hidden") persist(); };
    const onPageHide = () => persist();
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", onPageHide);
    return () => { document.removeEventListener("visibilitychange", flush); window.removeEventListener("pagehide", onPageHide); };
    // persist reads current refs, including the most recent edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function checkpoint(label: string) {
    entries.current = appendCheckpoint(entries.current, latest.current, label);
    setVersions(entries.current);
    return entries.current.at(-1)?.id;
  }

  function beforeEdit() {
    if (Date.now() - lastAutomatic.current < 60_000) return;
    checkpoint("编辑前自动恢复点"); lastAutomatic.current = Date.now();
  }

  function restoreCheckpoint(id: string) {
    const target = entries.current.find((item) => item.id === id);
    if (!target) return;
    checkpoint("恢复前的稿件");
    restore.current(target.snapshot);
  }

  function retry() {
    try {
      if (blocked.current) {
        const raw = window.localStorage.getItem(DRAFT_KEY);
        if (raw) readDraftArchive(raw, latest.current);
        blocked.current = false;
      }
      persist();
    } catch (reason) {
      setStatus("error"); setError(reason instanceof Error ? reason.message : "本机保存仍不可用，请先下载原稿。");
    }
  }

  const pending = ready && !blocked.current && JSON.stringify(snapshot) !== lastSaved.current;
  return { versions, checkpoint, beforeEdit, restoreCheckpoint, status: status === "saved" && pending ? "saving" : status, error, retry };
}
