import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inspectGifBuffer } from "../lib/editor/gif-inspector.ts";

const bytes = (...parts) => Uint8Array.from(parts.flat(Infinity));
const ascii = (value) => Array.from(value, (char) => char.charCodeAt(0));
const logicalScreen = [2, 0, 1, 0, 0x80, 0, 0];
const globalPalette = [0, 0, 0, 255, 255, 255];
const image = [0x2c, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0x02, 0x02, 0x4c, 0x01, 0];
const gce = (delay) => [0x21, 0xf9, 0x04, 0x01, delay & 255, delay >> 8, 0, 0];
const netscapeLoop = [0x21, 0xff, 0x0b, ...ascii("NETSCAPE2.0"), 0x03, 0x01, 0x00, 0x00, 0x00];
const makeGif = ({ frames = 2, includeGce = true } = {}) => bytes(
  ascii("GIF89a"), logicalScreen, globalPalette, netscapeLoop,
  ...Array.from({ length: frames }, (_, index) => [
    ...(includeGce ? gce(index === 0 ? 5 : 10) : []), image,
  ]),
  [0x3b],
);

test("reads dimensions, frame timing, transparency and Netscape loop metadata", () => {
  const gif = makeGif();
  const result = inspectGifBuffer(gif, 321);
  assert.equal(result.width, 2);
  assert.equal(result.height, 1);
  assert.equal(result.frameCount, 2);
  assert.deepEqual(result.frameDurationsMs, [50, 100]);
  assert.equal(result.durationMs, 150);
  assert.equal(result.loopCount, 0);
  assert.equal(result.hasTransparency, true);
  assert.equal(result.zeroDelayFrames, 0);
  assert.equal(result.fileSizeBytes, 321);
});

test("uses a conservative 100ms fallback when frames have no graphic control extension", () => {
  const result = inspectGifBuffer(makeGif({ frames: 1, includeGce: false }));
  assert.deepEqual(result.frameDurationsMs, [100]);
  assert.equal(result.durationMs, 100);
  assert.equal(result.loopCount, 0);
});

test("rejects non-GIF, truncated blocks and missing trailer instead of inventing metadata", () => {
  assert.throws(() => inspectGifBuffer(Uint8Array.from([1, 2, 3, 4, 5, 6])), /不是完整 GIF|不是 GIF/);
  const truncated = makeGif();
  assert.throws(() => inspectGifBuffer(truncated.slice(0, -4)), /不完整|截断|结束标记/);
  const missingTrailer = makeGif().slice(0, -1);
  assert.throws(() => inspectGifBuffer(missingTrailer), /结束标记/);
});

test("the GIF tab is integrated without adding a sixth workflow stage", async () => {
  const [page, component, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/gif-workbench.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/editorial-workflow.css", import.meta.url), "utf8"),
  ]);
  assert.ok(page.includes('type StageKey = "稿件" | "编排" | "版式" | "封面" | "交付"'));
  assert.ok(page.includes('type InspectorTab = "步骤" | "规范" | "品牌" | "动图"'));
  assert.ok(page.includes('["步骤", "规范", "品牌", "动图"] as InspectorTab[]'));
  assert.ok(page.includes('<GifWorkbench articleTitle={article.title}'));
  assert.ok(page.includes("function insertGif(url: string, caption: string)"));
  assert.ok(page.includes('archive.checkpoint("插入动图前的稿件")'));
  assert.ok(page.includes("setMarkdown("));
  assert.ok(component.includes("使用 $pixel-gif-sticker-pack"));
  assert.ok(component.includes("inspectGifFile(next)"));
  assert.ok(component.includes('url.protocol !== "https:"'));
  assert.ok(component.includes("不会上传服务器"));
  assert.ok(component.includes("外链图片可能被微信过滤"));
  assert.ok(component.includes("sampleUrl: \"https://github.com/WoYun520/gif-factory/blob/main/docs/previews/pixel-light.gif\""));
  assert.ok(component.includes("查看 GIF Factory 上游样例"));
  assert.ok(component.includes("onDrop="));
  assert.ok(css.includes(".gif-selected-style-preview"));
  assert.ok(css.includes(".gif-style-preview-art[data-style=\"comic-fusion\"]"));
  assert.ok(css.includes("[data-dragging=\"true\"]"));
  assert.ok(css.includes(".gif-workbench"));
  assert.ok(css.includes("grid-template-columns: repeat(4, minmax(0, 1fr))"));
});

test("the prompt distinguishes the custom industrial preset from GIF Factory built-in styles", async () => {
  const component = await readFile(new URL("../app/gif-workbench.tsx", import.meta.url), "utf8");
  for (const phrase of [
    "工业科普动态示意",
    "自定义适配",
    "GIF Factory 风格库",
    "默认方形 512×512",
    "review_gif.py",
    "技术检查通过不等于审美验收通过",
  ]) assert.ok(component.includes(phrase), phrase);
});
