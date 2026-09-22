import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const designSystem = fs.readFileSync(new URL("../lib/editor/design-system.ts", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("Markdown 版式收敛为五套职责明确的骨架", () => {
  const order = designSystem.match(/markdownStyleOrder:[^=]+\= \[([^\]]+)\]/)?.[1] ?? "";
  const keys = [...order.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(keys, ["jiangnan", "editorial", "technical", "essay", "minimal"]);
  assert.doesNotMatch(designSystem, /^\s+(spring|collage): \{ name:/m);
});

test("主工作流只有稿件、编排、版式、封面、交付五步", () => {
  assert.match(page, /type StageKey = "稿件" \| "编排" \| "版式" \| "封面" \| "交付"/);
  assert.match(page, /title: "稿件"[\s\S]*title: "编排"[\s\S]*title: "版式"[\s\S]*title: "封面"[\s\S]*title: "交付"/);
  assert.doesNotMatch(page, /title: "组件"/);
  assert.match(page, /className="workflow-next-action"/);
});

test("旧版式草稿平滑迁移，不会造成空白或崩溃", () => {
  assert.match(page, /\["spring", "collage"\]\.includes\(payload\.markdownStyle\)\) setMarkdownStyle\("jiangnan"\)/);
});
