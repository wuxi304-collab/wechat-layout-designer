"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

type IconName =
  | "brand" | "document" | "structure" | "style" | "assets" | "check"
  | "spark" | "phone" | "desktop" | "undo" | "redo" | "copy" | "publish"
  | "chevron" | "close" | "brush" | "history" | "warning" | "search" | "plus";

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
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
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

const themes = {
  editorial: { name: "编辑部", accent: "#9f3d2f", ink: "#1f241f", paper: "#fffdf7" },
  industrial: { name: "工业纪要", accent: "#35655e", ink: "#1b2926", paper: "#f7f8f2" },
  eastern: { name: "东方章法", accent: "#866137", ink: "#2a251e", paper: "#fff9eb" },
  minimal: { name: "克制蓝", accent: "#3c647c", ink: "#202a30", paper: "#fffefa" },
};

type ThemeKey = keyof typeof themes;
type InspectorTab = "智能" | "样式" | "品牌";
type StageKey = "内容" | "编排" | "视觉" | "组件" | "交付";
type LayoutMode = "calm" | "balanced" | "editorial";
type BlockType = "title" | "paragraph" | "heading" | "quote" | "list";
type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] };

const stageItems: { icon: IconName; title: StageKey; meta: string }[] = [
  { icon: "document", title: "内容", meta: "结构已识别" },
  { icon: "structure", title: "编排", meta: "3 项可执行" },
  { icon: "style", title: "视觉", meta: "品牌气质" },
  { icon: "assets", title: "组件", meta: "语义模块" },
  { icon: "check", title: "交付", meta: "兼容检查" },
];

const components = [
  { kind: "观点", mark: "引", detail: "制造一次阅读停顿", snippet: "\n\n> 在这里写下需要被记住的核心判断。" },
  { kind: "章节", mark: "章", detail: "建立清晰的内容层级", snippet: "\n\n## 三、新的章节标题\n\n在这里继续正文。" },
  { kind: "行动", mark: "列", detail: "把并列信息变成动作", snippet: "\n\n- 第一个关键动作\n- 第二个关键动作\n- 第三个关键动作" },
  { kind: "数据", mark: "数", detail: "突出结论与证据", snippet: "\n\n> 72%｜在这里补充数据结论与口径。" },
  { kind: "图片", mark: "图", detail: "预留图注与叙事位置", snippet: "\n\n> 图片位置｜补充图片说明与来源。" },
  { kind: "收束", mark: "结", detail: "形成明确的文章结尾", snippet: "\n\n## 结语\n\n在这里写下结论与下一步。" },
];

