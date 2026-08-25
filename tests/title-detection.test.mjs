import assert from "node:assert/strict";
import test from "node:test";

import { detectPlainTextTitle } from "../lib/editor/title-detection.ts";

test("detects a standalone plain-text title", () => {
  assert.deepEqual(
    detectPlainTextTitle("中国不锈钢贸易商，还有未来吗？\n\n过去二十多年，贸易商连接钢厂与终端。"),
    { lineIndex: 0, raw: "中国不锈钢贸易商，还有未来吗？" },
  );
});

test("detects a title after a leading byline", () => {
  assert.deepEqual(
    detectPlainTextTitle("主编：钢铁私塾 唐淼\n\n太钢为什么一定要和青拓拼价格\n\n价格只是表象。"),
    { lineIndex: 2, raw: "太钢为什么一定要和青拓拼价格" },
  );
  assert.deepEqual(
    detectPlainTextTitle("**主编：钢铁私塾 唐淼**\n\n304L为什么不能随便替代304？\n\n低碳不是万能钥匙。"),
    { lineIndex: 2, raw: "304L为什么不能随便替代304？" },
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
