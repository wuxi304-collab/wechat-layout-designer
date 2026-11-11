import type { SourceRange } from "./source-navigation";

export type WechatAuditSeverity = "blocker" | "warning";

export type WechatAuditIssue = {
  id: string;
  severity: WechatAuditSeverity;
  message: string;
  action: string;
  blockIndex?: number;
  sourceRange?: SourceRange;
};

export type WechatAuditInput = {
  markdown: string;
  title: string;
  author: string;
  hasArticleBody: boolean;
  unclosedFence: boolean;
  blocks: readonly {
    type: string;
    headers?: readonly string[];
    src?: string;
    sourceRange?: SourceRange;
  }[];
  encodingIssues: readonly string[];
  importWarnings: readonly string[];
};

/**
 * Static preflight of Markdown / Article AST. This does not claim to verify
 * WeChat paste or remote image availability. Runtime HTML safety remains the
 * separate responsibility of prepareWechatDelivery().
 */
export function auditWechatArticle(input: WechatAuditInput): WechatAuditIssue[] {
  const result: WechatAuditIssue[] = [];
  const append = (issue: WechatAuditIssue) => { result.push(issue); };

  if (!input.hasArticleBody) append({
    id: "empty-body", severity: "blocker",
    message: "正文为空，不能生成微信正文",
    action: "打开原稿，补充至少一个有效正文段落。",
  });
  if (!input.title.trim() || input.title === "未命名文章") append({
    id: "missing-title", severity: "blocker",
    message: "未识别到文章标题",
    action: "在原稿首行单独填写标题，或使用 # 标记。",
  });
  else if (Array.from(input.title).length > 64) append({
    id: "title-too-long", severity: "blocker",
    message: "文章标题超过微信公众号 64 字上限",
    action: "精简标题后复检，避免发布后台截断。",
  });
  if (!input.author.trim()) append({
    id: "missing-author", severity: "blocker",
    message: "作者为空",
    action: "补充作者署名后再交付。",
  });
  else if (Array.from(input.author).length > 8) append({
    id: "author-too-long", severity: "blocker",
    message: "作者超过微信公众号 8 字上限",
    action: "使用不超过 8 字的作者名；完整署名可保留在正文。",
  });

  input.encodingIssues.forEach((message, index) => append({
    id: `encoding-${index}`, severity: "blocker", message,
    action: "检查编码、非法 Unicode 字符与导入来源，修正原稿后重试。",
  }));
  input.importWarnings.forEach((message, index) => append({
    id: `import-${index}`, severity: "warning", message,
    action: "返回原稿核对导入内容，不要凭预览推断解析正确。",
  }));

  if (input.unclosedFence) append({
    id: "unclosed-fence", severity: "warning",
    message: "检测到未闭合的代码围栏",
    action: "补齐 Markdown 代码围栏，再确认后续章节没有被并入代码块。",
  });
  if (/(?:```|~~~)\s*mermaid/i.test(input.markdown)) append({
    id: "mermaid", severity: "warning",
    message: "Mermaid 图不能直接按图形复制到公众号",
    action: "先导出为 PNG，再插入文章并核对图注。",
  });
  if (/\[[^\]]*\]\(\s*\)/.test(input.markdown)) append({
    id: "empty-link", severity: "warning",
    message: "发现没有目标地址的 Markdown 链接",
    action: "补充真实链接或删除空链接语法。",
  });

  input.blocks.forEach((block, index) => {
    if (block.type === "table" && (block.headers?.length ?? 0) > 4) append({
      id: `wide-table-${index}`, severity: "warning",
      message: `第 ${index + 1} 个正文块是 ${block.headers?.length} 列表格，手机端可能需要拆表`,
      action: "定位到表格，考虑拆为两组数据或转换为可读图片，复核手机端。",
      blockIndex: index, sourceRange: block.sourceRange,
    });
    if (block.type === "image" && block.src && /^https?:\/\//i.test(block.src)) append({
      id: `remote-image-${index}`, severity: "warning",
      message: `第 ${index + 1} 个正文块使用外链图片`,
      action: "发布前将图片转存公众号素材，并在草稿预览中检查是否加载。",
      blockIndex: index, sourceRange: block.sourceRange,
    });
  });

  return result;
}

export function summarizeWechatAudit(issues: readonly WechatAuditIssue[]) {
  return {
    blockers: issues.filter((issue) => issue.severity === "blocker").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    canDeliver: !issues.some((issue) => issue.severity === "blocker"),
  };
}
