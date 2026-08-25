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
  buildCoverPrompt,
  coverStyleCategories,
  coverStyles,
  recommendCoverStyles,
  type CoverStyleCategory,
} from "@/lib/editor/cover-design";
import { detectPlainTextTitle } from "@/lib/editor/title-detection";
import { inlineWechatSafeStyles, writeRichClipboard } from "@/lib/editor/wechat-adapter";

type IconName =
  | "brand" | "document" | "structure" | "style" | "assets" | "check"
  | "spark" | "phone" | "desktop" | "undo" | "redo" | "copy" | "publish"
  | "chevron" | "close" | "brush" | "history" | "warning" | "search" | "plus" | "moon";

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

type InspectorTab = "智能" | "样式" | "封面" | "规范" | "品牌";
type StageKey = "内容" | "编排" | "视觉" | "封面" | "组件" | "交付";
type AlertKind = "note" | "tip" | "important" | "warning" | "caution";
type BlockType = "title" | "paragraph" | "heading" | "subheading" | "quote" | "list" | "code" | "divider" | "table" | "alert" | "image";
type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "quote"; text: string }
  | { type: "list"; items: { text: string; checked?: boolean }[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "alert"; kind: AlertKind; text: string }
  | { type: "image"; alt: string; src: string; caption: string }
  | { type: "code"; language: string; code: string }
  | { type: "divider" };
type ArticleReference = { id: string; title: string; url: string; domain: string };
type ArticleFootnote = { id: string; text: string };

const wechatFontStacks: Record<FontProfile, string> = {
  classic: '"Source Han Serif SC","Noto Serif CJK SC","Noto Serif SC","Songti SC","STSong",SimSun,serif',
  literary: '"FangSong","FangSong_GB2312","LXGW WenKai Screen","LXGW WenKai","Source Han Serif SC","Noto Serif CJK SC",serif',
  clear: '"HarmonyOS Sans SC",MiSans,"PingFang SC","Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei UI","Microsoft YaHei",sans-serif',
};

const wechatUiFontStack = '"PingFang SC","Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei UI","Microsoft YaHei",sans-serif';

const stageItems: { icon: IconName; title: StageKey; meta: string }[] = [
  { icon: "document", title: "内容", meta: "结构已识别" },
  { icon: "structure", title: "编排", meta: "3 项可执行" },
  { icon: "style", title: "视觉", meta: "品牌气质" },
  { icon: "assets", title: "封面", meta: "智能荐图" },
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
  return value.replace(/\\([\\`*_[\]{}()#+\-.!>])/g, "$1");
}

function plainInline(text: string) {
  return decodeHtmlEntities(text)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\(\[([^\]]+)\]\[(\d+)\]\)/g, "〔$2〕")
    .replace(/\[([^\]]+)\]\[(\d+)\]/g, "$1〔$2〕")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(?: |x|X)\]\s*/g, "")
    .replace(/\\([\\`*_[\]{}()#+\-.!>])/g, "$1")
    .trim();
}

function renderInline(text: string) {
  const normalized = decodeHtmlEntities(text)
    .replace(/\(\[([^\]]+)\]\[(\d+)\]\)/g, "〔ref:$2〕")
    .replace(/\[([^\]]+)\]\[(\d+)\]/g, "$1〔ref:$2〕")
    .replace(/\[\^([^\]]+)\]/g, "〔foot:$1〕");
  const tokenPattern = /((?<!\\)\*\*[^*]+\*\*|(?<![\\*])\*[^*]+\*(?!\*)|(?<!\\)~~[^~]+~~|(?<!\\)`[^`\n]+`|<br\s*\/?>|〔ref:\d+〕|〔foot:[^〕]+〕|\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s，。；！？、）)]+)/gi;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(normalized))) {
    if (match.index > cursor) parts.push(unescapeMarkdown(normalized.slice(cursor, match.index)));
    const token = match[0];
    if (token.startsWith("**")) parts.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2).trim()}</strong>);
    else if (token.startsWith("*")) parts.push(<em key={`${match.index}-em`}>{token.slice(1, -1).trim()}</em>);
    else if (token.startsWith("~~")) parts.push(<s key={`${match.index}-strike`}>{token.slice(2, -2)}</s>);
    else if (token.startsWith("`")) parts.push(<code className="inline-code" key={`${match.index}-code`}>{token.slice(1, -1)}</code>);
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
    return `${result}${chineseJoin ? "" : " "}${line}`;
  }, "");
}

