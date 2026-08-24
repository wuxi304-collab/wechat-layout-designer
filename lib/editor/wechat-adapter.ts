export const WECHAT_SAFE_STYLE_PROPERTIES = [
  "display", "margin", "padding", "color", "background-color", "background-image",
  "border", "border-top", "border-right", "border-bottom", "border-left", "border-radius",
  "box-shadow", "opacity", "font-family", "font-size", "font-weight", "font-style",
  "line-height", "letter-spacing", "text-align", "text-decoration", "text-indent",
  "width", "max-width", "height", "box-sizing", "white-space", "word-break", "overflow-wrap", "overflow-x", "vertical-align",
] as const;

const INTERNAL_ATTRIBUTES = ["class", "id", "tabindex", "role", "data-md-style", "data-block-index"];

export function inlineWechatSafeStyles(source: HTMLElement, clone: HTMLElement) {
  clone.querySelectorAll("[data-editor-ui]").forEach((node) => node.remove());
  clone.querySelectorAll(".is-selected,.synced-style,.selectable-block").forEach((node) => node.classList.remove("is-selected", "synced-style", "selectable-block"));

  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))].filter((node) => !node.closest("[data-editor-ui]"));
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index];
    if (!target) return;
    const computed = window.getComputedStyle(node);
    WECHAT_SAFE_STYLE_PROPERTIES.forEach((property) => {
      const value = computed.getPropertyValue(property);
      if (value) target.style.setProperty(property, value);
    });
    INTERNAL_ATTRIBUTES.forEach((attribute) => target.removeAttribute(attribute));
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
