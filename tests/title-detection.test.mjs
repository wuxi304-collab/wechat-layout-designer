import assert from "node:assert/strict";
import test from "node:test";

import { detectPlainTextTitle } from "../lib/editor/title-detection.ts";

test("detects a standalone plain-text title", () => {
  assert.deepEqual(
    detectPlainTextTitle("中国不锈钢贸易商，还有未来吗？\n\n过去二十多年，贸易商连接钢厂与终端。"),
    { lineIndex: 0, lineIndices: [0], preambleLineIndices: [], raw: "中国不锈钢贸易商，还有未来吗？" },
  );
});

test("detects a title after a leading byline", () => {
  assert.deepEqual(
    detectPlainTextTitle("主编：钢铁私塾 唐淼\n\n太钢为什么一定要和青拓拼价格\n\n价格只是表象。"),
    { lineIndex: 2, lineIndices: [2], preambleLineIndices: [], raw: "太钢为什么一定要和青拓拼价格" },
  );
  assert.deepEqual(
    detectPlainTextTitle("**主编：钢铁私塾 唐淼**\n\n304L为什么不能随便替代304？\n\n低碳不是万能钥匙。"),
    { lineIndex: 2, lineIndices: [2], preambleLineIndices: [], raw: "304L为什么不能随便替代304？" },
  );
});

test("skips copied WeChat metadata before the title", () => {
  assert.deepEqual(
    detectPlainTextTitle("原创 钢铁私塾\n2026年8月26日 07:08 江苏\n\n中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了\n\n询价只是采购流程的一个节点。"),
    { lineIndex: 3, lineIndices: [3], preambleLineIndices: [0, 1], raw: "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了" },
  );
});

test("merges a title split by a visual line break", () => {
  assert.deepEqual(
    detectPlainTextTitle("不锈钢8月排产创历史新高，\n钢厂到底在赌什么？\n\n排产数据背后是另一套判断。"),
    { lineIndex: 0, lineIndices: [0, 1], preambleLineIndices: [], raw: "不锈钢8月排产创历史新高，钢厂到底在赌什么？" },
  );
});

test("does not mistake an ordinary opening paragraph for a title", () => {
  assert.equal(
    detectPlainTextTitle("过去二十多年，中国不锈钢行业有一个非常重要的角色：\n\n贸易商连接钢厂与终端。"),
    null,
  );
});

test("keeps explicit Markdown H1 authoritative", () => {
  assert.equal(
    detectPlainTextTitle("开场短句\n\n# 真正的标题\n\n正文"),
    null,
  );
});

test("rejects markup, overly long lines and missing body", () => {
  assert.equal(detectPlainTextTitle("> 引用不是标题\n\n正文"), null);
  assert.equal(detectPlainTextTitle(`${"很长".repeat(40)}\n\n正文`), null);
  assert.equal(detectPlainTextTitle("只有标题，没有正文"), null);
});