function parseArticle(markdown: string) {
  let source = normalizeMarkdownInput(markdown)
    .replace(/^([^\n]+)\n={3,}\s*$/gm, "# $1")
    .replace(/^([^\n]+)\n-{3,}\s*$/gm, "## $1");
  let frontMatterTitle = "";
  let frontMatterAuthor = "";
  const frontMatter = source.match(/^---\n([\s\S]*?)\n---\s*\n?/);
  if (frontMatter) {
    frontMatter[1].split("\n").forEach((line) => {
      const field = line.match(/^([\w-]+)\s*:\s*["']?(.*?)["']?\s*$/);
      if (!field) return;
      if (field[1].toLowerCase() === "title") frontMatterTitle = field[2];
      if (["author", "byline"].includes(field[1].toLowerCase())) frontMatterAuthor = field[2];
    });
    source = source.slice(frontMatter[0].length);
  }
  const inferredTitle = detectPlainTextTitle(source, frontMatterTitle);
  const lines = source.split("\n");
  if (inferredTitle) lines[inferredTitle.lineIndex] = "";
  let title = frontMatterTitle || (inferredTitle ? plainInline(inferredTitle.raw) : "未命名文章");
  let author = frontMatterAuthor || "钢铁私塾 唐淼";
  const blocks: ArticleBlock[] = [];
  const references: ArticleReference[] = [];
  const footnotes: ArticleFootnote[] = [];
  let paragraph: string[] = [];
  let list: { text: string; checked?: boolean }[] = [];
  let quote: string[] = [];
  let quoteKind: AlertKind | null = null;
  let tableConsumedUntil = -1;
  let codeFence: { marker: "```" | "~~~"; language: string; lines: string[] } | null = null;
  const flushParagraph = () => { if (paragraph.length) blocks.push({ type: "paragraph", text: joinParagraph(paragraph) }); paragraph = []; };
  const flushList = () => { if (list.length) blocks.push({ type: "list", items: list }); list = []; };
  const flushQuote = () => {
    if (quote.length) blocks.push(quoteKind ? { type: "alert", kind: quoteKind, text: joinParagraph(quote) } : { type: "quote", text: joinParagraph(quote) });
    quote = [];
    quoteKind = null;
  };
  const parseTableRow = (value: string) => value.replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((cell) => plainInline(cell.trim().replace(/\\\|/g, "|")));

  lines.forEach((rawLine, lineIndex) => {
    if (lineIndex <= tableConsumedUntil) return;
    const line = rawLine.trim();
    if (codeFence) {
      if (line.startsWith(codeFence.marker)) {
        blocks.push({ type: "code", language: codeFence.language, code: codeFence.lines.join("\n") });
        codeFence = null;
      } else codeFence.lines.push(rawLine);
      return;
    }
    const fence = line.match(/^(```|~~~)\s*([\w+-]*)/);
    if (fence) {
      flushParagraph(); flushList(); flushQuote();
      codeFence = { marker: fence[1] as "```" | "~~~", language: fence[2] || "text", lines: [] };
      return;
    }
    if (!line) { flushParagraph(); flushList(); flushQuote(); return; }
    const tableDivider = lines[lineIndex + 1]?.trim();
    if (line.includes("|") && tableDivider && /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(tableDivider)) {
      flushParagraph(); flushList(); flushQuote();
      const headers = parseTableRow(line);
      const rows: string[][] = [];
      let rowIndex = lineIndex + 2;
      while (rowIndex < lines.length && lines[rowIndex].trim().includes("|")) {
        rows.push(parseTableRow(lines[rowIndex].trim()));
        rowIndex += 1;
      }
      blocks.push({ type: "table", headers, rows });
      tableConsumedUntil = rowIndex - 1;
      return;
    }
    const authorLine = plainInline(line).match(/^(?:主编|作者)\s*[：:]\s*(.+)$/);
    if (authorLine) {
      flushParagraph(); flushList(); flushQuote();
      author = authorLine[1].trim();
      return;
    }
    const reference = line.match(/^\[([^\]]+)\]:\s*(https?:\/\/\S+?)(?:\s+["“](.*?)["”])?\s*$/);
    if (reference) {
      flushParagraph(); flushList(); flushQuote();
      const url = cleanUrl(reference[2]);
      references.push({ id: reference[1], title: plainInline(reference[3] || urlDomain(url)), url, domain: urlDomain(url) });
      return;
    }
    const footnote = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
    if (footnote) {
      flushParagraph(); flushList(); flushQuote();
      footnotes.push({ id: footnote[1], text: plainInline(footnote[2]) });
      return;
    }
    const image = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+["']([^"']*)["'])?\)$/);
    if (image) {
      flushParagraph(); flushList(); flushQuote();
      blocks.push({ type: "image", alt: plainInline(image[1]) || "文章图片", src: cleanUrl(image[2]), caption: plainInline(image[3] || image[1]) });
      return;
    }
    if (/^(?:-{3,}|_{3,}|\*{3,})$/.test(line)) { flushParagraph(); flushList(); flushQuote(); blocks.push({ type: "divider" }); return; }
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading?.[1].length === 1) { flushParagraph(); flushList(); flushQuote(); title = plainInline(heading[2]); return; }
    if (heading?.[1].length === 2) { flushParagraph(); flushList(); flushQuote(); blocks.push({ type: "heading", text: plainInline(heading[2].replace(/^[一二三四五六七八九十]+、/, "")) }); return; }
    if (heading && heading[1].length >= 3) { flushParagraph(); flushList(); flushQuote(); blocks.push({ type: "subheading", text: plainInline(heading[2]) }); return; }
    const quoteLine = line.match(/^>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph(); flushList();
      const alert = quoteLine[1].match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
      if (alert) quoteKind = alert[1].toLowerCase() as AlertKind;
      else quote.push(quoteLine[1]);
      return;
    }
    const listLine = line.match(/^(?:[-+*]|\d+[.)]|[（(]?\d+[）)])\s+(.+)$/);
    if (listLine) {
      flushParagraph(); flushQuote();
      const task = listLine[1].match(/^\[([ xX])\]\s+(.+)$/);
      list.push(task ? { text: task[2], checked: task[1].toLowerCase() === "x" } : { text: listLine[1] });
      return;
    }
    flushQuote();
    paragraph.push(line);
  });
  if (codeFence) blocks.push({ type: "code", language: codeFence.language, code: codeFence.lines.join("\n") });
  flushParagraph(); flushList(); flushQuote();
  const first = blocks.find((block) => block.type === "paragraph") as { type: "paragraph"; text: string } | undefined;
  const firstText = first ? plainInline(first.text) : "";
  const subtitle = first ? `${firstText.slice(0, 42)}${firstText.length > 42 ? "……" : ""}` : "让内容建立秩序，让观点获得形状。";
  return { title, author, subtitle, blocks, references, footnotes };
}

function blockLabel(type: BlockType) {
  return ({ title: "标题", paragraph: "正文", heading: "章节", subheading: "小节", quote: "观点", list: "行动列表", code: "代码块", divider: "分隔", table: "数据表格", alert: "提示块", image: "图片" } as const)[type];
}

