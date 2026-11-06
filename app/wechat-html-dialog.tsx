"use client";

import { useEffect, useRef, useState } from "react";
import { writeRichClipboard } from "@/lib/editor/wechat-adapter";
import { writePlainClipboard } from "@/lib/editor/clipboard";
import { downloadWechatDelivery, type WechatDelivery } from "@/lib/editor/wechat-export";

export function WechatHtmlDialog({ delivery, filename, onClose }: {
  delivery: WechatDelivery;
  filename: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<"preview" | "source">("preview");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function copyRich() {
    try {
      await writeRichClipboard(delivery.html, delivery.plainText, dialogRef.current);
      setStatus("富文本已复制。在微信公众号正文区直接粘贴，再打开草稿预览核对。");
    } catch {
      setStatus("浏览器未允许富文本复制。可下载 HTML，在桌面浏览器打开后选中正文复制。");
    }
  }

  async function copySource() {
    try {
      await writePlainClipboard(delivery.html, dialogRef.current);
      setStatus("HTML 源码已复制，供留档或调试。粘贴到公众号正文请用「复制微信富文本」。");
    } catch {
      setStatus("源码复制失败，可在源码框内手动选择复制。");
    }
  }

  return <dialog ref={dialogRef} className="wechat-html-dialog" aria-labelledby="wechat-html-title" onClose={onClose}>
    <header className="wechat-html-header">
      <div><p>交付 · HTML</p><h2 id="wechat-html-title">微信正文成品</h2><span>{delivery.title}</span></div>
      <button type="button" className="wechat-html-close" onClick={() => dialogRef.current?.close()}>关闭</button>
    </header>
    <p className="wechat-html-instructions">标题、作者分别填写。点击「复制微信富文本」，到公众号后台正文区普通粘贴。预览与复制使用同一份正文。</p>
    <div className="wechat-html-actions">
      <button type="button" className="wechat-html-primary" onClick={copyRich}>复制微信富文本</button>
      <button type="button" onClick={() => {
        try { downloadWechatDelivery(delivery, filename, dialogRef.current); setStatus("已发起 HTML 下载。"); }
        catch { setStatus("HTML 下载失败，请重试。"); }
      }}>下载 HTML</button>
    </div>
    <div className="wechat-html-feedback" role="status">{status}</div>
    <div className="wechat-html-views" role="group" aria-label="HTML 展示方式">
      <button type="button" aria-pressed={view === "preview"} onClick={() => setView("preview")}>手机正文预览</button>
      <button type="button" aria-pressed={view === "source"} onClick={() => setView("source")}>HTML 源码</button>
    </div>
    {view === "preview" ? <div className="wechat-html-frame"><iframe title="交付正文预览" sandbox="" srcDoc={delivery.document} /></div>
      : <div className="wechat-html-source"><textarea aria-label="交付正文 HTML 源码" readOnly spellCheck={false} value={delivery.html} /><button type="button" onClick={copySource}>复制 HTML 源码</button></div>}
    <section className="wechat-html-checks" aria-label="本地预检">
      <strong>{delivery.warnings.length ? `发布前复核 · ${delivery.warnings.length} 项` : "本地预检无提醒"}</strong>
      {delivery.warnings.length > 0 && <ul>{delivery.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      <p>微信草稿、手机与朋友圈仍需实测；图片、外链和复杂表格优先复核。</p>
    </section>
  </dialog>;
}
