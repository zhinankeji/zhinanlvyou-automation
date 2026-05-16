/**
 * 指南帮旅游 - 运营日报/周报生成器
 */

const fs = require("fs");
const path = require("path");
const seo = require("./seo");

const ARTICLES_DIR = path.join(__dirname, "../articles");
const OUTPUT_DIR = path.join(__dirname, "../output");
const LOG_DIR = path.join(__dirname, "../logs");
const DATA_DIR = path.join(__dirname, "../data");

/**
 * 获取今日日期字符串
 */
function getDateStr() {
  return new Date().toISOString().split("T")[0];
}

/**
 * 获取今日已生成文章
 */
function getTodayArticles() {
  const dateStr = getDateStr();
  const articles = [];
  const langDirs = fs.readdirSync(ARTICLES_DIR).filter(d => !d.startsWith("."));
  
  for (const lang of langDirs) {
    const langPath = path.join(ARTICLES_DIR, lang);
    if (!fs.existsSync(langPath)) continue;
    
    const files = fs.readdirSync(langPath).filter(f => f.startsWith(dateStr) && f.endsWith(".json"));
    for (const file of files) {
      try {
        const article = JSON.parse(fs.readFileSync(path.join(langPath, file), "utf-8"));
        articles.push({ ...article, lang, file });
      } catch (e) {
        articles.push({ lang, file, title: "[读取失败]", error: e.message });
      }
    }
  }
  
  return articles;
}

/**
 * 获取日志摘要
 */
function getLogSummary() {
  const dateStr = getDateStr();
  const logFile = path.join(LOG_DIR, `${dateStr}.log`);
  
  if (!fs.existsSync(logFile)) {
    return { total: 0, errors: 0, warnings: 0, lines: [] };
  }
  
  const content = fs.readFileSync(logFile, "utf-8");
  const lines = content.split("\n").filter(l => l.trim());
  
  return {
    total: lines.length,
    errors: lines.filter(l => l.includes("[ERROR]")).length,
    warnings: lines.filter(l => l.includes("[WARN]")).length,
    lines: lines.slice(-20) // 最近 20 条
  };
}

/**
 * 获取视频脚本数量
 */
function getVideoScriptCount() {
  const outputDir = path.join(OUTPUT_DIR, "video");
  if (!fs.existsSync(outputDir)) return 0;
  const dateStr = getDateStr();
  return fs.readdirSync(outputDir).filter(f => f.startsWith(dateStr)).length;
}

/**
 * 获取社媒文案数量
 */
function getSocialCopyCount() {
  const outputDir = path.join(OUTPUT_DIR, "social");
  if (!fs.existsSync(outputDir)) return 0;
  const dateStr = getDateStr();
  return fs.readdirSync(outputDir).filter(f => f.startsWith(dateStr)).length;
}

/**
 * ============================
 * 生成运营日报
 * ============================
 */
