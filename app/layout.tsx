import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "公众号排版设计师",
  description: "读懂文章结构，完成品牌化编排，并生成微信公众号兼容排版。",
  applicationName: "公众号排版设计师",
  keywords: ["微信公众号", "公众号排版", "Markdown", "内容设计", "品牌排版"],
  openGraph: {
    title: "公众号排版设计师",
    description: "不是替文章换颜色，而是替内容建立秩序。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "公众号排版设计师",
    description: "读懂文章结构，完成品牌化编排。",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
