export type LayoutMode = "calm" | "balanced" | "editorial";
export type FontProfile = "classic" | "literary" | "clear";

export type ThemeTokens = {
  name: string;
  palette: {
    accent: string;
    ink: string;
    paper: string;
    muted: string;
    line: string;
    soft: string;
  };
  dark: {
    paper: string;
    ink: string;
    muted: string;
    accent: string;
    line: string;
    soft: string;
  };
};

export type MarkdownStyle = {
  name: string;
  short: string;
  description: string;
  fit: string;
  theme: ThemeKey;
  layout: LayoutMode;
  fontProfile: FontProfile;
  typography: {
    bodySize: number;
    lineHeight: number;
    titleScale: number;
    tracking: number;
  };
  components: {
    heading: "chapter" | "rule" | "index" | "centered" | "plain";
    quote: "letter" | "editorial" | "note" | "essay";
    list: "ordered" | "ledger" | "minimal";
  };
};

export const themes = {
  national: {
    name: "赤蓝编辑",
    palette: { accent: "#b23a42", ink: "#17324b", paper: "#fffefd", muted: "#607383", line: "#d8e1e6", soft: "#f1f5f7" },
    dark: { paper: "#111e28", ink: "#edf3f6", muted: "#a9b8c3", accent: "#dc6b70", line: "#344958", soft: "#1b2b37" },
  },
  editorial: {
    name: "朱砂社论",
    palette: { accent: "#9d493b", ink: "#232623", paper: "#fbf8ef", muted: "#6f706b", line: "#ded8ca", soft: "#f4ece2" },
    dark: { paper: "#1d1c1a", ink: "#eeeae1", muted: "#aaa398", accent: "#d97a69", line: "#47423d", soft: "#292622" },
  },
  industrial: {
    name: "雨苔纪要",
    palette: { accent: "#536b62", ink: "#252b28", paper: "#f4f5f0", muted: "#6c756f", line: "#d4d9d4", soft: "#e9eeea" },
    dark: { paper: "#171c1a", ink: "#e9efeb", muted: "#a3afa8", accent: "#8eae9f", line: "#39443f", soft: "#202925" },
  },
  eastern: {
    name: "江南纸墨",
    palette: { accent: "#985043", ink: "#242724", paper: "#fbf6e9", muted: "#767169", line: "#e0d7c9", soft: "#f3eae0" },
    dark: { paper: "#1c1b18", ink: "#efebe1", muted: "#aaa398", accent: "#d47d6d", line: "#49433c", soft: "#28241f" },
  },
  minimal: {
    name: "烟雨黛",
    palette: { accent: "#586b70", ink: "#272c2d", paper: "#faf9f3", muted: "#707879", line: "#d9dcda", soft: "#eef0ed" },
    dark: { paper: "#171b1c", ink: "#edf0ef", muted: "#a5adae", accent: "#94aeb4", line: "#3b4446", soft: "#212728" },
  },
  spring: {
    name: "草长莺飞",
    palette: { accent: "#71885a", ink: "#283229", paper: "#fcfaed", muted: "#747868", line: "#dce0ce", soft: "#f1f2df" },
    dark: { paper: "#191d17", ink: "#edf1e7", muted: "#a8b09e", accent: "#a7c184", line: "#3d4737", soft: "#23291f" },
  },
  collage: {
    name: "纸上辑录",
    palette: { accent: "#a55443", ink: "#292722", paper: "#f5eddf", muted: "#746e64", line: "#dcd0bf", soft: "#ece0d1" },
    dark: { paper: "#1d1a17", ink: "#eee7dc", muted: "#aba094", accent: "#dc7f68", line: "#4b4239", soft: "#29231e" },
  },
} satisfies Record<string, ThemeTokens>;

export type ThemeKey = keyof typeof themes;

