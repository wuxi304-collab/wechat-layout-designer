"use client";

import { useEffect, useMemo, useState } from "react";
import { writePlainClipboard } from "@/lib/editor/clipboard";
import { inspectGifFile, type GifInspection } from "@/lib/editor/gif-inspector";

type GifStyle = "industrial" | "comic-fusion" | "type-linked" | "clay-mascot" | "pixel-light" | "lenticular";
type GifRatio = "16:9" | "4:3" | "1:1" | "3:4";

const styles: Array<{ id: GifStyle; name: string; origin: string; detail: string; preview?: string }> = [
  { id: "industrial", name: "工业科普动态示意", origin: "自定义适配", detail: "材料截面、轧制工序、腐蚀机理、数据变化" },
  { id: "comic-fusion", name: "漫画印刷整体融合", origin: "GIF Factory", detail: "人物、背景、标题作为整体设计", preview: "https://raw.githubusercontent.com/WoYun520/gif-factory/main/docs/previews/comic-fusion.gif" },
  { id: "type-linked", name: "人物与字体联动", origin: "GIF Factory", detail: "主体动作与标题字形同步变化", preview: "https://raw.githubusercontent.com/WoYun520/gif-factory/main/docs/previews/type-linked.gif" },
  { id: "clay-mascot", name: "粘土吉祥物", origin: "GIF Factory", detail: "适合品牌角色、产品与包装", preview: "https://raw.githubusercontent.com/WoYun520/gif-factory/main/docs/previews/clay-mascot.gif" },
  { id: "pixel-light", name: "像素轻动效", origin: "GIF Factory", detail: "适合小图标、轻量表情和提示", preview: "https://raw.githubusercontent.com/WoYun520/gif-factory/main/docs/previews/pixel-light.gif" },
  { id: "lenticular", name: "双状态光栅卡", origin: "GIF Factory", detail: "适合两个状态、两种外观之间切换", preview: "https://raw.githubusercontent.com/WoYun520/gif-factory/main/docs/previews/lenticular.gif" },
];

