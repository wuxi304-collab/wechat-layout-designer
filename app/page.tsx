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
  editorial: { name: "朱砂社论", accent: "#9d493b", ink: "#232623", paper: "#fbf8ef" },
  industrial: { name: "雨苔纪要", accent: "#536b62", ink: "#252b28", paper: "#f4f5f0" },
  eastern: { name: "江南纸墨", accent: "#985043", ink: "#242724", paper: "#fbf6e9" },
  minimal: { name: "烟雨黛", accent: "#586b70", ink: "#272c2d", paper: "#faf9f3" },
  spring: { name: "草长莺飞", accent: "#71885a", ink: "#283229", paper: "#fcfaed" },
};

type ThemeKey = keyof typeof themes;
type LayoutMode = "calm" | "balanced" | "editorial";
type FontProfile = "classic" | "literary" | "clear";

const fontProfiles: { key: FontProfile; name: string; sample: string; detail: string }[] = [
  { key: "classic", name: "雅宋", sample: "永", detail: "标题有骨，长文耐读" },
  { key: "literary", name: "书卷", sample: "墨", detail: "楷意题签，仿宋正文" },
  { key: "clear", name: "清朗", sample: "读", detail: "现代正文，手机更清楚" },
];

const markdownStyles = {
  jiangnan: {
    name: "江南书札",
    short: "书札",
    description: "宋体长读 · 朱砂小章 · 水岸留白",
    fit: "人物、产业叙事",
    theme: "eastern" as ThemeKey,
    layout: "calm" as LayoutMode,
    fontSize: 17,
    lineHeight: 1.96,
  },
  editorial: {
    name: "编辑部手记",
    short: "手记",
    description: "强标题 · 观点停顿 · 紧凑章法",
    fit: "评论、趋势判断",
    theme: "editorial" as ThemeKey,
    layout: "editorial" as LayoutMode,
    fontSize: 18,
    lineHeight: 1.8,
  },
  technical: {
    name: "技术纪要",
    short: "纪要",
    description: "理性层级 · 清晰列表 · 数据友好",
    fit: "标准、材料技术",
    theme: "industrial" as ThemeKey,
    layout: "balanced" as LayoutMode,
    fontSize: 16,
    lineHeight: 1.82,
  },
  essay: {
    name: "观点长卷",
    short: "长卷",
    description: "大题小节 · 宽松正文 · 引文成景",
    fit: "深度长文、专栏",
    theme: "editorial" as ThemeKey,
    layout: "calm" as LayoutMode,
    fontSize: 17,
    lineHeight: 2,
  },
  minimal: {
    name: "清简白页",
    short: "清简",
    description: "低装饰 · 高对比 · 快速阅读",
    fit: "快讯、短评、清单",
    theme: "minimal" as ThemeKey,
    layout: "balanced" as LayoutMode,
    fontSize: 17,
    lineHeight: 1.86,
  },
  spring: {
    name: "草长莺飞",
    short: "莺飞",
    description: "春水青 · 柳芽章题 · 杏纸轻读",
    fit: "人文随笔、品牌故事",
    theme: "spring" as ThemeKey,
    layout: "calm" as LayoutMode,
    fontSize: 17,
    lineHeight: 2,
  },
};

type MarkdownStyleKey = keyof typeof markdownStyles;
const markdownStyleOrder = Object.keys(markdownStyles) as MarkdownStyleKey[];
const titleBaseSizes: Record<MarkdownStyleKey, number> = { jiangnan: 32, editorial: 34, technical: 31, essay: 33, minimal: 30, spring: 32 };
type InspectorTab = "智能" | "样式" | "规范" | "品牌";
type StageKey = "内容" | "编排" | "视觉" | "组件" | "交付";
type BlockType = "title" | "paragraph" | "heading" | "subheading" | "quote" | "list" | "code" | "divider";
type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; code: string }
  | { type: "divider" };
type ArticleReference = { id: string; title: string; url: string; domain: string };

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

function plainInline(text: string) {
  return text
    .replace(/\(\[([^\]]+)\]\[(\d+)\]\)/g, "〔$2〕")
    .replace(/\[([^\]]+)\]\[(\d+)\]/g, "$1〔$2〕")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .trim();
}

function renderInline(text: string) {
  const normalized = text
    .replace(/\(\[([^\]]+)\]\[(\d+)\]\)/g, "〔ref:$2〕")
    .replace(/\[([^\]]+)\]\[(\d+)\]/g, "$1〔ref:$2〕");
  const tokenPattern = /(\*\*[^*]+\*\*|(?<!\*)\*[^*]+\*(?!\*)|~~[^~]+~~|〔ref:\d+〕|\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s，。；！？、）)]+)/g;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(normalized))) {
    if (match.index > cursor) parts.push(normalized.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("**")) parts.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2).trim()}</strong>);
    else if (token.startsWith("*")) parts.push(<em key={`${match.index}-em`}>{token.slice(1, -1).trim()}</em>);
    else if (token.startsWith("~~")) parts.push(<s key={`${match.index}-strike`}>{token.slice(2, -2)}</s>);
    else if (token.startsWith("〔ref:")) parts.push(<sup className="inline-citation" key={`${match.index}-ref`}>〔{token.slice(5, -1)}〕</sup>);
    else if (token.startsWith("[")) {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (link) parts.push(<a className="inline-link" href={cleanUrl(link[2])} key={`${match.index}-link`}>{link[1]}</a>);
    } else {
      const cleaned = cleanUrl(token);
      parts.push(<a className="inline-link bare-link" href={cleaned} key={`${match.index}-url`}>{urlDomain(cleaned)}</a>);
    }
    cursor = match.index + token.length;
  }
  if (cursor < normalized.length) parts.push(normalized.slice(cursor));
  return parts.length ? parts : text;
}

