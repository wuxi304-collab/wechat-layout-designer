import {
  WECHAT_FIXED_DIMENSION_PROPERTIES,
  WECHAT_FLOW_STYLE_PROPERTIES,
  isWechatFlowTag,
  normalizeWechatInlineFontSize,
  normalizeWechatLineHeight,
  shouldCopyWechatStyle,
  shouldInheritWechatProseMetrics,
} from "@/lib/editor/wechat-flow-policy";

export const WECHAT_SAFE_STYLE_PROPERTIES = [
  ...WECHAT_FLOW_STYLE_PROPERTIES,
  ...WECHAT_FIXED_DIMENSION_PROPERTIES,
] as const;

const INTERNAL_ATTRIBUTES = ["class", "id", "tabindex", "role", "data-md-style", "data-block-index"];

const FIXED_LENGTH = /^-?\d*\.?\d+(?:px|pt|pc|cm|mm|in)$/i;
const PROSE_CONTAINER_SELECTOR = "p,figcaption";
const PROSE_INLINE_SELECTOR = ":is(p,figcaption) :is(strong,b,em,i,s,del,a,span,sup,sub,code)";
const TIMELINE_TEXT_BLOCK_SELECTOR = "p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption,td,th";

export function applyWechatTimelineTextSafety(root: HTMLElement) {
  [root, ...Array.from(root.querySelectorAll<HTMLElement>(TIMELINE_TEXT_BLOCK_SELECTOR))].forEach((node) => {
    node.style.setProperty("-webkit-text-size-adjust", "100%");
    node.style.setProperty("text-size-adjust", "100%");
  });

  root.querySelectorAll<HTMLElement>(PROSE_INLINE_SELECTOR).forEach((node) => {
    if (FIXED_LENGTH.test(node.style.getPropertyValue("font-size").trim())) node.style.removeProperty("font-size");
    node.style.setProperty("display", "inline");
    node.style.setProperty("line-height", "inherit");
    node.style.setProperty("white-space", "normal");
    node.style.removeProperty("width");
    node.style.removeProperty("max-width");
    node.style.removeProperty("height");
    node.style.removeProperty("min-height");
    node.style.removeProperty("max-height");
  });
  return root;
}

export function enforceWechatInlineSemantics(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("strong,b").forEach((node) => {
    node.style.setProperty("font-weight", "700");
  });
  root.querySelectorAll<HTMLElement>("em,i").forEach((node) => {
    node.style.setProperty("font-style", "italic");
  });
  root.querySelectorAll<HTMLElement>("s,del").forEach((node) => {
    node.style.setProperty("text-decoration", "line-through");
  });
  root.querySelectorAll<HTMLElement>("a").forEach((node) => {
    node.style.setProperty("text-decoration", "underline");
  });
  return root;
}

export function findWechatFlowLayoutRisks(root: HTMLElement) {
  return [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))].filter((node) => {
    if (!isWechatFlowTag(node.tagName)) return false;
    const height = node.style.getPropertyValue("height");
    const minHeight = node.style.getPropertyValue("min-height");
    const maxHeight = node.style.getPropertyValue("max-height");
    const width = node.style.getPropertyValue("width");
    return [height, minHeight, maxHeight].some((value) => FIXED_LENGTH.test(value.trim()))
      || (node.tagName !== "TABLE" && FIXED_LENGTH.test(width.trim()));
  });
}

export function findWechatTimelineTextRisks(root: HTMLElement) {
  const risks: HTMLElement[] = [];
  const textAdjust = root.style.getPropertyValue("text-size-adjust") || root.style.getPropertyValue("-webkit-text-size-adjust");
  if (textAdjust !== "100%") risks.push(root);
  root.querySelectorAll<HTMLElement>(PROSE_INLINE_SELECTOR).forEach((node) => {
    const fontSize = node.style.getPropertyValue("font-size").trim();
    const lineHeight = node.style.getPropertyValue("line-height").trim();
    const display = node.style.getPropertyValue("display").trim();
    const whiteSpace = node.style.getPropertyValue("white-space").trim();
    if (FIXED_LENGTH.test(fontSize) || FIXED_LENGTH.test(lineHeight) || display === "inline-block" || whiteSpace === "nowrap") risks.push(node);
  });
  return risks;
}

