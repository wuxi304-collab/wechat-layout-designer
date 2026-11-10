"use client";

import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { findSourceMatches, isCompositionKey, toggleSourceAnnotation, readSourceHeadings, replaceSourceMatches, toggleSourceEmphasis, type SourceRange } from "@/lib/editor/source-navigation";
import { sourceIsLiteral, spreadsheetFromClipboard, tableInsertion } from "@/lib/editor/spreadsheet-paste";

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

export function SourceWorkspace({ value, active = true, focusRange = null, onChange, onCheckpoint }: { value: string; active?: boolean; focusRange?: SourceRange | null; onChange: (next: string) => void; onCheckpoint?: () => void }) {
  const [panel, setPanel] = useState<"search" | "outline" | null>(null);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(true);
  const [current, setCurrent] = useState(-1);
  const [hint, setHint] = useState("");
  const [plan, setPlan] = useState<{ source: string; replacement: string; matches: SourceRange[]; accepted: boolean[] } | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<SourceRange | null>(null);
  const previous = useRef(value);
  const visited = useRef(false);
  const history = useRef<{ past: { text: string; range: SourceRange }[]; future: { text: string; range: SourceRange }[] }>({ past: [], future: [] });
  const lastTyping = useRef(0);
  const composing = useRef(false);
  const rangeBeforeInput = useRef<SourceRange>({ start: 0, end: 0 });
  const [, redraw] = useState(0);
  const matches = useMemo(() => findSourceMatches(value, query, caseSensitive, wholeWord), [value, query, caseSensitive, wholeWord]);
  const headings = useMemo(() => panel === "outline" ? readSourceHeadings(value) : [], [panel, value]);

  useLayoutEffect(() => {
    if (!visited.current && !active) { previous.current = value; return; }
    visited.current = true;
    if (active && panel === "search") search.current?.focus();
    else if (active) editor.current?.focus({ preventScroll: true });
  }, [panel, active]);

  // Preview-to-source navigation runs after the drawer becomes visible.
  // Do not reset editor history or write into the article when focusing a block.
  useLayoutEffect(() => {
    if (!active || !focusRange || !editor.current) return;
    revealRange(editor.current, {
      start: Math.min(value.length, Math.max(0, focusRange.start)),
      end: Math.min(value.length, Math.max(0, focusRange.end)),
    });
  }, [active, focusRange, value]);

  useLayoutEffect(() => {
    if (previous.current !== value) {
      history.current.past.push({ text: previous.current, range: rangeBeforeInput.current });
      history.current.past = history.current.past.slice(-60);
      history.current.future = [];
      previous.current = value; lastTyping.current = 0;
      redraw((version) => version + 1);
    }
    if (!active || !pendingSelection.current || !editor.current) return;
    revealRange(editor.current, pendingSelection.current);
    pendingSelection.current = null;
  }, [value, active]);

  function commit(text: string, range?: SourceRange, typing = false) {
    if (text === value) return;
    const now = Date.now();
    if (!typing || !lastTyping.current || !composing.current && now - lastTyping.current > 750) {
      history.current.past.push({ text: value, range: { ...rangeBeforeInput.current } });
      history.current.past = history.current.past.slice(-60);
    }
    history.current.future = [];
    lastTyping.current = typing ? now : 0;
    previous.current = text;
    if (range) pendingSelection.current = range;
    onChange(text); redraw((version) => version + 1);
  }

  function travel(direction: "past" | "future") {
    if (composing.current) return;
    const target = history.current[direction].pop();
    if (!target) return;
    const opposite = direction === "past" ? "future" : "past";
    history.current[opposite].push({ text: value, range: { start: editor.current?.selectionStart ?? 0, end: editor.current?.selectionEnd ?? 0 } });
    previous.current = target.text; lastTyping.current = 0;
    pendingSelection.current = target.range;
    setCurrent(-1); setHint(direction === "past" ? "已撤销，可重做。" : "已重做。");
    onChange(target.text); redraw((version) => version + 1);
  }

  function replace(all = false) {
    if (composing.current) return;
    if (all) {
      if (matches.length > 500) return setHint("匹配超过 500 处，请缩小查找范围后审阅。");
      setPlan({ source: value, replacement, matches, accepted: matches.map(() => true) });
      return;
    }
    const index = current >= 0 && current < matches.length ? current : 0;
    const result = replaceSourceMatches(value, matches, replacement, index);
    if (!result || result.text === value) return setHint("替换后原稿没有变化。");
    commit(result.text, result);
    setCurrent(-1); setHint(`已替换 ${result.count} 处，可撤销。`);
  }

  function visit(direction: 1 | -1) {
    if (!editor.current || !matches.length) return;
    const index = current < 0 || current >= matches.length
      ? (direction === 1 ? 0 : matches.length - 1)
      : (current + direction + matches.length) % matches.length;
    setCurrent(index);
    revealRange(editor.current, matches[index]);
  }

  function format(marker: "*" | "**") {
    if (!editor.current || composing.current) return;
    rangeBeforeInput.current = { start: editor.current.selectionStart, end: editor.current.selectionEnd };
    const next = toggleSourceEmphasis(value, { start: editor.current.selectionStart, end: editor.current.selectionEnd }, marker);
    if (!next) {
      setHint("请先选中一段不跨行的文字。");
      editor.current.focus({ preventScroll: true });
      return;
    }
    pendingSelection.current = next;
    setCurrent(-1);
    setHint("");
    commit(next.text, next);
  }

  function annotate(kind: "underline" | "highlight") {
    if (!editor.current || composing.current) return;
    rangeBeforeInput.current = { start: editor.current.selectionStart, end: editor.current.selectionEnd };
    const next = toggleSourceAnnotation(value, rangeBeforeInput.current, kind);
    if (!next) return setHint("请先选中一段不跨行的文字。");
    commit(next.text, next); setHint("已更新强调样式，可再次点击取消或撤销。");
  }

  function shortcuts(event: KeyboardEvent<HTMLDivElement>) {
    if (composing.current || isCompositionKey(event.nativeEvent)) return;
    const key = event.key.toLowerCase();
    if (event.target === editor.current && (event.metaKey || event.ctrlKey) && !event.altKey && (key === "z" || key === "y")) {
      event.preventDefault(); travel(key === "y" || event.shiftKey ? "future" : "past");
    } else if (key === "escape" && panel) {
      event.preventDefault(); event.stopPropagation(); setPanel(null); editor.current?.focus();
    } else if ((event.metaKey || event.ctrlKey) && !event.altKey && (key === "f" || key === "h")) {
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
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => annotate("underline")}>下划线</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => annotate("highlight")}>高亮</button>
      <span className="source-proof-divider" aria-hidden="true" />
      <button type="button" disabled={!history.current.past.length} onMouseDown={(event) => event.preventDefault()} onClick={() => travel("past")}>撤销</button>
      <button type="button" disabled={!history.current.future.length} onMouseDown={(event) => event.preventDefault()} onClick={() => travel("future")}>重做</button>
      {hint && <span className="source-proof-hint" role="status">{hint}</span>}
    </div>
    {panel === "search" && <div className="source-find-panel"><div className="source-find">
      <input ref={search} type="search" aria-label="查找原稿文字" placeholder="查找牌号、标准号或文字" value={query} onChange={(event) => { setQuery(event.target.value); setCurrent(-1); setPlan(null); }} onKeyDown={(event) => {
        if (event.key !== "Enter" || isCompositionKey(event.nativeEvent)) return;
        event.preventDefault();
        visit(event.shiftKey ? -1 : 1);
      }} />
      <span role="status">{query.trim() ? matches.length ? current < 0 ? `${matches.length} 处` : `${current + 1} / ${matches.length}` : "无匹配" : "输入关键词"}</span>
      <div className="source-find-nav">
        <button type="button" disabled={!matches.length} onClick={() => visit(-1)}>上一处</button>
        <button type="button" disabled={!matches.length} onClick={() => visit(1)}>下一处</button>
      </div>
      <button type="button" aria-pressed={caseSensitive} onClick={() => { setCaseSensitive(!caseSensitive); setCurrent(-1); setPlan(null); }}>区分大小写</button>
      <button type="button" aria-pressed={wholeWord} onClick={() => { setWholeWord(!wholeWord); setCurrent(-1); setPlan(null); }}>完整词</button>
    </div><div className="source-find source-replace">
      <input aria-label="替换为" placeholder="替换为（留空可删除）" value={replacement} onChange={(event) => { setReplacement(event.target.value); setPlan(null); }} onKeyDown={(event) => { if (event.key === "Enter" && !isCompositionKey(event.nativeEvent)) { event.preventDefault(); replace(); } }} />
      <div className="source-find-nav"><button type="button" disabled={!matches.length} onClick={() => replace()}>替换当前</button><button type="button" disabled={!matches.length} onClick={() => replace(true)}>全部替换{matches.length ? `（${matches.length}）` : ""}</button></div>
    </div><p className="source-find-note">检索含标题与代码。完整词可区分 304 和 304L。</p>
    {plan && <section className="source-replace-review" aria-label="批量替换审阅">
      <div className="source-review-heading"><strong>替换前核对 · {plan.matches.length} 处</strong><button type="button" onClick={() => setPlan(null)}>取消审阅</button></div>
      <p>勾选需要替换的位置，核对牌号、数字与代码。原稿尚未改动。</p>
      {plan.source !== value && <p role="alert">原稿已变化，请取消审阅后重新查找。</p>}
      <div className="source-replace-items">{plan.matches.map((range, index) => <label key={range.start}><input type="checkbox" checked={plan.accepted[index]} aria-label={`替换第 ${index + 1} 处`} onChange={(event) => setPlan({ ...plan, accepted: plan.accepted.map((accepted, at) => at === index ? event.target.checked : accepted) })} /><span><small>第 {plan.source.slice(0, range.start).split("\n").length} 行</small>{plan.source.slice(Math.max(0, range.start - 20), range.start)}<del>{plan.source.slice(range.start, range.end)}</del><ins>{plan.replacement || "（删除）"}</ins>{plan.source.slice(range.end, range.end + 20)}</span></label>)}</div>
      <button type="button" className="source-replace-apply" disabled={plan.source !== value || !plan.accepted.some(Boolean)} onClick={() => {
        if (composing.current || plan.source !== value) return;
        const result = replaceSourceMatches(value, plan.matches.filter((_, index) => plan.accepted[index]), plan.replacement);
        if (!result) return;
        if (result.text !== value) { onCheckpoint?.(); commit(result.text, result); }
        setPlan(null); setCurrent(-1); setHint(`已应用 ${result.count} 处替换，可一次撤销。`);
      }}>应用 {plan.accepted.filter(Boolean).length} 处替换</button>
    </section>}</div>}
    {panel === "outline" && <nav className="source-heading-index" aria-label="原稿章节">
      {headings.length ? headings.map((heading) => <button type="button" key={heading.start} onClick={() => {
        if (editor.current) revealRange(editor.current, heading);
      }}>
        <span className="source-heading-line">第 {heading.line} 行</span><span data-level={heading.level}>{heading.text}</span>
      </button>) : <p>还没有 Markdown 标题。可以用 # 或 ## 标记标题与章节。</p>}
    </nav>}
    <textarea ref={editor} value={value} onBeforeInput={() => { if (editor.current) rangeBeforeInput.current = { start: editor.current.selectionStart, end: editor.current.selectionEnd }; }} onCompositionStart={() => { composing.current = true; lastTyping.current = 0; }} onCompositionEnd={() => { window.setTimeout(() => { composing.current = false; lastTyping.current = 0; }, 0); }} onPaste={(event) => {
      if (composing.current || sourceIsLiteral(value, event.currentTarget.selectionStart)) return;
      try {
        const table = spreadsheetFromClipboard(event.clipboardData.getData("text/plain"), event.clipboardData.getData("text/html"));
        if (!table) return;
        event.preventDefault();
        rangeBeforeInput.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd };
        const next = tableInsertion(value, rangeBeforeInput.current.start, rangeBeforeInput.current.end, table.markdown);
        onCheckpoint?.(); commit(next.text, next);
        setHint(`已转为 ${table.rows} 行 × ${table.columns} 列 Markdown 表格，首行为表头${table.merged ? "；合并格已展开，空位保留" : ""}。可一次撤销。`);
      } catch (reason) { event.preventDefault(); setHint(reason instanceof Error ? reason.message : "表格转换失败，原稿未改动。"); }
    }} onChange={(event) => { setCurrent(-1); setHint(""); const input = event.nativeEvent as InputEvent; commit(event.target.value, undefined, composing.current || input.inputType === "insertText" || input.inputType === "deleteContentBackward"); }} aria-label="Markdown 原稿" lang="zh-CN" autoCapitalize="off" autoCorrect="off" spellCheck={false}/>
  </div>;
}
