import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analyzeCoverContent,
  buildCoverHarness,
  buildCoverPrompt,
  coverStyles,
  detectCompanyName,
  validateCoverTextManifest,
} from "../lib/editor/cover-design.ts";

test("cover prompt uses the short logo-first workflow", async () => {
  const source = await readFile(new URL("../lib/editor/cover-design.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Logo First V4/);
  assert.match(source, /先取得真实 Logo 文件，再生成封面/);
  assert.match(source, /官方网站/);
  assert.match(source, /认证微信公众号/);
  assert.match(source, /作为本任务的原始参考素材/);
  assert.match(source, /真实存在这个文件，才可以调用生图工具/);
  assert.match(source, /不得让模型猜、画、描摹或仿制 Logo/);
  assert.match(source, /把 Logo 原图作为独立图层原样放在右上安全区/);
  assert.match(source, /coverAuthorName = "唐淼"/);
  assert.match(source, /只交付一张完成封面/);
  assert.match(source, /moodboard/);
  assert.match(source, /buildCoverProtocol/);
  assert.match(page, /先拿 Logo，再做封面/);
  assert.match(page, /找到原图，才开始生成/);
  assert.match(page, /复制封面制作指令/);
  assert.doesNotMatch(source, /Prompt as Code 协议 V3/);
  assert.doesNotMatch(source, /SHA-256/);
  assert.doesNotMatch(source, /Verification Harness/);
  assert.doesNotMatch(page, /4 GATES/);
});

test("title entity wins over descriptive prose and resolves to the canonical company", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const markdown = "要把它理解成一家大型化工设计院。\n\n材料选型在询价之前已经发生。";
  assert.equal(detectCompanyName(title, markdown), "中国天辰工程有限公司");
  assert.equal(detectCompanyName("材料选择为什么重要", markdown), null);
});

test("China Tianchen prompt blocks generated logos and locks the exact author name", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const profile = analyzeCoverContent(title, "要把它理解成一家大型化工设计院。材料与制造。" );
  const style = coverStyles.find((item) => item.id === "hyperreal");
  assert.ok(style);
  const prompt = buildCoverPrompt(style, title, profile);
  assert.match(prompt, /企业：中国天辰工程有限公司/);
  assert.match(prompt, /china-tcc\.com/);
  assert.match(prompt, /先打开中国天辰工程有限公司的官方网站/);
  assert.match(prompt, /官网没有可用图片时，再从该企业认证微信公众号/);
  assert.match(prompt, /真实存在这个文件，才可以调用生图工具/);
  assert.match(prompt, /右下角固定署名：“钢铁私塾 唐淼”/);
  assert.match(prompt, /“唐淼”不得写成“唐森”/);
  assert.doesNotMatch(prompt, /企业主体：是把它理解成一家大型化工设计院/);
});

test("V4 harness has only the three asset-first steps", () => {
  const harness = buildCoverHarness("中国天辰：项目用钢如何确定", "中国天辰工程有限公司");
  assert.equal(harness.workflowVersion, "4.0");
  assert.equal(harness.rule, "LOGO_FILE_FIRST");
  assert.equal(harness.steps.length, 3);
  assert.equal(harness.continueOnlyWhen, "OFFICIAL_LOGO_IMAGE_FILE_EXISTS");
  assert.match(harness.steps[0], /官网/);
  assert.match(harness.steps[0], /认证微信公众号/);
  assert.match(harness.steps[1], /真实图片文件/);
});

test("OCR harness rejects 唐森 and accepts only 唐淼", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const rejected = validateCoverTextManifest(title, [title, "钢铁私塾 唐森"]);
  assert.equal(rejected.passed, false);
  assert.deepEqual(rejected.missing, ["钢铁私塾 唐淼"]);
  assert.deepEqual(rejected.unexpected, ["钢铁私塾 唐森"]);
  assert.equal(validateCoverTextManifest(title, [title, "钢铁私塾 唐淼"]).passed, true);
});
