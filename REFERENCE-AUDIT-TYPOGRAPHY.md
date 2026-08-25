# 中文字体与排印仓库审计

审计日期：2026-08-25

本文件记录字体系统的设计依据。项目只吸收排印原则、字体角色和兼容策略，不复制第三方主题成品，也不直接搬运字体文件。

## 参考仓库

| 仓库 | 可借鉴的能力 | 本项目落点 | 许可证与边界 |
| --- | --- | --- | --- |
| [ethantw/Han](https://github.com/ethantw/Han) | 简繁日语义排印、标点与高级汉字布局 | `lang="zh-CN"`、严格断行、渐进增强 | MIT；学习排印模型，不引入运行时依赖 |
| [sofish/typo.css](https://github.com/sofish/typo.css) | 中文字体回退、自动间距、标点压缩、可读行长 | `--font-*` 回退链、`text-autospace`、`text-spacing-trim` | MIT；重新实现为本项目语义令牌 |
| [adobe-fonts/source-han-serif](https://github.com/adobe-fonts/source-han-serif) | 简体中文标题与长文宋体骨架 | 刊宋的 display/body 首选字体 | OFL；本版不打包字体文件 |
| [lxgw/LxgwWenKai](https://github.com/lxgw/LxgwWenKai) | 屏幕文楷、人文标题气质 | 文楷题签的可选首选字体 | OFL 1.1；遵守保留名称和 Web Font 子集说明，本版只作本机回退 |
| [be5invis/Sarasa-Gothic](https://github.com/be5invis/Sarasa-Gothic) | Inter、Iosevka 与思源黑体的中西文等宽组合 | Markdown 原稿、代码、参数与链接 | OFL；本版只作本机回退 |
| [KonghaYao/cn-font-split](https://github.com/KonghaYao/cn-font-split) | WOFF2 中文字体动态分包、按需加载 | 后续品牌字体资产管线候选 | Apache-2.0；启用前仍须逐一核对上游字库许可 |
| [YiNNx/typora-theme-lapis](https://github.com/YiNNx/typora-theme-lapis) | 正文、标题、代码、表格的字体角色分离 | 字体槽位与字阶关系 | MIT；不复制主题 CSS |

## 本轮结论

1. 字体系统按用途拆为 `ui / editorial / reading-serif / literary / fangsong / number / code / source`，不再让一套宋体承担整页。
2. 刊宋、文楷、屏读黑三种气质共享同一 Article AST 与 Theme DSL，只改变语义字体槽位。
3. 正文统一使用真实常规字重 400，标题与关键标签使用 600，避免 420、570、650 等在非可变字体上产生不可控的伪字重。
4. 中文标签缩小字距，状态差异由字号、字重、位置和颜色表达。
5. 复制微信正文时写入与当前字体气质一致的内联回退链，不依赖预览环境中的 class 或外链 CSS。
6. Web Font 暂不接入：完整中文字库体积大，动态稿件难以静态子集，且微信公众号接收端不能保证外链字体。后续只为品牌短字或固定 UI 字符评估分包加载。
