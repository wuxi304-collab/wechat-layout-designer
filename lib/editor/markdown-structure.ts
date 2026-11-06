type Fence = { character: string; length: number; language: string };
type Alignment = "left" | "center" | "right";

export function readFence(line: string): Fence | null {
  const match = line.match(/^ {0,3}(\x60{3,}|~{3,})[ \t]*([^\s]*)/);
  if (!match) return null;
  return { character: match[1][0], length: match[1].length, language: match[2] || "text" };
}

export function closesFence(line: string, fence: Fence) {
  const marker = line.match(/^ {0,3}(\x60{3,}|~{3,})[ \t]*$/)?.[1];
  return Boolean(marker && marker[0] === fence.character && marker.length >= fence.length);
}

export function readAtxHeading(line: string) {
  const match = line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)\s*$/);
  return match ? { level: match[1].length, text: match[2].replace(/[ \t]+#+[ \t]*$/, "") } : null;
}

export function readSetextHeading(line: string, following: string | undefined) {
  const text = line.trim();
  if (!text || line.startsWith("    ") || /^\t/.test(line) || /^[#>|<]/.test(text)
      || /^(?:[-+*]\s|\d+[.)]\s|[-*_]{3,}$|!\[|\[[^\]]+\]:)/.test(text)
      || readFence(line)) return null;
  const underline = following?.match(/^ {0,3}(=+|-+)[ \t]*$/)?.[1];
  return underline ? { level: underline[0] === "=" ? 1 : 2, text } : null;
}

/** Pick the first explicit document title outside code, leaving later H1s as sections. */
export function findMarkdownTitle(lines: readonly string[]) {
  let fence: Fence | null = null;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (fence) {
      if (closesFence(line, fence)) fence = null;
      continue;
    }
    fence = readFence(line);
    if (fence) continue;
    const atx = readAtxHeading(line);
    if (atx?.level === 1) return { text: atx.text, lineIndices: [index] };
    const setext = readSetextHeading(line, lines[index + 1]);
    if (setext?.level === 1) return { text: setext.text, lineIndices: [index, index + 1] };
  }
  return null;
}

/** Split only real column separators; an escaped pipe belongs to its cell. */
function readTableRow(line: string): string[] | null {
  const cells: string[] = [];
  const text = line.trim();
  let start = 0;
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === "|" && !escaped) {
      cells.push(text.slice(start, index).trim());
      start = index + 1;
    }
    escaped = character === "\\" && !escaped;
  }
  if (!cells.length) return null;
  cells.push(text.slice(start).trim());
  if (text.startsWith("|")) cells.shift();
  if (start === text.length) cells.pop();
  return cells.length ? cells : null;
}

export function readMarkdownTable(lines: readonly string[], index: number) {
  const line = lines[index];
  const divider = lines[index + 1];
  if (!line?.includes("|") || !divider?.includes("|") || !/^[\s|:-]+$/.test(divider)) return null;
  const headers = readTableRow(line);
  const delimiters = readTableRow(divider);
  if (!headers || !delimiters || headers.length !== delimiters.length || delimiters.some((cell) => !/^:?-{3,}:?$/.test(cell))) return null;

  const alignments: Alignment[] = delimiters.map((cell) => cell.endsWith(":") ? cell.startsWith(":") ? "center" : "right" : "left");
  const rows: string[][] = [];
  let next = index + 2;
  for (; next < lines.length; next++) {
    const raw = lines[next];
    if (!raw.trim() || readFence(raw) || readAtxHeading(raw) || /^\s*(?:>|!\[)/.test(raw)) break;
    const row = readTableRow(raw);
    if (!row) break;
    rows.push(row);
    // Keep source data even when a handwritten row has more cells than its header.
    while (headers.length < row.length) { headers.push(""); alignments.push("left"); }
  }
  return { headers, alignments, rows, consumedUntil: next - 1 };
}

export function readMarkdownListItem(line: string) {
  const match = line.match(/^\s*(?:(\d{1,9})[.)]|[（(]?(\d{1,9})[）)]|[-+*])\s+(.+)$/);
  if (!match) return null;
  const marker = match[1] ?? match[2];
  const task = match[3].match(/^\[([ xX])\]\s+(.+)$/);
  return {
    ordered: marker !== undefined,
    start: marker === undefined ? 1 : Number(marker),
    item: task ? { text: task[2], checked: task[1].toLowerCase() === "x" } : { text: match[3] },
  };
}
