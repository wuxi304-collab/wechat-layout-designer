import assert from "node:assert/strict";
import test from "node:test";
import { markdownFromRichClipboard } from "../lib/editor/clipboard-import.ts";

test("复制的富文本保留中文段落加粗且不带入网页按钮", () => {
  const plain = "不锈钢焊完以后，有一种腐蚀很有意思。";
  const html = `<div><p>不锈钢焊完以后，有一种<strong>腐蚀</strong>很有意思。</p><button>复制</button><script>danger()</script></div>`;
  assert.equal(markdownFromRichClipboard(html, plain), "不锈钢焊完以后，有一种**腐蚀**很有意思。");
});

test("已带 Markdown 的原稿优先，富文本内容不一致时保持原文字", () => {
  assert.equal(markdownFromRichClipboard("<p><strong>结论</strong>在这里</p>", "**结论**在这里"), null);
  assert.equal(markdownFromRichClipboard("<p><strong>甲</strong>乙丙</p>", "甲乙"), null);
  assert.equal(markdownFromRichClipboard('<p>甲<span style="font-weight:700">乙</span>丙</p>', "甲乙丙"), "甲**乙**丙");
});
