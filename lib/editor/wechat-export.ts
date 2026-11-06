import { applyWechatTimelineTextSafety, findWechatFlowLayoutRisks, findWechatTimelineTextRisks, inlineWechatSafeStyles } from "./wechat-adapter";

type DeliverySettings = {
  title: string;
  author: string;
  ink: string;
  accent: string;
  bodyFont: string;
  uiFont: string;
  fontSize: number;
  lineHeight: number;
  warnings: string[];
};

export type WechatDelivery = {
  title: string;
  html: string;
  plainText: string;
  document: string;
  warnings: string[];
};

const blockTags = new Set(["ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "OL", "P", "PRE", "SECTION", "TABLE", "UL"]);

export function readWechatPlainText(root: Node): string {
  const parts: string[] = [];
  let gap = 0;
  function append(text: string) {
    if (!text) return;
    if (parts.length && gap) parts.push("\n".repeat(gap));
    gap = 0;
    parts.push(text);
  }
  function visit(node: Node, marker = "") {
    if (node.nodeType === 3) { append(node.textContent ?? ""); return; }
    if (node.nodeType !== 1) return;
    const element = node as Element;
    const tag = element.tagName;
    if (tag === "BR") { gap++; return; }
    if (tag === "IMG") { append(element.getAttribute("alt") ?? ""); return; }
    const boundary = tag === "LI" || tag === "TR" ? 1 : blockTags.has(tag) ? 2 : 0;
    gap = Math.max(gap, boundary);
    if (marker) append(marker);
    if (tag === "PRE") append(element.textContent ?? "");
    else if (tag === "TR") Array.from(element.children).forEach((cell, index) => { if (index) append("\t"); visit(cell); });
    else if (tag === "OL" || tag === "UL") {
      const list = element as HTMLElement;
      const hasMarkers = list.style.listStyleType !== "none";
      let position = Number(list.getAttribute("start") ?? 1);
      list.childNodes.forEach((child) => {
        const isItem = child.nodeType === 1 && (child as Element).tagName === "LI";
        visit(child, hasMarkers && isItem ? tag === "OL" ? position + ". " : "• " : "");
        if (isItem) position++;
      });
    } else element.childNodes.forEach((child) => visit(child));
    gap = Math.max(gap, boundary);
  }
  visit(root);
  return parts.join("");
}

export function createWechatReviewDocument(title: string, fragment: string) {
  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<title>${safeTitle}</title>
</head>
<body style="box-sizing:border-box;max-width:720px;margin:0 auto;padding:20px 16px;overflow-wrap:anywhere;background:#fff">
${fragment}
</body>
</html>`;
}

// Input is the article rendered from our Markdown AST, never arbitrary user HTML.
export function prepareWechatDelivery(source: HTMLElement, settings: DeliverySettings): WechatDelivery {
  const temporaryClasses = ["wechat-dark-preview", "focus-active"].filter((name) => source.classList.contains(name));
  const clone = source.cloneNode(true) as HTMLElement;
  try {
    source.classList.remove(...temporaryClasses);
    inlineWechatSafeStyles(source, clone);
  } finally {
    source.classList.add(...temporaryClasses);
  }

  const body = clone.querySelector<HTMLElement>("[data-copy-body]");
  const footer = clone.querySelector<HTMLElement>("[data-copy-footer]");
  if (!body) throw new Error("正文暂时无法导出，请重试");
  const exportRoot = source.ownerDocument.createElement("section");
  exportRoot.lang = "zh-CN";
  const flowStyles = `display:block;width:100%;max-width:100%;margin:0;padding:0;color:${settings.ink};background:#fff;box-sizing:border-box;font-family:${settings.bodyFont};font-size:${settings.fontSize}px;line-height:${settings.lineHeight};word-break:normal;overflow-wrap:anywhere;`;
  exportRoot.style.cssText = flowStyles;
  const byline = source.ownerDocument.createElement("p");
  byline.textContent = `主编：${settings.author}`;
  byline.style.cssText = `margin:0 0 30px;padding:0 0 14px;border-bottom:1px solid ${settings.accent}33;color:${settings.accent};font-family:${settings.uiFont};font-size:14px;font-weight:600;line-height:1.7;letter-spacing:.01em;text-align:left;`;
  body.style.cssText = flowStyles;
  exportRoot.append(byline, body);
  if (footer) exportRoot.append(footer);
  exportRoot.querySelectorAll("[data-copy-exclude]").forEach((node) => node.remove());
  exportRoot.querySelectorAll("[data-copy-body],[data-copy-footer]").forEach((node) => {
    node.removeAttribute("data-copy-body");
    node.removeAttribute("data-copy-footer");
  });

  exportRoot.querySelectorAll<HTMLElement>("th,td,pre,pre code").forEach((node) => {
    node.style.setProperty("overflow-wrap", "anywhere");
    if (node.closest("pre")) node.style.setProperty("white-space", "pre-wrap");
  });
  applyWechatTimelineTextSafety(exportRoot);
  const flowRisks = findWechatFlowLayoutRisks(exportRoot);
  if (flowRisks.length) throw new Error(`发现 ${flowRisks.length} 处固定正文尺寸，可能造成文字重叠，已停止交付`);
  const timelineTextRisks = findWechatTimelineTextRisks(exportRoot);
  if (timelineTextRisks.length) throw new Error(`发现 ${timelineTextRisks.length} 处行内缩放风险，已停止交付`);

  const warnings = [...settings.warnings];
  const brokenImages = Array.from(source.querySelectorAll<HTMLImageElement>("[data-copy-body] img"))
    .filter((image) => image.complete && !image.naturalWidth).length;
  if (brokenImages) warnings.push(`${brokenImages} 张图片在当前预览中加载失败，请检查原图地址`);
  if (exportRoot.querySelector('a[href^="http:"] , a[href^="https:"]')) warnings.push("外部链接能否点击，以公众号草稿预览为准");
  const html = exportRoot.outerHTML;
  return { title: settings.title, html, plainText: readWechatPlainText(exportRoot), document: createWechatReviewDocument(settings.title, html), warnings: [...new Set(warnings)] };
}

export function downloadWechatDelivery(delivery: WechatDelivery, filename: string, host?: HTMLElement | null) {
  const url = URL.createObjectURL(new Blob([delivery.document], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  try { (host ?? document.body).append(link); link.click(); }
  finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
