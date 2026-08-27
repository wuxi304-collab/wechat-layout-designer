import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  WECHAT_FIXED_DIMENSION_PROPERTIES,
  WECHAT_FLOW_STYLE_PROPERTIES,
  isWechatFlowTag,
  normalizeWechatInlineFontSize,
  normalizeWechatLineHeight,
  shouldCopyWechatStyle,
  shouldInheritWechatProseMetrics,
} from "../lib/editor/wechat-flow-policy.js";

test("正文流样式白名单不包含固定尺寸", () => {
  assert.deepEqual(WECHAT_FIXED_DIMENSION_PROPERTIES, ["width", "max-width", "height"]);
  assert.equal(WECHAT_FLOW_STYLE_PROPERTIES.includes("height"), false);
  assert.equal(WECHAT_FLOW_STYLE_PROPERTIES.includes("width"), false);
  assert.equal(WECHAT_FLOW_STYLE_PROPERTIES.includes("line-height"), true);
});

test("段落和编辑外壳永远不复制固定高度", () => {
  assert.equal(shouldCopyWechatStyle({ tagName: "p", property: "height", hasText: true, isEditorWrapper: false }), false);
  assert.equal(shouldCopyWechatStyle({ tagName: "div", property: "height", hasText: true, isEditorWrapper: true }), false);
  assert.equal(shouldCopyWechatStyle({ tagName: "div", property: "margin", hasText: true, isEditorWrapper: true }), false);
  assert.equal(shouldCopyWechatStyle({ tagName: "i", property: "height", hasText: false, isEditorWrapper: false }), true);
});

test("像素行高恢复为随字体伸缩的单位行高", () => {
  assert.equal(normalizeWechatLineHeight("34.92px", "18px"), "1.94");
  assert.equal(normalizeWechatLineHeight("31.5px", "17.5px"), "1.8");
  assert.equal(normalizeWechatLineHeight("normal", "18px"), "normal");
});

test("常见文字容器全部纳入自动增高保护", () => {
  for (const tag of ["article", "section", "div", "p", "blockquote", "li", "h2", "footer", "table", "td"]) {
    assert.equal(isWechatFlowTag(tag), true, `${tag} 应当被视为正文流容器`);
  }
  assert.equal(isWechatFlowTag("strong"), false);
});

test("朋友圈字体放大时行内文字跟随父段落缩放", () => {
  assert.equal(normalizeWechatInlineFontSize("18px", "18px"), "inherit");
  assert.equal(normalizeWechatInlineFontSize("11.88px", "18px"), "0.66em");
  assert.equal(normalizeWechatInlineFontSize("15px", "18px"), "0.833em");
  assert.equal(shouldInheritWechatProseMetrics({ tagName: "strong", insideProse: true }), true);
  assert.equal(shouldInheritWechatProseMetrics({ tagName: "a", insideProse: true }), true);
  assert.equal(shouldInheritWechatProseMetrics({ tagName: "span", insideProse: false }), false);
});

test("复制链会移除编辑外壳并在写入剪贴板前复检", async () => {
  const adapter = await readFile(new URL("../lib/editor/wechat-adapter.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(adapter, /data-wechat-flow-wrapper/);
  assert.match(adapter, /wrapper\.replaceWith\(\.\.\.Array\.from\(wrapper\.childNodes\)\)/);
  assert.match(adapter, /findWechatFlowLayoutRisks/);
  assert.match(adapter, /applyWechatTimelineTextSafety/);
  assert.match(adapter, /text-size-adjust/);
  assert.match(adapter, /findWechatTimelineTextRisks/);
  assert.match(page, /findWechatFlowLayoutRisks\(exportRoot\)/);
  assert.match(page, /findWechatTimelineTextRisks\(exportRoot\)/);
  assert.match(page, /公众号与朋友圈双入口稳排/);
  assert.match(page, /已阻止复制以避免微信文字重叠/);
});
