import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("cover prompt requires exact title and verified official logo", async () => {
  const source = await readFile(new URL("../lib/editor/cover-design.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /最终成品必须含有上述标题/);
  assert.match(source, /逐字照录，一字不漏、一字不改/);
  assert.match(source, /官方 Logo/);
  assert.match(source, /绝不猜测、杜撰或仿制/);
  assert.match(source, /来源 URL/);
  assert.match(source, /钢铁私塾 唐淼/);
  assert.match(source, /右下角已准确排印/);
  assert.match(source, /Prompt as Code 协议 V2/);
  assert.match(source, /只交付一张完成封面/);
  assert.match(source, /唯一视觉隐喻/);
  assert.match(source, /镜头语言/);
  assert.match(source, /moodboard/);
  assert.match(source, /buildCoverProtocol/);
  assert.match(page, /Prompt as Code V2/);
  assert.match(page, /六段执行协议/);
  assert.match(page, /复制封面协议 V2/);
  assert.doesNotMatch(source, /图片本身不生成标题文字/);
  assert.doesNotMatch(page, /cover-toolbar-copy/);
});
