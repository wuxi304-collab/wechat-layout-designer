# 公众号排版设计师 · MD Design System V2

## 目标

把“主题 CSS 集合”升级为可组合的内容设计系统。任何主题都只改变令牌、字阶和语义组件映射；Markdown 解析、微信兼容与复制逻辑保持唯一实现。

```text
Markdown Source / WYSIWYG
          ↓
     Article AST
          ↓
 Design Engine
 ├─ Theme Tokens
 ├─ Typography
 └─ Semantic Components
          ↓
 Platform Adapter
 ├─ WeChat Preview
 ├─ WeChat Inline HTML
 └─ Web / PDF / Image
```

## 源码审计结论

本项目只学习架构与兼容策略，不复制第三方页面、品牌语言、主题成品或组件造型。

| Reference | 吸收的原则 | 本项目落点 |
| --- | --- | --- |
| WeMD | core/templates 分层、语义深色预览 | `design-system.ts` 的 light/dark tokens |
| doocs/md | 解析 → 主题 → 平台适配 → 内联 HTML | `wechat-adapter.ts` |
| md-wechat | 安全样式白名单、表格/脚注/图片 | AST 组件与复制白名单 |
| Wenyan | Typora 主题先归一化再发布 | Theme DSL，不直接执行任意 CSS |
| MoPai | 主题产品化与跨平台交付 | Style Preset 与 Platform Adapter 分离 |
| Milkdown | ProseMirror/remark 的插件式 WYSIWYG | V3 编辑器内核候选，不与主题耦合 |
| Lapis | 中文正文、代码、表格的节奏 | 字阶、行距、等宽字分工 |
| Claude-Like | 低噪声、弱边框、语义色 | 控件减框、状态用边线与文字表达 |

## 已落地模块

### Theme Tokens

文件：`lib/editor/design-system.ts`

- `palette`: accent / ink / paper / muted / line / soft
- `dark`: 对应语义深色，不使用 `filter: invert()`
- `typography`: bodySize / lineHeight / titleScale / tracking
- `components`: heading / quote / list 的语义映射

### Article AST

当前支持：

- ATX 与 Setext 标题
- 段落、粗体、斜体、删除线、行内代码、链接
- 引用、GFM Alert、列表、任务列表
- 代码围栏、分隔线
- GFM 表格
- 图片与图注
- 引用定义与文末脚注
- YAML front matter 的 title / author
- UTF-8、UTF-16、GB18030/GBK、Big5 导入与异常字符检查

### WeChat Adapter

文件：`lib/editor/wechat-adapter.ts`

- 只导出微信可承受的内联样式白名单
- 去除编辑器 class、id、交互属性和工具节点
- 同时写入 `text/html` 与 `text/plain;charset=utf-8`
- 深色模式仅用于预览，复制始终使用原主题浅色语义

## 设计纪律

1. 一个视觉效果必须能解释其语义；不能解释的装饰应删除。
2. 正文默认 16—18px，中文长文行距 1.78—2.0。
3. UI 使用无衬线，正文使用宋/仿宋体系，代码使用等宽字体。
4. 状态优先用边线、字重和位置表达，避免标签堆叠。
5. 主题色不超过三类：强调、正文、承载面。
6. 微信复制结果不得依赖 class、外链 CSS、动画、定位或伪元素。
7. 深色预览按标题、正文、弱文字、边线、承载面分别映射。

## 下一阶段边界

V3 若引入 Milkdown，只替换输入交互层。Article AST、Design Engine、Theme DSL 和 WeChat Adapter 必须保持稳定，避免把编辑器实现侵入发布链路。