function parseArticle(markdown: string) {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  let title = "未命名文章";
  const blocks: ArticleBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => { if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") }); paragraph = []; };
  const flushList = () => { if (list.length) blocks.push({ type: "list", items: list }); list = []; };

  lines.forEach((line) => {
    if (!line) { flushParagraph(); flushList(); return; }
    if (line.startsWith("# ")) { title = line.slice(2).trim(); return; }
    if (line.startsWith("## ")) { flushParagraph(); flushList(); blocks.push({ type: "heading", text: line.slice(3).replace(/^[一二三四五六七八九十]+、/, "") }); return; }
    if (line.startsWith("> ")) { flushParagraph(); flushList(); blocks.push({ type: "quote", text: line.slice(2) }); return; }
    if (/^[-*] /.test(line)) { flushParagraph(); list.push(line.slice(2)); return; }
    paragraph.push(line.replace(/\*\*(.*?)\*\*/g, "$1"));
  });
  flushParagraph(); flushList();
  const first = blocks.find((block) => block.type === "paragraph") as { type: "paragraph"; text: string } | undefined;
  const subtitle = first ? `${first.text.slice(0, 42)}${first.text.length > 42 ? "……" : ""}` : "让内容建立秩序，让观点获得形状。";
  return { title, subtitle, blocks };
}

function blockLabel(type: BlockType) {
  return ({ title: "标题", paragraph: "正文", heading: "章节", quote: "观点", list: "行动列表" } as const)[type];
}

export default function Home() {
  const [theme, setTheme] = useState<ThemeKey>("editorial");
  const [inspector, setInspector] = useState<InspectorTab>("智能");
  const [stage, setStage] = useState<StageKey>("编排");
  const [preview, setPreview] = useState<"phone" | "desktop">("phone");
  const [fontSize, setFontSize] = useState(17);
  const [lineHeight, setLineHeight] = useState(1.88);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("balanced");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [toast, setToast] = useState("");
  const [adopted, setAdopted] = useState<string[]>(["quote"]);
  const [selected, setSelected] = useState<{ index: number; type: BlockType } | null>({ index: 2, type: "heading" });
  const [capturedType, setCapturedType] = useState<BlockType | null>(null);
  const [syncedTypes, setSyncedTypes] = useState<BlockType[]>([]);
  const [componentQuery, setComponentQuery] = useState("");
  const [versions, setVersions] = useState<{ markdown: string; label: string }[]>([]);
  const studioRef = useRef<HTMLElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previousStage = useRef(stage);
  const previousInspector = useRef(inspector);
  const previousArticleStyle = useRef(`${theme}-${layoutMode}`);

  const currentTheme = themes[theme];
  const wordCount = useMemo(() => markdown.replace(/[#>*`\-]/g, "").trim().length, [markdown]);
  const article = useMemo(() => parseArticle(markdown), [markdown]);
  const filteredComponents = useMemo(() => components.filter((item) => `${item.kind}${item.detail}`.includes(componentQuery.trim())), [componentQuery]);
  const diagnostics = useMemo(() => {
    const items: string[] = [];
    if (/\[\^[^\]]+\]/.test(markdown)) items.push("脚注需要转换为文末注释");
    if (/```mermaid/.test(markdown)) items.push("Mermaid 图需要转为图片");
    if (/\[[^\]]*\]\(\s*\)/.test(markdown)) items.push("检测到空链接");
    if (/\|.+\|/.test(markdown)) items.push("表格需要检查手机宽度");
    return items;
  }, [markdown]);

  useEffect(() => {
    const saved = window.localStorage.getItem("wechat-layout-designer-draft-v2");
    if (!saved) return;
    try {
      const payload = JSON.parse(saved);
      if (payload.schemaVersion === 2 && typeof payload.markdown === "string") {
        const timer = window.setTimeout(() => setMarkdown(payload.markdown), 0);
        return () => window.clearTimeout(timer);
      }
    } catch { /* 保留示例稿 */ }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => window.localStorage.setItem("wechat-layout-designer-draft-v2", JSON.stringify({ schemaVersion: 2, markdown, updatedAt: Date.now() })), 450);
    return () => window.clearTimeout(timer);
  }, [markdown]);

  useLayoutEffect(() => {
    if (!studioRef.current) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
        entrance
          .from(".topbar", { y: -8, opacity: 0.94, duration: 0.46 })
          .from(".canvas-toolbar", { y: -7, opacity: 0.94, duration: 0.34 }, "-=0.28")
          .from(".article-page", { y: 26, scale: 0.989, duration: 0.72, ease: "power2.out" }, "-=0.16")
          .from(".workflow-item", { x: -8, opacity: 0.9, duration: 0.28, stagger: 0.04 }, "-=0.54")
          .from(".inspector-content > *", { y: 8, opacity: 0.92, duration: 0.3, stagger: 0.05 }, "<");

        gsap.to(".jiangnan-mist", { xPercent: 1.15, yPercent: -0.35, scale: 1.018, duration: 17, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to(".save-indicator i", { scale: 1.55, opacity: 0.38, duration: 1.9, repeat: -1, yoyo: true, ease: "sine.inOut" });
      }, studioRef);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);

  useLayoutEffect(() => {
    if (!studioRef.current || previousStage.current === stage) return;
    previousStage.current = stage;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(".left-context > *", { y: 9, opacity: 0.78 }, { y: 0, opacity: 1, duration: 0.38, stagger: 0.045, ease: "power2.out", clearProps: "transform,opacity" });
      gsap.fromTo(".workflow-item.active .workflow-icon", { scale: 0.86, rotate: -5 }, { scale: 1, rotate: 0, duration: 0.42, ease: "back.out(1.7)", clearProps: "transform" });
    }, studioRef);
    return () => context.revert();
  }, [stage]);

  useLayoutEffect(() => {
    if (!studioRef.current || previousInspector.current === inspector) return;
    previousInspector.current = inspector;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(".inspector-content > *", { y: 12, opacity: 0.78 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.055, ease: "power2.out", clearProps: "transform,opacity" });
    }, studioRef);
    return () => context.revert();
  }, [inspector]);

  useLayoutEffect(() => {
    const articleStyle = `${theme}-${layoutMode}`;
    if (!studioRef.current || previousArticleStyle.current === articleStyle) return;
    previousArticleStyle.current = articleStyle;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(".article-page", { scale: 0.993, filter: "blur(1.4px)" }, { scale: 1, filter: "blur(0px)", duration: 0.52, ease: "power2.out", clearProps: "transform,filter" });
      gsap.fromTo(".article-page h1, .article-page h2, .article-page blockquote", { y: 6, opacity: 0.72 }, { y: 0, opacity: 1, duration: 0.38, stagger: 0.045, ease: "power2.out", clearProps: "transform,opacity" });
    }, studioRef);
    return () => context.revert();
  }, [theme, layoutMode]);

  useLayoutEffect(() => {
    if (!studioRef.current || !selected || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(".block-toolbar", { y: -7, scale: 0.965, opacity: 0.72 }, { y: 0, scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.55)", clearProps: "transform,opacity" });
      gsap.fromTo(".selectable-block.is-selected", { backgroundColor: "rgba(159, 61, 47, 0.12)" }, { backgroundColor: "rgba(159, 61, 47, 0.035)", duration: 0.58, ease: "power2.out", clearProps: "backgroundColor" });
    }, studioRef);
    return () => context.revert();
  }, [selected]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2400); }

  function adopt(id: string) { setAdopted((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); }

  function applyLayout(mode: LayoutMode) {
    setLayoutMode(mode);
    if (mode === "calm") { setFontSize(17); setLineHeight(2); }
    if (mode === "balanced") { setFontSize(17); setLineHeight(1.88); }
    if (mode === "editorial") { setFontSize(18); setLineHeight(1.78); }
    setAdopted(["quote", "list", "rhythm"]);
    notify(`已按“${mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}”策略重排全文`);
  }

  function insertComponent(snippet: string, kind: string) {
    setMarkdown((value) => `${value.trimEnd()}${snippet}\n`);
    setStage("编排");
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
    setVersions((items) => [...items.slice(-4), { markdown, label: `恢复点 ${items.length + 1}` }]);
    notify("已生成可恢复版本");
  }

  function restoreVersion() {
    const last = versions.at(-1);
    if (!last) return notify("还没有可恢复版本");
    setMarkdown(last.markdown);
    setVersions((items) => items.slice(0, -1));
    notify(`已恢复${last.label}`);
  }

  async function importText(file?: File) {
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) return notify("当前可直接导入 Markdown 或 TXT");
    setMarkdown(await file.text());
    notify(`已导入 ${file.name}，结构分析完成`);
  }

  async function copyArticle() {
    const source = articleRef.current;
    if (!source) return;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-editor-ui]").forEach((node) => node.remove());
    clone.querySelectorAll(".is-selected,.synced-style,.selectable-block").forEach((node) => node.classList.remove("is-selected", "synced-style", "selectable-block"));
    const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))].filter((node) => !node.closest("[data-editor-ui]"));
    const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
    const properties = ["display", "margin", "padding", "color", "backgroundColor", "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "textAlign", "textDecoration", "width", "maxWidth", "boxSizing", "whiteSpace", "wordBreak", "verticalAlign"] as const;
    sourceNodes.forEach((node, index) => {
      const target = cloneNodes[index]; if (!target) return;
      const computed = window.getComputedStyle(node);
      properties.forEach((property) => target.style.setProperty(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), computed[property]));
      target.removeAttribute("class"); target.removeAttribute("id"); target.removeAttribute("tabindex"); target.removeAttribute("role");
    });
    try {
      const html = clone.outerHTML;
      if (window.ClipboardItem && navigator.clipboard?.write) await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([source.innerText], { type: "text/plain" }) })]);
      else await navigator.clipboard.writeText(source.innerText);
      notify("已复制公众号兼容富文本");
    } catch { notify("浏览器未允许复制，请重试"); }
  }

  const selectProps = (index: number, type: BlockType) => ({
    className: `selectable-block ${selected?.index === index && selected.type === type ? "is-selected" : ""} ${syncedTypes.includes(type) ? "synced-style" : ""}`,
    role: "button", tabIndex: 0,
    onClick: (event: React.MouseEvent) => { event.stopPropagation(); setSelected({ index, type }); },
    onKeyDown: (event: React.KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") setSelected({ index, type }); },
  });

  return (
    <main ref={studioRef} className="studio-shell" style={{ "--article-accent": currentTheme.accent, "--article-ink": currentTheme.ink, "--article-paper": currentTheme.paper, "--article-size": `${fontSize}px`, "--article-leading": lineHeight } as React.CSSProperties}>
      <header className="topbar">
        <div className="product-mark"><span className="mark-seal">排</span><div><strong>公众号排版设计师</strong><small>WECHAT EDITORIAL STUDIO</small></div></div>
        <div className="document-identity"><span className="save-indicator"><i />本机已保存</span><span className="document-name">{article.title}</span><button className="icon-button" aria-label="切换稿件"><Icon name="chevron" size={15}/></button></div>
        <div className="top-actions">
          <button className="icon-button" aria-label="恢复上一版本" onClick={restoreVersion}><Icon name="undo"/></button>
          <button className="icon-button" aria-label="生成恢复版本" onClick={saveVersion}><Icon name="history"/></button>
          <span className="top-divider"/>
          <button className="quiet-action" onClick={() => { setStage("编排"); setInspector("智能"); }}><Icon name="spark" size={15}/>整稿重排</button>
          <button className="primary-action" onClick={() => { setStage("交付"); setInspector("智能"); notify(diagnostics.length ? `发现 ${diagnostics.length} 项需要处理` : "发布检查完成：0 项阻断"); }}>发布检查 <Icon name="publish" size={16}/></button>
        </div>
      </header>

      <aside className="left-panel">
        <div className="panel-label">设计流程</div>
        <nav className="workflow-nav" aria-label="设计流程">
          {stageItems.map((item, index) => <button key={item.title} className={`workflow-item ${stage === item.title ? "active" : ""}`} onClick={() => { setStage(item.title); if (item.title === "视觉") setInspector("样式"); if (item.title === "交付") setInspector("智能"); }}>
            <span className="workflow-index">0{index + 1}</span><span className="workflow-icon"><Icon name={item.icon}/></span><span className="workflow-copy"><b>{item.title}</b><small>{item.meta}</small></span>
          </button>)}
        </nav>

        <div className="left-context">
          {stage === "内容" && <><div className="context-head"><span>稿件输入</span><small>保留内容所有权</small></div><button className="context-primary" onClick={() => setSourceOpen(true)}><Icon name="document"/>编辑 Markdown</button><button className="context-row" onClick={() => fileRef.current?.click()}><span><b>导入本地稿件</b><small>支持 .md / .txt</small></span><Icon name="plus"/></button><input ref={fileRef} type="file" accept=".md,.markdown,.txt" hidden onChange={(event) => importText(event.target.files?.[0])}/></>}
          {stage === "编排" && <><div className="context-head"><span>整稿策略</span><small>内容不变，只改章法</small></div><div className="layout-presets">{(["calm", "balanced", "editorial"] as LayoutMode[]).map((mode) => <button key={mode} className={layoutMode === mode ? "active" : ""} onClick={() => applyLayout(mode)}><b>{mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}</b><small>{mode === "calm" ? "长文慢读" : mode === "balanced" ? "通用首选" : "观点密集"}</small></button>)}</div><div className="context-note"><Icon name="spark"/><p><b>当前建议：均衡</b><small>保留两次阅读停顿，列表收束在末段。</small></p></div></>}
          {stage === "视觉" && <><div className="context-head"><span>视觉气质</span><small>来自品牌令牌</small></div><div className="mini-themes">{(Object.entries(themes) as [ThemeKey, typeof themes[ThemeKey]][]).map(([key, item]) => <button key={key} className={theme === key ? "active" : ""} onClick={() => setTheme(key)}><i style={{ background: item.accent }}/><span>{item.name}</span></button>)}</div></>}
          {stage === "组件" && <><div className="context-head"><span>语义组件</span><small>点击或拖到画布</small></div><label className="component-search"><Icon name="search" size={14}/><input value={componentQuery} onChange={(event) => setComponentQuery(event.target.value)} placeholder="搜索章节、观点、数据"/></label><div className="component-shelf">{filteredComponents.map((item) => <button key={item.kind} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", item.snippet)} onClick={() => insertComponent(item.snippet, item.kind)}><span>{item.mark}</span><p><b>{item.kind}</b><small>{item.detail}</small></p><Icon name="plus" size={14}/></button>)}</div></>}
          {stage === "交付" && <><div className="context-head"><span>交付清单</span><small>复制前必须通过</small></div><ul className="left-checklist"><li><Icon name="check"/>层级与段落<span>通过</span></li><li><Icon name="check"/>图片与链接<span>通过</span></li><li className={diagnostics.length ? "has-warning" : ""}><Icon name={diagnostics.length ? "warning" : "check"}/>微信样式兼容<span>{diagnostics.length ? `${diagnostics.length} 项` : "通过"}</span></li></ul><button className="context-primary" onClick={copyArticle}><Icon name="copy"/>复制公众号排版</button></>}
        </div>

        <div className="brand-kit-mini"><span className="brand-avatar">钢</span><div><b>钢铁私塾</b><small>品牌套件已启用</small></div><Icon name="check" size={16}/></div>
      </aside>

      <section className="canvas-area">
        <div className="canvas-toolbar">
          <div><span className="canvas-kicker">设计画布</span><strong>{selected ? `已选中 · ${blockLabel(selected.type)}` : preview === "phone" ? "手机阅读效果" : "桌面阅读效果"}</strong></div>
          <div className="canvas-controls">
            <button className={preview === "phone" ? "selected" : ""} onClick={() => setPreview("phone")} aria-label="手机预览"><Icon name="phone"/></button>
            <button className={preview === "desktop" ? "selected" : ""} onClick={() => setPreview("desktop")} aria-label="桌面预览"><Icon name="desktop"/></button><span/>
            <button onClick={() => setSourceOpen(true)}>查看原稿</button>
          </div>
        </div>

        <div className="jiangnan-mist" aria-hidden="true" />
        <div className={`canvas-stage ${preview}`} onClick={() => setSelected(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const snippet = event.dataTransfer.getData("text/plain"); if (snippet) insertComponent(snippet, "语义"); }}>
          <div className="ruler top-ruler"><i>0</i><i>100</i><i>200</i><i>300</i></div><div className="ruler side-ruler"><i>0</i><i>200</i><i>400</i><i>600</i></div>
          {selected && <div className="block-toolbar" data-editor-ui onClick={(event) => event.stopPropagation()}><span>{blockLabel(selected.type)}</span><button onClick={captureStyle}><Icon name="brush" size={14}/>采集规则</button><button className={capturedType ? "ready" : ""} onClick={applyCapturedStyle}>同步同类</button><button aria-label="取消选择" onClick={() => setSelected(null)}><Icon name="close" size={14}/></button></div>}

          <article className={`article-page layout-${layoutMode}`} ref={articleRef}>
            <header className="article-brandline"><div className="article-account"><span>钢</span><div><b>钢铁私塾</b><small>材料 · 产业 · 人物</small></div></div><span className="article-category">产业观察 / 028</span></header>
            <section {...selectProps(-1, "title")}><div className="article-title-block"><span className="article-eyebrow">EDITORIAL NOTE</span><h1>{article.title}</h1><p>{article.subtitle}</p><div className="article-byline"><span>主编：钢铁私塾 唐淼</span><i/></div></div></section>
            <div className="article-body">
              {article.blocks.map((block, index) => {
                if (block.type === "paragraph") return <div {...selectProps(index, "paragraph")} key={`${block.type}-${index}`}><p className={index === 1 ? "lead-paragraph" : ""}>{block.text}</p></div>;
                if (block.type === "heading") { const chapter = article.blocks.slice(0, index + 1).filter((item) => item.type === "heading").length; return <div {...selectProps(index, "heading")} key={`${block.type}-${index}`}><section className="chapter-heading"><span>{String(chapter).padStart(2, "0")}</span><div><small>EDITORIAL CHAPTER</small><h2>{block.text}</h2></div></section></div>; }
                if (block.type === "quote") return <div {...selectProps(index, "quote")} key={`${block.type}-${index}`}><blockquote><span>观点</span><p>{block.text}</p></blockquote></div>;
                return <div {...selectProps(index, "list")} key={`${block.type}-${index}`}><ol className="designed-list">{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}><span>{String(itemIndex + 1).padStart(2, "0")}</span><p><b>{item}</b><small>已识别为关键动作，建议保留独立层级。</small></p></li>)}</ol></div>;
              })}
            </div>
            <footer className="article-footer"><span>钢铁私塾</span><p>我们不贩卖焦虑，只研究变化。</p></footer>
          </article>
        </div>
        <div className="statusbar"><span><i className={diagnostics.length ? "status-warn" : "status-good"}/>{diagnostics.length ? `${diagnostics.length} 项兼容提醒` : "微信兼容检查通过"}</span><span>{wordCount.toLocaleString()} 字 · 预计阅读 {Math.max(1, Math.ceil(wordCount / 260))} 分钟</span><span>{versions.length} 个恢复点</span></div>
      </section>

      <aside className="inspector-panel">
        <div className="inspector-tabs" role="tablist">{(["智能", "样式", "品牌"] as InspectorTab[]).map((tab) => <button key={tab} className={inspector === tab ? "active" : ""} onClick={() => setInspector(tab)}>{tab}</button>)}</div>
        {inspector === "智能" && <div className="inspector-content">
          <section className="design-score"><div className="score-ring"><strong>{diagnostics.length ? 86 : 94}</strong><small>设计分</small></div><div><span>节奏清楚，论点获得停顿</span><p>所有建议都可执行、撤回并留下恢复点。</p></div></section>
          <section className="inspector-section layout-director"><div className="section-heading"><div><span>整稿导演</span><small>一次决定全文密度与节奏</small></div><Icon name="spark" size={17}/></div><div className="strategy-switch">{(["calm", "balanced", "editorial"] as LayoutMode[]).map((mode) => <button key={mode} className={layoutMode === mode ? "active" : ""} onClick={() => applyLayout(mode)}>{mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}</button>)}</div><button className="apply-all" onClick={() => applyLayout(layoutMode)}>执行全文重排<span>不改一个字</span></button></section>
          <section className="inspector-section"><div className="section-heading"><div><span>结构建议</span><small>来自文章语义，而非模板匹配</small></div><span className="suggestion-count">3</span></div><div className="suggestion-list">{[
            ["quote", "观点形成阅读停顿", "1 处判断已识别为观点组件。"], ["list", "并列信息改为行动序列", "末段 4 个动作适合编号表达。"], ["rhythm", "首屏保留一个主命题", "标题与摘要的间距需要更克制。"],
          ].map(([id, title, text], index) => { const applied = adopted.includes(id); return <article className={`suggestion-card ${applied ? "applied" : ""}`} key={id}><div className="suggestion-number">0{index + 1}</div><div><strong>{title}</strong><p>{text}</p></div><button onClick={() => adopt(id)}>{applied ? "已采用" : "采用"}</button></article>; })}</div></section>
          <section className="inspector-section compatibility-card"><div className="section-heading"><div><span>交付健康度</span><small>公众号粘贴前的确定性</small></div><span className={diagnostics.length ? "warning-tag" : "pass-tag"}>{diagnostics.length ? "待处理" : "通过"}</span></div>{diagnostics.length ? <ul>{diagnostics.map((item) => <li key={item}><Icon name="warning" size={15}/>{item}<span>定位</span></li>)}</ul> : <ul><li><Icon name="check" size={15}/>层级与段落<span>正常</span></li><li><Icon name="check" size={15}/>图片与链接<span>正常</span></li><li><Icon name="check" size={15}/>微信样式兼容<span>正常</span></li></ul>}</section>
          <button className="copy-delivery" onClick={copyArticle}><Icon name="copy"/>复制公众号排版</button>
        </div>}

        {inspector === "样式" && <div className="inspector-content"><section className="inspector-section"><div className="section-heading"><div><span>文章气质</span><small>原创令牌系统，改变章法而非贴皮</small></div></div><div className="theme-grid">{(Object.entries(themes) as [ThemeKey, typeof themes[ThemeKey]][]).map(([key, item]) => <button key={key} className={theme === key ? "active" : ""} onClick={() => setTheme(key)}><span className="theme-sample" style={{ background: item.paper, color: item.ink }}><i style={{ background: item.accent }}/><b>Aa</b></span><small>{item.name}</small></button>)}</div></section><section className="inspector-section control-stack"><label><span><b>正文字号</b><small>建议 16—18px</small></span><output>{fontSize}px</output></label><input type="range" min="15" max="20" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))}/><label><span><b>正文行距</b><small>长文需要更多呼吸</small></span><output>{lineHeight.toFixed(2)}</output></label><input type="range" min="1.6" max="2.12" step="0.04" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))}/></section><section className="inspector-section transfer-card"><div className="section-heading"><div><span>规则迁移</span><small>从一个内容块同步到所有同类</small></div><Icon name="brush" size={17}/></div><p>{capturedType ? `已采集：${blockLabel(capturedType)}` : "在画布中选择内容块，然后采集它的编排规则。"}</p><div><button onClick={captureStyle}>采集当前</button><button className="strong" onClick={applyCapturedStyle}>同步同类</button></div></section></div>}

        {inspector === "品牌" && <div className="inspector-content"><section className="brand-preview-card"><span className="brand-big-avatar">钢</span><div><small>当前品牌套件</small><strong>钢铁私塾</strong><p>工业理性 · 专业克制 · 有判断</p></div></section><section className="inspector-section brand-settings"><div className="section-heading"><div><span>品牌基因</span><small>每一篇内容自动继承</small></div></div><label><span>主色</span><i style={{ background: currentTheme.accent }}/>当前主题<button onClick={() => setInspector("样式")}>修改</button></label><label><span>正文</span><i style={{ background: currentTheme.ink }}/>墨黑<button onClick={() => setInspector("样式")}>修改</button></label><label><span>署名</span><b>主编：钢铁私塾 唐淼</b><button onClick={() => notify("品牌署名编辑将在下一版开放")}>编辑</button></label><label><span>结尾</span><b>固定品牌结尾</b><button onClick={() => notify("品牌结尾编辑将在下一版开放")}>编辑</button></label></section><section className="inspector-section"><div className="section-heading"><div><span>品牌一致性</span><small>本稿与品牌套件对照</small></div></div><div className="brand-consistency"><strong>100%</strong><div><i/><span>颜色、署名与语气均一致</span></div></div></section></div>}
      </aside>

      {sourceOpen && <div className="source-overlay" role="dialog" aria-modal="true" aria-label="原稿编辑器"><div className="source-drawer"><header><div><span>内容源</span><strong>Markdown 原稿</strong></div><div><button className="import-file" onClick={() => fileRef.current?.click()}>导入文件</button><button onClick={() => setSourceOpen(false)} aria-label="关闭原稿"><Icon name="close"/></button></div></header><textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} aria-label="Markdown 原稿" spellCheck={false}/><footer><span>{wordCount} 字 · 自动保存于本机</span><button onClick={() => { setSourceOpen(false); setStage("编排"); notify("内容结构已重新分析"); }}>分析并编排</button></footer></div></div>}
      {toast && <div className="toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
    </main>
  );
}
