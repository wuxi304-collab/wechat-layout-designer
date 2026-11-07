"use client";

import { useEffect, useRef, useState } from "react";
import { markdownStyles } from "@/lib/editor/design-system";
import type { DraftCheckpoint } from "@/lib/editor/draft-storage";

export function DraftHistoryDialog({ versions, saveStatus, onSave, onRestore, onClose }: {
  versions: DraftCheckpoint[]; saveStatus: string; onSave: () => string | undefined; onRestore: (id: string) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(versions.at(-1)?.id ?? "");
  const [message, setMessage] = useState("");
  const current = versions.find((item) => item.id === selected);
  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className="draft-history-dialog" aria-labelledby="draft-history-title" onClose={onClose}>
    <header><div><span>稿件 · 恢复</span><h2 id="draft-history-title">把改动留得住</h2></div><button type="button" onClick={() => dialog.current?.close()}>关闭</button></header>
    <p className="draft-history-intro">最近 12 个恢复点保存在当前浏览器。恢复原稿时一并恢复版式，并保留恢复前的稿件。</p>
    <button type="button" className="draft-history-save" onClick={() => { const id = onSave(); if (id) setSelected(id); setMessage("当前原稿与版式已加入恢复记录。"); }}>保留当前稿件与版式</button>
    <p className="draft-history-intro" role="status">{message ? `${message} ` : ""}{saveStatus}</p>
    {versions.length ? <div className="draft-history-body">
      <nav aria-label="稿件恢复点">{[...versions].reverse().map((item) => <button type="button" key={item.id} aria-pressed={item.id === selected} onClick={() => setSelected(item.id)}>
        <b>{item.label}</b><time dateTime={new Date(item.createdAt).toISOString()}>{new Date(item.createdAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
        <small>{item.snapshot.markdown.length.toLocaleString()} 字符 · {markdownStyles[item.snapshot.markdownStyle].name}</small>
      </button>)}</nav>
      <section className="draft-history-preview" aria-label="恢复点预览">{current ? <>
        <strong>{current.label}</strong><p>原稿预览</p><pre>{current.snapshot.markdown || "（空白稿）"}</pre>
        <button type="button" onClick={() => { onRestore(current.id); dialog.current?.close(); }}>恢复这个版本</button>
      </> : <p>选择一个恢复点，先核对原稿再恢复。</p>}</section>
    </div> : <p className="draft-history-empty">尚无恢复点。清空、粘贴、导入和批量替换前会自动保留；也可以手动保留当前稿件。</p>}
  </dialog>;
}
