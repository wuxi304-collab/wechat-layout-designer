import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wechat-layout-designer.wuxi304.chatgpt.site"),
  title: "公众号排版设计师",
  description: "读懂文章结构，完成品牌化编排，并生成微信公众号兼容排版。",
  applicationName: "公众号排版设计师",
  keywords: ["微信公众号", "公众号排版", "Markdown", "内容设计", "品牌排版"],
  openGraph: {
    title: "公众号排版设计师",
    description: "不是替文章换颜色，而是替内容建立秩序。",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "公众号排版设计师 · 中国红、深蓝与白色编辑工作台" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "公众号排版设计师",
    description: "读懂文章结构，完成品牌化编排。",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
