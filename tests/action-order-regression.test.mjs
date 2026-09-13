import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("copy actions sit immediately below the design score", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const smartPanel = source.slice(source.indexOf('{inspector === "智能"'), source.indexOf('{inspector === "样式"'));
  const scoreIndex = smartPanel.indexOf('className="design-score"');
  const deliveryIndex = smartPanel.indexOf('className="delivery-shortcuts"');
  const directorIndex = smartPanel.indexOf('className="inspector-section layout-director"');

  assert.ok(scoreIndex >= 0);
  assert.ok(deliveryIndex > scoreIndex);
  assert.ok(directorIndex > deliveryIndex);
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
  assert.match(handler, /setStage\("编排"\)/);
  assert.match(handler, /setMobilePane\("canvas"\)/);
});
