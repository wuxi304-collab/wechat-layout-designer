"use client";

import { useMemo, useState } from "react";

type IconName =
  | "brand"
  | "document"
  | "structure"
  | "style"
  | "assets"
  | "check"
  | "spark"
  | "phone"
  | "desktop"
  | "undo"
  | "redo"
  | "copy"
  | "publish"
  | "chevron"
  | "close";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    brand: <><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    document: <><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></>,
    structure: <><circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M9 6h6M8.5 7.5l2.5 8M15.5 7.5l-2.5 8"/></>,
    style: <><path d="M4 20h16M7 17l7-13 3 13"/><path d="M9.5 13h5"/></>,
    assets: <><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m6 17 4-4 3 3 2-2 3 3"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z"/><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></>,
    phone: <><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 6h4M11 18h2"/></>,
    desktop: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    undo: <path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6"/>,
    redo: <path d="m15 7 5 5-5 5M19 12h-8a6 6 0 0 0-6 6"/>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    publish: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 14v6h14v-6"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

const sampleMarkdown = `# 当成本拼不过青拓之后，我们还能卖什么？

价格战从来没有真正的赢家。对不锈钢贸易商而言，低价曾是最直接的武器，也正在成为最危险的依赖。

## 一、低价不是能力，只是阶段性结果

真正决定客户是否长期留下来的，从来不是某一吨便宜了五十元，而是材料是否选对、交期是否可靠、问题能否有人负责。

> 当产品越来越接近，专业判断本身就会成为产品。

## 二、从卖材料转向交付确定性

- 把牌号讲明白
- 把标准边界说清楚
- 把加工风险提前暴露
- 把售后责任写进流程`;

const themes = {
  editorial: { name: "编辑部", accent: "#b23a2b", ink: "#20201d", paper: "#fbfaf6" },
  industrial: { name: "工业纪要", accent: "#286a66", ink: "#192524", paper: "#f4f7f4" },
  eastern: { name: "东方章法", accent: "#8a6438", ink: "#29241e", paper: "#fbf5e8" },
  minimal: { name: "极简白", accent: "#315f8c", ink: "#1b2530", paper: "#ffffff" },
};

type ThemeKey = keyof typeof themes;
type InspectorTab = "智能" | "样式" | "品牌";

