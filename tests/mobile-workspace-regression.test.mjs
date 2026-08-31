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
  assert.match(css, /\.studio-shell\.mobile-pane-workflow > \.left-panel/);
  assert.match(css, /\.studio-shell\.mobile-pane-canvas > \.canvas-area/);
  assert.match(css, /\.studio-shell\.mobile-pane-inspector > \.inspector-panel/);
  assert.match(css, /height: 100dvh !important/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
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
