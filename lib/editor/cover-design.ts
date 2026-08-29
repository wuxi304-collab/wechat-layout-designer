export type CoverStyleCategory = "极简" | "中国" | "科技" | "实验" | "插画" | "工业";

export type CoverStyle = {
  id: string;
  name: string;
  short: string;
  category: CoverStyleCategory;
  keywords: string[];
  fit: string;
  direction: string;
  composition: string;
  texture: string;
  palette: [string, string, string];
  signals: string[];
  avoid: string;
  promptStyle: string;
};

export type CoverArticleProfile = {
  subject: string;
  tone: string;
  intent: string;
  signals: string[];
  companyName: string | null;
  companyConfidence: "high" | "medium" | null;
  companyReason: string | null;
  officialDomains: string[];
  isEnterprise: boolean;
  category: "industrial" | "technology" | "culture" | "business" | "people" | "science" | "youth" | "general";
};

export type CoverRecommendation = {
  style: CoverStyle;
  score: number;
  reason: string;
};

export type CoverPromptProtocol = {
  template: string;
  styleTags: string[];
  sceneTags: string[];
  visualAnchor: string;
  visualMetaphor: string;
  shotLanguage: string;
  hierarchy: string;
  referencePolicy: string;
  negativeLock: string[];
};

export const coverAuthorName = "唐淼";
export const coverSignature = `钢铁私塾 ${coverAuthorName}`;

export function normalizeCoverOcrText(value: string) {
  return value.normalize("NFC").replace(/[\u200b-\u200d\u2060\ufeff]/g, "").replace(/\s+/g, " ").trim();
}

export function validateCoverTextManifest(title: string, ocrLinesOutsideLogo: string[]) {
  const expected = [normalizeCoverOcrText(title), normalizeCoverOcrText(coverSignature)];
  const actual = ocrLinesOutsideLogo.map(normalizeCoverOcrText).filter(Boolean);
  const missing = expected.filter((line) => !actual.includes(line));
  const unexpected = actual.filter((line) => !expected.includes(line));
  return {
    passed: missing.length === 0 && unexpected.length === 0,
    missing,
    unexpected,
  };
}

