import { closesFence, readAtxHeading, readFence, readSetextHeading } from "./markdown-structure.ts";

export type SourceRange = { start: number; end: number };
export type SourceHeading = SourceRange & { line: number; level: number; text: string };

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
export function findSourceMatches(source: string, query: string): SourceRange[] {
  if (!query.trim()) return [];
  const literal = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(source.matchAll(new RegExp(literal, "giu")), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
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
