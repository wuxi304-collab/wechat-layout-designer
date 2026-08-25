export type PlainTextTitleCandidate = {
  lineIndex: number;
  raw: string;
};

function visibleLength(value: string) {
  return Array.from(value
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*|__|~~|`/g, "")
    .trim()).length;
}

function structuralText(value: string) {
  return value.replace(/^\s*(?:\*\*|__|~~)?\s*/, "").replace(/\s*(?:\*\*|__|~~)?\s*$/, "").trim();
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

/**
 * 识别公众号作者常用的“首行纯文本标题”。
 * 规则故意保守：只有独占一行、长度合适且后方仍有正文时才成立。
 */
export function detectPlainTextTitle(source: string, explicitTitle = ""): PlainTextTitleCandidate | null {
  if (explicitTitle.trim()) return null;
  const lines = source.split("\n");
  if (hasExplicitH1(lines)) return null;

  let lineIndex = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    if (/^(?:主编|作者)\s*[：:]\s*\S+/.test(structuralText(line))) continue;
    lineIndex = index;
    break;
  }
  if (lineIndex < 0) return null;

  const raw = lines[lineIndex].trim();
  if (
    /^(?:#{1,6}\s|>|[-+*]\s|\d+[.)]\s|```|~~~|!\[|\[[^\]]+\]:|<\/?[a-z]|https?:\/\/)/i.test(raw)
    || /^(?:-{3,}|_{3,}|\*{3,})$/.test(raw)
    || /^(?:主编|作者)\s*[：:]/.test(structuralText(raw))
  ) return null;

  const length = visibleLength(raw);
  if (length < 4 || length > 64) return null;
  if (/[。；;，,、：:]$/.test(raw)) return null;
  if ((raw.match(/[。；;，,、：:]/g)?.length ?? 0) > 2) return null;

  const nextLine = lines[lineIndex + 1]?.trim() ?? "";
  const separatedFromBody = !nextLine || /^(?:主编|作者)\s*[：:]\s*\S+/.test(structuralText(nextLine));
  if (!separatedFromBody) return null;

  const hasBodyAfterTitle = lines.slice(lineIndex + 1).some((line) => {
    const trimmed = line.trim();
    return Boolean(trimmed && !/^(?:主编|作者)\s*[：:]\s*\S+/.test(structuralText(trimmed)));
  });
  if (!hasBodyAfterTitle) return null;

  return { lineIndex, raw };
}