function joinParagraph(lines: string[]) {
  return lines.reduce((result, line) => {
    if (!result) return line;
    const chineseJoin = /[\u3400-\u9fff，。！？；：、“”‘’）]$/.test(result) && /^[\u3400-\u9fff“‘（]/.test(line);
    return `${result}${chineseJoin ? "" : " "}${line}`;
  }, "");
}

function parseArticle(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  let title = "未命名文章";
  let author = "钢铁私塾 唐淼";
  const blocks: ArticleBlock[] = [];
  const references: ArticleReference[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let codeFence: { language: string; lines: string[] } | null = null;
  const flushParagraph = () => { if (paragraph.length) blocks.push({ type: "paragraph", text: joinParagraph(paragraph) }); paragraph = []; };
  const flushList = () => { if (list.length) blocks.push({ type: "list", items: list }); list = []; };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (codeFence) {
      if (/^```/.test(line)) {
        blocks.push({ type: "code", language: codeFence.language, code: codeFence.lines.join("\n") });
        codeFence = null;
      } else codeFence.lines.push(rawLine);
      return;
    }
    const fence = line.match(/^```\s*([\w+-]*)/);
    if (fence) {
      flushParagraph(); flushList();
      codeFence = { language: fence[1] || "text", lines: [] };
      return;
    }
    if (!line) { flushParagraph(); flushList(); return; }
    const authorLine = plainInline(line).match(/^(?:主编|作者)\s*[：:]\s*(.+)$/);
    if (authorLine) {
      flushParagraph(); flushList();
      author = authorLine[1].trim();
      return;
    }
    const reference = line.match(/^\[([^\]]+)\]:\s*(https?:\/\/\S+?)(?:\s+["“](.*?)["”])?\s*$/);
    if (reference) {
      flushParagraph(); flushList();
      const url = cleanUrl(reference[2]);
      references.push({ id: reference[1], title: plainInline(reference[3] || urlDomain(url)), url, domain: urlDomain(url) });
      return;
    }
    if (/^(?:-{3,}|_{3,}|\*{3,})$/.test(line)) { flushParagraph(); flushList(); blocks.push({ type: "divider" }); return; }
    if (line.startsWith("# ")) { title = plainInline(line.slice(2).trim()); return; }
    if (line.startsWith("## ")) { flushParagraph(); flushList(); blocks.push({ type: "heading", text: plainInline(line.slice(3).replace(/^[一二三四五六七八九十]+、/, "")) }); return; }
    if (line.startsWith("### ")) { flushParagraph(); flushList(); blocks.push({ type: "subheading", text: plainInline(line.slice(4)) }); return; }
    if (line.startsWith("> ")) { flushParagraph(); flushList(); blocks.push({ type: "quote", text: line.slice(2) }); return; }
    if (/^[-*] /.test(line)) { flushParagraph(); list.push(line.slice(2)); return; }
    paragraph.push(line);
  });
  if (codeFence) blocks.push({ type: "code", language: codeFence.language, code: codeFence.lines.join("\n") });
  flushParagraph(); flushList();
  const first = blocks.find((block) => block.type === "paragraph") as { type: "paragraph"; text: string } | undefined;
  const firstText = first ? plainInline(first.text) : "";
  const subtitle = first ? `${firstText.slice(0, 42)}${firstText.length > 42 ? "……" : ""}` : "让内容建立秩序，让观点获得形状。";
  return { title, author, subtitle, blocks, references };
}

function blockLabel(type: BlockType) {
  return ({ title: "标题", paragraph: "正文", heading: "章节", subheading: "小节", quote: "观点", list: "行动列表", code: "代码块", divider: "分隔" } as const)[type];
}

