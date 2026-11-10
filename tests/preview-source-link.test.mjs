import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSourceLineRanges } from "../lib/editor/source-navigation.ts";

test("source ranges keep UTF-16 indices for Chinese, emoji and a removed front matter", () => {
  const source = "---\\ntitle: 测试\\n---\\n# 主题\\n\\n## 材料\\n304L 与 316L 😀\\n第二行";
  const normalized = source.replace(/\\n/g, "\n");
  const frontMatter = "---\ntitle: 测试\n---\n";
  const ranges = readSourceLineRanges(normalized.slice(frontMatter.length), frontMatter.length);
  assert.deepEqual(ranges.map(({ start, end }) => normalized.slice(start, end)), ["# 主题", "", "## 材料", "304L 与 316L 😀", "第二行"]);
  assert.equal(ranges[3].end - ranges[3].start, "304L 与 316L 😀".length);
  assert.equal(ranges[0].start, frontMatter.length);
});

test("source range mapping handles blank and final lines without shifting positions", () => {
  assert.deepEqual(readSourceLineRanges(""), [{ start: 0, end: 0 }]);
  assert.deepEqual(readSourceLineRanges("甲\n\n乙\n"), [
    { start: 0, end: 1 },
    { start: 2, end: 2 },
    { start: 3, end: 4 },
    { start: 5, end: 5 },
  ]);
  assert.throws(() => readSourceLineRanges("A", -1), RangeError);
});

test("article parser assigns source spans before blanking detected title lines", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /const sourceLines = readSourceLineRanges\(source, normalizeMarkdownInput\(markdown\)\.length - source\.length\)/);
  assert.ok(source.indexOf("const sourceLines = readSourceLineRanges") < source.indexOf("const inferredTitle ="));
  for (const kind of ["paragraph", "heading", "subheading", "quote", "alert", "table", "image", "list", "code", "divider"]) {
    assert.match(source, new RegExp("type: [^\\n]*[\\\"']" + kind + "[\\\"']"), "missing article block " + kind);
  }
  assert.match(source, /sourceRange: sourceSpan\(codeFence\.startLine, lineIndex\)/);
  assert.match(source, /sourceRange: sourceSpan\(lineIndex, table\.consumedUntil\)/);
  assert.match(source, /sourceRange: sourceSpan\(paragraphBegin, paragraphLast\)/);
  assert.match(source, /sourceRange: sourceSpan\(quoteBegin, quoteLast\)/);
  assert.match(source, /sourceRange: sourceSpan\(listBegin, listLast\)/);
});

test("phone final preview can select a block and open its source span", async () => {
  const [page, workspace] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/source-workspace.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /if \(workspaceView !== "proof"\) setWorkspaceView\("proof"\)/);
  assert.match(page, /function editSelectedBlock\(\)/);
  assert.match(page, /setSourceFocusRange\(\{ \.\.\.range \}\)/);
  assert.match(page, /<SourceWorkspace value=\{markdown\} active=\{sourceOpen\} focusRange=\{sourceFocusRange\}/);
  assert.match(workspace, /useLayoutEffect\(\(\) => \{[\s\S]*?if \(!active \|\| !focusRange \|\| !editor\.current\) return;/);
  assert.match(workspace, /revealRange\(editor\.current,/);
  assert.match(workspace, /\}, \[active, focusRange\]\);/);
  assert.doesNotMatch(workspace, /\}, \[active, focusRange, value\]\);/);
  assert.match(page, /if \(markdown !== safeMarkdown\) \{/);
  assert.match(page, /编辑本段/);
});
