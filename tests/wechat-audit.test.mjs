import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { auditWechatArticle, summarizeWechatAudit } from "../lib/editor/wechat-audit.ts";

const base = {
  markdown: "# 这是一篇专业文章\n\n## 第一章\n\n304L 与 316L 有不同的成分边界。",
  title: "这是一篇专业文章",
  author: "钢铁私塾 唐淼",
  hasArticleBody: true,
  unclosedFence: false,
  blocks: [
    { type: "heading", sourceRange: { start: 14, end: 21 } },
    { type: "paragraph", sourceRange: { start: 23, end: 47 } },
  ],
  encodingIssues: [],
  importWarnings: [],
};

test("clean article passes static structure preflight but is not claimed to be pasted successfully", () => {
  const issues = auditWechatArticle(base);
  assert.deepEqual(issues, []);
  assert.deepEqual(summarizeWechatAudit(issues), { blockers: 0, warnings: 0, canDeliver: true });
});

test("missing article fields and invalid encoding block export, while import risk remains a warning", () => {
  const issues = auditWechatArticle({
    ...base,
    hasArticleBody: false, title: "未命名文章", author: "过长的作者署名超过八个字",
    encodingIssues: ["含 Unicode 替换字符"], importWarnings: ["PDF 图表可能没有提取"],
  });
  assert.deepEqual(issues.filter((item) => item.severity === "blocker").map((item) => item.id), [
    "empty-body", "missing-title", "author-too-long", "encoding-0",
  ]);
  assert.ok(issues.some((item) => item.id === "import-0" && item.severity === "warning"));
  assert.equal(summarizeWechatAudit(issues).canDeliver, false);
});

test("title boundary and Unicode codepoints use readable character counting", () => {
  assert.equal(summarizeWechatAudit(auditWechatArticle({ ...base, title: "钢".repeat(64) })).blockers, 0);
  assert.equal(summarizeWechatAudit(auditWechatArticle({ ...base, title: "钢".repeat(65) })).blockers, 1);
  assert.equal(summarizeWechatAudit(auditWechatArticle({ ...base, title: "钢".repeat(63) + "😀" })).blockers, 0);
});

test("complex media, unclosed code blocks and empty links stay warnings with stable source ranges", () => {
  const range = { start: 50, end: 115 };
  const blocks = [
    ...base.blocks,
    { type: "table", headers: ["材质", "强度", "标准", "环境", "备注"], sourceRange: range },
    { type: "image", src: "https://example.com/304l.jpg", sourceRange: { start: 116, end: 145 } },
  ];
  const issues = auditWechatArticle({
    ...base, markdown: "# 说明\n\n```mermaid\nA-->B\n\n[空链接]()",
    unclosedFence: true, blocks,
  });
  assert.equal(summarizeWechatAudit(issues).canDeliver, true);
  for (const id of ["unclosed-fence", "mermaid", "empty-link", "wide-table-2", "remote-image-3"]) {
    assert.ok(issues.some((issue) => issue.id === id), id);
  }
  assert.deepEqual(issues.find((issue) => issue.id === "wide-table-2")?.sourceRange, range);
  assert.equal(issues.find((issue) => issue.id === "remote-image-3")?.blockIndex, 3);
});

test("delivery UI distinguishes blocking issues and allows issue-to-source navigation", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/editorial-workflow.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /const auditIssues = useMemo\(\(\) => auditWechatArticle\(/);
  assert.match(page, /const auditSummary = useMemo\(\(\) => summarizeWechatAudit\(auditIssues\)/);
  assert.match(page, /if \(!auditSummary\.canDeliver\) \{/);
  assert.match(page, /function locateDeliveryIssue\(issue: WechatAuditIssue\)/);
  assert.match(page, /setSourceFocusRange\(\{ \.\.\.issue\.sourceRange \}\)/);
  assert.match(page, /disabled=\{!auditSummary\.canDeliver\}/);
  assert.match(page, /aria-label="微信交付检查结果"/);
  assert.match(page, /定位修正/);
  assert.match(css, /\.wechat-audit-list li\[data-severity="blocker"\]/);
  assert.match(css, /min-height: 44px/);
});
