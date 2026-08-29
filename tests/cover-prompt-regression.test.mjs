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

test("V6 cover workflow requires atomic delivery of a verified final PNG", async () => {
  const source = await readFile(new URL("../lib/editor/cover-design.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(source, /Final Cover V6/);
  assert.match(source, /最终只交付一张完成封面 PNG/);
  assert.match(source, /开始前能力门禁/);
  assert.match(source, /禁止把它作为结果返回/);
  assert.match(source, /final-cover\.png/);
  assert.match(source, /只返回底图、只描述排版步骤或声称稍后合成都属于任务失败/);
  assert.match(source, /官方网站/);
  assert.match(source, /认证微信公众号/);
  assert.match(source, /不得让图像模型猜、画、描摹或仿制 Logo/);
  assert.match(source, /确定性代码合成/);
  assert.match(source, /coverAuthorName = "唐淼"/);
  assert.match(source, /四宫格/);
  assert.match(source, /buildCoverProtocol/);
  assert.match(page, /完整封面任务/);
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

test("China Tianchen final task blocks generated logos and requires final composition", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const profile = analyzeCoverContent(title, "要把它理解成一家大型化工设计院。材料与制造。" );
  const style = coverStyles.find((item) => item.id === "hyperreal");
  assert.ok(style);
  const prompt = buildCoverPrompt(style, title, profile);
  assert.match(prompt, /企业：中国天辰工程有限公司/);
  assert.match(prompt, /china-tcc\.com/);
  assert.match(prompt, /打开中国天辰工程有限公司官方网站/);
  assert.match(prompt, /认证微信公众号/);
  assert.match(prompt, /真实 PNG、SVG、WebP 或 JPG 文件已存在/);
  assert.match(prompt, /固定署名：“钢铁私塾 唐淼”/);
  assert.match(prompt, /图像模型不得书写标题和署名/);
  assert.match(prompt, /最终回复只附 final-cover\.png/);
  assert.match(prompt, /Logo 官方来源网址/);
  assert.doesNotMatch(prompt, /企业主体：是把它理解成一家大型化工设计院/);
});

test("V6 harness allows responses only after verified deterministic composition", () => {
  const harness = buildCoverHarness("中国天辰：项目用钢如何确定", "中国天辰工程有限公司");
  assert.equal(harness.workflowVersion, "6.0");
  assert.equal(harness.rule, "FINAL_FILE_ONLY");
  assert.equal(harness.steps.length, 3);
  assert.deepEqual(harness.requiredAssets, ["BACKGROUND_IMAGE", "OFFICIAL_LOGO_IMAGE"]);
  assert.deepEqual(harness.requiredCapabilities, ["WEB_RETRIEVAL", "IMAGE_GENERATION", "DETERMINISTIC_COMPOSITOR", "FILE_ATTACHMENT"]);
  assert.deepEqual(harness.stateMachine, ["PRECHECK", "ASSETS_READY", "BACKGROUND_READY", "COMPOSED", "VERIFIED", "DELIVERED"]);
  assert.equal(harness.respondOnlyWhen, "VERIFIED_FINAL_COVER_PNG_EXISTS");
  assert.equal(harness.finalization, "DETERMINISTIC_COMPOSITE_THEN_VERIFY");
  assert.match(harness.steps[0], /缺一项就停止/);
  assert.match(harness.steps[1], /确定性工具/);
  assert.match(harness.steps[2], /中间底图不得作为完成结果返回/);
});

test("non-enterprise task still delivers a finished cover rather than a background", () => {
  const title = "430正在发生一场比304更残酷的价格战";
  const profile = analyzeCoverContent(title, "400系不锈钢价格与产能分析。" );
  const style = coverStyles.find((item) => item.id === "hyperreal");
  assert.ok(style);
  const prompt = buildCoverPrompt(style, title, profile, null);
  assert.match(prompt, /最终只交付一张完成封面 PNG/);
  assert.match(prompt, /主标题：“430正在发生一场比304更残酷的价格战”/);
  assert.match(prompt, /固定署名：“钢铁私塾 唐淼”/);
  assert.match(prompt, /最终回复只附 final-cover\.png/);
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
