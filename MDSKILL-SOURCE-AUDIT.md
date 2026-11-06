# MDskill-Web 源码审阅

审阅版本：[AIPMAndy/MDskill-Web @ a76d3b0](https://github.com/AIPMAndy/MDskill-Web/tree/a76d3b09baa3eac7a2a390676457b8858dc3c316)。

| 参考位置 | 源码发现 | 本项目处理 |
| --- | --- | --- |
| `src/components/Editor/Editor.tsx` | 对 textarea 当前选区插入 Markdown，编辑后恢复选区，支持粗体、斜体快捷键。 | 在「稿件」原稿编辑器增加粗体与斜体。可重复点击取消，组合粗体和斜体时保留另一种强调。 |
| `src/utils/searchUtils.ts`、`src/components/Editor/OutlinePanel.tsx` | 查询命中与章节保留源文字符位置；仓库当前主页面未接上搜索与大纲面板。 | 使用原稿字面查询（如 `C++`、`GB/T 4237`），无需正则。章节定位复用标题和代码围栏规则，避开元信息、代码中的假标题。结果只选中原稿，不通过 HTML 高亮，也不会带入微信正文。 |
| `src/App.tsx`、`src/utils/wechatRenderer.ts` | 富文本复制直接编译微信内联样式，普通 HTML 导出则走另一套生成流程。 | 沿用已有微信适配器，微信预览、复制、下载仍共用同一份 HTML。 |
| `src/components/Poster/PosterModal.tsx` | 截取网页元素导出竖版海报。 | 不移植；横幅继续使用本站封面画布及独立文字层。 |

保留五步流程和五套版式。本次只扩展「稿件」校订，不改变文章数据结构或微信样式策略。浏览器验证不能替代公众号后台粘贴和手机微信阅读验收。