export const coverStyles: CoverStyle[] = [
  { id: "minimal-cold", name: "极简艺术", short: "克制留白", category: "极简", keywords: ["极简", "朴素", "高冷", "留白"], fit: "观点、学术、人物独白", direction: "只留下一个主视觉与一个判断，让沉默也成为画面。", composition: "主体偏置三分法，大面积负空间承接标题", texture: "哑光纸面、柔和自然光、低对比阴影", palette: ["#F7F7F5", "#1B2430", "#B3262E"], signals: ["观点", "判断", "学术", "研究", "人物"], avoid: "不要增加无意义图标、光效与装饰边框", promptStyle: "高级极简编辑摄影，克制留白，哑光质感，低饱和" },
  { id: "minimal-information", name: "信息极简", short: "大字先行", category: "极简", keywords: ["大字号", "信息优先", "层级", "去装饰"], fit: "深度评论、标准解读、行业判断", direction: "先让结论被看见，再让图像承担证据，而不是反过来。", composition: "标题占主导，主视觉压缩为一枚有证据感的局部", texture: "清洁白底、硬朗网格、细线编号", palette: ["#FFFFFF", "#102A43", "#C8323A"], signals: ["标准", "为什么", "真相", "分析", "对比", "价格", "成本"], avoid: "不要用小字堆满封面，也不要把正文摘要搬上去", promptStyle: "瑞士国际主义信息设计，大字号，严格网格，高对比，信息优先" },
  { id: "apple", name: "苹果风", short: "精致科技", category: "科技", keywords: ["简洁", "精致", "优雅", "科技"], fit: "产品、设备、技术突破", direction: "用一件被准确照亮的对象，替代一屋子的科技符号。", composition: "产品或材料居中悬浮，标题留在纯净安全区", texture: "银灰金属、玻璃反射、柔光棚拍", palette: ["#F4F6F8", "#172B4D", "#D63C43"], signals: ["产品", "设备", "技术", "芯片", "精密", "工艺", "制造"], avoid: "不要伪造产品细节，不要使用廉价蓝光线条", promptStyle: "高端科技产品摄影，银灰渐变，精密柔光，纯净留白" },
  { id: "classical-chinese", name: "古典中国风", short: "古意入纸", category: "中国", keywords: ["传统", "复古", "水墨", "篆刻"], fit: "历史、城市、传统工艺、人物", direction: "以古法造境，以现代版心约束，不把中国风做成素材仓库。", composition: "长卷式远近层次，印章落在视觉收口处", texture: "宣纸吸墨、浅绛设色、旧拓片肌理", palette: ["#F3E9D2", "#24352F", "#9D2D28"], signals: ["历史", "古城", "传统", "中国", "百年", "文化", "工艺"], avoid: "避免龙凤灯笼齐上阵，最多保留一类文化母题", promptStyle: "中国古典水墨与浅绛设色，宣纸肌理，克制篆刻，长卷构图" },
  { id: "modern-chinese", name: "现代中国风", short: "东方当代", category: "中国", keywords: ["现代", "简约", "东方", "大气"], fit: "中国企业、产业观察、城市叙事", direction: "传统精神做骨，现代几何做形，适合严肃而不陈旧的中国叙事。", composition: "现代网格中嵌入一个东方意象，横向留足标题区", texture: "细腻纸纹、现代建筑光影、印色点睛", palette: ["#FAF8F2", "#0B2848", "#C7353C"], signals: ["中国", "企业", "产业", "城市", "发展", "制造", "时代"], avoid: "不使用伪书法标题与俗艳金色", promptStyle: "现代东方视觉，深蓝与中国红，克制水墨，国际化网格" },
  { id: "low-poly", name: "Low Poly", short: "几何建模", category: "科技", keywords: ["低多边形", "抽象", "柔光", "结构"], fit: "材料结构、模型、工程原理", direction: "把复杂对象折算为可理解的面，让结构本身成为美感。", composition: "多边形主体由左下向右上生长，标题置于稳定空区", texture: "低面晶体、柔和环境光、精密渲染", palette: ["#EAF0F5", "#163A5F", "#D9474D"], signals: ["结构", "模型", "晶体", "材料", "算法", "工程", "原理"], avoid: "避免五颜六色的廉价多边形背景", promptStyle: "低多边形抽象建模，精密几何切面，柔和电影光，工程美学" },
  { id: "nod", name: "NOD风格", short: "怪趣叙事", category: "插画", keywords: ["奇想", "人物", "隐喻", "怪趣"], fit: "人物故事、社会观察、反常识", direction: "用略带荒诞的角色关系，把抽象命题变成一眼能懂的隐喻。", composition: "单一人物或物件形成夸张关系，画面保留叙事悬念", texture: "手绘线条、平涂色块、轻微颗粒", palette: ["#F5E9D6", "#23364D", "#D84A3A"], signals: ["人物", "故事", "反常识", "困境", "选择", "焦虑"], avoid: "不要使用来源不明的艺术家标志性角色", promptStyle: "原创怪趣叙事插画，克制手绘线条，隐喻构图，非特定艺术家风格" },
  { id: "paper-cut", name: "剪纸叠加", short: "层叠纸艺", category: "中国", keywords: ["剪纸", "层叠", "民艺", "空间"], fit: "节气、地域文化、传统产业", direction: "用纸层制造景深，用剪影提炼主题，亲切而不幼稚。", composition: "前中后景分层展开，标题位于最上层干净纸面", texture: "手工纸纤维、刀刻边缘、柔和投影", palette: ["#FFF5E8", "#153A59", "#C92D35"], signals: ["节气", "地域", "文化", "传统", "城市", "乡村"], avoid: "避免春节模板感与过多吉祥纹样", promptStyle: "现代剪纸叠加艺术，手工纸纤维，多层景深，中国红与深蓝" },
  { id: "cyber", name: "赛博故障", short: "数字张力", category: "科技", keywords: ["人工智能", "霓虹", "错位", "未来"], fit: "AI、网络、数字化、未来冲突", direction: "故障只为表达系统冲突，不为给画面添一层廉价噪声。", composition: "核心对象被少量数据错位切分，标题保持稳定可读", texture: "数字扫描线、冷色霓虹、玻璃反射", palette: ["#08172A", "#2368A2", "#E43B4F"], signals: ["AI", "人工智能", "数字", "网络", "未来", "算法", "机器人"], avoid: "故障面积不超过画面三成，拒绝满屏代码雨", promptStyle: "克制赛博故障视觉，深蓝数字空间，中国红数据切片，电影级光影" },
  { id: "vaporwave", name: "蒸汽波", short: "镭射怀旧", category: "实验", keywords: ["荧光", "流体", "梦幻", "复古"], fit: "青年文化、趋势、互联网怀旧", direction: "用旧未来的梦幻感谈论技术与消费，适合轻盈而带反思的题目。", composition: "地平线透视与单一复古物件，渐变聚焦主标题", texture: "镭射虹彩、低保真噪点、80年代数字质感", palette: ["#201547", "#6AD4DD", "#F35B8F"], signals: ["青年", "潮流", "互联网", "消费", "怀旧", "趋势"], avoid: "严肃标准、事故与企业公告不使用", promptStyle: "高级蒸汽波视觉，低保真复古未来，虹彩渐变，克制梦幻" },
  { id: "op-art", name: "欧普艺术", short: "秩序错视", category: "实验", keywords: ["错觉", "几何", "节奏", "运动"], fit: "数据、周期、博弈、认知偏差", direction: "用严谨几何制造视觉运动，最适合表现循环、博弈与错觉。", composition: "规则线阵围绕标题安全区产生张力", texture: "高精度几何、黑白对比、局部红色节拍", palette: ["#FFFFFF", "#10253E", "#D22F3A"], signals: ["周期", "博弈", "变化", "错觉", "价格", "数据", "趋势"], avoid: "控制频率，避免摩尔纹与阅读眩晕", promptStyle: "欧普艺术几何错视，严谨黑白深蓝线阵，中国红节奏点" },
  { id: "light-overlay", name: "光感透气叠加", short: "氤氲通透", category: "科技", keywords: ["光感", "渐变", "透明", "氤氲"], fit: "新能源、医疗、科技愿景、精密材料", direction: "让光成为材料和技术的隐喻，轻盈但不空泛。", composition: "半透明层从主体边缘展开，中心保持清晰焦点", texture: "透光薄膜、玻璃、柔焦光晕", palette: ["#F4F8FB", "#315B7D", "#E45A5F"], signals: ["新能源", "医疗", "薄膜", "精密", "未来", "光", "洁净"], avoid: "避免彩色雾团铺满背景导致题目失焦", promptStyle: "半透明光感叠加，洁净渐变，薄膜与玻璃材质，空气感" },
  { id: "synesthetic-deconstruction", name: "通感解构", short: "拆解重组", category: "实验", keywords: ["解构", "反逻辑", "重组", "通感"], fit: "材料机理、认知颠覆、复杂议题", direction: "把熟悉之物拆开重组，迫使读者重新看见它的结构与意义。", composition: "对象沿工艺或逻辑路径分解，零件悬浮但秩序清楚", texture: "真实材质切片、理性阴影、局部异质拼接", palette: ["#EDEFF2", "#132E4B", "#BC3038"], signals: ["拆解", "机理", "本质", "重新", "颠覆", "结构", "材料"], avoid: "解构必须服务主题，不能变成无意义碎片", promptStyle: "通感化解构视觉，真实材质分解重组，理性空间，克制超现实" },
  { id: "memphis", name: "孟菲斯", short: "明快几何", category: "实验", keywords: ["明快", "几何", "趣味", "随机"], fit: "活动、科普、青年社群、轻知识", direction: "用鲜明形状降低知识门槛，适合轻内容，不适合沉重议题。", composition: "标题居中，几何符号在四周形成非对称平衡", texture: "平面色块、波形线条、细颗粒", palette: ["#FFF3E2", "#174A66", "#E74B42"], signals: ["活动", "青年", "科普", "入门", "社群", "创意"], avoid: "颜色不超过四种，严肃事故与标准解读慎用", promptStyle: "现代孟菲斯几何设计，明快但克制，非对称平衡，轻颗粒" },
  { id: "pop", name: "波普风格", short: "强烈传播", category: "插画", keywords: ["夸张", "写实", "高对比", "流行"], fit: "热点、冲突、人物、爆款观点", direction: "把冲突压缩成一个高能瞬间，适合需要强传播力的题目。", composition: "主体近景占画面六成，标题像报刊头条切入", texture: "丝网印刷网点、漫画墨线、强对比色块", palette: ["#F7E8C6", "#112B4A", "#D82932"], signals: ["热点", "大战", "为什么", "真相", "人物", "冲突", "涨价"], avoid: "夸张对象而非夸大事实，标题仍需准确", promptStyle: "高级波普编辑插画，丝网印刷网点，报刊冲突感，中国红深蓝" },
  { id: "steampunk", name: "蒸汽朋克", short: "机械怀旧", category: "工业", keywords: ["怀旧", "机械", "虚构", "蒸汽"], fit: "工业史、装备、百年企业、技术演进", direction: "让老机械与新技术同框，讲清工业文明如何一步步走来。", composition: "机械剖面与时代建筑形成纵深，标题留在烟雾亮区", texture: "黄铜、铆钉、旧钢、暖雾", palette: ["#E9DDC4", "#253647", "#A63A32"], signals: ["历史", "百年", "设备", "机械", "工业", "发展", "演进"], avoid: "不要把现代设备错误改成维多利亚机器", promptStyle: "克制蒸汽朋克工业史视觉，黄铜旧钢，机械剖面，电影暖雾" },
  { id: "maximalism", name: "极繁风格", short: "有序丰盛", category: "实验", keywords: ["华丽", "拼贴", "复杂", "大胆"], fit: "年度盘点、文化专题、多人物群像", direction: "复杂不等于混乱；用一个清晰中心统领丰富材料。", composition: "中心主题清晰，史料与图像围绕其形成层级拼贴", texture: "纸张拼贴、印刷错位、丰富但统一的图案", palette: ["#EFE1C6", "#122A44", "#C82F39"], signals: ["盘点", "群像", "年度", "全景", "百年", "文化"], avoid: "普通单议题不要硬塞十种素材", promptStyle: "编辑部极繁拼贴，有序层叠，历史纸张与现代网格，中国红深蓝" },
  { id: "cubism", name: "立体主义", short: "多面观察", category: "实验", keywords: ["多角度", "空间", "拼构", "形式"], fit: "多方博弈、人物、产业链、复杂关系", direction: "把同一对象的多个侧面放进一张图，适合没有单一答案的议题。", composition: "主体被分为数个视角平面，视线最终汇聚标题", texture: "纸板切面、矿物色块、结构线", palette: ["#E8E2D5", "#263B50", "#B63B35"], signals: ["多方", "产业链", "关系", "博弈", "人物", "选择", "市场"], avoid: "保留主体识别度，不做纯抽象色块", promptStyle: "现代立体主义编辑插画，多视角拼构，矿物色，结构清晰" },
  { id: "hyperreal", name: "超写实", short: "细节证据", category: "工业", keywords: ["写实", "细节", "精确", "场景"], fit: "材料、设备、企业、制造现场", direction: "当事实与工艺本身足够有力量，就让细节成为最可靠的主角。", composition: "材料或设备超近景，标题避开高频纹理区", texture: "真实金属、微观划痕、电影级侧光", palette: ["#EDF0F2", "#18324C", "#BF3038"], signals: ["材料", "设备", "企业", "工厂", "制造", "不锈钢", "产品"], avoid: "企业、设备与人物必须依据真实参考图，禁止杜撰", promptStyle: "工业超写实摄影，真实金属细节，冷峻侧光，高精度材质" },
  { id: "three-d-solid", name: "三维纯色渲染", short: "仪式空间", category: "科技", keywords: ["纯色", "三维", "空间", "仪式"], fit: "概念解释、材料科普、技术模块", direction: "用统一色系把复杂物件压缩成清晰概念，像一座可读的模型。", composition: "对象模块化陈列，层级沿横向展开", texture: "哑光三维材质、柔和体积光、干净阴影", palette: ["#E9F0F4", "#204E70", "#C83A42"], signals: ["概念", "模块", "技术", "结构", "科普", "工具"], avoid: "不要做成电商塑料玩具质感", promptStyle: "三维纯色概念渲染，哑光材质，模块化空间，克制体积光" },
  { id: "mbe", name: "MBE插画", short: "轻巧科普", category: "插画", keywords: ["卡通", "扁平", "粗线", "少色"], fit: "入门科普、工具教程、流程说明", direction: "把门槛降下来，但不把专业内容画成儿童读物。", composition: "三个以内的核心图形组成流程，标题占独立区域", texture: "粗细有度的断线、少量溢色色块", palette: ["#FFF7E9", "#164767", "#E54A42"], signals: ["入门", "教程", "工具", "流程", "三分钟", "看懂", "科普"], avoid: "严肃人物与事故议题不使用", promptStyle: "精致MBE科普插画，断线粗描边，三色以内，清楚友好" },
  { id: "heavy-industrial", name: "重工业风格", short: "钢铁有骨", category: "工业", keywords: ["工业", "粗粝", "力量", "冷峻"], fit: "钢铁、装备、制造、产业竞争", direction: "以钢铁现场的真实力量托住观点，最贴合材料与制造业内容。", composition: "钢卷、设备或厂房形成强透视，标题落在干净暗部", texture: "拉丝金属、氧化痕迹、焊火与冷光", palette: ["#E8EDF1", "#0A2947", "#C72F37"], signals: ["钢铁", "不锈钢", "材料", "工厂", "制造", "装备", "产能", "青拓", "太钢"], avoid: "拒绝黑金模板与无来源钢厂照片，粗粝不等于脏乱", promptStyle: "高端重工业编辑摄影，真实不锈钢材质，深蓝冷光，中国红点睛，力量感" },
  { id: "pixel", name: "像素风格", short: "数字颗粒", category: "插画", keywords: ["像素", "轮廓", "卡通", "复古"], fit: "软件、游戏、数字工具、怀旧科技", direction: "用低分辨率语言讲数字世界，适合轻量工具与网络文化。", composition: "像素对象居中，标题与对象保持八像素以上安全距", texture: "硬边像素块、有限色板、无抗锯齿轮廓", palette: ["#E8F0F2", "#113452", "#D33A43"], signals: ["软件", "游戏", "数字", "工具", "程序", "网络"], avoid: "材料实拍、企业人物与严肃标准慎用", promptStyle: "精致像素艺术，有限色板，清晰轮廓，现代编辑构图" },
  { id: "gothic", name: "哥特风格", short: "暗黑寓言", category: "实验", keywords: ["高耸", "神秘", "阴影", "复杂"], fit: "风险、灾难史、黑色寓言、悬疑", direction: "用纵向压迫与暗部讲风险，必须克制，不能消费真实灾难。", composition: "高耸结构与小尺度人物形成压迫对比", texture: "石材、铁艺、长阴影、雾", palette: ["#E9E6E0", "#111D2A", "#812A31"], signals: ["灾难", "风险", "崩塌", "危机", "事故", "悬疑"], avoid: "真实事故报道避免猎奇化，不使用血腥符号", promptStyle: "克制哥特式暗黑寓言，高耸工业结构，深长阴影，严肃编辑摄影" },
];