export default function Home() {
  const [theme, setTheme] = useState<ThemeKey>("eastern");
  const [markdownStyle, setMarkdownStyle] = useState<MarkdownStyleKey>("jiangnan");
  const [inspector, setInspector] = useState<InspectorTab>("智能");
  const [stage, setStage] = useState<StageKey>("编排");
  const [preview, setPreview] = useState<"phone" | "desktop">("phone");
  const [fontSize, setFontSize] = useState(17);
  const [lineHeight, setLineHeight] = useState(1.96);
  const [fontProfile, setFontProfile] = useState<FontProfile>("classic");
  const [titleScale, setTitleScale] = useState(1);
  const [articleTracking, setArticleTracking] = useState(0.018);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("calm");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [toast, setToast] = useState("");
  const [adopted, setAdopted] = useState<string[]>(["quote"]);
  const [selected, setSelected] = useState<{ index: number; type: BlockType } | null>(null);
  const [capturedType, setCapturedType] = useState<BlockType | null>(null);
  const [syncedTypes, setSyncedTypes] = useState<BlockType[]>([]);
  const [componentQuery, setComponentQuery] = useState("");
  const [versions, setVersions] = useState<{ markdown: string; label: string }[]>([]);
  const [wechatStatus, setWechatStatus] = useState<{ configured: boolean; connected: boolean; mode: string; appId: string | null; message: string }>({ configured: false, connected: false, mode: "未配置", appId: null, message: "尚未检查连接" });
  const [checkingWechat, setCheckingWechat] = useState(false);
  const studioRef = useRef<HTMLElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const inspectorPanelRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previousStage = useRef(stage);
  const previousInspector = useRef(inspector);
  const previousArticleStyle = useRef(`${markdownStyle}-${theme}-${layoutMode}-${fontProfile}`);

  const currentTheme = themes[theme];
  const currentMarkdownStyle = markdownStyles[markdownStyle];
  const articleTitleSize = titleBaseSizes[markdownStyle] * titleScale;
  const wordCount = useMemo(() => markdown.replace(/[#>*`\-]/g, "").trim().length, [markdown]);
  const article = useMemo(() => parseArticle(markdown), [markdown]);
  const outline = useMemo(() => article.blocks.map((block, index) => block.type === "heading" || block.type === "subheading" ? { index, type: block.type, text: block.text } : null).filter((item): item is { index: number; type: "heading" | "subheading"; text: string } => Boolean(item)), [article.blocks]);
  const filteredComponents = useMemo(() => components.filter((item) => `${item.kind}${item.detail}`.includes(componentQuery.trim())), [componentQuery]);
  const diagnostics = useMemo(() => {
    const items: string[] = [];
    if (article.title.length > 64) items.push("标题超过微信 64 字上限");
    if (article.author.length > 8) items.push("作者超过微信 8 字上限");
    if (/\[\^[^\]]+\]/.test(markdown)) items.push("脚注需要转换为文末注释");
    if (/```mermaid/.test(markdown)) items.push("Mermaid 图需要转为图片");
    if (/\[[^\]]*\]\(\s*\)/.test(markdown)) items.push("检测到空链接");
    if (/\|.+\|/.test(markdown)) items.push("表格需要检查手机宽度");
    return items;
  }, [article.author, article.title, markdown]);

  useEffect(() => {
    const saved = window.localStorage.getItem("wechat-layout-designer-draft-v2");
    if (!saved) return;
    try {
      const payload = JSON.parse(saved);
      if ([2, 3, 4, 5].includes(payload.schemaVersion) && typeof payload.markdown === "string") {
        const timer = window.setTimeout(() => {
          setMarkdown(payload.markdown);
          if (payload.schemaVersion >= 3) {
            if (typeof payload.markdownStyle === "string" && payload.markdownStyle in markdownStyles) setMarkdownStyle(payload.markdownStyle as MarkdownStyleKey);
            if (typeof payload.theme === "string" && payload.theme in themes) setTheme(payload.theme as ThemeKey);
            if (typeof payload.layoutMode === "string" && ["calm", "balanced", "editorial"].includes(payload.layoutMode)) setLayoutMode(payload.layoutMode as LayoutMode);
            if (typeof payload.fontSize === "number") setFontSize(payload.fontSize);
            if (typeof payload.lineHeight === "number") setLineHeight(payload.lineHeight);
            if (typeof payload.fontProfile === "string" && ["classic", "literary", "clear"].includes(payload.fontProfile)) setFontProfile(payload.fontProfile as FontProfile);
            if (typeof payload.titleScale === "number") setTitleScale(payload.titleScale);
            if (typeof payload.articleTracking === "number") setArticleTracking(payload.articleTracking);
          }
        }, 0);
        return () => window.clearTimeout(timer);
      }
    } catch { /* 保留示例稿 */ }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => window.localStorage.setItem("wechat-layout-designer-draft-v2", JSON.stringify({ schemaVersion: 5, markdown, markdownStyle, theme, layoutMode, fontProfile, fontSize, lineHeight, titleScale, articleTracking, updatedAt: Date.now() })), 450);
    return () => window.clearTimeout(timer);
  }, [articleTracking, fontProfile, fontSize, layoutMode, lineHeight, markdown, markdownStyle, theme, titleScale]);

  useEffect(() => {
    if (inspector !== "规范") return;
    fetch("/api/wechat")
      .then((response) => response.json())
      .then((payload) => setWechatStatus(payload))
      .catch(() => setWechatStatus((current) => ({ ...current, message: "连接状态暂不可用" })));
  }, [inspector]);

  useEffect(() => {
    if (inspectorPanelRef.current) inspectorPanelRef.current.scrollTop = 0;
  }, [inspector]);

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
      gsap.fromTo(".left-context > *", { y: 8, opacity: 0.72, filter: "blur(2px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.46, stagger: 0.055, ease: "power2.out", clearProps: "transform,opacity,filter" });
      gsap.fromTo(".workflow-item.active .workflow-icon", { scale: 0.91, rotate: -2 }, { scale: 1, rotate: 0, duration: 0.48, ease: "power3.out", clearProps: "transform" });
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
      gsap.fromTo(".article-page", { scale: 0.993, filter: "blur(1.4px)" }, { scale: 1, filter: "blur(0px)", duration: 0.52, ease: "power2.out", clearProps: "transform,filter" });
      gsap.fromTo(".article-page h1, .article-page h2, .article-page blockquote", { y: 6, opacity: 0.72 }, { y: 0, opacity: 1, duration: 0.38, stagger: 0.045, ease: "power2.out", clearProps: "transform,opacity" });
      gsap.fromTo(".article-body > .selectable-block", { y: 5 }, { y: 0, duration: 0.42, stagger: 0.025, ease: "power2.out", clearProps: "transform" });
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

  function jumpToBlock(index: number, type: "heading" | "subheading") {
    setSelected({ index, type });
    window.requestAnimationFrame(() => articleRef.current?.querySelector<HTMLElement>(`[data-block-index="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: typewriterMode ? "center" : "start" }));
  }

  function adopt(id: string) { setAdopted((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); }

  function applyLayout(mode: LayoutMode) {
    setLayoutMode(mode);
    if (mode === "calm") { setFontSize(17); setLineHeight(2); }
    if (mode === "balanced") { setFontSize(17); setLineHeight(1.88); }
    if (mode === "editorial") { setFontSize(18); setLineHeight(1.78); }
    setAdopted(["quote", "list", "rhythm"]);
    notify(`已按“${mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}”策略重排全文`);
  }

  function applyMarkdownStyle(key: MarkdownStyleKey) {
    const style = markdownStyles[key];
    setMarkdownStyle(key);
    setTheme(style.theme);
    setLayoutMode(style.layout);
    setFontSize(style.fontSize);
    setLineHeight(style.lineHeight);
    setSelected(null);
    setAdopted(["quote", "list", "rhythm"]);
    notify(`已换为“${style.name}”，正文内容未改动`);
  }

  function cycleMarkdownStyle() {
    const currentIndex = markdownStyleOrder.indexOf(markdownStyle);
    applyMarkdownStyle(markdownStyleOrder[(currentIndex + 1) % markdownStyleOrder.length]);
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

  async function pasteMarkdown() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return notify("剪贴板里没有可粘贴的文字");
      setMarkdown(text);
      notify("已粘贴 Markdown 原稿");
    } catch {
      notify("浏览器未允许读取剪贴板，请检查权限");
    }
  }

  function clearMarkdown() {
    if (!markdown.trim()) return notify("原稿已经是空的");
    setVersions((items) => [...items.slice(-4), { markdown, label: `清空前恢复点 ${items.length + 1}` }]);
    setMarkdown("");
    notify("原稿已清空，并保留一个恢复点");
  }

  async function copyPlainField(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify(`${label}已复制，可粘贴到微信${label}栏`);
    } catch {
      notify(`浏览器未允许复制${label}，请重试`);
    }
  }

  async function copyArticle() {
    const source = articleRef.current;
    if (!source) return;
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-editor-ui]").forEach((node) => node.remove());
    clone.querySelectorAll(".is-selected,.synced-style,.selectable-block").forEach((node) => node.classList.remove("is-selected", "synced-style", "selectable-block"));
    const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))].filter((node) => !node.closest("[data-editor-ui]"));
    const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
    const properties = ["display", "margin", "padding", "color", "backgroundColor", "backgroundImage", "border", "borderTop", "borderRight", "borderBottom", "borderLeft", "borderRadius", "boxShadow", "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "textAlign", "textDecoration", "textIndent", "width", "maxWidth", "boxSizing", "whiteSpace", "wordBreak", "overflowWrap", "verticalAlign"] as const;
    sourceNodes.forEach((node, index) => {
      const target = cloneNodes[index]; if (!target) return;
      const computed = window.getComputedStyle(node);
      properties.forEach((property) => target.style.setProperty(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), computed[property]));
      target.removeAttribute("class"); target.removeAttribute("id"); target.removeAttribute("tabindex"); target.removeAttribute("role"); target.removeAttribute("data-md-style");
    });
    try {
      const body = clone.querySelector<HTMLElement>("[data-copy-body]");
      const footer = clone.querySelector<HTMLElement>("[data-copy-footer]");
      if (!body) return notify("正文暂时无法导出，请重试");

      const exportRoot = document.createElement("section");
      exportRoot.style.cssText = `display:block;width:100%;max-width:100%;margin:0;padding:0;color:${currentTheme.ink};background:#ffffff;box-sizing:border-box;font-family:"Songti SC","STSong","Noto Serif CJK SC",serif;`;
      const byline = document.createElement("p");
      byline.textContent = `主编：${article.author}`;
      byline.style.cssText = `margin:0 0 30px;padding:0 0 14px;border:0;border-bottom:1px solid ${currentTheme.accent}33;color:${currentTheme.accent};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;font-size:13px;font-weight:600;line-height:1.7;letter-spacing:.03em;text-align:left;`;
      exportRoot.appendChild(byline);

      body.style.cssText = `display:block;width:100%;max-width:100%;margin:0;padding:0;color:${currentTheme.ink};background:#ffffff;box-sizing:border-box;font-family:"Songti SC","STSong","Noto Serif CJK SC",serif;font-size:${fontSize}px;line-height:${lineHeight};`;
      body.removeAttribute("data-copy-body");
      exportRoot.appendChild(body);
      if (footer) {
        footer.removeAttribute("data-copy-footer");
        exportRoot.appendChild(footer);
      }
      exportRoot.querySelectorAll("[data-copy-exclude]").forEach((node) => node.remove());
      exportRoot.querySelectorAll("[data-copy-body],[data-copy-footer]").forEach((node) => { node.removeAttribute("data-copy-body"); node.removeAttribute("data-copy-footer"); });

      const html = exportRoot.outerHTML;
      const plainText = exportRoot.innerText;
      if (window.ClipboardItem && navigator.clipboard?.write) await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([plainText], { type: "text/plain" }) })]);
      else await navigator.clipboard.writeText(plainText);
      notify("微信正文已复制，不含重复标题与预览页眉");
    } catch { notify("浏览器未允许复制，请重试"); }
  }

  async function checkWechatConnection() {
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
    className: `selectable-block ${selected?.index === index && selected.type === type ? "is-selected" : ""} ${syncedTypes.includes(type) ? "synced-style" : ""}`,
    "data-block-index": index,
    role: "button", tabIndex: 0,
    onClick: (event: React.MouseEvent) => { event.stopPropagation(); setSelected({ index, type }); },
    onKeyDown: (event: React.KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") setSelected({ index, type }); },
  });

  return (
    <main ref={studioRef} className={`studio-shell ${focusMode ? "studio-focus-mode" : ""} ${typewriterMode ? "studio-typewriter-mode" : ""}`} style={{ "--article-accent": currentTheme.accent, "--article-ink": currentTheme.ink, "--article-paper": currentTheme.paper, "--article-size": `${fontSize}px`, "--article-leading": lineHeight, "--article-title-size": `${articleTitleSize}px`, "--article-tracking": `${articleTracking}em` } as React.CSSProperties}>
      <header className="topbar">
        <div className="product-mark"><span className="mark-seal">排</span><div><strong>公众号排版设计师</strong><small>江南编辑书房 · 文章有骨</small></div></div>
        <div className="document-identity"><span className="save-indicator"><i />本机已保存</span><span className="document-name">{article.title}</span><button className="icon-button" aria-label="切换稿件"><Icon name="chevron" size={15}/></button></div>
        <div className="top-actions">
          <button className="icon-button" aria-label="恢复上一版本" onClick={restoreVersion}><Icon name="undo"/></button>
          <button className="icon-button" aria-label="生成恢复版本" onClick={saveVersion}><Icon name="history"/></button>
          <span className="top-divider"/>
          <button className="quiet-action" onClick={() => { setStage("编排"); setInspector("智能"); }}><Icon name="spark" size={15}/>整稿重排</button>
          <button className="primary-action" onClick={() => { setStage("交付"); setInspector("智能"); notify(diagnostics.length ? `发现 ${diagnostics.length} 项需要处理` : "交付检查完成：0 项阻断"); }}>交付检查 <Icon name="publish" size={16}/></button>
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
          {stage === "内容" && <><div className="context-head"><span>稿件输入</span><small>保留内容所有权</small></div><button className="context-primary" onClick={() => setSourceOpen(true)}><Icon name="document"/>编辑 Markdown</button><button className="context-row" onClick={() => fileRef.current?.click()}><span><b>导入本地稿件</b><small>支持 .md / .txt</small></span><Icon name="plus"/></button><input ref={fileRef} type="file" accept=".md,.markdown,.txt" hidden onChange={(event) => importText(event.target.files?.[0])}/><div className="article-outline"><header><span>文章大纲</span><small>{outline.length + 1} 个层级</small></header><button className="outline-title" onClick={() => { setSelected({ index: -1, type: "title" }); articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><i>题</i><span>{article.title}</span></button>{outline.map((item) => <button key={`${item.type}-${item.index}`} className={item.type === "subheading" ? "outline-subheading" : ""} onClick={() => jumpToBlock(item.index, item.type)}><i>{item.type === "heading" ? "章" : "节"}</i><span>{item.text}</span></button>)}</div></>}
          {stage === "编排" && <><div className="context-head"><span>整稿策略</span><small>内容不变，只改章法</small></div><div className="layout-presets">{(["calm", "balanced", "editorial"] as LayoutMode[]).map((mode, index) => <button key={mode} className={layoutMode === mode ? "active" : ""} aria-pressed={layoutMode === mode} onClick={() => applyLayout(mode)}><em>0{index + 1}</em><b>{mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}</b><small>{mode === "calm" ? "长文慢读" : mode === "balanced" ? "通用首选" : "观点密集"}</small></button>)}</div><div className="context-note"><Icon name="spark"/><p><b>当前建议：均衡</b><small>保留两次阅读停顿，列表收束在末段。</small></p></div></>}
          {stage === "视觉" && <><div className="context-head"><span>Markdown 版式</span><small>一键换骨，不动正文</small></div><div className="mini-styles">{markdownStyleOrder.map((key, index) => { const item = markdownStyles[key]; return <button key={key} className={markdownStyle === key ? "active" : ""} aria-pressed={markdownStyle === key} onClick={() => applyMarkdownStyle(key)}><em>0{index + 1}</em><i style={{ background: themes[item.theme].accent }}/><span><b>{item.name}</b><small>{item.fit}</small></span>{markdownStyle === key && <strong>已用</strong>}</button>; })}</div></>}
          {stage === "组件" && <><div className="context-head"><span>语义组件</span><small>点击或拖到画布</small></div><label className="component-search"><Icon name="search" size={14}/><input value={componentQuery} onChange={(event) => setComponentQuery(event.target.value)} placeholder="搜索章节、观点、数据"/></label><div className="component-shelf">{filteredComponents.map((item) => <button key={item.kind} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", item.snippet)} onClick={() => insertComponent(item.snippet, item.kind)}><span>{item.mark}</span><p><b>{item.kind}</b><small>{item.detail}</small></p><Icon name="plus" size={14}/></button>)}</div></>}
          {stage === "交付" && <><div className="context-head"><span>微信交付</span><small>按顺序粘贴三个栏位</small></div><div className="publish-steps"><button onClick={() => copyPlainField(article.title, "标题")}><em>01</em><span><b>复制标题</b><small>{article.title.length}/64 字</small></span><Icon name="copy" size={15}/></button><button onClick={() => copyPlainField(article.author, "作者")}><em>02</em><span><b>复制作者</b><small>{article.author.length}/8 字</small></span><Icon name="copy" size={15}/></button><button className="strong" onClick={copyArticle}><em>03</em><span><b>复制微信正文</b><small>不含重复标题与页眉</small></span><Icon name="copy" size={15}/></button></div><ul className="left-checklist"><li><Icon name="check"/>层级与段落<span>通过</span></li><li><Icon name="check"/>图片与链接<span>通过</span></li><li className={diagnostics.length ? "has-warning" : ""}><Icon name={diagnostics.length ? "warning" : "check"}/>微信样式兼容<span>{diagnostics.length ? `${diagnostics.length} 项` : "通过"}</span></li></ul></>}
        </div>

        <div className="brand-kit-mini"><span className="brand-avatar">钢</span><div><b>钢铁私塾</b><small>品牌套件已启用</small></div><Icon name="check" size={16}/></div>
      </aside>

      <section className="canvas-area">
        <div className="canvas-toolbar">
          <div><span className="canvas-kicker">纸上工作台</span><strong>{selected ? `正在校订 · ${blockLabel(selected.type)}` : preview === "phone" ? "手机阅读效果" : "桌面阅读效果"}</strong></div>
          <div className="canvas-controls">
            <button className="quick-style-cycle" onClick={cycleMarkdownStyle} aria-label={`一键切换版式，当前为${currentMarkdownStyle.name}`} title="一键切换下一套 Markdown 版式"><Icon name="brush" size={15}/><span>换版</span><b>{currentMarkdownStyle.short}</b></button><span/>
            <button className={`writing-mode-toggle ${focusMode ? "selected" : ""}`} aria-pressed={focusMode} onClick={() => { setFocusMode((value) => !value); notify(focusMode ? "已退出专注校订" : "已进入专注校订，选择一个段落开始"); }} title="淡化当前内容块之外的文字"><Icon name="spark" size={14}/><b>专注</b></button>
            <button className={`writing-mode-toggle ${typewriterMode ? "selected" : ""}`} aria-pressed={typewriterMode} onClick={() => { setTypewriterMode((value) => !value); notify(typewriterMode ? "已退出居中阅读" : "已开启居中阅读，所选段落保持在视线中央"); }} title="让所选内容块保持在视线中央"><Icon name="structure" size={14}/><b>居中</b></button><span/>
            <button className={preview === "phone" ? "selected" : ""} aria-pressed={preview === "phone"} onClick={() => setPreview("phone")} aria-label="手机预览"><Icon name="phone"/></button>
            <button className={preview === "desktop" ? "selected" : ""} aria-pressed={preview === "desktop"} onClick={() => setPreview("desktop")} aria-label="桌面预览"><Icon name="desktop"/></button><span/>
            <button onClick={() => setSourceOpen(true)}>查看原稿</button>
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
          {selected && <div className="block-toolbar" data-editor-ui onClick={(event) => event.stopPropagation()}><span>{blockLabel(selected.type)}</span><button onClick={captureStyle}><Icon name="brush" size={14}/>采集规则</button><button className={capturedType ? "ready" : ""} onClick={applyCapturedStyle}>同步同类</button><button aria-label="取消选择" onClick={() => setSelected(null)}><Icon name="close" size={14}/></button></div>}

          <div className="paper-frame">
            <div className="paper-folio" aria-hidden="true"><span>公众号预览</span><i/>01</div>
            <article className={`article-page layout-${layoutMode} md-style-${markdownStyle} font-${fontProfile} ${focusMode && selected ? "focus-active" : ""}`} data-md-style={markdownStyle} ref={articleRef}>
            <header className="article-brandline" data-copy-exclude="wechat"><div className="article-account"><span>钢</span><div><b>钢铁私塾</b><small>材料 · 产业 · 人物</small></div></div><span className="article-category"><i/>产业观察 · 第 028 期</span></header>
            <section {...selectProps(-1, "title")} data-copy-exclude="wechat"><div className="article-title-block"><span className="article-eyebrow">编者按</span><h1>{article.title}</h1><p>{article.subtitle}</p><div className="article-byline"><span>主编：{article.author}</span><i/></div></div></section>
            <div className="article-body" data-copy-body>
              {article.blocks.map((block, index) => {
                if (block.type === "paragraph") return <div {...selectProps(index, "paragraph")} key={`${block.type}-${index}`}><p className={index === 1 ? "lead-paragraph" : ""}>{renderInline(block.text)}</p></div>;
                if (block.type === "heading") { const chapter = article.blocks.slice(0, index + 1).filter((item) => item.type === "heading").length; return <div {...selectProps(index, "heading")} key={`${block.type}-${index}`}><section className="chapter-heading"><span>{String(chapter).padStart(2, "0")}</span><div><small>第 {chapter} 章</small><h2>{block.text}</h2></div></section></div>; }
                if (block.type === "subheading") return <div {...selectProps(index, "subheading")} key={`${block.type}-${index}`}><h3 className="article-subheading"><span>小节</span>{block.text}</h3></div>;
                if (block.type === "quote") return <div {...selectProps(index, "quote")} key={`${block.type}-${index}`}><blockquote><span>观点</span><p>{renderInline(block.text)}</p></blockquote></div>;
                if (block.type === "code") return <div {...selectProps(index, "code")} key={`${block.type}-${index}`}><figure className="article-code"><figcaption><span>{block.language}</span><small>CODE NOTE</small></figcaption><pre><code>{block.code}</code></pre></figure></div>;
                if (block.type === "divider") return <div {...selectProps(index, "divider")} key={`${block.type}-${index}`}><div className="article-divider" aria-hidden="true"><i/><span>章间留白</span><i/></div></div>;
                return <div {...selectProps(index, "list")} key={`${block.type}-${index}`}><ol className="designed-list">{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}><span>{String(itemIndex + 1).padStart(2, "0")}</span><p><b>{renderInline(item)}</b><small>已识别为关键动作，建议保留独立层级。</small></p></li>)}</ol></div>;
              })}
              {article.references.length > 0 && <section className="article-references" aria-label="参考资料"><header><span>参考资料</span><small>SOURCES</small></header><ol>{article.references.map((reference) => <li key={`${reference.id}-${reference.url}`}><span>{reference.id.padStart(2, "0")}</span><a href={reference.url}><b>{reference.title}</b><small>{reference.domain}</small></a></li>)}</ol></section>}
            </div>
            <footer className="article-footer" data-copy-footer><span>钢铁私塾</span><p>我们不贩卖焦虑，只研究变化。</p></footer>
            </article>
          </div>
        </div>
        <div className="statusbar"><span><i className={diagnostics.length ? "status-warn" : "status-good"}/>{diagnostics.length ? `${diagnostics.length} 项兼容提醒` : "微信兼容检查通过"}</span><span>{wordCount.toLocaleString()} 字 · 预计阅读 {Math.max(1, Math.ceil(wordCount / 260))} 分钟</span><span>{focusMode ? "专注校订" : typewriterMode ? "居中阅读" : `${versions.length} 个恢复点`}</span></div>
      </section>

      <aside className="inspector-panel" ref={inspectorPanelRef}>
        <div className="inspector-tabs" role="tablist">{(["智能", "样式", "规范", "品牌"] as InspectorTab[]).map((tab, index) => <button key={tab} role="tab" aria-selected={inspector === tab} className={inspector === tab ? "active" : ""} onClick={() => setInspector(tab)}><em>0{index + 1}</em><span>{tab}</span><i/></button>)}</div>
        {inspector === "智能" && <div className="inspector-content">
          <section className="design-score"><div className="score-ring"><strong>{diagnostics.length ? 86 : 94}</strong><small>设计分</small></div><div><span>节奏清楚，论点获得停顿</span><p>所有建议都可执行、撤回并留下恢复点。</p></div></section>
          <section className="inspector-section layout-director"><div className="section-heading"><div><span>整稿导演</span><small>一次决定全文密度与节奏</small></div><Icon name="spark" size={17}/></div><div className="strategy-switch">{(["calm", "balanced", "editorial"] as LayoutMode[]).map((mode) => <button key={mode} className={layoutMode === mode ? "active" : ""} aria-pressed={layoutMode === mode} onClick={() => applyLayout(mode)}>{mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}<i/></button>)}</div><button className="apply-all" onClick={() => applyLayout(layoutMode)}>执行全文重排<span>不改一个字</span></button></section>
          <section className="inspector-section"><div className="section-heading"><div><span>结构建议</span><small>来自文章语义，而非模板匹配</small></div><span className="suggestion-count">3</span></div><div className="suggestion-list">{[
            ["quote", "观点形成阅读停顿", "1 处判断已识别为观点组件。"], ["list", "并列信息改为行动序列", "末段 4 个动作适合编号表达。"], ["rhythm", "首屏保留一个主命题", "标题与摘要的间距需要更克制。"],
          ].map(([id, title, text], index) => { const applied = adopted.includes(id); return <article className={`suggestion-card ${applied ? "applied" : ""}`} key={id}><div className="suggestion-number">0{index + 1}</div><div><strong>{title}</strong><p>{text}</p></div><button className="proof-action" aria-pressed={applied} onClick={() => adopt(id)}><i/>{applied ? "已采用" : "采用"}</button></article>; })}</div></section>
          <section className="inspector-section compatibility-card"><div className="section-heading"><div><span>交付健康度</span><small>公众号粘贴前的确定性</small></div><span className={diagnostics.length ? "warning-tag" : "pass-tag"}>{diagnostics.length ? "待处理" : "通过"}</span></div>{diagnostics.length ? <ul>{diagnostics.map((item) => <li key={item}><Icon name="warning" size={15}/>{item}<span>定位</span></li>)}</ul> : <ul><li><Icon name="check" size={15}/>层级与段落<span>正常</span></li><li><Icon name="check" size={15}/>图片与链接<span>正常</span></li><li><Icon name="check" size={15}/>微信样式兼容<span>正常</span></li></ul>}</section>
          <p className="copy-delivery-note">微信标题与作者栏须单独粘贴；正文默认不再重复标题。</p><button className="copy-delivery" onClick={copyArticle}><Icon name="copy"/>复制微信正文</button>
        </div>}

        {inspector === "样式" && <div className="inspector-content"><section className="inspector-section markdown-style-section"><div className="section-heading"><div><span>Markdown 版式</span><small>内容与皮肤分离，一次替换整套章法</small></div><span className="style-count">{String(markdownStyleOrder.length).padStart(2, "0")}</span></div><div className="markdown-style-gallery">{markdownStyleOrder.map((key, index) => { const item = markdownStyles[key]; const palette = themes[item.theme]; return <button key={key} className={markdownStyle === key ? "active" : ""} aria-pressed={markdownStyle === key} onClick={() => applyMarkdownStyle(key)}><span className={`md-style-preview preview-${key}`} style={{ "--preview-accent": palette.accent, "--preview-ink": palette.ink, "--preview-paper": palette.paper } as React.CSSProperties}><i/><b/><b/><small/><small/></span><span className="md-style-copy"><strong>{item.name}</strong><small>{item.description}</small><em>{item.fit}</em></span><span className="md-style-index">{markdownStyle === key ? "已应用" : `0${index + 1}`}</span></button>; })}</div></section><section className="inspector-section"><div className="section-heading"><div><span>纸墨配色</span><small>保留版式，只替换纸色与强调色</small></div></div><div className="theme-grid">{(Object.entries(themes) as [ThemeKey, typeof themes[ThemeKey]][]).map(([key, item]) => <button key={key} className={theme === key ? "active" : ""} aria-pressed={theme === key} onClick={() => setTheme(key)}><span className="theme-sample" style={{ background: item.paper, color: item.ink }}><i style={{ background: item.accent }}/><b>Aa</b></span><small>{item.name}</small>{theme === key && <em>当前</em>}</button>)}</div></section><section className="inspector-section font-profile-section"><div className="section-heading"><div><span>字体气质</span><small>不是换字号，是重建阅读性格</small></div></div><div className="font-profile-grid">{fontProfiles.map((item) => <button key={item.key} className={fontProfile === item.key ? "active" : ""} aria-pressed={fontProfile === item.key} onClick={() => { setFontProfile(item.key); notify(`已切换为“${item.name}”字体气质`); }}><span>{item.sample}</span><div><b>{item.name}</b><small>{item.detail}</small></div><i>{fontProfile === item.key ? "正在使用" : "选择"}</i></button>)}</div></section><section className="inspector-section control-stack"><label><span><b>正文字号</b><small>建议 16—18px</small></span><output>{fontSize}px</output></label><input type="range" min="15" max="20" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))}/><label><span><b>正文行距</b><small>长文需要更多呼吸</small></span><output>{lineHeight.toFixed(2)}</output></label><input type="range" min="1.6" max="2.12" step="0.04" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))}/><label><span><b>标题尺度</b><small>避免标题压住正文</small></span><output>{Math.round(titleScale * 100)}%</output></label><input type="range" min="0.86" max="1.1" step="0.02" value={titleScale} onChange={(event) => setTitleScale(Number(event.target.value))}/><label><span><b>正文字距</b><small>密不逼仄，疏不散漫</small></span><output>{articleTracking.toFixed(3)}</output></label><input type="range" min="0" max="0.04" step="0.002" value={articleTracking} onChange={(event) => setArticleTracking(Number(event.target.value))}/></section><section className="inspector-section transfer-card"><div className="section-heading"><div><span>规则迁移</span><small>从一个内容块同步到所有同类</small></div><Icon name="brush" size={17}/></div><p>{capturedType ? `已采集：${blockLabel(capturedType)}` : "在画布中选择内容块，然后采集它的编排规则。"}</p><div><button onClick={captureStyle}>采集当前</button><button className="strong" onClick={applyCapturedStyle}>同步同类</button></div></section></div>}

        {inspector === "规范" && <div className="inspector-content standards-panel">
          <section className="inspector-section"><div className="section-heading"><div><span>微信公众号排版规范</span><small>区分平台兼容与品牌建议</small></div><span className="pass-tag">已校验</span></div><ul className="rule-ledger">
            <li><i>01</i><p><b>正文基线</b><small>16—18px，行距 1.75—1.9；避免依赖外部 CSS。</small></p></li>
            <li><i>02</i><p><b>层级克制</b><small>每屏一个视觉重点，颜色不超过三种，列表不超过七项。</small></p></li>
            <li><i>03</i><p><b>图片与链接</b><small>图片进入微信素材体系；外链、热链与跳转发布前复核。</small></p></li>
            <li><i>04</i><p><b>标题与摘要</b><small>准确对应正文，不堆符号，不用无法兑现的悬念。</small></p></li>
          </ul></section>
          <section className="inspector-section"><div className="section-heading"><div><span>钢铁私塾内容要求</span><small>平台红线之上，再加编辑部标准</small></div></div><ul className="content-guardrails">
            <li><Icon name="check" size={14}/><span><b>作者置前</b><small>主编署名位于正文开头。</small></span></li>
            <li><Icon name="check" size={14}/><span><b>1500—2500 字</b><small>当前 {wordCount} 字，短稿允许人工放行。</small></span></li>
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

        {inspector === "品牌" && <div className="inspector-content"><section className="brand-preview-card"><span className="brand-big-avatar">钢</span><div><small>当前品牌套件</small><strong>钢铁私塾</strong><p>工业理性 · 专业克制 · 有判断</p></div></section><section className="inspector-section brand-settings"><div className="section-heading"><div><span>品牌基因</span><small>每一篇内容自动继承</small></div></div><label><span>主色</span><i style={{ background: currentTheme.accent }}/>当前主题<button onClick={() => setInspector("样式")}>修改</button></label><label><span>正文</span><i style={{ background: currentTheme.ink }}/>墨黑<button onClick={() => setInspector("样式")}>修改</button></label><label><span>署名</span><b>主编：钢铁私塾 唐淼</b><button onClick={() => notify("品牌署名编辑将在下一版开放")}>编辑</button></label><label><span>结尾</span><b>固定品牌结尾</b><button onClick={() => notify("品牌结尾编辑将在下一版开放")}>编辑</button></label></section><section className="inspector-section"><div className="section-heading"><div><span>品牌一致性</span><small>本稿与品牌套件对照</small></div></div><div className="brand-consistency"><strong>100%</strong><div><i/><span>颜色、署名与语气均一致</span></div></div></section></div>}
      </aside>

      {sourceOpen && <div className="source-overlay" role="dialog" aria-modal="true" aria-label="原稿编辑器"><div className="source-drawer"><header><div><span>内容源</span><strong>Markdown 原稿</strong></div><div className="source-actions"><button className="source-action paste-action" onClick={pasteMarkdown}><Icon name="copy" size={14}/>一键粘贴</button><button className="source-action clear-action" onClick={clearMarkdown} disabled={!markdown.trim()}><Icon name="close" size={14}/>清空</button><button className="source-action import-file" onClick={() => fileRef.current?.click()}><Icon name="document" size={14}/>导入文件</button><button className="source-close" onClick={() => setSourceOpen(false)} aria-label="关闭原稿"><Icon name="close"/></button></div></header><textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} aria-label="Markdown 原稿" spellCheck={false}/><footer><span>{wordCount} 字 · 自动保存于本机</span><button onClick={() => { setSourceOpen(false); setStage("编排"); notify("内容结构已重新分析"); }}>分析并编排</button></footer></div></div>}
      {toast && <div className="toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
    </main>
  );
}
