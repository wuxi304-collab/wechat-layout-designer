import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GitHub Pages build is static, path-safe, and deployed by Actions", async () => {
  const [page, config, workflow, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../vite.pages.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(config, /base: "\.\/"/);
  assert.match(config, /\.\/github-pages/);
  assert.match(config, /dist-pages/);
  assert.match(page, /isGitHubPagesRuntime/);
  assert.match(page, /静态版不连接公众号服务端/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /npm run build:pages/);
  assert.match(packageJson, /"build:pages"/);
});
