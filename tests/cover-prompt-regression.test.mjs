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

test("V7 cover workflow is short, deterministic, and delivers one verified PNG", async () => {
  const source = await readFile(new URL("../lib/editor/cover-design.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /V7 精准版/);
  assert.match(source, /只交付一张 final-cover\.png/);
  assert.match(page, /四步执行：素材、底图、合成、验收/);
  assert.match(source, /【1｜Logo】/);
  assert.match(source, /底图是中间文件，不能作为结果/);
  assert.match(source, /final-cover\.png/);
  assert.match(source, /不得返回底图、过程说明、多方案或稍后合成的承诺/);
  assert.match(source, /企业官网/);
  assert.match(source, /认证公众号/);
  assert.match(source, /禁止让模型猜、画、描摹或仿制 Logo/);
  assert.match(source, /确定性合成/);
  assert.match(source, /coverAuthorName = "唐淼"/);
  assert.match(source, /四宫格/);
  assert.match(source, /buildCoverProtocol/);
  assert.match(page, /精准封面任务/);
  assert.match(page, /本机合成兜底/);
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
  assert.match(prompt, /成品中不得出现企业 Logo/);
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

test("China Tianchen final task blocks generated logos and requires final composition", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const profile = analyzeCoverContent(title, "要把它理解成一家大型化工设计院。材料与制造。" );
  const style = coverStyles.find((item) => item.id === "hyperreal");
  assert.ok(style);
  const prompt = buildCoverPrompt(style, title, profile);
  assert.match(prompt, /企业：中国天辰工程有限公司/);
  assert.match(prompt, /china-tcc\.com/);
  assert.match(prompt, /先从企业官网取得页面实际使用的 Logo 原图/);
  assert.match(prompt, /认证公众号头像或官方文章页素材/);
  assert.match(prompt, /本地 PNG \/ SVG \/ WebP \/ JPG 文件/);
  assert.match(prompt, /右下署名：钢铁私塾 唐淼/);
  assert.match(prompt, /图像模型不得书写标题和署名/);
  assert.match(prompt, /只返回 final-cover\.png/);
  assert.match(prompt, /并附来源网址/);
  assert.doesNotMatch(prompt, /企业主体：是把它理解成一家大型化工设计院/);
  assert.ok(prompt.split("\n").length <= 24, "prompt must stay concise");
  assert.ok(prompt.length < 1800, "prompt must stay focused");
});

test("V7 harness keeps the three real production steps", () => {
  const harness = buildCoverHarness("中国天辰：项目用钢如何确定", "中国天辰工程有限公司");
  assert.equal(harness.workflowVersion, "7.0");
  assert.equal(harness.rule, "FINAL_FILE_ONLY");
  assert.equal(harness.steps.length, 3);
  assert.deepEqual(harness.requiredAssets, ["BACKGROUND_IMAGE", "OFFICIAL_LOGO_IMAGE"]);
  assert.deepEqual(harness.requiredCapabilities, ["WEB_RETRIEVAL", "IMAGE_GENERATION", "DETERMINISTIC_COMPOSITOR", "FILE_ATTACHMENT"]);
  assert.deepEqual(harness.stateMachine, ["PRECHECK", "ASSETS_READY", "BACKGROUND_READY", "COMPOSED", "VERIFIED", "DELIVERED"]);
  assert.equal(harness.respondOnlyWhen, "VERIFIED_FINAL_COVER_PNG_EXISTS");
  assert.equal(harness.finalization, "DETERMINISTIC_COMPOSITE_THEN_VERIFY");
  assert.match(harness.steps[0], /真实 Logo 文件/);
  assert.match(harness.steps[1], /代码原样放 Logo/);
  assert.match(harness.steps[2], /只交付 final-cover\.png/);
});

test("non-enterprise task still delivers a finished cover rather than a background", () => {
  const title = "430正在发生一场比304更残酷的价格战";
  const profile = analyzeCoverContent(title, "400系不锈钢价格与产能分析。" );
  const style = coverStyles.find((item) => item.id === "hyperreal");
  assert.ok(style);
  const prompt = buildCoverPrompt(style, title, profile, null);
  assert.match(prompt, /只交付一张 final-cover\.png/);
  assert.match(prompt, /主标题：430正在发生一场比304更残酷的价格战/);
  assert.match(prompt, /右下署名：钢铁私塾 唐淼/);
  assert.match(prompt, /只返回 final-cover\.png/);
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
