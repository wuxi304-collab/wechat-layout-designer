# Open Typora 源码审阅与公众号平台落地

审阅日期：2026-11-07。源仓库：[AniChikage/open-typora](https://github.com/AniChikage/open-typora/tree/3dd6fe408ab9cbf0d08cd47f9f5a14404bac9eb8)。固定提交 `3dd6fe408ab9cbf0d08cd47f9f5a14404bac9eb8`，`package.json` 版本 0.24.4，MIT License。搜索结果中仍有 0.12/0.22 的缓存介绍，因此实现判断使用本次实际拉取的源码。

## 实际阅读范围

- `docs/architecture.md`：文档源间隔、选区、事务、组合输入、独立导出与版本边界。
- `src/editor/model.ts`：原始 Markdown 往返、source/composition 会话、最小差异、撤销合并与保留预算。
- `src/editor/search.ts`：字面/大小写/全词匹配、源位置、替换串处理。
- `src/editor/clipboard.ts`、`tests/clipboard.test.mts`：Office HTML、带引号 TSV、合并单元格、转义、代码粘贴与资源上限。
- `src/editor/composition.ts`：`isComposing`、229 与 Process 键边界。
- `src/editor/aiReview.ts`、`shared/rewrite-constraints.mts`：差异审阅、采纳后组装、原稿失效检查、数字/链接/代码/术语保留。
- `electron/versions.mts`、`src/components/VersionHistoryDialog.tsx`：持久快照、恢复前记录、保留预算、错误反馈。
- `src/components/EditorWorkspace.tsx` 与 `MarkdownEditor.tsx` 的模式、历史、查找、粘贴和组合输入部分：访问过的编辑器保持挂载、输入焦点和异步结果复检。
- `src/editor/sourcePositions.ts`、`statistics.ts`、`useSourceAnalysis.ts` 和 `print.ts` 导出入口：位置映射、字数口径、长稿后台分析和按需导出。

本记录只覆盖以上文件及所列调用链，不宣称审计了原生 Swift、全部插件、安装器或整个仓库。

## 落地映射

| 上游机制 | 对公众号生产的意义 | 本轮实现 |
| --- | --- | --- |
| 原稿与编辑事务分离 | 校订应能撤销，切换面板不丢正在做的工作 | 原稿编辑器首次打开后保持状态，关闭重开保留查找、选区、滚动和当前会话的撤销/重做 |
| 先审阅，再应用 | 修改牌号、价格和标准号时可检查具体位置 | 批量替换先展示行号、原文与新文，可逐处取消；原稿变化后阻止应用，应用生成恢复点且可一次撤销 |
| 字面与全词检索 | 304 与 304L 不应被无意混改 | 默认完整词匹配；行业文本采用 ASCII 牌号边界，允许中文紧邻的“中文304材质”命中，区别于上游 Unicode 全词边界 |
| TSV/Office 表格导入 | 价格、规格和对比表可以直接从 Excel/WPS 进入文章 | 原稿选区粘贴转 Markdown；保留小数位、前导零、空单元格、换行与竖线；合并格展开保留空位；首行作为表头并明确提示 |
| 代码与组合输入保护 | 代码里的制表符和中文候选键不应触发错误转换 | 围栏、行内代码、缩进代码和 YAML 内保留原粘贴；候选 Enter、229/Process 键不触发查找或替换 |
| 持久版本与恢复前快照 | 清空或误覆盖之后仍可找回原稿 | 浏览器 schema 8，兼容 schema 2–7；最近 12 个原稿与版式快照；保存成功后才显示已保存，页面离开前补存，错误时提供备份与重试 |
| 异步动作重新核对目标 | 文件解析或剪贴板读取完成时不覆盖新的编辑 | 导入/粘贴记录起始原稿，完成时不一致即停止应用并提示 |
| 导出与编辑视图分离 | 微信交付只包含文章 | 沿用当前 AST 和微信内联 HTML 编译器，新增原始 Markdown 复制/下载；审阅控件和本机记录不进入正文 |

## 实现边界

本平台继续使用现有五步流程、五套版式、封面模块与微信适配器。上游桌面编辑模型以跨平台本机文件为中心，网页公众号平台使用浏览器草稿与内联 HTML，不能把其完整桌面内核直接等同于微信编辑器。

本轮审阅针对用户主动查找替换，不调用模型，也不自动判断牌号或标准是否正确。原稿快照和撤销记录是两套机制：快照可跨刷新，逐步撤销仅保留在当前页面会话。表格转换限制 5,000 单元格，不执行公式；普通多段 HTML、畸形 TSV 或代码走原粘贴路径，无法可靠转换的复杂表格明确报错。

暂未引入完整 contenteditable 富编辑内核、CodeMirror、多文档 AI 改写、任意本机文件系统/插件、Pandoc、MathJax 或 Mermaid 自动渲染。上游普通 HTML/CSS 导出不能直接作为微信公众号兼容输出。

微信后台保存、手机微信及朋友圈入口，仍须真实客户端验收；浏览器回归和合成输入事件不能替代实体中文输入法验收。