const ratios: Array<{ value: GifRatio; label: string; dimensions: string }> = [
  { value: "16:9", label: "横版 16:9", dimensions: "960 × 540" },
  { value: "4:3", label: "横版 4:3", dimensions: "900 × 675" },
  { value: "1:1", label: "方形 1:1", dimensions: "640 × 640" },
  { value: "3:4", label: "竖版 3:4", dimensions: "720 × 960" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDuration(ms: number) {
  return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 2)} 秒`;
}

function secureImageUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.toString().replace(/\)/g, "%29");
  } catch {
    return "";
  }
}

export function GifWorkbench({ articleTitle, articleContext, onInsert }: {
  articleTitle: string;
  articleContext: string;
  onInsert: (url: string, caption: string) => void;
}) {
  const [style, setStyle] = useState<GifStyle>("industrial");
  const [ratio, setRatio] = useState<GifRatio>("16:9");
  const [purpose, setPurpose] = useState<"article" | "poster" | "sticker">("article");
  const [overlayText, setOverlayText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<GifInspection | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("文章动态配图");

  const selectedStyle = styles.find((item) => item.id === style) ?? styles[0];
  const selectedRatio = ratios.find((item) => item.value === ratio) ?? ratios[0];
  const normalizedUrl = secureImageUrl(imageUrl);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const prompt = useMemo(() => {
    const purposeText = purpose === "article"
      ? "微信公众号文章正文中的动态配图，不是封面，不是聊天表情包"
      : purpose === "poster"
        ? "品牌或活动动态海报"
        : "可独立发送的聊天表情 GIF";
    const ratioText = purpose === "sticker" ? "1:1 方形画布" : `${selectedRatio.value}，目标画布约 ${selectedRatio.dimensions}`;
    const styleText = style === "industrial"
      ? "工业科普动态示意（本项目自定义适配，不冒充 GIF Factory 内置风格）：用真实材料质感和清楚的工艺关系表达一个知识点"
      : `${selectedStyle.name}（GIF Factory 风格库）`;
    const context = articleContext.trim().slice(0, 900);
    return [
      "使用 $pixel-gif-sticker-pack，参考 GIF Factory 的对应风格说明与质量检查流程。",
      `文章主题：${articleTitle || "待定"}`,
      `用途：${purposeText}。`,
      `视觉方向：${styleText}。`,
      `画幅：${ratioText}。注意：GIF Factory 部分现成导出脚本默认方形 512×512，光栅卡默认 480×720；不要把方形预设冒充横版输出。若当前脚本不支持目标比例，先制作对应比例的分镜/图集，再使用适配的自定义合成流程。`,
      "动作：一个清晰、可读的核心动作；建议 4–6 秒，循环衔接自然，不用长静止帧凑时长。按画面复杂度控制帧数与体积。",
      overlayText.trim() ? `画面文字必须逐字准确：${overlayText.trim()}。除此之外不生成任何文字。` : "默认不在画面中生成文字，避免中文错字；图注由公众号排版工具后期添加。",
      "事实约束：只使用稿件中明确出现的材料、牌号、标准、企业名称和数据；没有提供的参数、工艺、标识、Logo 一律不补造。企业 Logo 只能使用用户提供的官方原图。仅借鉴样例的视觉技法，不复刻样例中的受保护角色、IP、商标或作品造型。",
      "质量门禁：先出一张静态构图和一张动态小样；确认后再批量。导出后运行 review_gif.py 检查实际帧数、时长、透明边缘和逐帧问题；输出帧图与检查报告。技术检查通过不等于审美验收通过。",
      "交付：最终 GIF、原始文件、帧图/联系表、时长/帧数/画幅/文件大小报告。不要只给预览图。",
      context ? `文章上下文（只作为语义参考）：\n${context}` : "",
    ].filter(Boolean).join("\n\n");
  }, [articleTitle, articleContext, overlayText, purpose, selectedRatio, selectedStyle, style]);

  const warnings = useMemo(() => {
    if (!metadata) return [];
    const result: string[] = [];
    if (metadata.fileSizeBytes > 10 * 1024 * 1024) result.push("文件超过 10 MB。微信公开永久图片素材接口的 GIF 参考上限为 10 MB；正文编辑器与其他上传入口可能采用不同规则，请以账号内实际提示为准。");
    if (metadata.width > 1080 || metadata.height > 1080) result.push("单边超过 1080 px。为控制文章加载体积，可考虑缩小画布；这是本工具的优化建议，不是微信硬性限制。");
    if (metadata.frameCount > 120) result.push("帧数超过 120 帧，建议检查是否有重复帧或不必要的高帧率。");
    if (metadata.durationMs > 8000) result.push("动图超过 8 秒。长动画容易打断阅读，建议拆成短循环或静态图文。");
    if (metadata.zeroDelayFrames) result.push(`检测到 ${metadata.zeroDelayFrames} 个零延迟控制块，部分浏览器可能以不同速度播放。`);
    return result;
  }, [metadata]);

  async function chooseFile(next: File | undefined) {
    if (!next) return;
    setError("");
    setMetadata(null);
    if (next.size > 30 * 1024 * 1024) {
      setFile(null);
      setPreviewUrl("");
      setError("单个 GIF 超过 30 MB，本地预检已停止。请先在本机压缩后再导入。");
      return;
    }
    try {
      const inspected = await inspectGifFile(next);
      setFile(next);
      setPreviewUrl(URL.createObjectURL(next));
      setMetadata(inspected);
    } catch (reason) {
      setFile(null);
      setPreviewUrl("");
      setError(reason instanceof Error ? reason.message : "GIF 读取失败，请检查文件。");
    }
  }

  async function copyPrompt() {
    try {
      await writePlainClipboard(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("复制制作指令失败，请检查浏览器剪贴板权限。");
    }
  }

  return <div className="gif-workbench">
    <section className="gif-workbench-intro">
      <div className="gif-workbench-brand"><span>GIF</span><div><strong>动图工坊</strong><small>GIF Factory workflow · 文章素材工作台</small></div></div>
      <p>先用 GIF Factory 制作动态素材，再回到这里预览、检查技术参数，并把已上传到可访问 HTTPS 地址的 GIF 插入正文。</p>
      <a href="https://github.com/WoYun520/gif-factory" target="_blank" rel="noreferrer">查看 GIF Factory 源码与 Skill <span>↗</span></a>
    </section>

    <section className="gif-workbench-section">
      <header><div><b>01 · 生成任务</b><small>根据当前文章生成一份可复制的 GIF Factory 指令</small></div><span>AI 制作</span></header>
      <label className="gif-field-label" htmlFor="gif-purpose">作品用途</label>
      <select id="gif-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value as typeof purpose)}>
        <option value="article">公众号正文动态配图</option>
        <option value="poster">品牌 / 活动动态海报</option>
        <option value="sticker">聊天表情 GIF</option>
      </select>
      <label className="gif-field-label" htmlFor="gif-style">视觉风格</label>
      <div className="gif-style-grid">
        {styles.map((item) => <button type="button" key={item.id} className={style === item.id ? "active" : ""} aria-pressed={style === item.id} onClick={() => setStyle(item.id)}>
          <span>{item.name}</span><small>{item.origin} · {item.detail}</small>
        </button>)}
      </div>
      <div className="gif-selected-style-preview">
        {selectedStyle.preview
          ? <img src={selectedStyle.preview} alt={`${selectedStyle.name}动态样例`} loading="lazy"/>
          : <div className="gif-industrial-preview" aria-hidden="true"><span>304</span><i/><b>INDUSTRIAL MOTION</b></div>}
        <div><b>{selectedStyle.name}</b><small>{selectedStyle.preview ? "上游公开动图样例 · 仅作技法参考" : "本项目自定义方向 · 钢铁材料与工艺动态示意"}</small></div>
      </div>
      <label className="gif-field-label" htmlFor="gif-ratio">画幅建议</label>
      <select id="gif-ratio" value={ratio} onChange={(event) => setRatio(event.target.value as GifRatio)}>
        {ratios.map((item) => <option key={item.value} value={item.value}>{item.label} · {item.dimensions}</option>)}
      </select>
      <label className="gif-field-label" htmlFor="gif-overlay-text">画面必须出现的文字（可留空）</label>
      <input id="gif-overlay-text" value={overlayText} onChange={(event) => setOverlayText(event.target.value)} placeholder="例如：304L ≠ 304" maxLength={80}/>
      <div className="gif-prompt-preview"><pre>{prompt}</pre></div>
      <button type="button" className="gif-primary-action" onClick={copyPrompt}>{copied ? "制作指令已复制" : "复制 GIF Factory 制作指令"}</button>
      <p className="gif-workbench-note">说明：本网页不直接调用 GIF Factory 的图像生成环境；此处生成制作指令。横版正文动图需适配横向画幅，不能直接套用其方形表情包导出预设。</p>
    </section>

    <section className="gif-workbench-section">
      <header><div><b>02 · 本地预览与预检</b><small>导入 GIF 后读取容器信息，不修改原文件</small></div><span>本机处理</span></header>
      <label className="gif-upload-zone" onDragOver={(event) => { event.preventDefault(); event.currentTarget.dataset.dragging = "true"; }} onDragLeave={(event) => { delete event.currentTarget.dataset.dragging; }} onDrop={(event) => { event.preventDefault(); delete event.currentTarget.dataset.dragging; void chooseFile(event.dataTransfer.files?.[0]); }}>
        <input type="file" accept=".gif,image/gif" onChange={(event) => { void chooseFile(event.target.files?.[0]); event.currentTarget.value = ""; }}/>
        <strong>{file ? "更换 GIF 文件" : "选择或拖入 GIF 文件"}</strong>
        <small>仅本地读取，不会上传服务器；单文件预检上限 30 MB</small>
      </label>
      {error && <p className="gif-error" role="alert">{error}</p>}
      {file && metadata && <div className="gif-preview-card">
        <div className="gif-preview-media"><img src={previewUrl} alt="本地 GIF 动态预览"/></div>
        <div className="gif-preview-details">
          <strong title={file.name}>{file.name}</strong>
          <div className="gif-metrics">
            <span><b>{metadata.width} × {metadata.height}</b><small>画布</small></span>
            <span><b>{metadata.frameCount}</b><small>帧数</small></span>
            <span><b>{formatDuration(metadata.durationMs)}</b><small>总时长</small></span>
            <span><b>{formatBytes(metadata.fileSizeBytes)}</b><small>文件大小</small></span>
          </div>
          <p>循环字段：{metadata.loopCount === null ? "未检测到" : metadata.loopCount === 0 ? "0 · 无限循环" : String(metadata.loopCount)} · {metadata.hasTransparency ? "含透明像素" : "未检测到透明控制"} · 平均约 {metadata.durationMs ? (metadata.frameCount / (metadata.durationMs / 1000)).toFixed(1) : "—"} FPS</p>
          <a href={previewUrl} download={file.name}>下载原始 GIF</a>
        </div>
        {warnings.length > 0 && <ul className="gif-warning-list">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
        {warnings.length === 0 && <p className="gif-pass-note">基础容器预检通过。此结果不代表画面审美、动作连续性或微信上传已通过。</p>}
      </div>}
    </section>

    <section className="gif-workbench-section">
      <header><div><b>03 · 插入文章</b><small>上传到微信素材后，再把可访问地址写入原稿</small></div><span>正文集成</span></header>
      <label className="gif-field-label" htmlFor="gif-caption">图片说明 / 替代文字</label>
      <input id="gif-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={80} placeholder="例如：双相不锈钢显微组织变化"/>
      <label className="gif-field-label" htmlFor="gif-image-url">已上传 GIF 的 HTTPS 图片地址</label>
      <input id="gif-image-url" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://mmbiz.qpic.cn/…"/>
      <button type="button" className="gif-primary-action" disabled={!normalizedUrl || !caption.trim()} onClick={() => onInsert(normalizedUrl, caption.trim())}>插入到当前文章</button>
      <p className="gif-workbench-note">本地文件不会自动变成公众号图片地址。请先在公众号后台上传 GIF，再粘贴后台可用的 HTTPS 地址。外链图片可能被微信过滤；交付预检会继续提醒你转存公众号素材并实测。</p>
    </section>
  </div>;
}
