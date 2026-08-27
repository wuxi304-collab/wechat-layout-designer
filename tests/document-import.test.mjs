import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import JSZip from "jszip";
import { importDocumentFile, pdfLinesToMarkdown } from "../lib/editor/document-import.ts";

test("PDF 中文换行会合并为自然段，不在汉字间插入空格", () => {
  const markdown = pdfLinesToMarkdown([
    { text: "中国不锈钢行业正在", x: 40, y: 700, height: 16 },
    { text: "进入新的成本周期。", x: 40, y: 680, height: 16 },
  ]);
  assert.equal(markdown, "中国不锈钢行业正在进入新的成本周期。");
});

test("PDF 大字号首行会保留为文章标题", () => {
  const markdown = pdfLinesToMarkdown([
    { text: "太钢今年最狠的一刀", x: 40, y: 700, height: 28 },
    { text: "这不是降本，而是重新定义研发。", x: 40, y: 650, height: 16 },
  ], true);
  assert.match(markdown, /^# 太钢今年最狠的一刀/);
});

test("Word 文档会在本机转换为带标题层级的 Markdown", async () => {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    </Types>`);
  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`);
  zip.folder("word").file("styles.xml", `<?xml version="1.0" encoding="UTF-8"?>
    <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="标题"/></w:style>
    </w:styles>`);
  zip.folder("word").folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    </Relationships>`);
  zip.folder("word").file("document.xml", `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>太钢研发成本观察</w:t></w:r></w:p>
        <w:p><w:r><w:t>这是一段正文。</w:t></w:r></w:p>
        <w:sectPr/>
      </w:body>
    </w:document>`);
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const file = { name: "观察.docx", size: bytes.byteLength, arrayBuffer: async () => bytes.buffer };
  const imported = await importDocumentFile(file);
  assert.equal(imported.sourceLabel, "DOCX · 本机解析");
  assert.match(imported.markdown, /^# 太钢研发成本观察/);
  assert.match(imported.markdown, /这是一段正文。/);
});

test("文件入口包含 Word、PDF、本机解析与扫描件保护", async () => {
  const source = await readFile(new URL("../lib/editor/document-import.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /mammoth/);
  assert.match(source, /pdfjs-dist/);
  assert.match(source, /可能是扫描件；请先 OCR/);
  assert.match(source, /旧版 \.doc 暂不支持/);
  assert.match(source, /MAX_PDF_BYTES = 50 \* 1024 \* 1024/);
  assert.match(source, /MAX_PDF_PAGES = 500/);
  assert.match(page, /\.docx,\.pdf/);
  assert.match(page, /PDF≤500页 · ≤50MB/);
  assert.match(page, /PDF \$\{currentPage\}\/\$\{totalPages\} 页/);
  assert.match(page, /文件仅在本机解析/);
  assert.match(page, /导入 .* 前/);
});