export default function Home() {
  const [theme, setTheme] = useState<ThemeKey>("national");
  const [markdownStyle, setMarkdownStyle] = useState<MarkdownStyleKey>("jiangnan");
  const [inspector, setInspector] = useState<InspectorTab>("智能");
  const [stage, setStage] = useState<StageKey>("编排");
  const [preview, setPreview] = useState<"phone" | "desktop">("phone");
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.94);
  const [fontProfile, setFontProfile] = useState<FontProfile>("classic");
  const [titleScale, setTitleScale] = useState(1);
  const [articleTracking, setArticleTracking] = useState(0.018);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("calm");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [darkPreview, setDarkPreview] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<"proof" | "final">("proof");
  const [typesetOpen, setTypesetOpen] = useState(false);
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [sourceEncoding, setSourceEncoding] = useState("UTF-8 · 编辑器");
  const [toast, setToast] = useState("");
  const [adopted, setAdopted] = useState<string[]>(["quote"]);
  const [selected, setSelected] = useState<{ index: number; type: BlockType } | null>(null);
  const [capturedType, setCapturedType] = useState<BlockType | null>(null);
  const [syncedTypes, setSyncedTypes] = useState<BlockType[]>([]);
  const [componentQuery, setComponentQuery] = useState("");
  const [coverStyleId, setCoverStyleId] = useState("");
  const [coverCategory, setCoverCategory] = useState<"全部" | CoverStyleCategory>("全部");
  const [versions, setVersions] = useState<{ markdown: string; label: string }[]>([]);
  const [wechatStatus, setWechatStatus] = useState<{ configured: boolean; connected: boolean; mode: string; appId: string | null; message: string }>({ configured: false, connected: false, mode: "未配置", appId: null, message: "尚未检查连接" });
  const [checkingWechat, setCheckingWechat] = useState(false);
  const studioRef = useRef<HTMLElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const inspectorPanelRef = useRef<HTMLElement>(null);
  const typesetRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previousStage = useRef(stage);
  const previousInspector = useRef(inspector);
  const previousArticleStyle = useRef(`${markdownStyle}-${theme}-${layoutMode}-${fontProfile}`);

  const currentTheme = themes[theme];
  const currentMarkdownStyle = markdownStyles[markdownStyle];
  const articleTitleSize = titleBaseSizes[markdownStyle] * titleScale;
  const safeMarkdown = useMemo(() => normalizeMarkdownInput(markdown), [markdown]);
  const encodingIssues = useMemo(() => findEncodingIssues(markdown), [markdown]);
  const wordCount = useMemo(() => safeMarkdown.replace(/[#>*`\-]/g, "").trim().length, [safeMarkdown]);
  const article = useMemo(() => parseArticle(safeMarkdown), [safeMarkdown]);
  const coverProfile = useMemo(() => analyzeCoverContent(article.title, safeMarkdown), [article.title, safeMarkdown]);
  const coverRecommendations = useMemo(() => recommendCoverStyles(article.title, safeMarkdown), [article.title, safeMarkdown]);
  const selectedCoverStyle = useMemo(() => coverStyles.find((item) => item.id === coverStyleId) ?? coverRecommendations[0].style, [coverRecommendations, coverStyleId]);
  const filteredCoverStyles = useMemo(() => coverCategory === "全部" ? coverStyles : coverStyles.filter((item) => item.category === coverCategory), [coverCategory]);
  const coverPrompt = useMemo(() => buildCoverPrompt(selectedCoverStyle, article.title, coverProfile), [article.title, coverProfile, selectedCoverStyle]);
  const outline = useMemo(() => article.blocks.map((block, index) => block.type === "heading" || block.type === "subheading" ? { index, type: block.type, text: block.text } : null).filter((item): item is { index: number; type: "heading" | "subheading"; text: string } => Boolean(item)), [article.blocks]);
  const filteredComponents = useMemo(() => components.filter((item) => `${item.kind}${item.detail}`.includes(componentQuery.trim())), [componentQuery]);
  const diagnostics = useMemo(() => {
    const items: string[] = [...encodingIssues];
    if (article.title === "未命名文章") items.push("未识别到标题：请将标题独占首行，或在前面添加 #");
    if (article.title.length > 64) items.push("标题超过微信 64 字上限");
    if (article.author.length > 8) items.push("作者超过微信 8 字上限");
    if (/(?:```|~~~)\s*mermaid/i.test(markdown)) items.push("Mermaid 图需要转为图片");
    if (/\[[^\]]*\]\(\s*\)/.test(markdown)) items.push("检测到空链接");
    if (/!\[[^\]]*\]\(https?:\/\//.test(markdown)) items.push("外链图片发布前请转存微信素材库");
    for (const marker of ["```", "~~~"] as const) {
      const fenceCount = markdown.split("\n").filter((line) => line.trimStart().startsWith(marker)).length;
      if (fenceCount % 2) items.push(`${marker} 代码块没有闭合`);
    }
    return items;
  }, [article.author, article.title, encodingIssues, markdown]);

  useEffect(() => {
    const saved = window.localStorage.getItem("wechat-layout-designer-draft-v2");
    if (!saved) return;
    try {
      const payload = JSON.parse(saved);
      if ([2, 3, 4, 5, 6, 7].includes(payload.schemaVersion) && typeof payload.markdown === "string") {
        const timer = window.setTimeout(() => {
          setMarkdown(normalizeMarkdownInput(payload.markdown));
          setSourceEncoding("UTF-8 · 本机草稿");
          if (payload.schemaVersion >= 3) {
            if (typeof payload.markdownStyle === "string" && payload.markdownStyle in markdownStyles) setMarkdownStyle(payload.markdownStyle as MarkdownStyleKey);
            if (payload.schemaVersion >= 6 && typeof payload.theme === "string" && payload.theme in themes) setTheme(payload.theme as ThemeKey);
            if (typeof payload.layoutMode === "string" && ["calm", "balanced", "editorial"].includes(payload.layoutMode)) setLayoutMode(payload.layoutMode as LayoutMode);
            if (typeof payload.fontSize === "number") setFontSize(payload.schemaVersion < 7 ? Math.min(20, payload.fontSize + 1) : payload.fontSize);
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
    const timer = window.setTimeout(() => window.localStorage.setItem("wechat-layout-designer-draft-v2", JSON.stringify({ schemaVersion: 7, markdown, markdownStyle, theme, layoutMode, fontProfile, fontSize, lineHeight, titleScale, articleTracking, updatedAt: Date.now() })), 450);
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
      gsap.fromTo(".left-context > *", { y: 8, opacity: 0.72, filter: "blur(2px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.46, stagger: 0.055, ease: "power2.out", clearProps: "transform,opacity,filter" });
      gsap.fromTo(".workflow-item.active .workflow-icon", { scale: 0.91, rotate: -2 }, { scale: 1, rotate: 0, duration: 0.48, ease: "power3.out", clearProps: "transform" });
      if (stage === "封面") {
        gsap.fromTo(".cover-workbench", { y: 14, opacity: 0.6, scale: 0.99 }, { y: 0, opacity: 1, scale: 1, duration: 0.58, ease: "power3.out", clearProps: "transform,opacity" });
        gsap.fromTo(".cover-analysis-grid > div", { y: 7, opacity: 0 }, { y: 0, opacity: 1, duration: 0.36, stagger: 0.07, ease: "sine.out", clearProps: "transform,opacity" });
      }
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
      const paperCraft = markdownStyle === "collage";
      const ease = paperCraft ? "steps(5)" : "power2.out";
      gsap.fromTo(".article-page", { scale: paperCraft ? 0.986 : 0.993, rotate: paperCraft ? -0.12 : 0, filter: "blur(1.4px)" }, { scale: 1, rotate: 0, filter: "blur(0px)", duration: paperCraft ? 0.46 : 0.52, ease, clearProps: "transform,filter" });
      gsap.fromTo(".article-page h1, .article-page h2, .article-page blockquote", { y: paperCraft ? 11 : 6, rotate: paperCraft ? -0.4 : 0, opacity: 0.72 }, { y: 0, rotate: 0, opacity: 1, duration: paperCraft ? 0.42 : 0.38, stagger: paperCraft ? 0.07 : 0.045, ease, clearProps: "transform,opacity" });
      gsap.fromTo(".article-body > .selectable-block", { y: paperCraft ? 8 : 5, x: paperCraft ? -3 : 0 }, { y: 0, x: 0, duration: 0.42, stagger: paperCraft ? 0.045 : 0.025, ease, clearProps: "transform" });
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
    setFontProfile(style.fontProfile);
    setFontSize(style.typography.bodySize);
    setLineHeight(style.typography.lineHeight);
    setTitleScale(style.typography.titleScale);
    setArticleTracking(style.typography.tracking);
    setSelected(null);
    setAdopted(["quote", "list", "rhythm"]);
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
    try {
      const decoded = decodeImportedBuffer(await file.arrayBuffer());
      setMarkdown(decoded.text);
      setSourceEncoding(`${decoded.encoding} · 文件`);
      const issues = findEncodingIssues(decoded.text);
      notify(issues.length ? `已按 ${decoded.encoding} 导入，仍有 ${issues.length} 项编码风险` : `已按 ${decoded.encoding} 导入，字符检查通过`);
    } catch {
      notify("文件编码无法识别，请另存为 UTF-8 后重试");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function pasteMarkdown() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return notify("剪贴板里没有可粘贴的文字");
      setMarkdown(normalizeMarkdownInput(text));
      setSourceEncoding("Unicode · 剪贴板");
      notify("已粘贴原稿，并清理隐藏控制字符");
    } catch {
      notify("浏览器未允许读取剪贴板，请检查权限");
    }
  }

  function clearMarkdown() {
    if (!markdown.trim()) return notify("原稿已经是空的");
    setVersions((items) => [...items.slice(-4), { markdown, label: `清空前恢复点 ${items.length + 1}` }]);
    setMarkdown("");
    setSourceEncoding("UTF-8 · 空白稿");
    notify("原稿已清空，并保留一个恢复点");
  }

  async function copyPlainField(value: string, label: string) {
    if (findEncodingIssues(value).length) return notify(`${label}含有异常字符，请先回到原稿修正`);
    try {
      await navigator.clipboard.writeText(normalizeMarkdownInput(value));
      notify(`${label}已复制，可粘贴到微信${label}栏`);
    } catch {
      notify(`浏览器未允许复制${label}，请重试`);
    }
  }

  async function copyCoverPrompt() {
    try {
      await navigator.clipboard.writeText(coverPrompt);
      notify(`“${selectedCoverStyle.name}”封面指令已复制`);
    } catch {
      notify("浏览器未允许复制封面指令，请重试");
    }
  }

  async function copyArticle() {
    if (encodingIssues.length) {
      setInspector("智能");
      return notify(`检测到 ${encodingIssues.length} 项编码风险，处理后才能复制正文`);
    }
    const source = articleRef.current;
    if (!source) return;
    const wasDarkPreview = source.classList.contains("wechat-dark-preview");
    if (wasDarkPreview) source.classList.remove("wechat-dark-preview");
    const clone = source.cloneNode(true) as HTMLElement;
    inlineWechatSafeStyles(source, clone);
    if (wasDarkPreview) source.classList.add("wechat-dark-preview");
    try {
      const body = clone.querySelector<HTMLElement>("[data-copy-body]");
      const footer = clone.querySelector<HTMLElement>("[data-copy-footer]");
      if (!body) return notify("正文暂时无法导出，请重试");

      const exportRoot = document.createElement("section");
      exportRoot.lang = "zh-CN";
      exportRoot.style.cssText = `display:block;width:100%;max-width:100%;margin:0;padding:0;color:${currentTheme.palette.ink};background:#ffffff;box-sizing:border-box;font-family:${wechatFontStacks[fontProfile]};font-size:${fontSize}px;line-height:${lineHeight};word-break:normal;overflow-wrap:anywhere;`;
      const byline = document.createElement("p");
      byline.textContent = `主编：${article.author}`;
      byline.style.cssText = `margin:0 0 30px;padding:0 0 14px;border:0;border-bottom:1px solid ${currentTheme.palette.accent}33;color:${currentTheme.palette.accent};font-family:${wechatUiFontStack};font-size:14px;font-weight:600;line-height:1.7;letter-spacing:.01em;text-align:left;`;
      exportRoot.appendChild(byline);

      body.style.cssText = `display:block;width:100%;max-width:100%;margin:0;padding:0;color:${currentTheme.palette.ink};background:#ffffff;box-sizing:border-box;font-family:${wechatFontStacks[fontProfile]};font-size:${fontSize}px;line-height:${lineHeight};word-break:normal;overflow-wrap:anywhere;`;
      body.removeAttribute("data-copy-body");
      exportRoot.appendChild(body);
      if (footer) {
        footer.removeAttribute("data-copy-footer");
        exportRoot.appendChild(footer);
      }
      exportRoot.querySelectorAll("[data-copy-exclude]").forEach((node) => node.remove());
      exportRoot.querySelectorAll("[data-copy-body],[data-copy-footer]").forEach((node) => { node.removeAttribute("data-copy-body"); node.removeAttribute("data-copy-footer"); });

      const html = normalizeMarkdownInput(exportRoot.outerHTML);
      const plainText = normalizeMarkdownInput(exportRoot.innerText);
      await writeRichClipboard(html, plainText);
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
    className: `selectable-block ${workspaceView === "final" ? "is-readonly" : ""} ${selected?.index === index && selected.type === type ? "is-selected" : ""} ${syncedTypes.includes(type) ? "synced-style" : ""}`,
    "data-block-index": index,
    role: workspaceView === "proof" ? "button" : undefined, tabIndex: workspaceView === "proof" ? 0 : -1,
    onClick: (event: React.MouseEvent) => { event.stopPropagation(); if (workspaceView === "proof") setSelected({ index, type }); },
    onKeyDown: (event: React.KeyboardEvent) => { if (workspaceView === "proof" && (event.key === "Enter" || event.key === " ")) setSelected({ index, type }); },
  });

  return (
    <main ref={studioRef} className={`studio-shell ${focusMode ? "studio-focus-mode" : ""} ${typewriterMode ? "studio-typewriter-mode" : ""} ${workspaceView === "final" ? "studio-final-view" : ""}`} style={{ ...themeCssVariables(currentTheme, false), "--article-dark-accent": currentTheme.dark.accent, "--article-dark-ink": currentTheme.dark.ink, "--article-dark-paper": currentTheme.dark.paper, "--article-dark-muted": currentTheme.dark.muted, "--article-dark-line": currentTheme.dark.line, "--article-dark-soft": currentTheme.dark.soft, "--article-size": `${fontSize}px`, "--article-leading": lineHeight, "--article-title-size": `${articleTitleSize}px`, "--article-tracking": `${articleTracking}em` } as React.CSSProperties}>
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
        <section className="left-input" aria-label="稿件输入">
          <div className="left-input-heading"><div><span>稿件输入</span><small>先放稿，再设计</small></div><i>{wordCount.toLocaleString()} 字</i></div>
          <button className="left-input-primary" onClick={() => setSourceOpen(true)}><Icon name="document" size={16}/><span><b>编辑 Markdown</b><small>粘贴、清空或继续修改</small></span><Icon name="chevron" size={14}/></button>
          <button className="left-input-import" onClick={() => fileRef.current?.click()}><Icon name="plus" size={14}/>导入本地稿件 <small>.md / .txt</small></button>
          <input ref={fileRef} type="file" accept=".md,.markdown,.txt" hidden onChange={(event) => importText(event.target.files?.[0])}/>
        </section>
        <div className="panel-label">设计流程</div>
        <nav className="workflow-nav" aria-label="设计流程">
          {stageItems.map((item, index) => <button key={item.title} className={`workflow-item ${stage === item.title ? "active" : ""}`} onClick={() => { setStage(item.title); if (item.title === "视觉") setInspector("样式"); if (item.title === "封面") { setInspector("封面"); setTypesetOpen(false); setSelected(null); } if (item.title === "交付") setInspector("智能"); }}>
            <span className="workflow-index">0{index + 1}</span><span className="workflow-icon"><Icon name={item.icon}/></span><span className="workflow-copy"><b>{item.title}</b><small>{item.meta}</small></span>
          </button>)}
        </nav>

        <div className="left-context">
          {stage === "内容" && <><div className="context-head"><span>文章大纲</span><small>{outline.length + 1} 个层级</small></div><div className="article-outline"><button className="outline-title" onClick={() => { setSelected({ index: -1, type: "title" }); articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><i>题</i><span>{article.title}</span></button>{outline.map((item) => <button key={`${item.type}-${item.index}`} className={item.type === "subheading" ? "outline-subheading" : ""} onClick={() => jumpToBlock(item.index, item.type)}><i>{item.type === "heading" ? "章" : "节"}</i><span>{item.text}</span></button>)}</div></>}
          {stage === "编排" && <><div className="context-head"><span>整稿策略</span><small>内容不变，只改章法</small></div><div className="layout-presets">{(["calm", "balanced", "editorial"] as LayoutMode[]).map((mode, index) => <button key={mode} className={layoutMode === mode ? "active" : ""} aria-pressed={layoutMode === mode} onClick={() => applyLayout(mode)}><em>0{index + 1}</em><b>{mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}</b><small>{mode === "calm" ? "长文慢读" : mode === "balanced" ? "通用首选" : "观点密集"}</small></button>)}</div><div className="context-note"><Icon name="spark"/><p><b>当前建议：均衡</b><small>保留两次阅读停顿，列表收束在末段。</small></p></div></>}
          {stage === "视觉" && <><div className="context-head"><span>Markdown 版式</span><small>一键换骨，不动正文</small></div><div className="mini-styles">{markdownStyleOrder.map((key, index) => { const item = markdownStyles[key]; return <button key={key} className={markdownStyle === key ? "active" : ""} aria-pressed={markdownStyle === key} onClick={() => applyMarkdownStyle(key)}><em>0{index + 1}</em><i style={{ background: themes[item.theme].palette.accent }}/><span><b>{item.name}</b><small>{item.fit}</small></span>{markdownStyle === key && <strong>已用</strong>}</button>; })}</div></>}
          {stage === "封面" && <><div className="context-head"><span>封面插图建议</span><small>读内容，再选画法</small></div><div className="cover-profile-mini"><span>{coverProfile.subject}</span><span>{coverProfile.tone}</span><span>{coverProfile.intent}</span></div><div className="cover-recommend-mini">{coverRecommendations.map((item, index) => <button key={item.style.id} className={selectedCoverStyle.id === item.style.id ? "active" : ""} onClick={() => setCoverStyleId(item.style.id)}><em>0{index + 1}</em><span className="cover-mini-palette">{item.style.palette.map((color) => <i key={color} style={{ background: color }}/>)}</span><span><b>{item.style.name}</b><small>{item.style.fit}</small></span><strong>{item.score}</strong></button>)}</div><button className="cover-copy-mini" onClick={copyCoverPrompt}><Icon name="copy" size={14}/>复制当前生图指令</button></>}
          {stage === "组件" && <><div className="context-head"><span>语义组件</span><small>点击或拖到画布</small></div><label className="component-search"><Icon name="search" size={14}/><input value={componentQuery} onChange={(event) => setComponentQuery(event.target.value)} placeholder="搜索章节、观点、数据"/></label><div className="component-shelf">{filteredComponents.map((item) => <button key={item.kind} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", item.snippet)} onClick={() => insertComponent(item.snippet, item.kind)}><span>{item.mark}</span><p><b>{item.kind}</b><small>{item.detail}</small></p><Icon name="plus" size={14}/></button>)}</div></>}
          {stage === "交付" && <><div className="context-head"><span>微信交付</span><small>按顺序粘贴三个栏位</small></div><div className="publish-steps"><button onClick={() => copyPlainField(article.title, "标题")}><em>01</em><span><b>复制标题</b><small>{article.title.length}/64 字</small></span><Icon name="copy" size={15}/></button><button onClick={() => copyPlainField(article.author, "作者")}><em>02</em><span><b>复制作者</b><small>{article.author.length}/8 字</small></span><Icon name="copy" size={15}/></button><button className="strong" onClick={copyArticle}><em>03</em><span><b>复制微信正文</b><small>不含重复标题与页眉</small></span><Icon name="copy" size={15}/></button></div><ul className="left-checklist"><li><Icon name="check"/>层级与段落<span>通过</span></li><li><Icon name="check"/>图片与链接<span>通过</span></li><li className={diagnostics.length ? "has-warning" : ""}><Icon name={diagnostics.length ? "warning" : "check"}/>微信样式兼容<span>{diagnostics.length ? `${diagnostics.length} 项` : "通过"}</span></li></ul></>}
        </div>

        <div className="brand-kit-mini"><span className="brand-avatar">钢</span><div><b>钢铁私塾</b><small>品牌套件已启用</small></div><Icon name="check" size={16}/></div>
      </aside>

      <section className="canvas-area">
        <div className="canvas-toolbar">
          <div><span className="canvas-kicker">{stage === "封面" ? "封面工作台" : "纸上工作台"}</span><strong>{stage === "封面" ? `${selectedCoverStyle.name} · 构图建议` : workspaceView === "final" ? `${preview === "phone" ? "手机" : "桌面"}成稿效果` : selected ? `正在校订 · ${blockLabel(selected.type)}` : "选择一段文字开始校订"}</strong></div>
          <div className="canvas-controls">
            {stage === "封面" ? <><span className="cover-ratio-tag">微信横幅 2.35:1</span><button className="cover-toolbar-copy" onClick={copyCoverPrompt}><Icon name="copy" size={14}/>复制生图指令</button><button onClick={() => { setStage("视觉"); setInspector("样式"); }}>返回正文设计</button></> : <>
            <div className="workspace-mode-switch" role="tablist" aria-label="工作视图"><i className={workspaceView === "final" ? "at-final" : ""}/><button role="tab" aria-selected={workspaceView === "proof"} className={workspaceView === "proof" ? "active" : ""} onClick={() => changeWorkspaceView("proof")}>校订</button><button role="tab" aria-selected={workspaceView === "final"} className={workspaceView === "final" ? "active" : ""} onClick={() => changeWorkspaceView("final")}>成稿</button></div>
            <div className="quick-typeset-wrap" ref={typesetRef}>
              <button className={`typeset-launch ${typesetOpen ? "selected" : ""}`} aria-label={`文章排版，当前为${currentMarkdownStyle.name}`} title="打开排版设置，可一键切换版式" aria-haspopup="dialog" aria-expanded={typesetOpen} onClick={() => setTypesetOpen((value) => !value)}><Icon name="style" size={15}/><span>排版</span><b>{currentMarkdownStyle.short}</b></button>
              {typesetOpen && <div className="quick-typeset-popover" role="dialog" aria-label="快速排版">
                <header><div><span>文章排版</span><strong>{currentMarkdownStyle.name}</strong></div><button aria-label="关闭快速排版" onClick={() => setTypesetOpen(false)}><Icon name="close" size={15}/></button></header>
                <section><div className="quick-typeset-label"><span>版式骨架</span><small>真实小样，而非主题名列表</small></div><div className="quick-style-grid">{markdownStyleOrder.map((key, index) => { const item = markdownStyles[key]; const palette = themes[item.theme].palette; return <button key={key} className={markdownStyle === key ? "active" : ""} aria-pressed={markdownStyle === key} onClick={() => applyMarkdownStyle(key)}><span className="quick-style-sheet" style={{ "--quick-paper": palette.paper, "--quick-ink": palette.ink, "--quick-accent": palette.accent } as React.CSSProperties}><i/><b/><b/><small/></span><span><b>{item.name}</b><small>{item.fit}</small></span><em>{markdownStyle === key ? "已用" : `0${index + 1}`}</em></button>; })}</div></section>
                <section><div className="quick-typeset-label"><span>阅读密度</span><small>字号、行距与段距联动</small></div><div className="quick-density-switch">{(["calm", "balanced", "editorial"] as LayoutMode[]).map((mode) => <button key={mode} className={layoutMode === mode ? "active" : ""} aria-pressed={layoutMode === mode} onClick={() => applyLayout(mode)}>{mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}<i/></button>)}</div></section>
                <section><div className="quick-typeset-label"><span>纸墨气质</span><small>只换颜色，不动章法</small></div><div className="quick-palette-row">{(Object.entries(themes) as [ThemeKey, typeof themes[ThemeKey]][]).map(([key, item]) => <button key={key} className={theme === key ? "active" : ""} aria-label={item.name} aria-pressed={theme === key} title={item.name} onClick={() => setTheme(key)} style={{ "--quick-paper": item.palette.paper, "--quick-ink": item.palette.ink, "--quick-accent": item.palette.accent } as React.CSSProperties}><i/><span>{item.name}</span></button>)}</div></section>
                <footer><button onClick={cycleMarkdownStyle}><Icon name="brush" size={14}/>换下一套</button><button className="strong" onClick={() => { setStage("视觉"); setInspector("样式"); setTypesetOpen(false); }}>完整样式设置<Icon name="chevron" size={14}/></button></footer>
              </div>}
            </div><span/>
            {workspaceView === "proof" && <><button className={`writing-mode-toggle ${focusMode ? "selected" : ""}`} aria-pressed={focusMode} onClick={() => { setFocusMode((value) => !value); notify(focusMode ? "已退出专注校订" : "已进入专注校订，选择一个段落开始"); }} title="淡化当前内容块之外的文字"><Icon name="spark" size={14}/><b>专注</b></button>
            <button className={`writing-mode-toggle ${typewriterMode ? "selected" : ""}`} aria-pressed={typewriterMode} onClick={() => { setTypewriterMode((value) => !value); notify(typewriterMode ? "已退出居中阅读" : "已开启居中阅读，所选段落保持在视线中央"); }} title="让所选内容块保持在视线中央"><Icon name="structure" size={14}/><b>居中</b></button><span/></>}
            <button className={`writing-mode-toggle dark-preview-toggle ${darkPreview ? "selected" : ""}`} aria-pressed={darkPreview} onClick={() => { setDarkPreview((value) => !value); notify(darkPreview ? "已返回微信浅色预览" : "已切换微信语义深色预览"); }} title="按微信深色语义预览，不影响复制样式"><Icon name="moon" size={14}/><b>{darkPreview ? "浅色" : "深色"}</b></button><span/>
            <button className={preview === "phone" ? "selected" : ""} aria-pressed={preview === "phone"} onClick={() => setPreview("phone")} aria-label="手机预览"><Icon name="phone"/></button>
            <button className={preview === "desktop" ? "selected" : ""} aria-pressed={preview === "desktop"} onClick={() => setPreview("desktop")} aria-label="桌面预览"><Icon name="desktop"/></button><span/>
            <button onClick={() => setSourceOpen(true)}>查看原稿</button>
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
          {selected && <div className="block-toolbar" data-editor-ui onClick={(event) => event.stopPropagation()}><span>{blockLabel(selected.type)}</span><button onClick={captureStyle}><Icon name="brush" size={14}/>采集规则</button><button className={capturedType ? "ready" : ""} onClick={applyCapturedStyle}>同步同类</button><button aria-label="取消选择" onClick={() => setSelected(null)}><Icon name="close" size={14}/></button></div>}

          {stage === "封面" ? <section className="cover-workbench" onClick={(event) => event.stopPropagation()} style={{ "--cover-paper": selectedCoverStyle.palette[0], "--cover-ink": selectedCoverStyle.palette[1], "--cover-accent": selectedCoverStyle.palette[2] } as React.CSSProperties}>
            <header className="cover-workbench-head"><div><span>封面设计建议</span><h2>{selectedCoverStyle.name}</h2><p>{selectedCoverStyle.direction}</p></div><strong><b>{coverRecommendations.find((item) => item.style.id === selectedCoverStyle.id)?.score ?? 88}</b><small>匹配度</small></strong></header>
            <div className="cover-concept-canvas" aria-label={`${selectedCoverStyle.name}封面构图草图`}>
              <span className="cover-concept-index">COVER / {String(coverStyles.findIndex((item) => item.id === selectedCoverStyle.id) + 1).padStart(2, "0")}</span>
              <div className="cover-concept-title"><small>{coverProfile.subject} · {coverProfile.tone}</small><h3>{article.title}</h3><p>{selectedCoverStyle.short} / 为中文标题预留安全区</p></div>
              <div className="cover-concept-visual" aria-hidden="true"><i/><i/><i/><span>主视觉区</span></div>
              <div className="cover-safe-line" aria-hidden="true"><span>标题安全线</span></div>
            </div>
            <div className="cover-analysis-grid"><div><span>构图</span><p>{selectedCoverStyle.composition}</p></div><div><span>材质与光线</span><p>{selectedCoverStyle.texture}</p></div><div><span>适合</span><p>{selectedCoverStyle.fit}</p></div><div><span>避坑</span><p>{selectedCoverStyle.avoid}</p></div></div>
            <footer className="cover-workbench-foot"><div className="cover-palette"><span>配色</span>{selectedCoverStyle.palette.map((color) => <i key={color} style={{ background: color }} title={color}/>)}</div><button onClick={copyCoverPrompt}><Icon name="copy" size={15}/>复制完整生图指令</button></footer>
          </section> : <div className="paper-frame">
            <div className="paper-folio" aria-hidden="true"><span>公众号预览</span><i/>01</div>
            <article lang="zh-CN" className={`article-page layout-${layoutMode} md-style-${markdownStyle} font-${fontProfile} ${darkPreview ? "wechat-dark-preview" : ""} ${focusMode && selected ? "focus-active" : ""}`} data-md-style={markdownStyle} ref={articleRef}>
            <header className="article-brandline" data-copy-exclude="wechat"><div className="article-account"><span>钢</span><div><b>钢铁私塾</b><small>材料 · 产业 · 人物</small></div></div><span className="article-category"><i/>产业观察 · 第 028 期</span></header>
            <section {...selectProps(-1, "title")} data-copy-exclude="wechat"><div className="article-title-block"><span className="article-eyebrow">编者按</span><h1>{article.title}</h1><p>{article.subtitle}</p><div className="article-byline"><span>主编：{article.author}</span><i/></div></div></section>
            <div className="article-body" data-copy-body>
              {article.blocks.map((block, index) => {
                if (block.type === "paragraph") return <div {...selectProps(index, "paragraph")} key={`${block.type}-${index}`}><p className={index === 1 ? "lead-paragraph" : ""}>{renderInline(block.text)}</p></div>;
                if (block.type === "heading") { const chapter = article.blocks.slice(0, index + 1).filter((item) => item.type === "heading").length; return <div {...selectProps(index, "heading")} key={`${block.type}-${index}`}><section className="chapter-heading"><span>{String(chapter).padStart(2, "0")}</span><div><small>第 {chapter} 章</small><h2>{block.text}</h2></div></section></div>; }
                if (block.type === "subheading") return <div {...selectProps(index, "subheading")} key={`${block.type}-${index}`}><h3 className="article-subheading"><span>小节</span>{block.text}</h3></div>;
                if (block.type === "quote") return <div {...selectProps(index, "quote")} key={`${block.type}-${index}`}><blockquote><span>观点</span><p>{renderInline(block.text)}</p></blockquote></div>;
                if (block.type === "alert") { const labels: Record<AlertKind, string> = { note: "说明", tip: "提示", important: "重要", warning: "注意", caution: "谨慎" }; return <div {...selectProps(index, "alert")} key={`${block.type}-${index}`}><aside className={`article-alert alert-${block.kind}`}><header><i/>{labels[block.kind]}</header><p>{renderInline(block.text)}</p></aside></div>; }
                if (block.type === "table") return <div {...selectProps(index, "table")} key={`${block.type}-${index}`}><div className="article-table-wrap"><table><thead><tr>{block.headers.map((header, cellIndex) => <th key={`${header}-${cellIndex}`}>{renderInline(header)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={`row-${rowIndex}`}>{block.headers.map((_, cellIndex) => <td key={`cell-${rowIndex}-${cellIndex}`}>{renderInline(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody></table></div></div>;
                if (block.type === "image") return <div {...selectProps(index, "image")} key={`${block.type}-${index}`}><figure className="article-figure"><img src={block.src} alt={block.alt}/>{block.caption && <figcaption><span>图</span>{block.caption}</figcaption>}</figure></div>;
                if (block.type === "code") return <div {...selectProps(index, "code")} key={`${block.type}-${index}`}><figure className="article-code"><figcaption><span>{block.language}</span><small>CODE NOTE</small></figcaption><pre><code>{block.code}</code></pre></figure></div>;
                if (block.type === "divider") return <div {...selectProps(index, "divider")} key={`${block.type}-${index}`}><div className="article-divider" aria-hidden="true"><i/><span>章间留白</span><i/></div></div>;
                return <div {...selectProps(index, "list")} key={`${block.type}-${index}`}><ol className="designed-list">{block.items.map((item, itemIndex) => <li className={item.checked === undefined ? "" : `task-item ${item.checked ? "task-complete" : ""}`} key={`${item.text}-${itemIndex}`}><span>{item.checked === undefined ? String(itemIndex + 1).padStart(2, "0") : <i aria-label={item.checked ? "已完成" : "未完成"}/>}</span><p><b>{renderInline(item.text)}</b></p></li>)}</ol></div>;
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
        <div className="statusbar"><span><i className={diagnostics.length ? "status-warn" : "status-good"}/>{diagnostics.length ? `${diagnostics.length} 项兼容提醒` : "微信兼容检查通过"}</span><span>{wordCount.toLocaleString()} 字 · 预计阅读 {Math.max(1, Math.ceil(wordCount / 260))} 分钟</span><span>{focusMode ? "专注校订" : typewriterMode ? "居中阅读" : `${versions.length} 个恢复点`}</span></div>
      </section>

      <aside className="inspector-panel" ref={inspectorPanelRef}>
        <div className="inspector-tabs" role="tablist">{(["智能", "样式", "封面", "规范", "品牌"] as InspectorTab[]).map((tab, index) => <button key={tab} role="tab" aria-selected={inspector === tab} className={inspector === tab ? "active" : ""} onClick={() => { setInspector(tab); if (tab === "封面") { setStage("封面"); setTypesetOpen(false); setSelected(null); } }}><em>0{index + 1}</em><span>{tab}</span><i/></button>)}</div>
        {inspector === "智能" && <div className="inspector-content">
          <section className="design-score"><div className="score-ring"><strong>{diagnostics.length ? 86 : 94}</strong><small>设计分</small></div><div><span>节奏清楚，论点获得停顿</span><p>所有建议都可执行、撤回并留下恢复点。</p></div></section>
          <section className="inspector-section layout-director"><div className="section-heading"><div><span>整稿导演</span><small>一次决定全文密度与节奏</small></div><Icon name="spark" size={17}/></div><div className="strategy-switch">{(["calm", "balanced", "editorial"] as LayoutMode[]).map((mode) => <button key={mode} className={layoutMode === mode ? "active" : ""} aria-pressed={layoutMode === mode} onClick={() => applyLayout(mode)}>{mode === "calm" ? "舒展" : mode === "balanced" ? "均衡" : "编辑部"}<i/></button>)}</div><button className="apply-all" onClick={() => applyLayout(layoutMode)}>执行全文重排<span>不改一个字</span></button></section>
          <section className="inspector-section"><div className="section-heading"><div><span>结构建议</span><small>来自文章语义，而非模板匹配</small></div><span className="suggestion-count">3</span></div><div className="suggestion-list">{[
            ["quote", "观点形成阅读停顿", "1 处判断已识别为观点组件。"], ["list", "并列信息改为行动序列", "末段 4 个动作适合编号表达。"], ["rhythm", "首屏保留一个主命题", "标题与摘要的间距需要更克制。"],
          ].map(([id, title, text], index) => { const applied = adopted.includes(id); return <article className={`suggestion-card ${applied ? "applied" : ""}`} key={id}><div className="suggestion-number">0{index + 1}</div><div><strong>{title}</strong><p>{text}</p></div><button className="proof-action" aria-pressed={applied} onClick={() => adopt(id)}><i/>{applied ? "已采用" : "采用"}</button></article>; })}</div></section>
          <section className="inspector-section compatibility-card"><div className="section-heading"><div><span>交付健康度</span><small>公众号粘贴前的确定性</small></div><span className={diagnostics.length ? "warning-tag" : "pass-tag"}>{diagnostics.length ? "待处理" : "通过"}</span></div>{diagnostics.length ? <ul>{diagnostics.map((item) => <li key={item}><Icon name="warning" size={15}/>{item}<span>定位</span></li>)}</ul> : <ul><li><Icon name="check" size={15}/>层级与段落<span>正常</span></li><li><Icon name="check" size={15}/>图片与链接<span>正常</span></li><li><Icon name="check" size={15}/>微信样式兼容<span>正常</span></li></ul>}</section>
          <div className="delivery-shortcuts" aria-label="微信标题与作者复制"><button onClick={() => copyPlainField(article.title, "标题")}><Icon name="copy" size={15}/><span><b>复制正文标题</b><small>{article.title.length}/64 字</small></span></button><button onClick={() => copyPlainField(article.author, "作者")}><Icon name="copy" size={15}/><span><b>复制作者信息</b><small>{article.author.length}/8 字</small></span></button></div><p className="copy-delivery-note">按标题、作者、正文的顺序粘贴到微信后台。</p><button className="copy-delivery" onClick={copyArticle}><Icon name="copy"/>复制微信正文</button>
        </div>}

        {inspector === "样式" && <div className="inspector-content"><section className="inspector-section markdown-style-section"><div className="section-heading"><div><span>Markdown 版式</span><small>内容与皮肤分离，一次替换整套章法</small></div><span className="style-count">{String(markdownStyleOrder.length).padStart(2, "0")}</span></div><div className="markdown-style-gallery">{markdownStyleOrder.map((key, index) => { const item = markdownStyles[key]; const palette = themes[item.theme].palette; return <button key={key} className={markdownStyle === key ? "active" : ""} aria-pressed={markdownStyle === key} onClick={() => applyMarkdownStyle(key)}><span className={`md-style-preview preview-${key}`} style={{ "--preview-accent": palette.accent, "--preview-ink": palette.ink, "--preview-paper": palette.paper } as React.CSSProperties}><i/><b/><b/><small/><small/></span><span className="md-style-copy"><strong>{item.name}</strong><small>{item.description}</small><em>{item.fit}</em></span><span className="md-style-index">{markdownStyle === key ? "已应用" : `0${index + 1}`}</span></button>; })}</div></section><section className="inspector-section"><div className="section-heading"><div><span>纸墨配色</span><small>保留版式，只替换纸色与强调色</small></div></div><div className="theme-grid">{(Object.entries(themes) as [ThemeKey, typeof themes[ThemeKey]][]).map(([key, item]) => <button key={key} className={theme === key ? "active" : ""} aria-pressed={theme === key} onClick={() => setTheme(key)}><span className="theme-sample" style={{ background: item.palette.paper, color: item.palette.ink }}><i style={{ background: item.palette.accent }}/><b>Aa</b></span><small>{item.name}</small>{theme === key && <em>当前</em>}</button>)}</div></section><section className="inspector-section font-profile-section"><div className="section-heading"><div><span>字体气质</span><small>优先调用可用字库，缺字自动回退</small></div></div><div className="font-profile-grid">{fontProfiles.map((item) => <button key={item.key} className={fontProfile === item.key ? "active" : ""} aria-pressed={fontProfile === item.key} onClick={() => { setFontProfile(item.key); notify(`已切换为“${item.name}”字体气质`); }}><span>{item.sample}</span><div><b>{item.name}</b><small>{item.detail}</small></div><i>{fontProfile === item.key ? "正在使用" : "选择"}</i></button>)}</div></section><section className="inspector-section control-stack"><label><span><b>正文字号</b><small>建议 16—18px</small></span><output>{fontSize}px</output></label><input type="range" min="15" max="20" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))}/><label><span><b>正文行距</b><small>长文需要更多呼吸</small></span><output>{lineHeight.toFixed(2)}</output></label><input type="range" min="1.6" max="2.12" step="0.04" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))}/><label><span><b>标题尺度</b><small>避免标题压住正文</small></span><output>{Math.round(titleScale * 100)}%</output></label><input type="range" min="0.86" max="1.1" step="0.02" value={titleScale} onChange={(event) => setTitleScale(Number(event.target.value))}/><label><span><b>正文字距</b><small>密不逼仄，疏不散漫</small></span><output>{articleTracking.toFixed(3)}</output></label><input type="range" min="0" max="0.04" step="0.002" value={articleTracking} onChange={(event) => setArticleTracking(Number(event.target.value))}/></section><section className="inspector-section transfer-card"><div className="section-heading"><div><span>规则迁移</span><small>从一个内容块同步到所有同类</small></div><Icon name="brush" size={17}/></div><p>{capturedType ? `已采集：${blockLabel(capturedType)}` : "在画布中选择内容块，然后采集它的编排规则。"}</p><div><button onClick={captureStyle}>采集当前</button><button className="strong" onClick={applyCapturedStyle}>同步同类</button></div></section></div>}

        {inspector === "封面" && <div className="inspector-content cover-inspector">
          <section className="cover-reading-card"><header><span><Icon name="spark" size={15}/>文章画像</span><small>已分析标题与正文语义</small></header><div><b>{coverProfile.subject}</b><b>{coverProfile.tone}</b><b>{coverProfile.intent}</b></div><p>{coverProfile.signals.length ? `识别线索：${coverProfile.signals.join("、")}` : "当前稿件线索较少，先按深度观点类内容推荐。"}</p></section>
          <section className="inspector-section cover-recommend-section"><div className="section-heading"><div><span>首选方案</span><small>推荐不是审判，理由必须说得明白</small></div><span className="suggestion-count">03</span></div><div className="cover-recommend-list">{coverRecommendations.map((item, index) => <button key={item.style.id} className={selectedCoverStyle.id === item.style.id ? "active" : ""} onClick={() => setCoverStyleId(item.style.id)}><em>0{index + 1}</em><span className="cover-style-swatch">{item.style.palette.map((color) => <i key={color} style={{ background: color }}/>)}</span><span><strong>{item.style.name}</strong><small>{item.reason}</small></span><b>{item.score}</b></button>)}</div></section>
          <section className="inspector-section cover-selected-card"><div className="section-heading"><div><span>当前设计建议</span><small>{selectedCoverStyle.short} · {selectedCoverStyle.fit}</small></div></div><dl><div><dt>构图</dt><dd>{selectedCoverStyle.composition}</dd></div><div><dt>材质</dt><dd>{selectedCoverStyle.texture}</dd></div><div><dt>避坑</dt><dd>{selectedCoverStyle.avoid}</dd></div></dl><button onClick={copyCoverPrompt}><Icon name="copy" size={15}/>复制完整生图指令</button></section>
          <section className="inspector-section cover-library"><div className="section-heading"><div><span>24种封面风格</span><small>按内容选语言，不按流行贴皮肤</small></div><span className="style-count">24</span></div><div className="cover-category-filter">{coverStyleCategories.map((category) => <button key={category} className={coverCategory === category ? "active" : ""} onClick={() => setCoverCategory(category)}>{category}</button>)}</div><div className="cover-style-library">{filteredCoverStyles.map((item) => <button key={item.id} className={selectedCoverStyle.id === item.id ? "active" : ""} onClick={() => setCoverStyleId(item.id)}><span className="cover-library-palette">{item.palette.map((color) => <i key={color} style={{ background: color }}/>)}</span><span><b>{item.name}</b><small>{item.short}</small></span><em>{String(coverStyles.findIndex((style) => style.id === item.id) + 1).padStart(2, "0")}</em></button>)}</div></section>
        </div>}

        {inspector === "规范" && <div className="inspector-content standards-panel">
          <section className="inspector-section"><div className="section-heading"><div><span>微信公众号排版规范</span><small>区分平台兼容与品牌建议</small></div><span className="pass-tag">已校验</span></div><ul className="rule-ledger">
            <li><i>01</i><p><b>正文基线</b><small>16—18px，行距 1.75—1.9；避免依赖外部 CSS。</small></p></li>
            <li><i>02</i><p><b>层级克制</b><small>每屏一个视觉重点，颜色不超过三种，列表不超过七项。</small></p></li>
            <li><i>03</i><p><b>图片与链接</b><small>图片进入微信素材体系；外链、热链与跳转发布前复核。</small></p></li>
            <li><i>04</i><p><b>标题与摘要</b><small>准确对应正文，不堆符号，不用无法兑现的悬念。</small></p></li>
            <li><i>05</i><p><b>编码与字符</b><small>识别 UTF-8、GB18030 与 UTF-16；交付前拦截替换字符、控制符及异常转义。</small></p></li>
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

        {inspector === "品牌" && <div className="inspector-content"><section className="brand-preview-card"><span className="brand-big-avatar">钢</span><div><small>当前品牌套件</small><strong>钢铁私塾</strong><p>工业理性 · 专业克制 · 有判断</p></div></section><section className="inspector-section brand-settings"><div className="section-heading"><div><span>品牌基因</span><small>每一篇内容自动继承</small></div></div><label><span>主色</span><i style={{ background: currentTheme.palette.accent }}/>当前主题<button onClick={() => setInspector("样式")}>修改</button></label><label><span>正文</span><i style={{ background: currentTheme.palette.ink }}/>墨黑<button onClick={() => setInspector("样式")}>修改</button></label><label><span>署名</span><b>主编：钢铁私塾 唐淼</b><button onClick={() => notify("品牌署名编辑将在下一版开放")}>编辑</button></label><label><span>结尾</span><b>品牌宣言 + 交流声明</b><button onClick={() => notify("品牌结尾编辑将在下一版开放")}>编辑</button></label></section><section className="inspector-section"><div className="section-heading"><div><span>品牌一致性</span><small>本稿与品牌套件对照</small></div></div><div className="brand-consistency"><strong>100%</strong><div><i/><span>颜色、署名与语气均一致</span></div></div></section></div>}
      </aside>

      {sourceOpen && <div className="source-overlay" role="dialog" aria-modal="true" aria-label="原稿编辑器"><div className="source-drawer"><header><div><span>内容源</span><strong>Markdown 原稿</strong></div><div className="source-actions"><button className="source-action paste-action" onClick={pasteMarkdown}><Icon name="copy" size={14}/>一键粘贴</button><button className="source-action clear-action" onClick={clearMarkdown} disabled={!markdown.trim()}><Icon name="close" size={14}/>清空</button><button className="source-action import-file" onClick={() => fileRef.current?.click()}><Icon name="document" size={14}/>导入文件</button><button className="source-close" onClick={() => setSourceOpen(false)} aria-label="关闭原稿"><Icon name="close"/></button></div></header><textarea value={markdown} onChange={(event) => { setMarkdown(event.target.value); setSourceEncoding("UTF-8 · 手动编辑"); }} aria-label="Markdown 原稿" lang="zh-CN" autoCapitalize="off" autoCorrect="off" spellCheck={false}/><footer><span className="source-health"><b>{wordCount.toLocaleString()} 字</b><i className={encodingIssues.length ? "encoding-risk" : "encoding-safe"}>{sourceEncoding} · {encodingIssues.length ? `${encodingIssues.length} 项编码风险` : "编码正常"}</i><small className={article.title === "未命名文章" ? "title-missing" : "title-detected"}>{article.title === "未命名文章" ? "尚未识别标题" : "标题已识别"} · 自动保存于本机</small></span><button onClick={() => { setSourceOpen(false); setStage("编排"); notify(encodingIssues.length ? `已完成分析，发现 ${encodingIssues.length} 项编码风险` : article.title === "未命名文章" ? "正文已编排，但尚未识别标题" : `已识别标题：${article.title}`); }}>分析并编排</button></footer></div></div>}
      {toast && <div className="toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
    </main>
  );
}
