import {
  WECHAT_FIXED_DIMENSION_PROPERTIES,
  WECHAT_FLOW_STYLE_PROPERTIES,
  isWechatFlowTag,
  normalizeWechatLineHeight,
  shouldCopyWechatStyle,
} from "@/lib/editor/wechat-flow-policy";

export const WECHAT_SAFE_STYLE_PROPERTIES = [
  ...WECHAT_FLOW_STYLE_PROPERTIES,
  ...WECHAT_FIXED_DIMENSION_PROPERTIES,
] as const;

const INTERNAL_ATTRIBUTES = ["class", "id", "tabindex", "role", "data-md-style", "data-block-index"];

const FIXED_LENGTH = /^-?\d*\.?\d+(?:px|pt|pc|cm|mm|in)$/i;

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
    WECHAT_SAFE_STYLE_PROPERTIES.forEach((property) => {
      if (!shouldCopyWechatStyle({ tagName: node.tagName, property, hasText, isEditorWrapper })) return;
      const value = computed.getPropertyValue(property);
      if (!value) return;
      target.style.setProperty(
        property,
        property === "line-height" ? normalizeWechatLineHeight(value, computed.fontSize) : value,
      );
    });
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
  return clone;
}

export async function writeRichClipboard(html: string, plainText: string) {
  if (window.ClipboardItem && navigator.clipboard?.write) {
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html;charset=utf-8" }),
      "text/plain": new Blob([plainText], { type: "text/plain;charset=utf-8" }),
    })]);
    return;
  }
  await navigator.clipboard.writeText(plainText);
}
