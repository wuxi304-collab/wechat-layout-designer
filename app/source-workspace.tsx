"use client";

import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { findSourceMatches, readSourceHeadings, toggleSourceEmphasis, type SourceRange } from "@/lib/editor/source-navigation";

function revealRange(editor: HTMLTextAreaElement, range: SourceRange) {
  editor.focus({ preventScroll: true });
  editor.setSelectionRange(range.start, range.end);

  // Measure the wrapped source line using the textarea's own width and font.
  const computed = window.getComputedStyle(editor);
  const mirror = document.createElement("div");
  Object.assign(mirror.style, {
    position: "fixed", visibility: "hidden", pointerEvents: "none", top: "0", left: "0",
    boxSizing: "border-box", width: `${editor.clientWidth}px`, padding: computed.padding,
    font: computed.font, letterSpacing: computed.letterSpacing, tabSize: computed.tabSize,
    lineHeight: computed.lineHeight, whiteSpace: "pre-wrap", overflowWrap: "break-word",
  });
  const marker = document.createElement("span");
  marker.textContent = editor.value.slice(range.start, range.end) || "\u200b";
  mirror.append(document.createTextNode(editor.value.slice(0, range.start)), marker, document.createTextNode(editor.value.slice(range.end)));
  document.body.append(mirror);
  const top = marker.getBoundingClientRect().top - mirror.getBoundingClientRect().top;
  mirror.remove();
  if (top < editor.scrollTop || top + parseFloat(computed.lineHeight) > editor.scrollTop + editor.clientHeight) {
    editor.scrollTop = Math.max(0, top - editor.clientHeight * 0.32);
  }
}

export function SourceWorkspace({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [panel, setPanel] = useState<"search" | "outline" | null>(null);
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(-1);
  const [hint, setHint] = useState("");
  const editor = useRef<HTMLTextAreaElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<SourceRange | null>(null);
  const matches = useMemo(() => findSourceMatches(value, query), [value, query]);
  const headings = useMemo(() => panel === "outline" ? readSourceHeadings(value) : [], [panel, value]);

  useLayoutEffect(() => {
    if (panel === "search") search.current?.focus();
  }, [panel]);

  useLayoutEffect(() => {
    if (!pendingSelection.current || !editor.current) return;
    revealRange(editor.current, pendingSelection.current);
    pendingSelection.current = null;
  }, [value]);

  function visit(direction: 1 | -1) {
    if (!editor.current || !matches.length) return;
    const index = current < 0 || current >= matches.length
      ? (direction === 1 ? 0 : matches.length - 1)
      : (current + direction + matches.length) % matches.length;
    setCurrent(index);
    revealRange(editor.current, matches[index]);
  }

  function format(marker: "*" | "**") {
    if (!editor.current) return;
    const next = toggleSourceEmphasis(value, { start: editor.current.selectionStart, end: editor.current.selectionEnd }, marker);
    if (!next) {
      setHint("请先选中一段不跨行的文字。");
      editor.current.focus({ preventScroll: true });
      return;
    }
    pendingSelection.current = next;
    setCurrent(-1);
    setHint("");
    onChange(next.text);
  }

  function shortcuts(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing) return;
    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && !event.altKey && key === "f") {
      event.preventDefault();
      setPanel("search");
      search.current?.focus();
      search.current?.select();
    } else if ((event.metaKey || event.ctrlKey) && !event.altKey && (key === "b" || key === "i") && event.target === editor.current) {
      event.preventDefault();
      format(key === "b" ? "**" : "*");
    } else if (panel === "search" && key === "f3") {
      event.preventDefault();
      visit(event.shiftKey ? -1 : 1);
    }
  }

  return <div className="source-workspace" onKeyDown={shortcuts}>
    <div className="source-proof-tools" role="group" aria-label="原稿校订">
      <button type="button" aria-expanded={panel === "search"} onClick={() => setPanel(panel === "search" ? null : "search")}>查找</button>
      <button type="button" aria-expanded={panel === "outline"} onClick={() => setPanel(panel === "outline" ? null : "outline")}>章节定位</button>
      <span className="source-proof-divider" aria-hidden="true" />
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("**")}><b>加粗</b></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("*")}><i>斜体</i></button>
      {hint && <span className="source-proof-hint" role="status">{hint}</span>}
    </div>
    {panel === "search" && <div className="source-find">
      <input ref={search} type="search" aria-label="查找原稿文字" placeholder="查找牌号、标准号或文字" value={query} onChange={(event) => { setQuery(event.target.value); setCurrent(-1); }} onKeyDown={(event) => {
        if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
        event.preventDefault();
        visit(event.shiftKey ? -1 : 1);
      }} />
      <span role="status">{query.trim() ? matches.length ? current < 0 ? `${matches.length} 处` : `${current + 1} / ${matches.length}` : "无匹配" : "输入关键词"}</span>
      <div className="source-find-nav">
        <button type="button" disabled={!matches.length} onClick={() => visit(-1)}>上一处</button>
        <button type="button" disabled={!matches.length} onClick={() => visit(1)}>下一处</button>
      </div>
    </div>}
    {panel === "outline" && <nav className="source-heading-index" aria-label="原稿章节">
      {headings.length ? headings.map((heading) => <button type="button" key={heading.start} onClick={() => {
        if (editor.current) revealRange(editor.current, heading);
      }}>
        <span className="source-heading-line">第 {heading.line} 行</span><span data-level={heading.level}>{heading.text}</span>
      </button>) : <p>还没有 Markdown 标题。可以用 # 或 ## 标记标题与章节。</p>}
    </nav>}
    <textarea ref={editor} value={value} onChange={(event) => { setCurrent(-1); setHint(""); onChange(event.target.value); }} aria-label="Markdown 原稿" lang="zh-CN" autoCapitalize="off" autoCorrect="off" spellCheck={false}/>
  </div>;
}
