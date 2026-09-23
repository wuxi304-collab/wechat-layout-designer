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

test("结构组件按文章任务收敛，并根据正文语义给出推荐", () => {
  for (const name of ["开场导读", "核心判断", "数据证据", "双栏对照", "步骤清单", "结语行动"]) {
    assert.match(page, new RegExp(`kind: "${name}"`));
  }
  assert.match(page, /phase: "开场"/);
  assert.match(page, /phase: "观点"/);
  assert.match(page, /phase: "证据"/);
  assert.match(page, /phase: "过程"/);
  assert.match(page, /phase: "收尾"/);
  assert.match(page, /const componentRecommendations = useMemo/);
  assert.match(page, /推荐：\{componentRecommendations\.join\(" · "\)\}/);
  assert.doesNotMatch(page, /插入结构组件/);
});

test("旧版式草稿平滑迁移，不会造成空白或崩溃", () => {
  assert.match(page, /\["spring", "collage"\]\.includes\(payload\.markdownStyle\)\) setMarkdownStyle\("jiangnan"\)/);
});
