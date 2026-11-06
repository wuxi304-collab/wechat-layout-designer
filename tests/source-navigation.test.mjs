import assert from "node:assert/strict";
import test from "node:test";
import { findSourceMatches, readSourceHeadings, toggleSourceEmphasis } from "../lib/editor/source-navigation.ts";

test("source outline skips front matter and fenced examples while keeping original CRLF offsets", () => {
  const raw = ["---", "title: 现场记录", "# YAML 注释", "---", "牌号说明", "====", "", "````md", "# 演示", "```", "## 仍在代码内", "````", "## 关于 C# ###"].join("\r\n");
  const headings = readSourceHeadings(raw);
  assert.deepEqual(headings.map(({ line, level, text }) => [line, level, text]), [[5, 1, "牌号说明"], [13, 2, "关于 C#"]]);
  assert.equal(raw.slice(headings[1].start, headings[1].end), "## 关于 C# ###");
});

test("find treats technical punctuation as literal and preserves source offsets", () => {
  const raw = "测量：K / A+B (A.B)；a+b (a.b)；AABB (AAB)";
  const matches = findSourceMatches(raw, "A+B (A.B)");
  assert.deepEqual(matches.map(({ start, end }) => raw.slice(start, end)), ["A+B (A.B)", "a+b (a.b)"]);
  assert.deepEqual(findSourceMatches(raw, " "), []);
});

test("toggling bold and italic preserves both the surrounding Markdown and the actual selection", () => {
  const raw = "选材：**316L**。";
  const start = raw.indexOf("316L");
  const italic = toggleSourceEmphasis(raw, { start, end: start + 4 }, "*");
  assert.equal(italic.text, "选材：***316L***。");
  const unbold = toggleSourceEmphasis(italic.text, italic, "**");
  assert.equal(unbold.text, "选材：*316L*。");
  assert.equal(unbold.text.slice(unbold.start, unbold.end), "316L");
  assert.equal(toggleSourceEmphasis("甲\n乙", { start: 0, end: 3 }, "*"), null);
});
