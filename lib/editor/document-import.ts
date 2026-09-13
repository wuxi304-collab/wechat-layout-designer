import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const MAX_WORD_BYTES = 25 * 1024 * 1024;
const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_PDF_PAGES = 500;

export type ImportedDocument = {
  markdown: string;
  sourceLabel: string;
  summary: string;
  warnings: string[];
};

export type DocumentImportProgress = {
  currentPage: number;
  totalPages: number;
};

export type PdfTextRun = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfLine = {
  text: string;
  x: number;
  y: number;
  height: number;
};

export class DocumentImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentImportError";
  }
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function cleanMarkdown(value: string) {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extensionOf(name: string) {
  return name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
}

function shouldInsertSpace(previous: string, next: string, gap = 0, height = 16) {
  if (!previous || !next || gap <= Math.max(0.8, height * 0.08)) return false;
  const left = previous.at(-1) ?? "";
  const right = next[0] ?? "";
  if (/\p{Script=Han}/u.test(left) || /\p{Script=Han}/u.test(right)) return false;
  if (/[（《“‘【〔(\[/]/u.test(left) || /[，。！？；：、）》”’】〕)\].,!?;:]/u.test(right)) return false;
  return /[\p{L}\p{N}]/u.test(left) && /[\p{L}\p{N}]/u.test(right);
}

function joinWrappedText(previous: string, next: string) {
  if (!previous) return next;
  if (!next) return previous;
  if (/\w-$/.test(previous) && /^[a-z]/.test(next)) return `${previous.slice(0, -1)}${next}`;
  return `${previous}${shouldInsertSpace(previous, next, 2, 16) ? " " : ""}${next}`;
}

function groupPdfRunsIntoLines(runs: PdfTextRun[]) {
  const ordered = runs
    .filter((item) => item.str.trim())
    .sort((a, b) => Math.abs(b.y - a.y) > 1.5 ? b.y - a.y : a.x - b.x);
  const lines: Array<{ runs: PdfTextRun[]; y: number }> = [];

  for (const run of ordered) {
    const tolerance = Math.max(2, Math.min(5, run.height * 0.34));
    const line = lines.findLast((candidate) => Math.abs(candidate.y - run.y) <= tolerance);
    if (line) line.runs.push(run);
    else lines.push({ runs: [run], y: run.y });
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map<PdfLine>((line) => {
      const pieces = line.runs.sort((a, b) => a.x - b.x);
      let text = "";
      let previousEnd = pieces[0]?.x ?? 0;
      for (const piece of pieces) {
        const gap = piece.x - previousEnd;
        if (shouldInsertSpace(text, piece.str, gap, piece.height)) text += " ";
        text += piece.str;
        previousEnd = Math.max(previousEnd, piece.x + piece.width);
      }
      return {
        text: text.replace(/\s+/g, " ").trim(),
        x: Math.min(...pieces.map((item) => item.x)),
        y: line.y,
        height: Math.max(...pieces.map((item) => item.height || 1)),
      };
    })
    .filter((line) => line.text && !/^(?:第\s*)?\d+\s*(?:页)?$/u.test(line.text));
}

function boundaryKey(value: string) {
  return value.replace(/\s+/g, "").replace(/\d+/g, "#").slice(0, 64);
}

function removeRepeatedPdfMargins(pages: PdfLine[][]) {
  if (pages.length < 3) return pages;
  const counts = new Map<string, number>();
  for (const lines of pages) {
    const pageKeys = new Set([...lines.slice(0, 2), ...lines.slice(-2)].map((line) => boundaryKey(line.text)).filter((key) => key.length >= 3));
    for (const key of pageKeys) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const threshold = Math.max(2, Math.ceil(pages.length * 0.5));
  const repeated = new Set([...counts].filter(([, count]) => count >= threshold).map(([key]) => key));
  return pages.map((lines) => lines.filter((line, index) => {
    const atMargin = index < 2 || index >= lines.length - 2;
    return !atMargin || !repeated.has(boundaryKey(line.text));
  }));
}

export function pdfLinesToMarkdown(lines: PdfLine[], firstPage = false) {
  if (!lines.length) return "";
  const heights = lines.map((line) => line.height).filter(Boolean).sort((a, b) => a - b);
  const bodyHeight = median(heights.slice(0, Math.max(1, Math.ceil(heights.length * 0.6)))) || 16;
  const lineGaps = lines.slice(1).map((line, index) => lines[index].y - line.y).filter((gap) => gap > 1);
  const normalGap = median(lineGaps) || bodyHeight * 1.25;
  const leftEdge = Math.min(...lines.map((line) => line.x));
  const blocks: string[] = [];
  let paragraph = "";

  // PDF 经常把同一视觉标题拆成两行。首屏先找最大字号簇，再按邻接关系合为一个 H1；
  // 页眉或 Logo 旁的小字不会因为“出现得更早”而抢走标题。
  const earlyDisplay = firstPage
    ? lines.slice(0, 10).map((line, index) => ({ line, index })).filter(({ line }) => line.height >= bodyHeight * 1.22 && line.text.length <= 72)
    : [];
  const largestDisplay = Math.max(0, ...earlyDisplay.map(({ line }) => line.height));
  const titleCandidates = earlyDisplay.filter(({ line }) => line.height >= largestDisplay * 0.88);
  const titleGroup: typeof titleCandidates = [];
  for (const candidate of titleCandidates) {
    if (!titleGroup.length) {
      titleGroup.push(candidate);
      continue;
    }
    const previous = titleGroup.at(-1)!;
    const closeEnough = candidate.index === previous.index + 1
      && previous.line.y - candidate.line.y <= Math.max(largestDisplay * 2.4, normalGap * 2);
    if (!closeEnough || `${titleGroup.map(({ line }) => line.text).join("")}${candidate.line.text}`.length > 96) break;
    titleGroup.push(candidate);
  }
  const titleIndices = new Set(titleGroup.map(({ index }) => index));
  const titleText = titleGroup.map(({ line }) => line.text).join("");

  const flush = () => {
    if (paragraph.trim()) blocks.push(paragraph.trim());
    paragraph = "";
  };

  lines.forEach((line, index) => {
    const previous = lines[index - 1];
    if (titleIndices.has(index)) {
      flush();
      if (index === titleGroup[0]?.index) blocks.push(`# ${titleText}`);
      return;
    }
    const isDisplayLine = line.height >= bodyHeight * 1.22 && line.text.length <= 72;
    if (isDisplayLine) {
      flush();
      blocks.push(`## ${line.text}`);
      return;
    }
    const verticalGap = previous ? previous.y - line.y : 0;
    const indented = line.x - leftEdge > bodyHeight * 0.72;
    const previousClosed = previous ? /[。！？；!?]$/u.test(previous.text) : false;
    const startsNewParagraph = Boolean(previous && (verticalGap > Math.max(normalGap * 1.52, bodyHeight * 1.75) || (indented && previousClosed)));
    if (startsNewParagraph) flush();
    paragraph = joinWrappedText(paragraph, line.text);
  });
  flush();
  return cleanMarkdown(blocks.join("\n\n"));
}

async function importWord(arrayBuffer: ArrayBuffer): Promise<ImportedDocument> {
  const mammothModule = await import("mammoth");
  const mammoth = mammothModule.default;
  let imageCount = 0;
  const styleMap = [
    "p[style-name='标题'] => h1:fresh",
    ...Array.from({ length: 6 }, (_, index) => `p[style-name='标题 ${index + 1}'] => h${index + 1}:fresh`),
  ];
  // Browser builds read `arrayBuffer`; the Node test path reads `buffer`.
  // Keeping both makes the conversion deterministic without shipping a Node Buffer polyfill.
  const mammothInput = { arrayBuffer, buffer: new Uint8Array(arrayBuffer) } as unknown as { arrayBuffer: ArrayBuffer };
  const result = await mammoth.convertToHtml(
    mammothInput,
    {
      styleMap,
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.imgElement(async () => ({ src: `word-embedded-image:${++imageCount}` })),
    },
  );

  const turndown = new TurndownService({
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    headingStyle: "atx",
    strongDelimiter: "**",
  });
  turndown.use(gfm);
  turndown.addRule("wordEmbeddedImage", {
    filter: "img",
    replacement: (_content, node) => {
      const alt = (node as HTMLImageElement).alt.trim();
      return `\n\n> Word 内嵌图片${alt ? `：${alt}` : ""}（请在微信后台重新插入）\n\n`;
    },
  });
  const markdown = cleanMarkdown(turndown.turndown(result.value));
  if (!markdown) throw new DocumentImportError("Word 文档没有识别到可编辑文字，请检查文件内容");
  const warningCount = result.messages.filter((message) => message.type === "warning").length;
  const warnings = [
    ...(imageCount ? [`检测到 ${imageCount} 张内嵌图片，已保留位置提示，请在微信后台重新插入`] : []),
    ...(warningCount ? [`有 ${warningCount} 项 Word 样式未完全映射，请复核原稿`] : []),
  ];
  return {
    markdown,
    sourceLabel: "DOCX · 本机解析",
    summary: `Word 已导入${imageCount ? `，${imageCount} 张图片待补` : "，结构已转换"}`,
    warnings,
  };
}

async function importPdf(arrayBuffer: ArrayBuffer, onProgress?: (progress: DocumentImportProgress) => void): Promise<ImportedDocument> {
  const [pdfjs, workerAsset] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerAsset.default;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  try {
    const pdf = await loadingTask.promise;
    const processedPages = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const pages: PdfLine[][] = [];
    for (let pageNumber = 1; pageNumber <= processedPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const runs = textContent.items.flatMap<PdfTextRun>((item) => {
        if (!("str" in item) || !item.str.trim()) return [];
        return [{
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height || Math.abs(item.transform[3]) || 1,
        }];
      });
      pages.push(groupPdfRunsIntoLines(runs));
      page.cleanup();
      onProgress?.({ currentPage: pageNumber, totalPages: processedPages });
    }
    const cleanedPages = removeRepeatedPdfMargins(pages);
    const markdown = cleanMarkdown(cleanedPages.map((lines, index) => pdfLinesToMarkdown(lines, index === 0)).filter(Boolean).join("\n\n"));
    const characterCount = markdown.replace(/\s|[#>*_`-]/g, "").length;
    if (characterCount < Math.max(8, processedPages * 2)) {
      throw new DocumentImportError("PDF 几乎没有可选择文字，可能是扫描件；请先 OCR 后再导入");
    }
    const warnings = [
      "PDF 仅提取可选择文字，图片、脚注位置与复杂分栏需要人工复核",
      ...(characterCount / processedPages < 30 ? ["每页可提取文字较少，部分页面可能是扫描图"] : []),
      ...(pdf.numPages > processedPages ? [`文档共 ${pdf.numPages} 页，本次为避免卡顿只导入前 ${processedPages} 页`] : []),
    ];
    return {
      markdown,
      sourceLabel: `PDF ${processedPages}页 · 本机解析`,
      summary: `PDF 已导入 ${processedPages} 页，请复核分栏与图片`,
      warnings,
    };
  } catch (error) {
    if (error instanceof DocumentImportError) throw error;
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") throw new DocumentImportError("PDF 已加密，请解除密码后再导入");
    throw new DocumentImportError("PDF 无法解析，文件可能损坏、加密或格式不受支持");
  } finally {
    await loadingTask.destroy();
  }
}

export async function importDocumentFile(file: File, onProgress?: (progress: DocumentImportProgress) => void): Promise<ImportedDocument> {
  const extension = extensionOf(file.name);
  if (extension === ".doc") throw new DocumentImportError("旧版 .doc 暂不支持，请在 Word 中另存为 .docx");
  if (extension === ".docx") {
    if (file.size > MAX_WORD_BYTES) throw new DocumentImportError("Word 文件超过 25MB，请压缩图片后再导入");
    return importWord(await file.arrayBuffer());
  }
  if (extension === ".pdf") {
    if (file.size > MAX_PDF_BYTES) throw new DocumentImportError("PDF 超过 50MB，请压缩或拆分后再导入");
    return importPdf(await file.arrayBuffer(), onProgress);
  }
  throw new DocumentImportError("请选择 Markdown、TXT、Word（.docx）或 PDF 文件");
}