export const markdownStyles = {
  jiangnan: { name: "江南书札", short: "书札", description: "疏朗题签 · 文气章节 · 注脚式引文", fit: "人物、产业叙事", theme: "eastern", layout: "calm", fontProfile: "classic", typography: { bodySize: 18, lineHeight: 1.94, titleScale: 1, tracking: .02 }, components: { heading: "chapter", quote: "letter", list: "ordered" } },
  editorial: { name: "编辑部手记", short: "手记", description: "强题破局 · 横线分章 · 拉引成势", fit: "评论、趋势判断", theme: "editorial", layout: "editorial", fontProfile: "classic", typography: { bodySize: 18, lineHeight: 1.8, titleScale: 1.02, tracking: .012 }, components: { heading: "rule", quote: "editorial", list: "ledger" } },
  technical: { name: "技术纪要", short: "纪要", description: "编号分层 · 参数成组 · 证据优先", fit: "标准、材料技术", theme: "industrial", layout: "balanced", fontProfile: "clear", typography: { bodySize: 17, lineHeight: 1.84, titleScale: 1, tracking: .006 }, components: { heading: "index", quote: "note", list: "ledger" } },
  essay: { name: "观点长卷", short: "长卷", description: "题跋居中 · 缓章慢读 · 引文成景", fit: "深度长文、专栏", theme: "editorial", layout: "calm", fontProfile: "literary", typography: { bodySize: 18, lineHeight: 1.98, titleScale: 1.03, tracking: .022 }, components: { heading: "centered", quote: "essay", list: "minimal" } },
  minimal: { name: "清简白页", short: "清简", description: "去饰留序 · 短段快读 · 信息直达", fit: "快讯、短评、清单", theme: "minimal", layout: "balanced", fontProfile: "clear", typography: { bodySize: 18, lineHeight: 1.86, titleScale: .98, tracking: .004 }, components: { heading: "plain", quote: "note", list: "minimal" } },
  spring: { name: "草长莺飞", short: "莺飞", description: "柳色题签 · 杏纸轻读 · 春水收章", fit: "人文随笔、品牌故事", theme: "spring", layout: "calm", fontProfile: "literary", typography: { bodySize: 18, lineHeight: 1.98, titleScale: 1, tracking: .02 }, components: { heading: "centered", quote: "letter", list: "minimal" } },
  collage: { name: "纸上辑录", short: "辑录", description: "纸签分章 · 档案引文 · 定格入场", fit: "品牌故事、人物专访", theme: "collage", layout: "calm", fontProfile: "classic", typography: { bodySize: 18, lineHeight: 1.92, titleScale: 1, tracking: .016 }, components: { heading: "chapter", quote: "editorial", list: "ordered" } },
} satisfies Record<string, MarkdownStyle>;

export type MarkdownStyleKey = keyof typeof markdownStyles;
export const markdownStyleOrder: MarkdownStyleKey[] = ["collage", "jiangnan", "editorial", "technical", "essay", "minimal", "spring"];
export const titleBaseSizes: Record<MarkdownStyleKey, number> = { jiangnan: 34, editorial: 36, technical: 32, essay: 35, minimal: 32, spring: 34, collage: 34 };

export const fontProfiles: { key: FontProfile; name: string; sample: string; detail: string }[] = [
  { key: "classic", name: "雅宋", sample: "永", detail: "标题有骨，长文耐读" },
  { key: "literary", name: "书卷", sample: "墨", detail: "楷意题签，仿宋正文" },
  { key: "clear", name: "清朗", sample: "读", detail: "现代正文，手机更清楚" },
];

export function themeCssVariables(theme: ThemeTokens, darkPreview: boolean) {
  const palette = darkPreview ? theme.dark : theme.palette;
  return {
    "--article-accent": palette.accent,
    "--article-ink": palette.ink,
    "--article-paper": palette.paper,
    "--article-muted": palette.muted,
    "--article-line": palette.line,
    "--article-soft": palette.soft,
  } as const;
}
