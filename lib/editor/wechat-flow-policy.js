/**
 * 微信正文的样式白名单必须以“内容能继续长高”为第一原则。
 * 预览画布的计算尺寸只属于当前桌面宽度，不能成为移动端正文的固定尺寸。
 */
export const WECHAT_FLOW_STYLE_PROPERTIES = [
  "display", "margin", "padding", "color", "background-color", "background-image",
  "border", "border-top", "border-right", "border-bottom", "border-left", "border-radius",
  "box-shadow", "opacity", "font-family", "font-size", "font-weight", "font-style",
  "line-height", "letter-spacing", "text-align", "text-decoration", "text-indent",
  "box-sizing", "white-space", "word-break", "overflow-wrap", "overflow-x", "vertical-align",
];

export const WECHAT_FIXED_DIMENSION_PROPERTIES = ["width", "max-width", "height"];

const FLOW_TAGS = new Set([
  "ARTICLE", "ASIDE", "BLOCKQUOTE", "DIV", "FIGCAPTION", "FIGURE", "FOOTER", "HEADER",
  "H1", "H2", "H3", "H4", "H5", "H6", "LI", "MAIN", "OL", "P", "PRE", "SECTION",
  "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD", "TR", "UL",
]);

const PROSE_INLINE_TAGS = new Set([
  "A", "B", "CODE", "DEL", "EM", "I", "S", "SMALL", "SPAN", "STRONG", "SUB", "SUP",
]);

/** @param {string} tagName */
export function isWechatFlowTag(tagName) {
  return FLOW_TAGS.has(tagName.toUpperCase());
}

/**
 * 固定尺寸只允许留给无文字的叶子装饰。正文、标题、列表和表格必须由内容撑开。
 * 图片和表格会在适配器末端改写为相对尺寸，不复制桌面预览的像素尺寸。
 *
 * @param {{ tagName: string; property: string; hasText: boolean; isEditorWrapper: boolean }} input
 */
export function shouldCopyWechatStyle({ tagName, property, hasText, isEditorWrapper }) {
  if (isEditorWrapper) return false;
  if (WECHAT_FLOW_STYLE_PROPERTIES.includes(property)) return true;
  if (!WECHAT_FIXED_DIMENSION_PROPERTIES.includes(property)) return false;
  const normalizedTag = tagName.toUpperCase();
  return !hasText && (normalizedTag === "I" || normalizedTag === "SPAN");
}

/**
 * getComputedStyle 会把 1.94 变成 34.92px。恢复成单位行高后，微信替换字体或字号时
 * 行盒会一起长高，不再由桌面像素值卡住。
 *
 * @param {string} lineHeight
 * @param {string} fontSize
 */
export function normalizeWechatLineHeight(lineHeight, fontSize) {
  if (!lineHeight.endsWith("px") || !fontSize.endsWith("px")) return lineHeight;
  const line = Number.parseFloat(lineHeight);
  const font = Number.parseFloat(fontSize);
  if (!Number.isFinite(line) || !Number.isFinite(font) || line <= 0 || font <= 0) return lineHeight;
  const ratio = line / font;
  if (ratio < 0.75 || ratio > 3.2) return lineHeight;
  return ratio.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * 正文行内节点不应各自锁死像素字号。相同比例直接继承，小号引用和代码改成 em，
 * 这样朋友圈 WebView 调整段落字号时，整行仍按同一把尺缩放。
 *
 * @param {string} fontSize
 * @param {string} parentFontSize
 */
export function normalizeWechatInlineFontSize(fontSize, parentFontSize) {
  if (!fontSize.endsWith("px") || !parentFontSize.endsWith("px")) return "inherit";
  const child = Number.parseFloat(fontSize);
  const parent = Number.parseFloat(parentFontSize);
  if (!Number.isFinite(child) || !Number.isFinite(parent) || child <= 0 || parent <= 0) return "inherit";
  const ratio = child / parent;
  if (ratio >= 0.96 && ratio <= 1.04) return "inherit";
  if (ratio < 0.5 || ratio > 1.6) return "inherit";
  return `${ratio.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}em`;
}

/**
 * @param {{ tagName: string; insideProse: boolean }} input
 */
export function shouldInheritWechatProseMetrics({ tagName, insideProse }) {
  return insideProse && PROSE_INLINE_TAGS.has(tagName.toUpperCase());
}
