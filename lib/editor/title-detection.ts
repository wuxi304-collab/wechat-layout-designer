export type PlainTextTitleCandidate = {
  lineIndex: number;
  lineIndices: number[];
  preambleLineIndices: number[];
  raw: string;
};

function visibleText(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/^\s*(?:\*\*|__|~~)?\s*/, "")
    .replace(/\s*(?:\*\*|__|~~)?\s*$/, "")
    .trim();
}

function visibleLength(value: string) {
  return Array.from(visibleText(value)).length;
}

function hasExplicitH1(lines: string[]) {
  let fence: "```" | "~~~" | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const fenceMarker = line.match(/^(```|~~~)/)?.[1] as "```" | "~~~" | undefined;
    if (fenceMarker) {
      if (!fence) fence = fenceMarker;
      else if (fence === fenceMarker) fence = null;
      continue;
    }
    if (!fence && /^#\s+\S/.test(line)) return true;
  }
  return false;
}

function isByline(value: string) {
  return /^(?:主编|作者|编辑|撰文|文\/图|记者|统筹|审核|校对)\s*[：:]\s*\S+/u.test(visibleText(value));
}

function isDocumentMetadata(value: string) {
  const text = visibleText(value).replace(/\s+/g, " ");
  return /^(?:原创|转载|首发|置顶|来源|出品|发布于|公众号|微信公众平台)(?:\s|[：:]|$)/u.test(text)
    || /^(?:\d{4}\s*[年./-]\s*)?\d{1,2}\s*[月./-]\s*\d{1,2}\s*日?(?:\s+\d{1,2}:\d{2})?(?:\s+\S{1,8})?$/u.test(text)
    || /^(?:阅读|收听|星标|点赞|评论|字数|预计阅读)\s*[：:]?\s*\d+/u.test(text)
    || /^(?:DOCX?|PDF|Markdown|TXT)(?:\s|[·•|｜-]|$)/iu.test(text);
}

function isStructural(value: string) {
  const raw = value.trim();
  return /^(?:#{1,6}\s|>|[-+*]\s|\d+[.)]\s|```|~~~|!\[|\[[^\]]+\]:|<\/?[a-z]|https?:\/\/)/i.test(raw)
    || /^(?:-{3,}|_{3,}|\*{3,})$/.test(raw);
}

function isPlausibleTitle(value: string, allowWrappedEnding = false) {
  const text = visibleText(value);
  const length = visibleLength(text);
  if (length < 4 || length > 72 || isStructural(value) || isByline(value) || isDocumentMetadata(value)) return false;
  if ((allowWrappedEnding ? /[。；;、]$/u : /[。；;，,、]$/u).test(text)) return false;
  if ((text.match(/[。；;，,、]/gu)?.length ?? 0) > 3) return false;
  return true;
}

function nextNonEmptyIndex(lines: string[], from: number) {
  for (let index = from; index < lines.length; index += 1) {
    if (lines[index].trim()) return index;
  }
  return -1;
}

/** 识别复制稿、Word 与 PDF 常见的视觉标题，并越过来源、日期、公众号名与署名。 */
export function detectPlainTextTitle(source: string, explicitTitle = ""): PlainTextTitleCandidate | null {
  if (explicitTitle.trim()) return null;
  const lines = source.split("\n");
  if (hasExplicitH1(lines)) return null;

  let lineIndex = -1;
  let inspected = 0;
  const preambleLineIndices: number[] = [];
  for (let index = 0; index < lines.length && inspected < 14; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    inspected += 1;
    if (isByline(line)) continue;
    if (isDocumentMetadata(line)) {
      preambleLineIndices.push(index);
      continue;
    }
    const following = nextNonEmptyIndex(lines, index + 1);
    if (visibleLength(line) <= 12 && following >= 0 && isDocumentMetadata(lines[following])) {
      preambleLineIndices.push(index);
      continue;
    }
    lineIndex = index;
    break;
  }
  if (lineIndex < 0) return null;

  const lineIndices = [lineIndex];
  let raw = lines[lineIndex].trim();
  const adjacentIndex = lineIndex + 1;
  const adjacent = lines[adjacentIndex]?.trim() ?? "";
  const canMergeAdjacent = Boolean(
    adjacent
    && isPlausibleTitle(raw, true)
    && isPlausibleTitle(adjacent)
    && !/[。！？!?；;、]$/u.test(visibleText(raw))
    && visibleLength(raw) <= 48
    && visibleLength(adjacent) <= 48
    && visibleLength(`${raw}${adjacent}`) <= 96
  );
  if (!isPlausibleTitle(raw) && !canMergeAdjacent) return null;
  if (
    canMergeAdjacent
  ) {
    raw = `${raw}${adjacent}`;
    lineIndices.push(adjacentIndex);
  }

  const title = visibleText(raw);
  if (/[：:]$/u.test(title)) return null;
  const bodyStart = nextNonEmptyIndex(lines, lineIndices.at(-1)! + 1);
  if (bodyStart < 0) return null;
  if (isByline(lines[bodyStart]) || isDocumentMetadata(lines[bodyStart])) {
    if (nextNonEmptyIndex(lines, bodyStart + 1) < 0) return null;
  }

  const separated = !lines[lineIndices.at(-1)! + 1]?.trim() || lineIndices.length > 1;
  const titleSignal = /[？?！!]/u.test(title) || /[：:]/u.test(title) || visibleLength(title) <= 36;
  if (!separated && !titleSignal) return null;
  return { lineIndex, lineIndices, preambleLineIndices, raw: title };
}