const categoryRules: Array<{ category: CoverArticleProfile["category"]; label: string; keywords: string[]; preferred: string[] }> = [
  { category: "industrial", label: "材料与制造", keywords: ["不锈钢", "钢铁", "材料", "钢卷", "工厂", "制造", "装备", "产能", "牌号", "轧制", "焊接"], preferred: ["heavy-industrial", "hyperreal", "modern-chinese", "minimal-information"] },
  { category: "science", label: "技术与标准", keywords: ["标准", "腐蚀", "性能", "工艺", "机理", "实验", "成分", "公差", "测试", "技术"], preferred: ["minimal-information", "apple", "low-poly", "three-d-solid"] },
  { category: "technology", label: "数字与未来", keywords: ["AI", "人工智能", "算法", "模型", "数字", "软件", "芯片", "机器人", "智能"], preferred: ["apple", "cyber", "light-overlay", "low-poly"] },
  { category: "culture", label: "历史与地域", keywords: ["历史", "百年", "中国", "江南", "城市", "传统", "文化", "古城", "地域"], preferred: ["modern-chinese", "classical-chinese", "paper-cut", "maximalism"] },
  { category: "business", label: "产业与商业", keywords: ["企业", "价格", "成本", "市场", "商业", "贸易", "客户", "品牌", "竞争", "供应链"], preferred: ["minimal-information", "modern-chinese", "heavy-industrial", "cubism"] },
  { category: "people", label: "人物与故事", keywords: ["人物", "其人", "创始人", "老板", "工匠", "员工", "家族", "故事"], preferred: ["hyperreal", "modern-chinese", "pop", "nod"] },
  { category: "youth", label: "青年与轻知识", keywords: ["青年", "入门", "教程", "活动", "社群", "游戏", "潮流", "三分钟"], preferred: ["mbe", "memphis", "pop", "pixel"] },
];

