import { closesFence, readAtxHeading, readFence, readSetextHeading } from "./markdown-structure.ts";

export type SourceRange = { start: number; end: number };
export type SourceHeading = SourceRange & { line: number; level: number; text: string };

export function isCompositionKey(event: { isComposing?: boolean; keyCode?: number; key?: string }) {
  return Boolean(event.isComposing || event.keyCode === 229 || event.key === "Process");
}

export function toggleSourceAnnotation(source: string, range: SourceRange, kind: "underline" | "highlight") {
  const opening = kind === "underline" ? "<u>" : "==", closing = kind === "underline" ? "</u>" : "==";
  const text = source.slice(range.start, range.end);
  if (!text.trim() || text !== text.trim() || /[\r\n]/.test(text)) return null;
  if (source.slice(range.start - opening.length, range.start) === opening && source.slice(range.end, range.end + closing.length) === closing) {
    return { text: source.slice(0, range.start - opening.length) + text + source.slice(range.end + closing.length), start: range.start - opening.length, end: range.end - opening.length };
  }
  return { text: source.slice(0, range.start) + opening + text + closing + source.slice(range.end), start: range.start + opening.length, end: range.end + opening.length };
}

export function readSourceHeadings(source: string): SourceHeading[] {
  const lines = Array.from(source.matchAll(/([^\r\n]*)(?:\r\n|\r|\n|$)/g));
  const headings: SourceHeading[] = [];
  let fence: ReturnType<typeof readFence> = null;
  let startIndex = 0;
  if (lines[0]?.[1].replace(/^\uFEFF/, "") === "---") {
    const close = lines.findIndex((line, index) => index > 0 && /^---\s*$/.test(line[1]));
    if (close > 0 && lines.slice(1, close).some((line) => /^(?:title|author|byline|summary|description)\s*:/i.test(line[1]))) startIndex = close + 1;
  }
  for (let index = startIndex; index < lines.length; index++) {
    const row = lines[index];
    const text = index === 0 ? row[1].replace(/^\uFEFF/, "") : row[1];
    if (fence) {
      if (closesFence(text, fence)) fence = null;
      continue;
    }
    fence = readFence(text);
    if (fence) continue;
    const atx = readAtxHeading(text);
    const heading = atx ?? readSetextHeading(text, lines[index + 1]?.[1]);
    if (!heading) continue;
    const start = row.index;
    headings.push({ ...heading, line: index + 1, start, end: start + row[1].length });
    if (!atx) index++;
  }
  return headings;
}

/** Match literal text; match indices always refer to the unmodified textarea value. */
export function findSourceMatches(source: string, query: string, caseSensitive = false, wholeWord = false): SourceRange[] {
  if (!query.trim()) return [];
  const literal = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(source.matchAll(new RegExp(literal, caseSensitive ? "gu" : "giu")), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  })).filter(({ start, end }) => !wholeWord || !/[A-Za-z0-9_]/.test(source[start - 1] ?? "") && !/[A-Za-z0-9_]/.test(source[end] ?? ""));
}

/** Offsets come from findSourceMatches; replacement is literal, including $ and backslashes. */
export function replaceSourceMatches(source: string, matches: SourceRange[], replacement: string, index?: number) {
  const ranges = index === undefined ? matches : matches.slice(index, index + 1);
  if (!ranges.length) return null;
  let text = "", offset = 0;
  for (const range of ranges) {
    text += source.slice(offset, range.start) + replacement;
    offset = range.end;
  }
  text += source.slice(offset);
  return { text, start: ranges[0].start, end: ranges[0].start + replacement.length, count: ranges.length };
}

export function toggleSourceEmphasis(source: string, range: SourceRange, marker: "*" | "**") {
  const { start, end } = range;
  const selection = source.slice(start, end);
  if (!selection || selection.trim() !== selection || /[\r\n]/.test(selection)) return null;
  const size = marker.length;
  let before = start;
  let after = end;
  while (before > 0 && source[before - 1] === "*") before--;
  while (source[after] === "*") after++;
  const leading = start - before;
  const trailing = after - end;
  if (leading || trailing) {
    if (leading !== trailing || leading > 3) return null;
    const stars = "*".repeat(leading ^ size);
    return {
      text: source.slice(0, before) + stars + selection + stars + source.slice(after),
      start: before + stars.length,
      end: before + stars.length + selection.length,
    };
  }
  if (selection.startsWith("*") || selection.endsWith("*")) return null;
  return { text: source.slice(0, start) + marker + selection + marker + source.slice(end), start: start + size, end: end + size };
}


/**
 * Build UTF-16 textarea offsets for a normalized Markdown body. bodyOffset
 * accounts for front matter removed by the article parser. Work from the
 * unmodified source lines: title detection may blank lines in a working copy.
 */
export function readSourceLineRanges(body: string, bodyOffset = 0): SourceRange[] {
  if (!Number.isInteger(bodyOffset) || bodyOffset < 0) throw new RangeError("Invalid Markdown body offset");
  let cursor = bodyOffset;
  return body.split("\n").map((line) => {
    const range = { start: cursor, end: cursor + line.length };
    cursor += line.length + 1;
    return range;
  });
}
