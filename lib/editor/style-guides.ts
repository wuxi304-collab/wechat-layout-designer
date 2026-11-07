import type { MarkdownStyleKey } from "./design-system";

export const styleEditorialGuides: Record<MarkdownStyleKey, string> = {
  jiangnan: "宋体叙事、赭红点题、米金高亮。人名与转折用加粗，关键原话用细下划线，引用保留书信式留白。",
  editorial: "黑体观点、朱砂重点、淡红标记。核心结论用加粗，争议边界用下划线；章节用横线分隔，行动列表逐项落地。",
  technical: "黑体屏读、青蓝证据、浅蓝标记。牌号和标准号用代码，参数用表格，适用边界用下划线，勿用颜色替代数据含义。",
  essay: "仿宋文气、暖褐题签、浅金标记。章节居中、引文留白；高亮只留给转折或结论，让长文有疏密。",
  minimal: "清晰黑体、石墨正文、青灰重点。标题靠字重与留白分层，快讯结论加粗，日期与交付边界用下划线。",
};
