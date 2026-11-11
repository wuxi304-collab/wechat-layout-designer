import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageFile = new URL("../app/page.tsx", import.meta.url);
const cssFile = new URL("../app/editorial-workflow.css", import.meta.url);

test("desktop middle-width uses a real two-column canvas-first grid", async () => {
  const css = await readFile(cssFile, "utf8");
  const responsive = css.slice(css.lastIndexOf("@media (min-width: 841px) and (max-width: 1460px)"));
  assert.match(responsive, /\.editorial-studio\.studio-shell\s*\{[\s\S]*?grid-template-columns:\s*86px minmax\(0, 1fr\) !important;/);
  assert.match(responsive, /min-width:\s*0 !important;/);
  assert.match(responsive, /\.editorial-studio > \.inspector-panel\s*\{[\s\S]*?position:\s*fixed !important;/);
  assert.match(responsive, /visibility:\s*hidden;/);
  assert.match(responsive, /\.editorial-studio\.inspector-is-open > \.inspector-panel\s*\{/);
  assert.match(responsive, /\.editorial-studio \.canvas-stage\.phone \.paper-frame\s*\{[\s\S]*?width:\s*min\(560px, calc\(100% - 28px\)\) !important;/);
});

test("stage changes reveal contextual controls, and the inspector can be dismissed", async () => {
  const page = await readFile(pageFile, "utf8");
  assert.match(page, /\[inspectorOpen, setInspectorOpen\] = useState\(false\)/);
  assert.match(page, /inspectorOpen \? "inspector-is-open" : ""/);
  assert.match(page, /function activateStage\(nextStage: StageKey\) \{[\s\S]*?setInspectorOpen\(true\)/);
  assert.match(page, /function dismissInspector\(event: KeyboardEvent\)/);
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /className="workspace-inspector-toggle" aria-controls="studio-inspector" aria-expanded=\{inspectorOpen\}/);
  assert.match(page, /className="inspector-scrim"/);
  assert.match(page, /className="inspector-overlay-heading"/);
  assert.match(page, /id="studio-inspector" className="inspector-panel"/);
});

test("canvas keeps article and cover large without changing WeChat export markup", async () => {
  const [page, css] = await Promise.all([readFile(pageFile, "utf8"), readFile(cssFile, "utf8")]);
  assert.match(css, /\.editorial-studio \.cover-workbench\s*\{[\s\S]*?width:\s*min\(1000px, calc\(100% - 72px\)\)/);
  assert.match(css, /\.editorial-studio \.ruler,/);
  assert.match(css, /\.editorial-studio \.paper-frame::after \{ content: none !important; \}/);
  assert.match(css, /@media \(max-width: 840px\) \{[\s\S]*?\.editorial-studio\.mobile-pane-canvas \.manuscript-page \.article-body/);
  assert.match(page, /data-copy-body/);
  assert.match(page, /<WechatHtmlDialog/);
});

test("five-step workflow and all publication actions remain reachable", async () => {
  const page = await readFile(pageFile, "utf8");
  assert.match(page, /type StageKey = "稿件" \| "编排" \| "版式" \| "封面" \| "交付"/);
  assert.match(page, /onClick=\{\(\) => activateStage\("交付"\)\}/);
  assert.match(page, /onClick=\{copyArticle\}/);
  assert.match(page, /onClick=\{openWechatHtml\}/);
  assert.match(page, /onClick=\{\(\) => setSourceOpen\(true\)\}/);
});
