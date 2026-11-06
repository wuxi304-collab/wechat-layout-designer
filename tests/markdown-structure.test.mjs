import assert from "node:assert/strict";
import test from "node:test";
import { closesFence, findMarkdownTitle, readAtxHeading, readFence, readMarkdownListItem, readMarkdownTable } from "../lib/editor/markdown-structure.ts";

test("table cells retain inline markup and escaped pipes, with deliberate column alignment", () => {
  const lines = [
    "| 牌号 | 厚度 | 说明 |",
    "| --- | ---: | :---: |",
    "| **316L** | 3.0 mm | `A\\|B` |",
    "| 2205 | 6 mm | 短句 | 追加证据 |",
    "## 后续章节 | 口径",
  ];
  const table = readMarkdownTable(lines, 0);
  assert.deepEqual(table?.headers, ["牌号", "厚度", "说明", ""]);
  assert.deepEqual(table?.alignments, ["left", "right", "center", "left"]);
  assert.deepEqual(table?.rows, [["**316L**", "3.0 mm", "`A\\|B`"], ["2205", "6 mm", "短句", "追加证据"]]);
  assert.equal(table?.consumedUntil, 3);
  assert.equal(readMarkdownTable(["普通文句 | 继续", "| --- |"], 0), null);
});

test("fenced code cannot supply the document title or consume a shorter closing fence", () => {
  const lines = ["````md", "# 这是代码", "```", "里面还是代码", "````", "关于 C#", "====", "# 后续章节"];
  const fence = readFence(lines[0]);
  assert.equal(closesFence(lines[2], fence), false);
  assert.equal(closesFence(lines[4], fence), true);
  assert.deepEqual(findMarkdownTitle(lines), { text: "关于 C#", lineIndices: [5, 6] });
  assert.deepEqual(readAtxHeading("# 保留 C#"), { level: 1, text: "保留 C#" });
  assert.deepEqual(readAtxHeading("## 章节 ##"), { level: 2, text: "章节" });
});

test("ordered, bulleted and task markers retain their own semantics", () => {
  assert.deepEqual(readMarkdownListItem("7. 工况确认"), { ordered: true, start: 7, item: { text: "工况确认" } });
  assert.deepEqual(readMarkdownListItem("- [x] 看质保书"), { ordered: false, start: 1, item: { text: "看质保书", checked: true } });
  assert.deepEqual(readMarkdownListItem("（3） 复核"), { ordered: true, start: 3, item: { text: "复核" } });
  assert.equal(readMarkdownListItem("3.0 mm 热轧"), null);
});
