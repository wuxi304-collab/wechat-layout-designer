import TurndownService from "turndown";
import { closesFence, readFence } from "./markdown-structure.ts";

const MAX_CELLS = 5000;
export type SpreadsheetPaste = { markdown: string; rows: number; columns: number; merged: boolean };

/** Rectangular clipboard TSV. Never interpret a cell as a number or formula. */
export function readClipboardGrid(text: string): string[][] | null {
  if (!text.includes("\t") || text.length > 2_000_000) return null;
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false, delimiters = 0;
  for (let at = 0; at < text.length; at++) {
    const char = text[at];
    if (quoted) {
      if (char === '"' && text[at + 1] === '"') { cell += '"'; at++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === '"' && !cell && !closed) quoted = true;
    else if (char === "\t" || char === "\n" || char === "\r") {
      row.push(cell); cell = ""; closed = false;
      if (char === "\t") delimiters++;
      else { rows.push(row); row = []; if (char === "\r" && text[at + 1] === "\n") at++; }
      if (delimiters + rows.length > MAX_CELLS) throw new Error("表格超过 5,000 个单元格，请拆分后粘贴。原稿未改动。");
    } else {
      if (closed) return null;
      cell += char;
    }
  }
  if (quoted || !delimiters) return null;
  if (row.length || cell || closed || !/[\r\n]$/.test(text)) rows.push([...row, cell]);
  if (!rows.length || rows.some((item) => item.length !== rows[0].length)) return null;
  return rows;
}

function cellMarkdown(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/([=`*_~\[\]<>])/g, "\\$1").replace(/\|/g, "\\|").replace(/\r\n?|\n/g, "<br>");
}

export function gridMarkdown(rows: string[][], alignments: string[] = [], formatted = false): SpreadsheetPaste {
  const columns = Math.max(...rows.map((row) => row.length));
  if (!rows.length || !columns || rows.length * columns > MAX_CELLS) throw new Error("表格为空或超过 5,000 个单元格，请拆分后粘贴。");
  const serialize = (row: string[]) => `| ${Array.from({ length: columns }, (_, index) => formatted ? formattedCell(row[index] ?? "") : cellMarkdown(row[index] ?? "")).join(" | ")} |`;
  const rule = `| ${Array.from({ length: columns }, (_, index) => ({ right: "---:", center: ":---:", left: ":---" })[alignments[index]] ?? "---").join(" | ")} |`;
  return { markdown: [serialize(rows[0]), rule, ...rows.slice(1).map(serialize)].join("\n"), rows: rows.length, columns, merged: false };
}

function formattedCell(value: string) {
  let result = "", slashes = 0;
  for (const character of value.replace(/\r\n?|\n/g, "<br>")) {
    if (character === "|" && slashes % 2 === 0) result += "\\";
    result += character;
    slashes = character === "\\" ? slashes + 1 : 0;
  }
  return result;
}

function htmlGrid(html: string): SpreadsheetPaste | null {
  let result: SpreadsheetPaste | null = null, count = 0;
  const converter = new TurndownService();
  const cells = new TurndownService({ strongDelimiter: "**", emDelimiter: "*", codeBlockStyle: "fenced" });
  const escapeCell = cells.escape.bind(cells);
  cells.escape = (text) => escapeCell(text).replace(/=/g, "\\=");
  cells.remove(["script", "style", "button", "iframe", "object", "form", "input"]);
  cells.addRule("cellBreak", { filter: "br", replacement: () => "\n" });
  cells.addRule("cellBold", {
    filter: (node) => node.nodeName === "SPAN" && /font-weight\s*:\s*(?:bold|[6-9]00)\b/i.test(node.getAttribute("style") ?? ""),
    replacement: (content) => `**${content}**`,
  });
  cells.addRule("cellLink", { filter: "a", replacement: (content, node) => {
    const href = node.getAttribute("href") ?? "";
    return /^https?:\/\/[^\s<>]+$/i.test(href) && !/[()]/.test(href) ? `[${content}](${href})` : content;
  } });
  converter.remove(["script", "style", "button", "iframe", "object", "form", "input"]);
  converter.addRule("spreadsheet", { filter: "table", replacement: (_content, node) => {
    count++;
    if (node.querySelector("table,img,svg")) throw new Error("表格含嵌套表或图片，请先整理为纯单元格再粘贴。原稿未改动。");
    const sourceRows = Array.from(node.querySelectorAll("tr"));
    if (sourceRows.length > MAX_CELLS) throw new Error("表格超过 5,000 行，请拆分后粘贴。原稿未改动。");
    const grid: string[][] = sourceRows.map(() => []), alignments: string[] = [];
    let merged = false, occupied = 0;
    sourceRows.forEach((row, rowIndex) => {
      let column = 0;
      for (const cell of Array.from(row.children).filter((child) => /^(?:TD|TH)$/.test(child.nodeName))) {
        while (grid[rowIndex][column] !== undefined) column++;
        const span = Number(cell.getAttribute("colspan") || 1), declaredHeight = Number(cell.getAttribute("rowspan") || 1);
        const height = declaredHeight === 0 ? sourceRows.length - rowIndex : Math.min(declaredHeight, sourceRows.length - rowIndex);
        if (!Number.isSafeInteger(span) || span < 1 || !Number.isSafeInteger(height) || height < 1 || (column + span) * sourceRows.length > MAX_CELLS || (occupied += height * span) > MAX_CELLS) throw new Error("合并单元格范围过大或无效，请拆分表格后粘贴。原稿未改动。");
        if (span > 1 || height > 1) merged = true;
        const clone = cell.cloneNode(true) as HTMLElement;
        Array.from(clone.querySelectorAll("script,style,button,input")).forEach((child) => child.parentNode?.removeChild(child));
        const text = cells.turndown(clone.innerHTML).trim();
        for (let down = 0; down < height; down++) for (let across = 0; across < span; across++) {
          if (grid[rowIndex + down][column + across] !== undefined) throw new Error("合并单元格相互重叠，请整理表格后重试。原稿未改动。");
          grid[rowIndex + down][column + across] = !down && !across ? text : "";
        }
        if (!rowIndex) alignments[column] = (cell.getAttribute("align") || (cell as HTMLElement).style?.textAlign || "").toLowerCase();
        column += span;
      }
    });
    result = { ...gridMarkdown(grid, alignments, true), merged };
    return `\n\n${result.markdown}\n\n`;
  } });
  const converted = converter.turndown(html).trim();
  const captured = result as SpreadsheetPaste | null;
  return count === 1 && captured && converted === captured.markdown ? captured : null;
}

export function spreadsheetFromClipboard(plain: string, html = ""): SpreadsheetPaste | null {
  if (html.length > 2_000_000) return null;
  if (/<table\b/i.test(html)) return htmlGrid(html);
  if (/<(?:pre|code)\b/i.test(html)) return null;
  if (/^ {0,3}(?:`{3,}|~{3,}|#{1,6}\s|---\s*$)/m.test(plain)) return null;
  const grid = readClipboardGrid(plain);
  return grid ? gridMarkdown(grid) : null;
}

export function sourceIsLiteral(source: string, position: number): boolean {
  const before = source.slice(0, position), lines = before.split(/\r\n?|\n/);
  if (lines[0]?.replace(/^\uFEFF/, "") === "---" && !lines.slice(1).some((line) => /^---\s*$/.test(line))) return true;
  let fence: ReturnType<typeof readFence> = null;
  for (const line of lines.slice(0, -1)) {
    if (fence) { if (closesFence(line, fence)) fence = null; }
    else fence = readFence(line);
  }
  if (fence || /^(?: {4}|\t)/.test(lines.at(-1) ?? "")) return true;
  let ticks = "";
  for (const match of (lines.at(-1) ?? "").matchAll(/(?<!\\)`+/g)) ticks = ticks === match[0] ? "" : ticks || match[0];
  return Boolean(ticks);
}

export function tableInsertion(source: string, start: number, end: number, markdown: string) {
  const before = source.slice(0, start), after = source.slice(end);
  const prefix = !before || /\n[ \t]*\n$/.test(before) ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const suffix = !after || /^\n[ \t]*\n/.test(after) ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const insert = prefix + markdown + suffix;
  return { text: before + insert + after, start: start + insert.length, end: start + insert.length };
}
