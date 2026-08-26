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