function generateDailyReport() {
  const dateStr = getDateStr();
  const articles = getTodayArticles();
  const logs = getLogSummary();
  const videoCount = getVideoScriptCount();
  const socialCount = getSocialCopyCount();
  const keywords = seo.loadKeywords();
  
  // 按语言分组统计
  const langStats = {};
  const langNames = { zh: "中文", en: "English", ru: "Русский", ko: "한국어", ja: "日本語", th: "ไทย" };
  
  for (const a of articles) {
    if (!langStats[a.lang]) langStats[a.lang] = { count: 0, categories: [] };
    langStats[a.lang].count++;
    if (a.category) langStats[a.lang].categories.push(a.category);
  }
  
  // 今日关键词
  const todayKeywords = [];
  const dayOffset = new Date().getDate();
  for (const lang of Object.keys(keywords)) {
    const langKeywords = keywords[lang] || [];
    const idx = (dayOffset + lang.length) % langKeywords.length;
    if (langKeywords[idx]) {
      todayKeywords.push({ lang, keyword: langKeywords[idx].keyword, priority: langKeywords[idx].priority });
    }
  }
  
  // 需要人工确认的事项
  const humanConfirmItems = [];
  for (const a of articles) {
    if (a.category && ["海南门票咨询", "海南入境指南"].includes(a.category)) {
      humanConfirmItems.push({
        article: a.title,
        reason: "涉及门票/签证信息，需人工确认",
        lang: a.lang
      });
    }
  }
  
  // 错误列表
  const errorList = logs.lines.filter(l => l.includes("[ERROR]"));
  
  const report = [
    "=".repeat(60),
    `📊 指南帮旅游 - 运营日报`,
    `📅 ${dateStr}`,
    "=".repeat(60),
    "",
    "【今日文章统计】",
    `总文章数: ${articles.length}`,
    "",
    ...Object.entries(langStats).map(([lang, stat]) => 
      `  ${langNames[lang] || lang}: ${stat.count} 篇`
    ),
    "",
    "【内容分布】",
    ...articles.map((a, i) => `  ${i+1}. [${langNames[a.lang] || a.lang}] ${a.title || a.file} - ${a.category || "未分类"}`),
    "",
    "【今日视频脚本】",
    `  生成数量: ${videoCount} 条`,
    "",
    "【今日社媒文案】",
    `  生成数量: ${socialCount} 篇`,
    "",
    "【SEO 关键词】",
    ...todayKeywords.map(k => `  [${k.lang}] ${k.keyword} (优先度: ${k.priority})`),
    "",
    "【日志摘要】",
    `  总日志: ${logs.total} 条`,
    `  错误: ${logs.errors} 条`,
    `  警告: ${logs.warnings} 条`,
    "",
    ...(errorList.length > 0 ? ["【错误详情】", ...errorList.map(e => `  ❌ ${e}`), ""] : ["  ✅ 今日无错误"]),
    "",
    ...(humanConfirmItems.length > 0 ? ["【⚠️ 人工确认事项】", ...humanConfirmItems.map(h => 
      `  ⚠️ [${h.lang}] ${h.article} - ${h.reason}`
    ), ""] : ["  ✅ 今日无人工确认事项"]),
    "",
    "【明日计划】",
    ...Object.keys(langNames).map(lang => `  - ${langNames[lang]}: 生成 ${lang === "zh" || lang === "en" ? 2 : 1} 篇`),
    "  - 视频脚本: 3 条",
    "  - SEO 检查: 自动执行",
    "",
    "=".repeat(60),
    "📌 系统状态: 运行中",
    "📌 发布状态: 草稿 (AUTO_PUBLISH=false)",
    `📌 生成时间: ${new Date().toISOString()}`,
    "=".repeat(60)
  ].join("\n");
  
  // 保存日报
  const reportPath = path.join(OUTPUT_DIR, `daily-report-${dateStr}.txt`);
  fs.writeFileSync(reportPath, report, "utf-8");
  
  // 同时保存为 JSON
  const reportJson = {
    date: dateStr,
    articles: {
      total: articles.length,
      byLanguage: langStats
    },
    videoScripts: videoCount,
    socialCopy: socialCount,
    keywords: todayKeywords,
    errors: logs.errors,
    warnings: logs.warnings,
    humanConfirm: humanConfirmItems,
    status: "running"
  };
  const jsonPath = path.join(OUTPUT_DIR, `daily-report-${dateStr}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2), "utf-8");
  
  return { report, json: reportJson, path: reportPath };
}

/**
 * ============================
 * 生成运营周报
 * ============================
 */
function generateWeeklyReport() {
  const dateStr = getDateStr();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  
  // 统计本周文章
  const weekArticles = [];
  const langDirs = fs.readdirSync(ARTICLES_DIR).filter(d => !d.startsWith("."));
  
  for (const lang of langDirs) {
    const langPath = path.join(ARTICLES_DIR, lang);
    if (!fs.existsSync(langPath)) continue;
    
    const files = fs.readdirSync(langPath).filter(f => {
      if (!f.endsWith(".json")) return false;
      const fileDate = f.split("-")[0];
      return fileDate >= weekStartStr && fileDate <= dateStr;
    });
    
    for (const file of files) {
      try {
        const article = JSON.parse(fs.readFileSync(path.join(langPath, file), "utf-8"));
        weekArticles.push({ ...article, lang, file });
      } catch (e) {
        // skip
      }
    }
  }
  
  // 按语言统计
  const langStats = {};
  const langNames = { zh: "中文", en: "English", ru: "Русский", ko: "한국어", ja: "日本語", th: "ไทย" };
  const categoryStats = {};
  
  for (const a of weekArticles) {
    if (!langStats[a.lang]) langStats[a.lang] = 0;
    langStats[a.lang]++;
    
    const cat = a.category || "未分类";
    if (!categoryStats[cat]) categoryStats[cat] = 0;
    categoryStats[cat]++;
  }
  
  // 热门关键词（基于文章标题统计）
  const keywordCount = {};
  const allKeywords = seo.loadKeywords();
  for (const lang of Object.keys(allKeywords)) {
    for (const kw of allKeywords[lang]) {
      keywordCount[kw.keyword] = 0;
    }
  }
  for (const a of weekArticles) {
    for (const kw of Object.keys(keywordCount)) {
      if ((a.title || "").includes(kw)) {
        keywordCount[kw]++;
      }
    }
  }
  const topKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, c]) => c > 0)
    .slice(0, 10);
  
  // 多语言增长
  const weeklyGrowth = {};
  for (const lang of Object.keys(langStats)) {
    weeklyGrowth[lang] = {
      count: langStats[lang],
      percentage: weekArticles.length > 0 ? Math.round((langStats[lang] / weekArticles.length) * 100) : 0
    };
  }
  
  // 下周内容规划
  const nextWeekPlan = [];
  for (const lang of Object.keys(langNames)) {
    const daily = lang === "zh" || lang === "en" ? 2 : 1;
    nextWeekPlan.push(`${langNames[lang]}: ${daily * 7} 篇（每日 ${daily} 篇）`);
  }
  nextWeekPlan.push("视频脚本: 21 条（每日 3 条）");
  nextWeekPlan.push("社媒文案: 随文章同步生成");
  
  const report = [
    "=".repeat(60),
    `📊 指南帮旅游 - 运营周报`,
    `📅 ${weekStartStr} ~ ${dateStr}`,
    "=".repeat(60),
    "",
    "【本周概况】",
    `  总文章数: ${weekArticles.length} 篇`,
    "",
    "【各语言增长】",
    ...Object.entries(langStats).map(([lang, count]) => 
      `  ${langNames[lang] || lang}: ${count} 篇`
    ),
    "",
    "【热门文章类别】",
    ...Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat, count]) => `  ${cat}: ${count} 篇`),
    "",
    ...(topKeywords.length > 0 ? [
      "【热门关键词】",
      ...topKeywords.map(([kw, count], i) => `  ${i+1}. "${kw}" - 出现 ${count} 次`),
      ""
    ] : ["  📝 关键词数据收集中...", ""]),
    "",
    "【SEO 优化建议】",
    "  1. 确保每篇文章标题含核心关键词",
    "  2. 补充更多 FAQ 内容（建议 3-5 条）",
    "  3. 加强内链建设，提升页面权重",
    "  4. 更新 Sitemap → 已自动执行",
    "  5. 建议持续关注 Google Search Console",
    "",
    "【下周内容规划】",
    ...nextWeekPlan.map(item => `  📌 ${item}`),
    "",
    "【风险提醒】",
    "  ⚠️ 所有门票价格和开放时间需人工核实",
    "  ⚠️ 签证政策变化需人工关注",
    "  ⚠️ 自动发布功能未开启 (AUTO_PUBLISH=false)",
    "",
    "=".repeat(60),
    `📌 系统状态: 运行中 | 生成时间: ${new Date().toISOString()}`,
    "=".repeat(60)
  ].join("\n");
  
  // 保存周报
  const weekNum = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / (7 * 86400000));
  const reportPath = path.join(OUTPUT_DIR, `weekly-report-${now.getFullYear()}-W${weekNum}.txt`);
  fs.writeFileSync(reportPath, report, "utf-8");
  
  const reportJson = {
    period: { start: weekStartStr, end: dateStr, week: weekNum },
    totalArticles: weekArticles.length,
    byLanguage: langStats,
    byCategory: categoryStats,
    topKeywords: Object.fromEntries(topKeywords),
    weeklyGrowth,
    riskItems: [
      "门票价格和开放时间需人工核实",
      "签证政策变化需人工关注",
      "自动发布功能未开启 (AUTO_PUBLISH=false)"
    ],
    status: "running"
  };
  const jsonPath = path.join(OUTPUT_DIR, `weekly-report-${now.getFullYear()}-W${weekNum}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2), "utf-8");
  
  return { report, json: reportJson, path: reportPath };
}

module.exports = {
  generateDailyReport,
  generateWeeklyReport,
  getTodayArticles
};
