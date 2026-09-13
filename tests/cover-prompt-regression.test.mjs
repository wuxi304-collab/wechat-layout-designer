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

test("V8 cover workflow is short, direct, and requires locked text in the final PNG", async () => {
  const source = await readFile(new URL("../lib/editor/cover-design.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /V8 直接版/);
  assert.match(source, /生成一张且只生成一张完整封面 PNG/);
  assert.match(page, /一次生成：构图、标题、署名、验收/);
  assert.match(source, /禁止返回无字底图/);
  assert.match(source, /final-cover\.png/);
  assert.match(source, /禁止返回无字底图、样机、过程图或方案板/);
  assert.match(source, /官网原图/);
  assert.match(source, /绝不仿制/);
  assert.match(source, /确定性文字层/);
  assert.match(source, /coverAuthorName = "唐淼"/);
  assert.match(source, /四宫格/);
  assert.match(source, /buildCoverProtocol/);
  assert.match(page, /成品封面指令/);
  assert.match(page, /文字保险/);
  assert.match(page, /cover-background-file/);
  assert.match(page, /cover-logo-file/);
  assert.match(page, /官方来源网址/);
  assert.match(page, /生成最终封面 PNG/);
  assert.match(page, /disabled=\{!canComposeCover\}/);
  assert.match(page, /canvas\.width = 2350/);
  assert.match(page, /canvas\.height = 1000/);
  assert.match(page, /context\.drawImage\(logo/);
  assert.doesNotMatch(source, /Asset Pack V5/);
  assert.doesNotMatch(source, /Logo First V4/);
  assert.doesNotMatch(page, /复制素材准备任务/);
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

test("industry headlines with dates and production data never become imaginary companies", async () => {
  const title = "不锈钢8月排产创历史新高，钢厂到底在赌什么？";
  const markdown = "8月钢厂排产与产量继续上升，多家企业正在观察库存和价格。";
  const profile = analyzeCoverContent(title, markdown);
  const style = coverStyles.find((item) => item.id === "minimal-information");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(style);
  assert.equal(detectCompanyName(title, markdown), null);
  assert.equal(profile.companyName, null);
  assert.equal(profile.isEnterprise, false);
  const prompt = buildCoverPrompt(style, title, profile);
  assert.match(prompt, /文章没有明确企业主体/);
  assert.match(prompt, /行业词、月份、排产、价格和标题片段都不是企业名/);
  assert.match(prompt, /文章没有明确企业主体，不添加任何 Logo/);
  assert.doesNotMatch(prompt, /企业：不锈钢8月排产创历史新高/);
  assert.doesNotMatch(prompt, /企业：不锈钢8月排产创历史新高/);
  assert.match(page, /coverProfile\.companyConfidence === "high"/);
  assert.match(page, /候选待确认/);
  assert.match(page, /采用候选/);
});

test("medium-confidence brand prefixes require confirmation before Logo workflow", () => {
  const title = "富钢特板：25万吨之外，它真正想做的是一门更难的生意";
  const markdown = "这家公司正在扩建工厂，主营特种钢板。";
  const profile = analyzeCoverContent(title, markdown);
  const style = coverStyles.find((item) => item.id === "hyperreal");
  assert.ok(style);
  assert.equal(profile.companyName, "富钢特板");
  assert.equal(profile.companyConfidence, "medium");
  assert.equal(profile.isEnterprise, false);
  assert.doesNotMatch(buildCoverPrompt(style, title, profile), /企业：富钢特板/);
  assert.match(buildCoverPrompt(style, title, profile, "富钢特板"), /企业：富钢特板/);
});

test("China Tianchen final task requires official logo and title inside the image", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const profile = analyzeCoverContent(title, "要把它理解成一家大型化工设计院。材料与制造。" );
  const style = coverStyles.find((item) => item.id === "hyperreal");
  assert.ok(style);
  const prompt = buildCoverPrompt(style, title, profile);
  assert.match(prompt, /企业：中国天辰工程有限公司/);
  assert.match(prompt, /china-tcc\.com/);
  assert.match(prompt, /企业：中国天辰工程有限公司/);
  assert.match(prompt, /Logo：仅使用已取得的官网原图/);
  assert.match(prompt, /标题（必须真实出现在图片中，逐字一致）/);
  assert.match(prompt, /右下固定署名（逐字一致）/);
  assert.match(prompt, /不能返回缺标题图片/);
  assert.match(prompt, /最终只返回 final-cover\.png/);
  assert.doesNotMatch(prompt, /企业主体：是把它理解成一家大型化工设计院/);
  assert.ok(prompt.split("\n").length <= 12, "prompt must stay concise");
  assert.ok(prompt.length < 1200, "prompt must stay focused");
});

test("V8 harness blocks delivery when locked text is missing", () => {
  const harness = buildCoverHarness("中国天辰：项目用钢如何确定", "中国天辰工程有限公司");
  assert.equal(harness.workflowVersion, "8.0");
  assert.equal(harness.rule, "LOCKED_TEXT_IN_FINAL_IMAGE");
  assert.equal(harness.steps.length, 3);
  assert.deepEqual(harness.requiredAssets, ["OFFICIAL_LOGO_IMAGE", "FINAL_COVER_IMAGE"]);
  assert.deepEqual(harness.requiredCapabilities, ["IMAGE_GENERATION", "TEXT_COMPOSITION", "FILE_ATTACHMENT"]);
  assert.deepEqual(harness.stateMachine, ["PRECHECK", "DESIGNED", "TEXT_LOCKED", "VERIFIED", "DELIVERED"]);
  assert.equal(harness.respondOnlyWhen, "VERIFIED_FINAL_COVER_PNG_EXISTS");
  assert.equal(harness.finalization, "FINAL_IMAGE_MUST_CONTAIN_LOCKED_TEXT");
  assert.equal(harness.stopWhen, "LOCKED_TEXT_MISSING_OR_INCORRECT");
  assert.match(harness.steps[0], /真实 Logo 原图/);
  assert.match(harness.steps[1], /准确标题与署名/);
  assert.match(harness.steps[2], /只交付 final-cover\.png/);
});

test("non-enterprise task still delivers a finished cover rather than a background", () => {
  const title = "430正在发生一场比304更残酷的价格战";
  const profile = analyzeCoverContent(title, "400系不锈钢价格与产能分析。" );
  const style = coverStyles.find((item) => item.id === "hyperreal");
  assert.ok(style);
  const prompt = buildCoverPrompt(style, title, profile, null);
  assert.match(prompt, /生成一张且只生成一张完整封面 PNG/);
  assert.match(prompt, /标题（必须真实出现在图片中，逐字一致）：“430正在发生一场比304更残酷的价格战”/);
  assert.match(prompt, /右下固定署名（逐字一致）：“钢铁私塾 唐淼”/);
  assert.match(prompt, /最终只返回 final-cover\.png/);
  assert.doesNotMatch(prompt, /只返回一个实际图片文件：无字无 Logo 的横幅底图/);
});

test("OCR harness rejects 唐森 and accepts only 唐淼", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const rejected = validateCoverTextManifest(title, [title, "钢铁私塾 唐森"]);
  assert.equal(rejected.passed, false);
  assert.deepEqual(rejected.missing, ["钢铁私塾 唐淼"]);
  assert.deepEqual(rejected.unexpected, ["钢铁私塾 唐森"]);
  assert.equal(validateCoverTextManifest(title, [title, "钢铁私塾 唐淼"]).passed, true);
});
