import assert from "node:assert/strict";
import test from "node:test";
import { findSourceMatches, isCompositionKey, readSourceHeadings, replaceSourceMatches, toggleSourceAnnotation, toggleSourceEmphasis } from "../lib/editor/source-navigation.ts";

test("highlight and underline preserve source and can toggle off without changing emphasis", () => {
  const source = "前文 **316L** 后文";
  for (const kind of ["underline", "highlight"]) {
    const next = toggleSourceAnnotation(source, { start: 3, end: 11 }, kind);
    assert.equal(next.text.slice(next.start, next.end), "**316L**");
    assert.equal(toggleSourceAnnotation(next.text, next, kind).text, source);
  }
  assert.equal(toggleSourceAnnotation("甲\n乙", {start:0,end:3}, "highlight"), null);
});

test("IME candidate Enter and Process keys do not trigger source commands", () => {
  assert.equal(isCompositionKey({ key: "Enter", keyCode: 229 }), true);
  assert.equal(isCompositionKey({ key: "Enter", isComposing: true }), true);
  assert.equal(isCompositionKey({ key: "Process" }), true);
  assert.equal(isCompositionKey({ key: "Enter", keyCode: 13 }), false);
});

test("literal replacement preserves technical punctuation, CRLF, dollar signs and case choice", () => {
  const raw = "# C++\r\nA+B (A.B)；a+b (a.b)\r\n**316L**";
  const matches = findSourceMatches(raw, "A+B (A.B)");
  assert.equal(replaceSourceMatches(raw, matches, "$&\\316L", 1).text, "# C++\r\nA+B (A.B)；$&\\316L\r\n**316L**");
  assert.equal(replaceSourceMatches(raw, matches, "").text, "# C++\r\n；\r\n**316L**");
  assert.equal(findSourceMatches(raw, "A+B (A.B)", true).length, 1);
  assert.equal(replaceSourceMatches(raw, [], "x"), null);
  const unicode = "K / k";
  assert.equal(replaceSourceMatches(unicode, findSourceMatches(unicode, "k"), "中").text, "中 / 中");
  const grades = "304、304L、S30408，中文304材质，**304**。";
  assert.deepEqual(findSourceMatches(grades, "304", false, true).map(({start}) => start), [0, 18, 26]);
});

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
