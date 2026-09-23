import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

function createConverter() {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    strongDelimiter: "**",
    emDelimiter: "*",
  });
  turndown.use(gfm);
  turndown.addRule("removeClipboardChrome", {
    filter: ["script", "style", "button", "nav", "iframe", "noscript", "svg"],
    replacement: () => "",
  });
  turndown.addRule("styledBold", {
    filter: (node) => node.nodeName === "SPAN" && /font-weight\s*:\s*(?:bold|[6-9]00)\b/i.test((node as HTMLElement).getAttribute("style") ?? ""),
    replacement: (content) => `**${content}**`,
  });
  return turndown;
}

function readableText(markdown: string) {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(^|\n)\s*(?:#{1,6}\s+|>\s*|[-+*]\s+|\d+[.)]\s+)/g, "$1")
    .replace(/\\([\\`*_[\]{}()#+\-.!>])/g, "$1")
    .replace(/[*_~`\s]/g, "")
    .normalize("NFC");
}

/** A rich clipboard is useful only if it preserves the exact source text and adds emphasis. */
export function markdownFromRichClipboard(html: string, plainText: string) {
  if (!html || html.length > 2_000_000 || /\*\*[^*\n]+\*\*/.test(plainText)) return null;
  if (!/<(?:strong|b)\b|font-weight\s*:\s*(?:bold|[6-9]00)\b/i.test(html)) return null;
  const markdown = createConverter().turndown(html).trim();
  if (!/\*\*[^*\n]+\*\*/.test(markdown)) return null;
  if (readableText(markdown) !== readableText(plainText)) return null;
  return markdown;
}