export const coverStyleCategories: Array<"全部" | CoverStyleCategory> = ["全部", "极简", "中国", "科技", "实验", "插画", "工业"];

type EnterpriseRecord = {
  canonicalName: string;
  aliases: string[];
  officialDomains?: string[];
};

export type CompanyResolution = {
  canonicalName: string;
  matchedText: string;
  confidence: "high" | "medium";
  reason: string;
  officialDomains: string[];
};

const enterpriseRecords: EnterpriseRecord[] = [
  {
    canonicalName: "中国天辰工程有限公司",
    aliases: ["中国化学天辰公司", "中国天辰", "CNCEC-TCC"],
    officialDomains: ["china-tcc.com"],
  },
  ...[
    "阿法拉伐", "奥托昆普", "华生精密", "泰来华顿", "兰石重装", "上海实达", "宝武", "青拓", "太钢", "酒钢", "首钢", "浦项", "森松", "中集", "天华院", "烨贸", "查特", "VDM",
  ].map((name) => ({ canonicalName: name, aliases: [name] })),
];

const enterpriseAliases = enterpriseRecords
  .flatMap((record) => record.aliases.map((alias) => ({ alias, record })))
  .sort((a, b) => b.alias.length - a.alias.length);

function cleanCompanyCandidate(value: string) {
  return value
    .replace(/^[#>*\-\s\d.、一二三四五六七八九十]+/, "")
    .replace(/[“”‘’《》【】\[\]（）()]/g, "")
    .trim();
}

function recordForCompany(value: string) {
  return enterpriseRecords.find((record) => record.canonicalName === value || record.aliases.includes(value));
}

function isPlausibleLegalEntity(value: string) {
  if (value.length < 4 || value.length > 36) return false;
  return !/(?:是把|理解成|看作|作为|属于|所谓|一家|很多|我们|他们|它|这个|那个|某个)/.test(value);
}

export function resolveCompanyEntity(title: string, markdown: string): CompanyResolution | null {
  const cleanedTitle = cleanCompanyCandidate(title);
  const knownInTitle = enterpriseAliases.find(({ alias }) => cleanedTitle.includes(alias));
  if (knownInTitle) {
    return {
      canonicalName: knownInTitle.record.canonicalName,
      matchedText: knownInTitle.alias,
      confidence: "high",
      reason: "标题命中企业别名表",
      officialDomains: knownInTitle.record.officialDomains ?? [],
    };
  }

  const legalEntityPattern = /([A-Za-z0-9\u3400-\u9fff·]{2,28}?(?:有限责任公司|股份有限公司|有限公司|集团公司|控股集团|集团|研究院|设计院))/;
  const legalInTitle = cleanedTitle.match(legalEntityPattern)?.[1];
  if (legalInTitle && isPlausibleLegalEntity(legalInTitle)) {
    const record = recordForCompany(legalInTitle);
    return {
      canonicalName: record?.canonicalName ?? legalInTitle,
      matchedText: legalInTitle,
      confidence: "high",
      reason: "标题包含完整企业名称",
      officialDomains: record?.officialDomains ?? [],
    };
  }

  const lines = markdown.split(/\r?\n/).map(cleanCompanyCandidate).filter(Boolean).slice(0, 80);
  for (const line of lines) {
    const structured = line.match(/^(?:企业主体|公司名称|企业名称|品牌主体|主体)\s*[：:]\s*(.+)$/)?.[1];
    const fullLineEntity = line.match(new RegExp(`^${legalEntityPattern.source}$`))?.[1];
    const candidate = cleanCompanyCandidate(structured ?? fullLineEntity ?? "");
    if (!candidate || !isPlausibleLegalEntity(candidate)) continue;
    const record = recordForCompany(candidate);
    return {
      canonicalName: record?.canonicalName ?? candidate,
      matchedText: candidate,
      confidence: "high",
      reason: structured ? "结构化企业主体字段" : "正文独立企业全称行",
      officialDomains: record?.officialDomains ?? [],
    };
  }

  // A brand-led headline normally declares the subject with a colon. Commas and
  // dashes are editorial punctuation, so treating everything before them as a
  // company turns industry headlines such as “不锈钢8月排产创历史新高，…” into
  // imaginary enterprises.
  const titlePrefix = cleanCompanyCandidate(title.split(/[：:｜|]/)[0] ?? "");
  const hasEnterpriseContext = /公司|集团|企业|上市|股份|成立于|总部|创始人|董事长|产能|工厂|主营|营收/.test(markdown);
  const genericIndustryPrefix = /中国|行业|贸易商|企业|市场|未来|为什么|如何|真相|标准|不锈钢|钢铁|钢厂|排产|产量|价格|成本|利润|供需|库存|月份|季度|创新高|新高|同比|环比|\d{1,4}(?:年|月|季度)?/;
  const looksLikeNamedEntity = titlePrefix.length >= 2 && titlePrefix.length <= 12 && !genericIndustryPrefix.test(titlePrefix);
  return hasEnterpriseContext && looksLikeNamedEntity ? {
    canonicalName: titlePrefix,
    matchedText: titlePrefix,
    confidence: "medium",
    reason: "标题前缀推断，生成前仍需人工确认",
    officialDomains: [],
  } : null;
}

export function detectCompanyName(title: string, markdown: string) {
  return resolveCompanyEntity(title, markdown)?.canonicalName ?? null;
}

export function analyzeCoverContent(title: string, markdown: string): CoverArticleProfile {
  const text = `${title}\n${markdown}`.toLowerCase();
  const ranked = categoryRules.map((rule) => ({ ...rule, matched: rule.keywords.filter((word) => text.includes(word.toLowerCase())) }))
    .sort((a, b) => b.matched.length - a.matched.length);
  const primary = ranked[0];
  const subject = primary && primary.matched.length ? primary.label : "深度观点";
  const tone = /危机|崩塌|事故|真相|大战|困境|焦虑/.test(text) ? "冷静辨析" : /历史|百年|传统|故事/.test(text) ? "叙事沉淀" : /ai|人工智能|数字|未来|技术/.test(text) ? "科技理性" : /钢铁|不锈钢|材料|制造|工业/.test(text) ? "工业理性" : "克制判断";
  const intent = /\?|？|为什么|真相|能否|是否/.test(title) ? "问题拆解" : /对比|vs|替代|不如|区别/i.test(title) ? "对比判断" : /标准|牌号|性能|工艺|机理/.test(text) ? "知识解释" : /人物|其人|创始人|家族|故事/.test(text) ? "人物叙事" : "观点传播";
  const company = resolveCompanyEntity(title, markdown);
  return {
    subject,
    tone,
    intent,
    signals: primary?.matched.slice(0, 4) ?? [],
    companyName: company?.canonicalName ?? null,
    companyConfidence: company?.confidence ?? null,
    companyReason: company?.reason ?? null,
    officialDomains: company?.officialDomains ?? [],
    // Medium confidence is only a suggestion for the editor. It must never
    // activate the Logo workflow until a human confirms the entity.
    isEnterprise: company?.confidence === "high",
    category: primary?.matched.length ? primary.category : "general",
  };
}

export function recommendCoverStyles(title: string, markdown: string): CoverRecommendation[] {
  const profile = analyzeCoverContent(title, markdown);
  const text = `${title}\n${markdown}`.toLowerCase();
  const preferred = categoryRules.find((rule) => rule.category === profile.category)?.preferred ?? ["minimal-information", "modern-chinese", "hyperreal"];
  return coverStyles.map((style) => {
    const preferredIndex = preferred.indexOf(style.id);
    const signalHits = style.signals.filter((signal) => text.includes(signal.toLowerCase())).length;
    const brandFit = ["minimal-information", "modern-chinese", "heavy-industrial", "hyperreal"].includes(style.id) ? 3 : 0;
    const score = Math.min(97, 69 + (preferredIndex >= 0 ? 18 - preferredIndex * 3 : 0) + signalHits * 3 + brandFit);
    const reason = `${profile.subject}需要${profile.tone}的视觉语气；${style.name}能以${style.short}突出“${title === "未命名文章" ? "文章主命题" : title.slice(0, 22)}${title.length > 22 ? "…" : ""}”。`;
    return { style, score, reason };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
}

const protocolByCategory: Record<CoverStyleCategory, Pick<CoverPromptProtocol, "template" | "styleTags" | "shotLanguage" | "hierarchy">> = {
  极简: {
    template: "概念字体海报 / Editorial Typography Poster",
    styleTags: ["编辑排版", "大字主导", "智能留白", "单一证据物"],
    shotLanguage: "平视或轻微俯视，50—85mm 的克制透视；只保留一枚证据型局部，背景安静，不做满屏场景。",
    hierarchy: "主标题约占视觉权重 45%，唯一主视觉约 35%，其余为空气与安全区；阅读顺序必须是标题→主视觉→署名。",
  },
  中国: {
    template: "现代东方编辑封面 / Contemporary Chinese Editorial",
    styleTags: ["水墨留白", "现代网格", "纸纤维", "克制印色"],
    shotLanguage: "横向长卷式景深，以前景引线、中景主体、远景余韵形成三层空间；东方意象只保留一种。",
    hierarchy: "主标题占 40%，东方主意象占 35%，留白占 25%；古意负责气韵，现代网格负责秩序。",
  },
  科技: {
    template: "科学概念海报 / Precision Technology Visual",
    styleTags: ["精密材质", "柔光棚拍", "科学可视化", "清洁网格"],
    shotLanguage: "50—90mm 棚拍或微距视角，控制高光并保留材料细节；数据线只承担解释，不承担装饰。",
    hierarchy: "标题与精密主体各占约 40%，辅助结构不超过 20%；先看命题，再看技术证据。",
  },
  实验: {
    template: "概念字体海报 / Experimental Editorial Poster",
    styleTags: ["概念排版", "受控解构", "视觉节奏", "高辨识留白"],
    shotLanguage: "平面编辑视角，允许局部错位、切片或视错觉，但实验效果覆盖不超过画面 30%，标题区域绝对稳定。",
    hierarchy: "标题占 42%，概念装置占 38%，实验纹理不超过 20%；新奇必须服从识别与事实。",
  },
  插画: {
    template: "原创编辑插画海报 / Original Editorial Illustration",
    styleTags: ["原创角色", "单一隐喻", "平面叙事", "印刷颗粒"],
    shotLanguage: "使用一个人物或物件关系完成叙事，近景或中景，不做群像拼盘；造型语言必须原创，不模仿在世艺术家。",
    hierarchy: "标题约 40%，叙事主体约 45%，其余为呼吸与署名；三秒内应读懂冲突，但不夸大事实。",
  },
  工业: {
    template: "工业编辑摄影 / Industrial Editorial Photography",
    styleTags: ["真实材料", "电影侧光", "制造现场", "证据细节"],
    shotLanguage: "35—70mm 低机位或超近景，使用侧逆光刻画真实金属纹理；设备、工厂与产品必须依据参考图。",
    hierarchy: "标题约占 38%，真实工业主体约占 47%，环境与品牌信息不超过 15%；力量来自尺度与材质，不来自特效。",
  },
};

function selectVisualMetaphor(title: string, profile: CoverArticleProfile) {
  const text = `${title} ${profile.signals.join(" ")}`;
  if (/价格|成本|低价|降价|涨价|利润/.test(text)) return "一条精确的价格刻度压过材料截面：用尺度差表达利润空间被挤压，不使用金币、钞票或下跌箭头。";
  if (/竞争|大战|打不过|守住|替代|博弈/.test(text)) return "同一材质表面出现两套尺度与加工精度的张力：用制造逻辑的差异表现竞争，不使用拳头、战火或棋盘。";
  if (/未来|转型|还能|是否|机会|变化/.test(text)) return "唯一主体从受限暗部进入分岔亮区：表现旧路径收窄、新能力打开，不使用俗套上升箭头。";
  if (/标准|牌号|性能|工艺|精度|公差|机理/.test(text)) return "卡尺、刻度或材料剖面只保留一种，让被测量的细节成为事实证据。";
  if (/历史|百年|传统|演进/.test(text)) return "同一工业对象由档案纸纹平滑过渡到当代真实材质，时间只发生一次，不做年代素材拼盘。";
  if (profile.category === "people") return "以经核验的人物肖像和一件职业物证形成安静对视，人物神态承担叙事，不制造戏剧动作。";
  if (profile.category === "industrial") return "一枚真实材料或设备局部被精准光线切开，截面与表面共同回答标题中的判断。";
  return "一个与文章主命题直接相关的实物形成唯一视觉锚点，借尺度、方向或留白制造问题感，不添加泛化符号。";
}

export function buildCoverProtocol(style: CoverStyle, title: string, profile: CoverArticleProfile, companyName: string | null = profile.companyConfidence === "high" ? profile.companyName : null): CoverPromptProtocol {
  const base = protocolByCategory[style.category];
  const visualAnchor = companyName
    ? `${companyName}官网或认证公众号中的真实厂房、设备、产品影像，只选择其中一个作为主锚点`
    : profile.category === "people"
      ? "经可靠来源核验的人物肖像，配一件能说明其身份的职业物证"
      : `${profile.subject}中最能证明文章判断的一件真实对象或材料局部`;
  const referencePolicy = companyName
    ? `先从${companyName}官网或认证公众号复制当前 Logo 图片为本地素材；文件未取得就停止，取得后只把原图作为独立图层合成，禁止模型重画。`
    : profile.category === "people"
      ? "真实人物必须使用可核验肖像参考；无法确认身份时改用不指向具体人物的物证，不虚构面孔。"
      : "不使用来源不明的品牌、人物或专有产品外观；事实型对象优先依据可靠参考，概念部分只负责表达关系。";
  return {
    ...base,
    sceneTags: Array.from(new Set([profile.subject, profile.tone, profile.intent, ...profile.signals])).slice(0, 6),
    visualAnchor,
    visualMetaphor: selectVisualMetaphor(title, profile),
    referencePolicy,
    negativeLock: [
      "只交付一张完成封面，不要 moodboard、样机、设计说明、过程图、四宫格或方案板",
      "不要乱码、伪中文、占位字、第二主标题、无关英文或正文摘要",
      "不要素材堆砌、随机图标、无意义粒子、廉价蓝光、塑料 3D、过度光晕",
      "不要把标题贴在现成照片上；标题必须参与构图并保持最高识别度",
      style.avoid,
    ],
  };
}

export function buildCoverHarness(title: string, companyName: string | null) {
  const resolvedTitle = title === "未命名文章" ? "" : normalizeCoverOcrText(title);
  const companyRecord = companyName ? recordForCompany(companyName) : undefined;
  return {
    workflowVersion: "6.0",
    rule: "FINAL_FILE_ONLY",
    company: {
      company: companyName,
      officialDomainHints: companyRecord?.officialDomains ?? [],
    },
    steps: companyName ? [
      "开始前确认具备联网取 Logo、生无字底图和 Canvas / Sharp / ImageMagick 精确合成能力；缺一项就停止",
      "取得官方 Logo 原图并生成无字底图后，用确定性工具原样放 Logo、逐字排印标题与署名",
      "核验尺寸和锁定文字，只交付 final-cover.png；中间底图不得作为完成结果返回",
    ] : [
      "开始前确认具备生无字底图和 Canvas / Sharp / ImageMagick 精确合成能力；缺一项就停止",
      "生成无字底图后，用确定性工具逐字排印锁定标题与署名，图像模型不负责写字",
      "核验尺寸和锁定文字，只交付 final-cover.png；中间底图不得作为完成结果返回",
    ],
    requiredAssets: companyName ? ["BACKGROUND_IMAGE", "OFFICIAL_LOGO_IMAGE"] : ["BACKGROUND_IMAGE"],
    requiredCapabilities: companyName ? ["WEB_RETRIEVAL", "IMAGE_GENERATION", "DETERMINISTIC_COMPOSITOR", "FILE_ATTACHMENT"] : ["IMAGE_GENERATION", "DETERMINISTIC_COMPOSITOR", "FILE_ATTACHMENT"],
    stateMachine: ["PRECHECK", "ASSETS_READY", "BACKGROUND_READY", "COMPOSED", "VERIFIED", "DELIVERED"],
    respondOnlyWhen: "VERIFIED_FINAL_COVER_PNG_EXISTS",
    stopWhen: "ANY_REQUIRED_CAPABILITY_OR_ASSET_MISSING",
    finalization: "DETERMINISTIC_COMPOSITE_THEN_VERIFY",
    lockedText: {
      title: resolvedTitle || "缺少标题",
      signature: coverSignature,
    },
  };
}

export function buildCoverPrompt(style: CoverStyle, title: string, profile: CoverArticleProfile, companyName: string | null = profile.companyConfidence === "high" ? profile.companyName : null) {
  const resolvedTitle = title === "未命名文章" ? "" : title.trim();
  const protocol = buildCoverProtocol(style, title, profile, companyName);
  const officialDomains = companyName ? recordForCompany(companyName)?.officialDomains ?? profile.officialDomains : [];
  const brandSteps = companyName ? [
    "【阶段 1｜先取得官方 Logo 原图】",
    `企业：${companyName}`,
    ...(officialDomains.length ? [`官网线索：${officialDomains.join("、")}`] : []),
    `1. 打开${companyName}官方网站，下载当前页面实际使用的 Logo 图片；官网没有可用图片时，再从该企业认证微信公众号头像、菜单页或官方文章页取得。`,
    "2. 必须先确认真实 PNG、SVG、WebP 或 JPG 文件已存在于附件或本地路径。网页链接、企业名称、文字描述和搜索缩略图都不算取得文件。",
    "3. 不得让图像模型猜、画、描摹或仿制 Logo；不得用百科、自媒体、素材站或搜索结果缩略图代替官方文件。",
    "4. 找不到官方 Logo 原图时立即停止，只回复“未取得官方 Logo 文件，请用户上传”；不得生成底图或伪造封面。",
    "5. 记录 Logo 官方来源网址，最终随成品附一行来源供用户复核。",
  ] : [
    "【阶段 1｜Logo 判断】",
    "文章未识别到具体企业主体：本封面不放企业 Logo，也不得凭空创造品牌标志。",
    "行业、品类、月份、排产、价格、产量与问题句都不是企业名称；不得把标题片段当企业，不得自行搜索同名公司或补放 Logo。",
  ];

  return [
    "【微信公众号成品封面任务｜Final Cover V6】",
    "你是同时具备素材检索、生图与确定性排版能力的制作 Agent。最终只交付一张完成封面 PNG；无字底图只是内部中间文件，禁止把它作为结果返回。",
    "【开始前能力门禁｜先检查，再调用任何生图工具】",
    companyName
      ? "必须同时具备：联网取得官方 Logo 原图、生成无字底图、使用 Canvas / SVG / Sharp / ImageMagick 精确合成、附加最终 PNG 文件四项能力。"
      : "必须同时具备：生成无字底图、使用 Canvas / SVG / Sharp / ImageMagick 精确合成、附加最终 PNG 文件三项能力。",
    "缺少任何一项能力时，立即停止并说明“当前环境无法完成确定性封面合成”；此时禁止先生成或返回底图。不得把本任务直接交给只会生图、不会代码合成的模型。",
    ...brandSteps,
    "【阶段 2｜生成内部无字底图】",
    "生成一张 2350×1000、2.35:1 的微信公众号横幅底图。底图中禁止出现标题、署名、Logo、占位框、乱码、伪中文和任何文字。",
    companyName
      ? "左侧约 58% 保持低纹理、可读的标题安全区；右上保留 Logo 安全区；右下保留署名安全区。只设计光影、材质和主体关系，不画边框或文字占位符。"
      : "左侧约 58% 保持低纹理、可读的标题安全区；右上不预留也不放置 Logo，右下保留署名安全区。只设计光影、材质和主体关系，不画边框或文字占位符。",
    "这张底图是内部临时资产：不得在回复中单独展示、附加或称为完成封面。",
    "【画面设计】",
    `内容画像：${profile.subject} / ${profile.tone} / ${profile.intent}。`,
    `风格：${protocol.template}；${style.promptStyle}。`,
    `画面主体：${protocol.visualAnchor}。`,
    `表达方式：${protocol.visualMetaphor}`,
    `构图：${style.composition}。`,
    `材质与光线：${style.texture}。`,
    `主色：${style.palette.join("、")}，整体最多三种主色。`,
    "【阶段 3｜确定性代码合成】",
    resolvedTitle ? `主标题：“${resolvedTitle}”` : "缺少主标题：停止任务并向用户索取，不得自拟。",
    `固定署名：“${coverSignature}”`,
    "必须在生图结束后继续执行代码合成，不能停在底图阶段。使用 Canvas、SVG、Sharp、ImageMagick 或等价确定性工具将文字叠加到底图；图像模型不得书写标题和署名。",
    "画布固定为 2350×1000。标题放在左侧低纹理安全区，使用清晰中文编辑字体，按语义分为 2—3 行；不得改字、删字、换词、截断或另加副标题。",
    `右下角固定排印“${coverSignature}”，保持一行；必须逐字读取字符串，禁止凭记忆输入，“淼”不得替换为“森”或其他形近字。`,
    companyName ? "将已取得的官方 Logo 原图作为独立图层放在右上安全区，只允许等比缩放与裁去透明空边，不换色、不变形、不描边、不重绘。" : "画面中不得出现任何企业 Logo。",
    "【阶段 4｜成品验证与原子交付】",
    "1. 确认最终文件真实存在，文件名为 final-cover.png，像素必须为 2350×1000。",
    resolvedTitle ? `2. 最终画面主标题逐字等于“${resolvedTitle}”，全图只出现这一处主标题。` : "2. 主标题已经补齐并逐字核验。",
    `3. 右下角逐字等于“${coverSignature}”，保持一行，没有“唐森”等错字。`,
    companyName ? `4. Logo 确为${companyName}官方原图，图形、标准色和比例未被修改。` : "4. 画面没有企业 Logo。",
    "5. 不含乱码、无关英文、占位字、样机、界面、设计说明、过程板、四宫格或中间底图。",
    "只有以上全部通过，才允许回复。最终回复只附 final-cover.png；企业稿另附一行 Logo 官方来源网址。只返回底图、只描述排版步骤或声称稍后合成都属于任务失败。",
  ].join("\n");
}
