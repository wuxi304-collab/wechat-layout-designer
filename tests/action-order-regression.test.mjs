import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("delivery presents the copy actions in the order used by the WeChat editor", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const deliveryPanel = source.slice(source.indexOf('className="inspector-content editorial-stage-content editorial-delivery"'), source.indexOf('{inspector === "步骤" && stage === "版式"'));
  assert.match(deliveryPanel, /本地预检[\s\S]*01 复制标题[\s\S]*02 复制作者[\s\S]*03 复制微信正文[\s\S]*微信 HTML 交付/);
});

test("source toolbar follows clear, paste, analyze, import order", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const actions = source.slice(source.indexOf('className="source-actions"'), source.indexOf('</header><textarea'));
  const clearIndex = actions.indexOf("clear-action");
  const pasteIndex = actions.indexOf("paste-action");
  const analyzeIndex = actions.indexOf("analyze-action");
  const importIndex = actions.indexOf("import-file");

  assert.ok(clearIndex >= 0);
  assert.ok(pasteIndex > clearIndex);
  assert.ok(analyzeIndex > pasteIndex);
  assert.ok(importIndex > analyzeIndex);
  assert.match(actions, /一键粘贴并编排/);
  assert.match(actions, /重新分析/);
});

test("one tap paste writes, analyzes, and leaves the source drawer", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const handler = source.slice(source.indexOf("async function pasteMarkdown"), source.indexOf("function clearMarkdown"));
  assert.match(handler, /navigator\.clipboard\.readText\(\)/);
  assert.match(handler, /parseArticle\(nextMarkdown\)/);
  assert.match(handler, /setSourceOpen\(false\)/);
  assert.match(handler, /activateStage\("编排"\)/);
});