export default function Home() {
  const [theme, setTheme] = useState<ThemeKey>("editorial");
  const [inspector, setInspector] = useState<InspectorTab>("智能");
  const [preview, setPreview] = useState<"phone" | "desktop">("phone");
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.82);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const [toast, setToast] = useState("");
  const [adopted, setAdopted] = useState<string[]>([]);

  const currentTheme = themes[theme];
  const wordCount = useMemo(() => markdown.replace(/[#>*`\-]/g, "").trim().length, [markdown]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function adopt(id: string) {
    setAdopted((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  return (
    <main className="studio-shell" style={{ "--article-accent": currentTheme.accent, "--article-ink": currentTheme.ink, "--article-paper": currentTheme.paper, "--article-size": `${fontSize}px`, "--article-leading": lineHeight } as React.CSSProperties}>
      <header className="topbar">
        <div className="product-mark">
          <span className="mark-seal">排</span>
          <div><strong>公众号排版设计师</strong><small>WECHAT EDITORIAL STUDIO</small></div>
        </div>

        <div className="document-identity">
          <span className="save-indicator"><i />已保存</span>
          <span className="document-name">当成本拼不过青拓之后</span>
          <button className="icon-button" aria-label="切换稿件"><Icon name="chevron" size={15} /></button>
        </div>

        <div className="top-actions">
          <button className="icon-button" aria-label="撤销"><Icon name="undo" /></button>
          <button className="icon-button" aria-label="重做"><Icon name="redo" /></button>
          <span className="top-divider" />
          <button className="quiet-action" onClick={() => notify("已生成可恢复版本")}>生成版本</button>
          <button className="primary-action" onClick={() => notify("发布检查已完成：0 项阻断")}>发布检查 <Icon name="publish" size={16} /></button>
        </div>
      </header>

      <aside className="left-panel">
        <div className="panel-label">设计流程</div>
        <nav className="workflow-nav" aria-label="设计流程">
          {[
            ["document", "内容", "结构已识别"],
            ["structure", "编排", "3 项建议"],
            ["style", "视觉", currentTheme.name],
            ["assets", "素材", "6 项资源"],
            ["check", "交付", "准备就绪"],
          ].map(([icon, title, meta], index) => (
            <button key={title} className={`workflow-item ${index === 1 ? "active" : ""}`}>
              <span className="workflow-index">0{index + 1}</span>
              <span className="workflow-icon"><Icon name={icon as IconName} /></span>
              <span className="workflow-copy"><b>{title}</b><small>{meta}</small></span>
            </button>
          ))}
        </nav>

        <div className="drafts-block">
          <div className="panel-label row-label"><span>近期稿件</span><button aria-label="新建稿件">＋</button></div>
          <button className="draft-card active"><span>观点</span><strong>当成本拼不过青拓之后，我们还能卖什么？</strong><small>刚刚更新 · 1,286字</small></button>
          <button className="draft-card"><span>人物</span><strong>李双良：炉火边缘的另一种答案</strong><small>昨天 · 2,104字</small></button>
          <button className="all-documents">查看全部稿件 <Icon name="chevron" size={14} /></button>
        </div>

        <div className="brand-kit-mini">
          <span className="brand-avatar">钢</span>
          <div><b>钢铁私塾</b><small>品牌套件已启用</small></div>
          <Icon name="check" size={16} />
        </div>
      </aside>

      <section className="canvas-area">
        <div className="canvas-toolbar">
          <div><span className="canvas-kicker">设计画布</span><strong>{preview === "phone" ? "手机阅读效果" : "桌面阅读效果"}</strong></div>
          <div className="canvas-controls">
            <button className={preview === "phone" ? "selected" : ""} onClick={() => setPreview("phone")} aria-label="手机预览"><Icon name="phone" /></button>
            <button className={preview === "desktop" ? "selected" : ""} onClick={() => setPreview("desktop")} aria-label="桌面预览"><Icon name="desktop" /></button>
            <span />
            <button onClick={() => setSourceOpen(true)}>查看原稿</button>
          </div>
        </div>

        <div className={`canvas-stage ${preview}`}>
          <div className="ruler top-ruler"><i>0</i><i>100</i><i>200</i><i>300</i></div>
          <div className="ruler side-ruler"><i>0</i><i>200</i><i>400</i><i>600</i></div>

          <article className="article-page">
            <header className="article-brandline">
              <div className="article-account"><span>钢</span><div><b>钢铁私塾</b><small>材料 · 产业 · 人物</small></div></div>
              <span className="article-category">产业观察 / 028</span>
            </header>

            <section className="article-title-block">
              <span className="article-eyebrow">EDITORIAL NOTE</span>
              <h1>当成本拼不过青拓之后，<br />我们还能卖什么？</h1>
              <p>低价是最直接的武器，也正在成为最危险的依赖。</p>
              <div className="article-byline"><span>主编：钢铁私塾 唐淼</span><i /></div>
            </section>

            <div className="article-body">
              <p>价格战从来没有真正的赢家。对不锈钢贸易商而言，低价曾是最直接的武器，也正在成为最危险的依赖。</p>
              <p className="lead-paragraph">在产能与效率的巨大机器面前，单纯依靠价差生存的空间，正像退潮后的水洼，一寸寸见底。</p>

              <section className="chapter-heading"><span>01</span><div><small>PRICE IS NOT CAPABILITY</small><h2>低价不是能力，只是阶段性结果</h2></div></section>
              <p>真正决定客户是否长期留下来的，从来不是某一吨便宜了五十元，而是材料是否选对、交期是否可靠、问题能否有人负责。</p>
              <blockquote><span>观点</span><p>当产品越来越接近，专业判断本身就会成为产品。</p></blockquote>

              <section className="chapter-heading"><span>02</span><div><small>DELIVER CERTAINTY</small><h2>从卖材料，转向交付确定性</h2></div></section>
              <ol className="designed-list">
                <li><span>01</span><p><b>把牌号讲明白</b><small>不是报出一个材质名称，而是解释适用边界。</small></p></li>
                <li><span>02</span><p><b>把标准说清楚</b><small>标准不是装饰，是订货与责任的共同语言。</small></p></li>
                <li><span>03</span><p><b>把风险放到前面</b><small>专业不是事后解释，是事前判断。</small></p></li>
              </ol>
            </div>

            <footer className="article-footer"><span>钢铁私塾</span><p>我们不贩卖焦虑，只研究变化。</p></footer>
          </article>

          <div className="page-note note-one"><span>01</span><p>标题层级已重组<br /><small>建立更明确的阅读入口</small></p></div>
          <div className="page-note note-two"><span>02</span><p>金句已识别<br /><small>建议使用观点组件</small></p></div>
        </div>

        <div className="statusbar"><span><i className="status-good" />微信兼容检查通过</span><span>{wordCount.toLocaleString()} 字 · 预计阅读 5 分钟</span><span>自动保存于本机</span></div>
      </section>

      <aside className="inspector-panel">
        <div className="inspector-tabs" role="tablist">
          {(["智能", "样式", "品牌"] as InspectorTab[]).map((tab) => <button key={tab} className={inspector === tab ? "active" : ""} onClick={() => setInspector(tab)}>{tab}</button>)}
        </div>

        {inspector === "智能" && (
          <div className="inspector-content">
            <section className="design-score"><div className="score-ring"><strong>92</strong><small>设计分</small></div><div><span>结构清楚，阅读节奏良好</span><p>还有 3 项建议可以提升完成度</p></div></section>
            <section className="inspector-section">
              <div className="section-heading"><div><span>结构建议</span><small>基于文章语义生成</small></div><Icon name="spark" size={17} /></div>
              <div className="suggestion-list">
                {[
                  ["quote", "突出核心判断", "检测到 1 处强观点，适合做成视觉停顿。", "已应用"],
                  ["list", "重组并列信息", "末段包含 4 个并列动作，可转换为编号卡片。", "应用"],
                  ["rhythm", "缩短首屏段落", "第二段偏长，拆分后手机阅读更轻。", "应用"],
                ].map(([id, title, text, action], index) => {
                  const isApplied = adopted.includes(id) || index === 0;
                  return <article className={`suggestion-card ${isApplied ? "applied" : ""}`} key={id}><div className="suggestion-number">0{index + 1}</div><div><strong>{title}</strong><p>{text}</p></div><button onClick={() => adopt(id)}>{isApplied ? "已应用" : action}</button></article>;
                })}
              </div>
            </section>

            <section className="inspector-section compatibility-card">
              <div className="section-heading"><div><span>交付健康度</span><small>粘贴公众号前最后检查</small></div><span className="pass-tag">通过</span></div>
              <ul><li><Icon name="check" size={15} />层级与段落 <span>正常</span></li><li><Icon name="check" size={15} />图片与链接 <span>正常</span></li><li><Icon name="check" size={15} />微信样式兼容 <span>正常</span></li></ul>
            </section>
            <button className="copy-delivery" onClick={() => notify("已复制微信兼容富文本")}><Icon name="copy" />复制公众号排版</button>
          </div>
        )}

        {inspector === "样式" && (
          <div className="inspector-content">
            <section className="inspector-section">
              <div className="section-heading"><div><span>文章气质</span><small>改变章法，不改内容</small></div></div>
              <div className="theme-grid">
                {(Object.entries(themes) as [ThemeKey, typeof themes[ThemeKey]][]).map(([key, item]) => <button key={key} className={theme === key ? "active" : ""} onClick={() => setTheme(key)}><span className="theme-sample" style={{ background: item.paper, color: item.ink }}><i style={{ background: item.accent }} /><b>Aa</b></span><small>{item.name}</small></button>)}
              </div>
            </section>

            <section className="inspector-section control-stack">
              <label><span><b>正文字号</b><small>建议 15—17px</small></span><output>{fontSize}px</output></label>
              <input type="range" min="14" max="19" step="1" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
              <label><span><b>正文行距</b><small>长文需要更多呼吸</small></span><output>{lineHeight.toFixed(2)}</output></label>
              <input type="range" min="1.5" max="2.1" step="0.04" value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} />
            </section>

            <section className="inspector-section">
              <div className="section-heading"><div><span>局部组件</span><small>插入可复用内容结构</small></div></div>
              <div className="component-list">{[["引", "观点引语"], ["数", "数据结论"], ["图", "图片组"], ["表", "对比表格"]].map(([mark, label]) => <button key={label}><span>{mark}</span>{label}<b>＋</b></button>)}</div>
            </section>
          </div>
        )}

        {inspector === "品牌" && (
          <div className="inspector-content">
            <section className="brand-preview-card"><span className="brand-big-avatar">钢</span><div><small>当前品牌套件</small><strong>钢铁私塾</strong><p>工业理性 · 专业克制 · 有判断</p></div></section>
            <section className="inspector-section brand-settings">
              <div className="section-heading"><div><span>品牌基因</span><small>所有稿件统一继承</small></div></div>
              <label><span>主色</span><i style={{ background: "#b23a2b" }} />朱砂红 <button>修改</button></label>
              <label><span>正文</span><i style={{ background: "#20201d" }} />墨黑 <button>修改</button></label>
              <label><span>署名</span><b>主编：钢铁私塾 唐淼</b><button>编辑</button></label>
              <label><span>结尾</span><b>固定品牌结尾</b><button>编辑</button></label>
            </section>
            <section className="inspector-section">
              <div className="section-heading"><div><span>品牌一致性</span><small>本稿与品牌套件对照</small></div></div>
              <div className="brand-consistency"><strong>100%</strong><div><i /><span>颜色、署名与语气均一致</span></div></div>
            </section>
          </div>
        )}
      </aside>

      {sourceOpen && (
        <div className="source-overlay" role="dialog" aria-modal="true" aria-label="原稿编辑器">
          <div className="source-drawer">
            <header><div><span>原稿</span><strong>Markdown 内容</strong></div><button onClick={() => setSourceOpen(false)} aria-label="关闭原稿"><Icon name="close" /></button></header>
            <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} aria-label="Markdown 原稿" spellCheck={false} />
            <footer><span>{wordCount} 字 · 已自动保存</span><button onClick={() => { setSourceOpen(false); notify("内容结构已重新分析"); }}>重新编排</button></footer>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div>}
    </main>
  );
}
