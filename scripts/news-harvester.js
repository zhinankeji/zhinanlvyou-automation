/**
 * 指南帮旅游 - AI 信息采集器 V2.0
 *
 * 职责：
 * 1. 维护海南景点动态数据库（开放时间、票价变化）
 * 2. 跟踪搜索趋势，调整关键词优先级
 * 3. 检测热点事件（新景点、新政策、季节性活动）
 * 4. 输出"新闻摘要"供内容管线使用
 *
 * 用法: node scripts/news-harvester.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const LOG_DIR = path.join(ROOT, "logs");

// ======== 内置景点知识库 ========
// 核心数据：后续可通过网络采集更新
const ATTRACTIONS_DB = {
  zh: [
    {
      name: "亚龙湾",
      dest: "三亚",
      type: "海滩",
      desc: "被誉为'天下第一湾'，7公里银色沙滩",
      tips: ["建议上午去，人少景美", "免费进入，水上项目另收费"],
      season: "全年皆宜，10月-4月最佳",
      ticketInfo: "免费（部分区域收费）",
      hot: true
    },
    {
      name: "蜈支洲岛",
      dest: "三亚",
      type: "岛屿",
      desc: "著名潜水胜地，被誉为'中国马尔代夫'",
      tips: ["上岛需乘船，20分钟航程", "建议安排一天时间"],
      season: "全年",
      ticketInfo: "门票+船票 ¥144起",
      hot: true
    },
    {
      name: "南山寺",
      dest: "三亚",
      type: "文化",
      desc: "108米南海观音像坐落于此",
      tips: ["建议半天时间", "素食餐厅值得尝试"],
      season: "全年",
      ticketInfo: "门票 ¥129",
      hot: true
    },
    {
      name: "大小洞天",
      dest: "三亚",
      type: "景点",
      desc: "三亚历史最悠久的风景名胜区",
      tips: ["适合拍照打卡", "有婚拍基地"],
      season: "全年",
      ticketInfo: "门票约¥90",
      hot: false
    },
    {
      name: "天涯海角",
      dest: "三亚",
      type: "景点",
      desc: "三亚标志性景点",
      tips: ["适合情侣打卡"],
      season: "全年",
      ticketInfo: "门票约¥81",
      hot: false
    },
    {
      name: "三亚国际免税城",
      dest: "三亚",
      type: "购物",
      desc: "亚洲最大单体免税店",
      tips: ["离岛需提前6小时购物", "每人每年限额10万"],
      season: "全年",
      ticketInfo: "免费进入",
      hot: true
    },
    {
      name: "呀诺达雨林",
      dest: "三亚",
      type: "雨林",
      desc: "5A级热带雨林景区",
      tips: ["穿运动鞋", "带防蚊液"],
      season: "全年",
      ticketInfo: "门票约¥168",
      hot: false
    },
    {
      name: "分界洲岛",
      dest: "陵水",
      type: "岛屿",
      desc: "海南最佳潜水点之一",
      tips: ["水清沙细", "海洋剧场值得看"],
      season: "全年",
      ticketInfo: "门票+船票约¥132",
      hot: false
    },
    {
      name: "文昌航天发射中心",
      dest: "文昌",
      type: "科技",
      desc: "中国最新航天发射基地",
      tips: ["有发射任务时限制参观", "科普中心全年开放"],
      season: "全年",
      ticketInfo: "科普中心约¥50",
      hot: false
    },
    {
      name: "博鳌亚洲论坛会址",
      dest: "琼海",
      type: "文化",
      desc: "博鳌亚洲论坛永久会址",
      tips: ["参观约1-2小时", "每年3-4月论坛期间不开放"],
      season: "全年",
      ticketInfo: "门票约¥128",
      hot: false
    },
    {
      name: "日月湾",
      dest: "万宁",
      type: "海滩",
      desc: "世界级冲浪胜地",
      tips: ["每年10月-3月浪最好", "适合初学者"],
      season: "10月-3月最佳",
      ticketInfo: "免费",
      hot: true
    },
    {
      name: "东坡书院",
      dest: "儋州",
      type: "文化",
      desc: "苏东坡贬谪儋州时的讲学场所",
      tips: ["了解东坡文化", "适合文化爱好者"],
      season: "全年",
      ticketInfo: "门票约¥20",
      hot: false
    }
  ],
  en: [
    { name: "Yalong Bay", dest: "Sanya", type: "Beach", desc: "Known as 'Number One Bay Under Heaven', 7km silver sand beach", tips: ["Go in the morning", "Free entry"], season: "Year-round", hot: true },
    { name: "Wuzhizhou Island", dest: "Sanya", type: "Island", desc: "Famous diving spot known as 'China's Maldives'", tips: ["20-min ferry ride", "Full day recommended"], season: "Year-round", ticketInfo: "¥144 incl. ferry", hot: true },
    { name: "Nanshan Temple", dest: "Sanya", type: "Culture", desc: "Home to the 108m Guanyin Statue", tips: ["Half day recommended"], season: "Year-round", ticketInfo: "¥129", hot: true },
    { name: "Sanya Int'l Duty Free", dest: "Sanya", type: "Shopping", desc: "Asia's largest standalone duty-free mall", tips: ["Shop 6hrs before departure", "¥100k annual limit"], season: "Year-round", hot: true },
    { name: "Riyue Bay", dest: "Wanning", type: "Beach", desc: "World-class surfing destination", tips: ["Best waves Oct-Mar"], season: "Oct-Mar best", ticketInfo: "Free", hot: true }
  ]
};

// ======== 季节性事件 ========
const SEASONAL_EVENTS = [
  { month: 1, event: "元旦假期旅游高峰", keyword: "元旦旅游", lang: "zh" },
  { month: 2, event: "春节黄金周海南旅游高峰", keyword: "春节旅游", lang: "zh" },
  { month: 3, event: "博鳌亚洲论坛", keyword: "博鳌论坛", lang: "zh" },
  { month: 4, event: "海南黎族苗族三月三", keyword: "三月三", lang: "zh" },
  { month: 5, event: "五一假期", keyword: "五一旅游", lang: "zh" },
  { month: 6, event: "端午假期+三亚雨季开始", keyword: "端午旅游", lang: "zh" },
  { month: 7, event: "暑假海南亲子游旺季", keyword: "海南亲子游", lang: "zh" },
  { month: 8, event: "暑假高峰+文昌航天发射", keyword: "航天发射", lang: "zh" },
  { month: 9, event: "开学季旅游淡季", keyword: "错峰旅游", lang: "zh" },
  { month: 10, event: "国庆黄金周", keyword: "国庆旅游", lang: "zh" },
  { month: 11, event: "海南欢乐节", keyword: "海南欢乐节", lang: "zh" },
  { month: 12, event: "跨年+冬季避寒旺季", keyword: "冬季旅游", lang: "zh" },
  { month: 1, event: "New Year travel peak", keyword: "New Year Hainan", lang: "en" },
  { month: 2, event: "Chinese New Year peak", keyword: "Chinese New Year Hainan", lang: "en" },
  { month: 7, event: "Summer vacation family travel", keyword: "Hainan family travel", lang: "en" },
  { month: 10, event: "National Day Golden Week", keyword: "China National Day Hainan", lang: "en" },
  { month: 12, event: "Winter escape peak season", keyword: "Hainan winter travel", lang: "en" }
];

// ======== 搜索趋势模拟 ========
// 真实场景下应接入 Google Trends API / 百度指数
// 当前使用内置趋势数据 + 季节性加权
function getTrendingKeywords() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const trends = [];

  // 基础热门关键词
  const baseKeywords = {
    zh: [
      { keyword: "海南旅游", baseHot: 85, seasonal: true },
      { keyword: "三亚旅游", baseHot: 80, seasonal: true },
      { keyword: "海南自由行", baseHot: 70, seasonal: true },
      { keyword: "海南机票", baseHot: 65, seasonal: true },
      { keyword: "海南酒店", baseHot: 60, seasonal: true },
      { keyword: "三亚免税店", baseHot: 55, seasonal: false },
      { keyword: "海南海滩", baseHot: 50, seasonal: true },
      { keyword: "海南亲子游", baseHot: 40, seasonal: true },
      { keyword: "三亚美食", baseHot: 45, seasonal: false },
      { keyword: "海南避坑", baseHot: 35, seasonal: false }
    ],
    en: [
      { keyword: "Hainan travel", baseHot: 75, seasonal: true },
      { keyword: "Sanya travel", baseHot: 70, seasonal: true },
      { keyword: "Hainan beaches", baseHot: 60, seasonal: true },
      { keyword: "Sanya hotels", baseHot: 55, seasonal: true },
      { keyword: "Hainan family vacation", baseHot: 45, seasonal: true },
      { keyword: "Sanya duty free", baseHot: 50, seasonal: false }
    ]
  };

  // 冬季（11月-3月）热门上升
  const winterBoost = (month >= 11 || month <= 3) ? 1.3 : 1.0;
  // 暑假（7月-8月）
  const summerBoost = (month >= 7 && month <= 8) ? 1.2 : 1.0;
  // 节假日旺季
  const holidayBoost = ([1, 2, 5, 10].includes(month)) ? 1.4 : 1.0;

  const seasonFactor = Math.max(winterBoost, summerBoost, holidayBoost);

  for (const [lang, kws] of Object.entries(baseKeywords)) {
    for (const kw of kws) {
      const hot = Math.min(100, Math.round(kw.baseHot * (kw.seasonal ? seasonFactor : 1.0)));
      trends.push({ keyword: kw.keyword, hot, lang, source: "internal" });
    }
  }

  // 季节性事件关键词
  for (const ev of SEASONAL_EVENTS) {
    if (ev.month === month) {
      trends.push({ keyword: ev.keyword, hot: 90, lang: ev.lang, source: "seasonal" });
    }
  }

  // 按热度排序
  return trends.sort((a, b) => b.hot - a.hot);
}

// ======== 生成今日新闻摘要 ========
function generateDigest() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dateStr = now.toISOString().split("T")[0];

  // 根据季节推荐目的地
  let recommendedDests = [];
  if (month >= 11 || month <= 3) {
    recommendedDests = ["三亚", "陵水"]; // 冬季推荐暖和的地方
  } else if (month >= 7 && month <= 8) {
    recommendedDests = ["三亚", "万宁", "陵水"]; // 暑假
  } else {
    recommendedDests = ["三亚", "海口", "万宁", "儋州", "文昌", "五指山"];
  }

  // 季节性提醒
  const seasonalTips = [];
  if (month >= 5 && month <= 10) {
    seasonalTips.push({ lang: "zh", text: "🚨 海南已进入雨季，出行请携带雨具，关注台风预警" });
    seasonalTips.push({ lang: "en", text: "🚨 Rainy season in Hainan, bring umbrella, check typhoon warnings" });
  }
  if (month >= 11 && month <= 3) {
    seasonalTips.push({ lang: "zh", text: "☀️ 海南进入最佳旅游季节，温暖干燥，适合避寒" });
    seasonalTips.push({ lang: "en", text: "☀️ Best season to visit Hainan - warm and dry, perfect escape from winter" });
  }
  if (month >= 7 && month <= 8) {
    seasonalTips.push({ lang: "zh", text: "👨‍👩‍👧‍👦 暑假亲子游旺季，建议提前预订酒店和门票" });
    seasonalTips.push({ lang: "en", text: "👨‍👩‍👧‍👦 Summer vacation peak, book hotels and tickets in advance" });
  }

  // 当日季节性事件
  const todayEvents = SEASONAL_EVENTS.filter(e => e.month === month);

  return {
    date: dateStr,
    season: month >= 11 || month <= 3 ? "winter" : month >= 7 && month <= 8 ? "summer" : "spring-autumn",
    trendingKeywords: getTrendingKeywords(),
    recommendedDestinations: recommendedDests,
    seasonalTips,
    events: todayEvents.map(e => e.event),
    hotAttractions: {
      zh: ATTRACTIONS_DB.zh.filter(a => a.hot).map(a => a.name),
      en: ATTRACTIONS_DB.en.filter(a => a.hot).map(a => a.name)
    },
    // 建议重点生成的内容类型（基于季节和趋势）
    recommendedContentTypes: {
      zh: generateContentRecommendations("zh", month),
      en: generateContentRecommendations("en", month)
    }
  };
}

// ======== 根据趋势建议内容类型 ========
function generateContentRecommendations(lang, month) {
  const priorities = [];

  // 基本推荐（全年）
  const baseRecs = lang === "zh" ? [
    "海南景点", "三亚旅游", "海南自由行", "海南美食", "海南海滩"
  ] : [
    "Hainan Attractions", "Sanya Travel", "Hainan Free Travel", "Hainan Food", "Hainan Beaches"
  ];
  priorities.push(...baseRecs.map(t => ({ type: t, priority: "high", reason: "基础内容" })));

  // 季节性推荐
  if (month >= 11 || month <= 3) {
    priorities.push({ type: lang === "zh" ? "海南避坑指南" : "Hainan Pitfall Guide", priority: "high", reason: "旺季避坑" });
    priorities.push({ type: lang === "zh" ? "海南入境指南" : "Hainan Entry Guide", priority: "high", reason: "旺季入境咨询" });
  }
  if (month >= 7 && month <= 8) {
    priorities.push({ type: lang === "zh" ? "海南亲子游" : "Hainan Family Travel", priority: "urgent", reason: "暑假亲子" });
  }
  if (month >= 5 && month <= 6) {
    priorities.push({ type: lang === "zh" ? "海南旅游路线" : "Hainan Travel Routes", priority: "high", reason: "假期出行规划" });
  }

  return priorities;
}

// ======== 更新 data/keywords.json ========
function updateKeywords(trending) {
  const kwPath = path.join(DATA_DIR, "keywords.json");
  if (!fs.existsSync(kwPath)) return false;

  try {
    const keywords = JSON.parse(fs.readFileSync(kwPath, "utf-8"));

    for (const lang of Object.keys(keywords)) {
      for (const item of keywords[lang]) {
        // 查找匹配的趋势数据
        const trend = trending.find(t =>
          t.lang === lang &&
          t.keyword.toLowerCase() === item.keyword.toLowerCase()
        );
        if (trend) {
          // 根据热度调整优先级：hot>80→priority 1; hot>50 →2; else→3
          item.priority = trend.hot > 80 ? 1 : trend.hot > 50 ? 2 : 3;
          item.lastUpdated = new Date().toISOString().split("T")[0];
        }
      }
    }

    fs.writeFileSync(kwPath, JSON.stringify(keywords, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error(`⚠️ 更新关键词失败: ${e.message}`);
    return false;
  }
}

// ======== 保存新闻摘要到日志 ========
function saveDigest(digest) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  // 保存为 JSON（供其他模块调用）
  const jsonPath = path.join(LOG_DIR, `digest-${digest.date}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(digest, null, 2), "utf-8");

  // 保存为可读文本
  const txtPath = path.join(LOG_DIR, `digest-${digest.date}.txt`);
  const lines = [
    "=".repeat(50),
    `📰 今日信息摘要 - ${digest.date}`,
    "=".repeat(50),
    "",
    `🌸 季节: ${digest.season}`,
    "",
    "🔥 热门趋势关键词:",
    ...digest.trendingKeywords.slice(0, 10).map(t => `   ${t.keyword} (热度:${t.hot}) [${t.lang}]`),
    "",
    "🏖️ 推荐目的地:",
    `   ${digest.recommendedDestinations.join("、")}`,
    "",
    "📢 季节性提醒:",
    ...digest.seasonalTips.map(t => `   ${t.text}`),
    "",
    "🎯 推荐生成内容:",
    ...(digest.recommendedContentTypes.zh || []).filter(t => t.priority === "urgent" || t.priority === "high").map(t => `   [${t.priority.toUpperCase()}] ${t.type} - ${t.reason}`),
    "",
    "📌 当日事件:",
    ...(digest.events.length ? digest.events.map(e => `   📅 ${e}`) : ["   暂无特殊事件"]),
    "",
    "=".repeat(50)
  ];

  fs.writeFileSync(txtPath, lines.join("\n"), "utf-8");
  return { jsonPath, txtPath };
}

// ======== 主函数 ========
async function main() {
  const startTime = Date.now();

  console.log("=".repeat(50));
  console.log("📰 指南帮旅游 - AI 信息采集器");
  console.log("=".repeat(50));

  // 生成摘要
  console.log("\n🔍 分析搜索趋势...");
  const digest = generateDigest();
  console.log(`   趋势关键词: ${digest.trendingKeywords.length} 条`);
  console.log(`   热门景点: ${digest.hotAttractions.zh.length} 个 (中文)`);

  // 更新关键词
  console.log("\n📝 更新关键词优先级...");
  const updated = updateKeywords(digest.trendingKeywords);
  console.log(`   ${updated ? "✅ 已更新" : "⚠️ 无需更新"}`);

  // 保存摘要
  console.log("\n💾 保存信息摘要...");
  const saved = saveDigest(digest);
  console.log(`   ✅ ${saved.txtPath}`);

  // 输出推荐
  console.log("\n🎯 今日内容生成建议:");
  const urgent = digest.recommendedContentTypes.zh.filter(t => t.priority === "urgent");
  const high = digest.recommendedContentTypes.zh.filter(t => t.priority === "high");
  if (urgent.length) urgent.forEach(t => console.log(`   🔴 [优先] ${t.type}`));
  if (high.length) high.forEach(t => console.log(`   🟡 [推荐] ${t.type}`));

  console.log("\n" + "=".repeat(50));
  console.log(`✅ 采集完成 (${Date.now() - startTime}ms)`);
  console.log("=".repeat(50));
}

main().catch(e => {
  console.error("❌ 采集失败:", e.message);
  process.exit(1);
});
