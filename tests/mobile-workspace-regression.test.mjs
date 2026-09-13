import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile workspace uses one visible pane and a touch dock", async () => {
  const [page, css, html] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../github-pages/index.html", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type MobilePane = "workflow" \| "canvas" \| "inspector"/);
  assert.match(page, /className="mobile-dock"/);
  assert.match(page, /mobile-pane-\$\{mobilePane\}/);
  assert.match(page, /window\.matchMedia\("\(max-width: 840px\)"\)/);
  assert.match(page, /setWorkspaceView\("final"\)/);
  assert.match(page, />稿件<\/span>/);
  assert.match(page, />阅读<\/span>/);
  assert.match(page, />调整<\/span>/);
  assert.match(page, /brand-title-mobile">钢铁私塾排版/);
  assert.match(page, /delivery-label-mobile">检查/);
  assert.match(css, /\.studio-shell\.mobile-pane-workflow > \.left-panel/);
  assert.match(css, /\.studio-shell\.mobile-pane-canvas > \.canvas-area/);
  assert.match(css, /\.studio-shell\.mobile-pane-inspector > \.inspector-panel/);
  assert.match(css, /height: 100dvh !important/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.studio-final-view \.canvas-stage/);
  assert.match(css, /\.studio-final-view \.paper-frame/);
  assert.match(css, /filter: none !important/);
  assert.match(css, /V4\.2 · 移动编辑器重构/);
  assert.match(css, /V4\.3 · 手机工作区再设计/);
  assert.match(css, /V4\.4 · 手机稿件页最终布局契约/);
  assert.match(css, /--mobile-paper: #fffefa/);
  assert.match(css, /\.workflow-nav \{[\s\S]*display: flex !important/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /\.left-context \{[\s\S]*position: static !important/);
  assert.match(css, /\.source-actions \{[\s\S]*width: 100% !important/);
  assert.doesNotMatch(css.slice(css.indexOf("V4.3 · 手机工作区再设计")), /width:\s*calc\(100% \+ 44px\)/);
  assert.match(css, /\.writing-mode-toggle:not\(\.dark-preview-toggle\) \{ display: none !important; \}/);
  assert.match(css, /\.cover-protocol-strip,[\s\S]*grid-template-columns: 1fr !important/);
  const finalMobileContract = css.slice(css.indexOf("V4.4 · 手机稿件页最终布局契约"));
  assert.match(finalMobileContract, /grid-template-rows: auto auto auto auto !important/);
  assert.match(finalMobileContract, /\.workflow-nav \{[\s\S]*height: 62px !important/);
  assert.match(finalMobileContract, /\.left-context \{[\s\S]*grid-row: 4 !important/);
  assert.match(finalMobileContract, /\.layout-presets \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /\.studio-final-view \.article-title-block h1/);
  assert.match(html, /viewport-fit=cover/);
});

test("plain text copy has an iPhone-safe synchronous fallback and visible feedback", async () => {
  const [page, clipboard] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/editor/clipboard.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /writePlainClipboard\(normalizeMarkdownInput\(value\)\)/);
  assert.match(page, /标题已复制/);
  assert.match(clipboard, /document\.execCommand\("copy"\)/);
  assert.match(clipboard, /navigator\.clipboard\?\.writeText/);
  assert.ok(
    clipboard.indexOf("copyWithSelection(text)") < clipboard.indexOf("navigator.clipboard?.writeText"),
    "selection fallback must run in the original tap stack before async clipboard access",
  );
});
