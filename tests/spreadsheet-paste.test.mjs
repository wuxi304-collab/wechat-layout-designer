import assert from "node:assert/strict";
import test from "node:test";
import { gridMarkdown, readClipboardGrid, sourceIsLiteral, spreadsheetFromClipboard, tableInsertion } from "../lib/editor/spreadsheet-paste.ts";

test("Excel TSV preserves grades, decimal precision, leading zeroes, quoted breaks and empty columns", () => {
  const raw = '牌号\t厚度\t价格\t备注\r\n304L\t3.00\t0012800\t"A|B\n第二行"\r\n316L\t0.050\t1,234.00\t\r\n';
  const grid = readClipboardGrid(raw);
  assert.deepEqual(grid, [["牌号", "厚度", "价格", "备注"], ["304L", "3.00", "0012800", "A|B\n第二行"], ["316L", "0.050", "1,234.00", ""]]);
  const table = gridMarkdown(grid);
  assert.equal(table.rows, 3); assert.equal(table.columns, 4);
  assert.ok(table.markdown.includes("304L | 3.00 | 0012800 | A\\|B<br>第二行"));
  assert.ok(table.markdown.includes("0.050 | 1,234.00"));
});

test("plain data escapes Markdown and HTML without evaluating formulas or losing characters", () => {
  const table = spreadsheetFromClipboard('**literal**\t=SUM(A1)\t<script>x</script>\tA|B');
  assert.ok(table.markdown.includes('\\*\\*literal\\*\\*'));
  assert.ok(table.markdown.includes('=SUM(A1)'));
  assert.ok(table.markdown.includes('\\<script\\>x\\</script\\>'));
  assert.equal(readClipboardGrid('A\tB\n\t\n').length, 2);
  assert.equal(readClipboardGrid('A\t"say ""hi"""')[0][1], 'say "hi"');
});

test("ordinary or malformed text and code paste are preserved through the ordinary path", () => {
  for (const raw of ['one\ntwo', '"unfinished\tvalue', '"quoted"suffix\tx', 'A\tB\n\tx\ty']) assert.equal(readClipboardGrid(raw), null);
  assert.equal(spreadsheetFromClipboard("A\tB", "<pre><code>A\tB</code></pre>"), null);
  assert.equal(spreadsheetFromClipboard("```txt\nA\tB\n```"), null);
  assert.equal(sourceIsLiteral("# 稿件\n\n```txt\nA", 15), true);
  assert.equal(sourceIsLiteral("---\ntitle: 中文\n", 15), true);
  assert.equal(sourceIsLiteral("参数 `A", 5), true);
  assert.equal(sourceIsLiteral("# 稿件\n\n正常文字", 11), false);
});

test("Office HTML td headers and merged cells keep positions and original values", () => {
  const table = spreadsheetFromClipboard("", '<table><tr><td>牌号</td><td colspan="2">参数</td></tr><tr><td rowspan="0">304L</td><td>3.00</td><td>0012</td></tr><tr><td>6.00</td><td>0013</td></tr></table>');
  assert.equal(table.merged, true);
  assert.equal(table.markdown, "| 牌号 | 参数 |  |\n| --- | --- | --- |\n| 304L | 3.00 | 0012 |\n|  | 6.00 | 0013 |");
  const one = spreadsheetFromClipboard("", '<table><tr><td align="right">厚度</td></tr><tr><td>3.00<br>6.00<script>danger()</script></td></tr></table>');
  assert.equal(one.markdown, "| 厚度 |\n| ---: |\n| 3.00<br>6.00 |");
});

test("mixed rich content and unbounded spans never silently lose content", () => {
  assert.equal(spreadsheetFromClipboard("A\tB", "<p>说明必须保留</p><table><tr><td>A</td><td>B</td></tr></table>"), null);
  assert.throws(() => spreadsheetFromClipboard("", '<table><tr><td colspan="99999">保留</td></tr></table>'), /过大|无效/);
  assert.throws(() => readClipboardGrid("x\t".repeat(6000)), /5,000/);
  assert.deepEqual(tableInsertion("前文后文", 2, 2, "TABLE"), { text: "前文\n\nTABLE\n\n后文", start: 11, end: 11 });
});

test("Office cell emphasis, inline code, links and numeric spelling survive together", () => {
  const html = '<table><tr><td><strong>牌号</strong></td><td>参数</td></tr><tr><td><span style="font-weight:700">304L</span><br><em>核对原文</em></td><td><code>A|B</code><br>3.00 / 0012<br><a href="https://example.com/evidence">原始证据</a></td></tr></table>';
  const table = spreadsheetFromClipboard("", html);
  assert.equal(table.markdown, '| **牌号** | 参数 |\n| --- | --- |\n| **304L**<br>*核对原文* | `A\\|B`<br>3.00 / 0012<br>[原始证据](https://example.com/evidence) |');
});

test("literal Office cell text stays literal and unsafe link destinations are omitted", () => {
  const table = spreadsheetFromClipboard("", '<table><tr><td>原文</td><td>备注</td></tr><tr><td>**原样** | =SUM(A1)</td><td><a href="javascript:alert(1)">保留文字</a></td></tr></table>');
  assert.ok(table.markdown.includes('\\*\\*原样\\*\\* \\| =SUM(A1)'));
  assert.ok(table.markdown.includes('保留文字'));
  assert.ok(!table.markdown.includes('javascript:'));
});
