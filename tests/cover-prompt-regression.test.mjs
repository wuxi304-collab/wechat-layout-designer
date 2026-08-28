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

test("cover workflow separates asset retrieval from deterministic composition", async () => {
  const source = await readFile(new URL("../lib/editor/cover-design.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Asset Pack V5/);
  assert.match(source, /本任务只准备素材/);
  assert.match(source, /不得交付最终封面/);
  assert.match(source, /必须只返回两个实际图片文件/);
  assert.match(source, /只返回底图视为任务失败/);
  assert.match(source, /官方网站/);
  assert.match(source, /认证微信公众号/);
  assert.match(source, /不得让图像模型猜、画、描摹或仿制 Logo/);
  assert.match(source, /由排版站本机 Canvas 合成/);
  assert.match(source, /coverAuthorName = "唐淼"/);
  assert.match(source, /moodboard/);
  assert.match(source, /buildCoverProtocol/);
  assert.match(page, /本机封面合成/);
  assert.match(page, /cover-background-file/);
  assert.match(page, /cover-logo-file/);
  assert.match(page, /官方来源网址/);
  assert.match(page, /生成最终封面 PNG/);
  assert.match(page, /disabled=\{!canComposeCover\}/);
  assert.match(page, /canvas\.width = 2350/);
  assert.match(page, /canvas\.height = 1000/);
  assert.match(page, /context\.drawImage\(logo/);
  assert.doesNotMatch(source, /Logo First V4/);
  assert.doesNotMatch(page, /复制封面制作指令/);
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

test("China Tianchen asset task blocks generated logos and preserves locked text for local composition", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const profile = analyzeCoverContent(title, "要把它理解成一家大型化工设计院。材料与制造。" );
  const style = coverStyles.find((item) => item.id === "hyperreal");
  assert.ok(style);
  const prompt = buildCoverPrompt(style, title, profile);
  assert.match(prompt, /企业：中国天辰工程有限公司/);
  assert.match(prompt, /china-tcc\.com/);
  assert.match(prompt, /先打开中国天辰工程有限公司官方网站/);
  assert.match(prompt, /认证微信公众号/);
  assert.match(prompt, /真实可下载的 PNG、SVG、WebP 或 JPG 文件/);
  assert.match(prompt, /固定署名：“钢铁私塾 唐淼”/);
  assert.match(prompt, /严禁画入底图/);
  assert.match(prompt, /排版站本机 Canvas 合成/);
  assert.doesNotMatch(prompt, /企业主体：是把它理解成一家大型化工设计院/);
});

test("V5 harness gates deterministic composition on real local assets", () => {
  const harness = buildCoverHarness("中国天辰：项目用钢如何确定", "中国天辰工程有限公司");
  assert.equal(harness.workflowVersion, "5.0");
  assert.equal(harness.rule, "NO_ASSET_NO_COMPOSE");
  assert.equal(harness.steps.length, 3);
  assert.deepEqual(harness.requiredAssets, ["BACKGROUND_IMAGE", "OFFICIAL_LOGO_IMAGE"]);
  assert.equal(harness.composeOnlyWhen, "ALL_REQUIRED_LOCAL_FILES_SELECTED");
  assert.equal(harness.finalization, "BROWSER_CANVAS_DETERMINISTIC_COMPOSITE");
  assert.match(harness.steps[0], /官方 Logo 文件/);
  assert.match(harness.steps[1], /按钮保持禁用/);
  assert.match(harness.steps[2], /本机 Canvas/);
});

test("OCR harness rejects 唐森 and accepts only 唐淼", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const rejected = validateCoverTextManifest(title, [title, "钢铁私塾 唐森"]);
  assert.equal(rejected.passed, false);
  assert.deepEqual(rejected.missing, ["钢铁私塾 唐淼"]);
  assert.deepEqual(rejected.unexpected, ["钢铁私塾 唐森"]);
  assert.equal(validateCoverTextManifest(title, [title, "钢铁私塾 唐淼"]).passed, true);
});