export function inlineWechatSafeStyles(source: HTMLElement, clone: HTMLElement) {
  clone.querySelectorAll("[data-editor-ui]").forEach((node) => node.remove());
  clone.querySelectorAll(".is-selected,.synced-style").forEach((node) => node.classList.remove("is-selected", "synced-style"));

  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))].filter((node) => !node.closest("[data-editor-ui]"));
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index];
    if (!target) return;
    const computed = window.getComputedStyle(node);
    const isEditorWrapper = node.classList.contains("selectable-block");
    const hasText = Boolean(node.textContent?.trim());
    const insideProse = Boolean(node.parentElement?.closest(PROSE_CONTAINER_SELECTOR));
    const inheritProseMetrics = shouldInheritWechatProseMetrics({ tagName: node.tagName, insideProse });
    WECHAT_SAFE_STYLE_PROPERTIES.forEach((property) => {
      if (!shouldCopyWechatStyle({ tagName: node.tagName, property, hasText, isEditorWrapper })) return;
      const value = computed.getPropertyValue(property);
      if (!value) return;
      target.style.setProperty(
        property,
        property === "line-height" ? normalizeWechatLineHeight(value, computed.fontSize) : value,
      );
    });
    if (inheritProseMetrics) {
      const parentFontSize = node.parentElement ? window.getComputedStyle(node.parentElement).fontSize : computed.fontSize;
      const relativeFontSize = normalizeWechatInlineFontSize(computed.fontSize, parentFontSize);
      if (relativeFontSize === "inherit") target.style.removeProperty("font-size");
      else target.style.setProperty("font-size", relativeFontSize);
      target.style.setProperty("display", "inline");
      target.style.setProperty("line-height", "inherit");
      target.style.setProperty("white-space", "normal");
      target.style.removeProperty("width");
      target.style.removeProperty("max-width");
      target.style.removeProperty("height");
      target.style.removeProperty("font-family");
      target.style.removeProperty("letter-spacing");
    }
    if (isEditorWrapper) target.setAttribute("data-wechat-flow-wrapper", "true");
    INTERNAL_ATTRIBUTES.forEach((attribute) => target.removeAttribute(attribute));
  });

  // 媒体使用相对尺寸；桌面预览的像素宽高绝不能进入手机正文。
  clone.querySelectorAll<HTMLElement>("img,video").forEach((node) => {
    node.style.setProperty("display", "block");
    node.style.setProperty("width", "100%");
    node.style.setProperty("max-width", "100%");
    node.style.setProperty("height", "auto");
  });
  clone.querySelectorAll<HTMLElement>("table").forEach((node) => {
    node.style.setProperty("width", "100%");
    node.style.setProperty("max-width", "100%");
    node.style.removeProperty("height");
  });

  // 预览选择壳只服务编辑交互。交付时把内容提升一级，避免壳的旧高度压住下一段。
  clone.querySelectorAll<HTMLElement>("[data-wechat-flow-wrapper]").forEach((wrapper) => {
    wrapper.replaceWith(...Array.from(wrapper.childNodes));
  });

  // 最终保险：所有会被文字撑高的语义块都不得携带固定尺寸。
  [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))].forEach((node) => {
    if (!isWechatFlowTag(node.tagName)) return;
    if (node.tagName === "TABLE") {
      node.style.setProperty("width", "100%");
      node.style.setProperty("max-width", "100%");
    } else {
      node.style.removeProperty("width");
      node.style.removeProperty("max-width");
    }
    node.style.removeProperty("height");
    node.style.removeProperty("min-height");
    node.style.removeProperty("max-height");
  });
  applyWechatTimelineTextSafety(clone);
  enforceWechatInlineSemantics(clone);
  return clone;
}

function copyRichWithSelection(html: string) {
  if (typeof document === "undefined" || !document.body || typeof document.execCommand !== "function") return false;
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const selection = window.getSelection();
  const savedRanges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
  const container = document.createElement("div");
  container.contentEditable = "true";
  container.setAttribute("aria-hidden", "true");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:.01;pointer-events:none;";
  container.innerHTML = html;
  document.body.appendChild(container);

  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    container.remove();
    selection?.removeAllRanges();
    savedRanges.forEach((savedRange) => selection?.addRange(savedRange));
    activeElement?.focus({ preventScroll: true });
  }
  return copied;
}

export async function writeRichClipboard(html: string, plainText: string) {
  // iOS / 微信内置 WebView 常没有 ClipboardItem，但仍支持在点击手势中复制富文本选区。
  // 必须先同步尝试，不能 await 之后再补救，否则浏览器会撤销复制权限。
  if (copyRichWithSelection(html)) return "selection" as const;

  if (window.ClipboardItem && navigator.clipboard?.write) {
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html;charset=utf-8" }),
      "text/plain": new Blob([plainText], { type: "text/plain;charset=utf-8" }),
    })]);
    return "clipboard" as const;
  }
  throw new Error("Rich clipboard unavailable");
}
