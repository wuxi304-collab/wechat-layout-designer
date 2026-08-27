import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  analyzeCoverContent,
  buildCoverPrompt,
  coverStyles,
  detectCompanyName,
  validateCoverTextManifest,
} from "../lib/editor/cover-design.ts";

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
  assert.match(source, /Prompt as Code 协议 V3 \+ Verification Harness/);
  assert.match(source, /只交付一张完成封面/);
  assert.match(source, /唯一视觉隐喻/);
  assert.match(source, /镜头语言/);
  assert.match(source, /moodboard/);
  assert.match(source, /buildCoverProtocol/);
  assert.match(source, /deterministic_typesetting_layer/);
  assert.match(source, /sha256_recorded/);
  assert.match(source, /MASK_LOGO_BBOX_THEN_OCR/);
  assert.match(source, /TEXT_MISMATCH/);
  assert.match(page, /Prompt as Code V3/);
  assert.match(page, /交付闸门 Harness V3/);
  assert.match(page, /复制生产协议 V3/);
  assert.doesNotMatch(source, /图片本身不生成标题文字/);
  assert.doesNotMatch(source, /若生图模型不能保证中文准确/);
  assert.doesNotMatch(page, /cover-toolbar-copy/);
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
  assert.match(prompt, /企业主体：中国天辰工程有限公司/);
  assert.match(prompt, /china-tcc\.com/);
  assert.match(prompt, /Logo 必须作为独立资产层直接合成/);
  assert.match(prompt, /作者名锁定为“唐淼”/);
  assert.match(prompt, /钢铁私塾 唐森.*TEXT_MISMATCH/);
  assert.doesNotMatch(prompt, /企业主体：是把它理解成一家大型化工设计院/);
});

test("OCR harness rejects 唐森 and accepts only 唐淼", () => {
  const title = "中国天辰：很多化工项目用什么钢，在询价之前其实已经决定了";
  const rejected = validateCoverTextManifest(title, [title, "钢铁私塾 唐森"]);
  assert.equal(rejected.passed, false);
  assert.deepEqual(rejected.missing, ["钢铁私塾 唐淼"]);
  assert.deepEqual(rejected.unexpected, ["钢铁私塾 唐森"]);
  assert.equal(validateCoverTextManifest(title, [title, "钢铁私塾 唐淼"]).passed, true);
});
