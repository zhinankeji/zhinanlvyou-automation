/**
 * 指南帮旅游 - AI SEO 监测器 V2.0
 *
 * 职责：
 * 1. 分析已有文章的 SEO 质量（标题、描述、内容、结构）
 * 2. 检查关键词覆盖情况
 * 3. 生成 SEO 优化建议
 * 4. 记录 SEO 评分趋势
 * 5. [可选] 集成 Google Search Console API
 *
 * 用法: node scripts/seo-monitor.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "articles");
const DATA_DIR = path.join(ROOT, "data");
const LOG_DIR = path.join(ROOT, "logs");
const OUTPUT_DIR = path.join(ROOT, "output");

// ======== SEO 评分标准 ========
const SEO_RULES = {
  title: { maxLen: 70, minLen: 10, weight: 20 },
  metaDescription: { maxLen: 160, minLen: 50, weight: 15 },
  slug: { maxLen: 80, weight: 5 },
  content: { minWords: 300, weight: 25 },
  headings: { weight: 10 },
  keywords: { weight: 15 },
  faq: { minCount: 1, weight: 10 },
  links: { weight: 5 },   // 内链
  contact: { weight: 5 }  // 联系方式
};

// ======== 语言配置 ========
const LANG_NAMES = {
  zh: "中文", en: "English", ru: "Русский",
  ko: "한국어", ja: "日本語", th: "ไทย"
};

// ======== 关键词配置 ========
function loadKeywords() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "keywords.json"), "utf-8"));
  } catch (e) { return {}; }
}

// ======== 文章分析 ========
function analyzeArticle(article, lang, keywords) {
  const issues = [];
  let score = 100;

  // 1. 标题检查
  const title = article.title || "";
  if (!title) {
    issues.push({ type: "error", field: "title", msg: "标题为空", deduct: SEO_RULES.title.weight });
  } else if (title.length < SEO_RULES.title.minLen) {
    issues.push({ type: "warn", field: "title", msg: `标题过短 (${title.length}字，建议≥${SEO_RULES.title.minLen})`, deduct: 10 });
  } else if (title.length > SEO_RULES.title.maxLen) {
    issues.push({ type: "warn", field: "title", msg: `标题过长 (${title.length}字，建议≤${SEO_RULES.title.maxLen})`, deduct: 5 });
  }

  // 2. Meta Description
  const meta = article.metaDescription || "";
  if (!meta) {
    issues.push({ type: "error", field: "metaDescription", msg: "Meta Description 为空", deduct: SEO_RULES.metaDescription.weight });
  } else if (meta.length < SEO_RULES.metaDescription.minLen) {
    issues.push({ type: "warn", field: "metaDescription", msg: `Meta Description 过短 (${meta.length}字)`, deduct: 8 });
  }

  // 3. Slug
  const slug = article.slug || "";
  if (!slug) {
    issues.push({ type: "error", field: "slug", msg: "Slug 为空", deduct: SEO_RULES.slug.weight });
  } else if (slug.length > SEO_RULES.slug.maxLen) {
    issues.push({ type: "warn", field: "slug", msg: `Slug 过长 (${slug.length}字符)`, deduct: 3 });
  }

  // 4. 内容长度
  const contentText = (article.content || "").replace(/<[^>]*>/g, "").trim();
  const wordCount = lang === "zh" ? contentText.length : contentText.split(/\s+/).length;
  if (wordCount < SEO_RULES.content.minWords) {
    issues.push({ type: "warn", field: "content", msg: `内容过短 (${wordCount}词，建议≥${SEO_RULES.content.minWords})`, deduct: 15 });
  }

  // 5. 标题层级
  const headings = (article.content || "").match(/<h[23][^>]*>/g) || [];
  if (headings.length < 2) {
    issues.push({ type: "warn", field: "headings", msg: `H2/H3 标题太少 (${headings.length}个)`, deduct: 5 });
  } else if (headings.length > 10) {
    issues.push({ type: "info", field: "headings", msg: `标题数量合适 (${headings.length}个)` });
  }

  // 6. 关键词覆盖
  const langKeywords = keywords[lang] || [];
  const titleLower = title.toLowerCase();
  const contentLower = contentText.toLowerCase();
  let keywordHits = 0;
  for (const kw of langKeywords) {
    const kwLower = kw.keyword.toLowerCase();
    if (titleLower.includes(kwLower) || contentLower.includes(kwLower)) {
      keywordHits++;
    }
  }
  const coverageRate = langKeywords.length > 0 ? (keywordHits / langKeywords.length) * 100 : 0;
  if (coverageRate < 30) {
    issues.push({ type: "warn", field: "keywords", msg: `关键词覆盖率过低 (${keywordHits}/${langKeywords.length}，${Math.round(coverageRate)}%)`, deduct: 10 });
  }

  // 7. FAQ
  const faq = article.faq || [];
  if (!faq.length) {
    issues.push({ type: "warn", field: "faq", msg: "未包含 FAQ", deduct: SEO_RULES.faq.weight });
  } else if (faq.length < SEO_RULES.faq.minCount) {
    issues.push({ type: "info", field: "faq", msg: `FAQ 数量偏少 (${faq.length}条)` });
  }

  // 8. 内链
  const internalLinks = (article.content || "").match(/href=["']\/[^"']*["']/g) || [];
  if (internalLinks.length < 1) {
    issues.push({ type: "info", field: "links", msg: "未包含内链", deduct: 3 });
  }

  // 9. 联系模块
  const hasContact = (article.content || "").includes("contact") ||
                     (article.content || "").includes("微信") ||
                     (article.content || "").includes("WhatsApp");
  if (!hasContact) {
    issues.push({ type: "error", field: "contact", msg: "未包含联系方式", deduct: SEO_RULES.contact.weight });
  }

  // 计算最终得分
  for (const issue of issues) {
    score -= (issue.deduct || 0);
  }
  score = Math.max(0, Math.min(100, score));

  return { score, issues, wordCount, keywordCoverage: Math.round(coverageRate) };
}

// ======== 加载所有文章 ========
function loadAllArticles() {
  const allArticles = {};
  if (!fs.existsSync(ARTICLES_DIR)) return allArticles;

  for (const lang of fs.readdirSync(ARTICLES_DIR)) {
    const langPath = path.join(ARTICLES_DIR, lang);
    if (!fs.existsSync(langPath)) continue;
    allArticles[lang] = [];

    for (const file of fs.readdirSync(langPath).filter(f => f.endsWith(".json"))) {
      try {
        const article = JSON.parse(fs.readFileSync(path.join(langPath, file), "utf-8"));
        article._lang = lang;
        article._file = file;
        allArticles[lang].push(article);
      } catch (e) { /* skip */ }
    }
  }
  return allArticles;
}

// ======== 生成 SEO 报告 ========
function generateSEOReport(allArticles) {
  const keywords = loadKeywords();
  const results = [];

  for (const [lang, articles] of Object.entries(allArticles)) {
    for (const article of articles) {
      const analysis = analyzeArticle(article, lang, keywords);
      results.push({
        lang,
        file: article._file,
        title: article.title || "无标题",
        slug: article.slug || "",
        score: analysis.score,
        wordCount: analysis.wordCount,
        keywordCoverage: analysis.keywordCoverage,
        issues: analysis.issues.filter(i => i.type !== "info").length,
        hasFaq: (article.faq || []).length > 0
      });
    }
  }

  // 按得分排序
  results.sort((a, b) => a.score - b.score);

  // 汇总统计
  const summary = {
    totalArticles: results.length,
    totalScore: results.reduce((s, r) => s + r.score, 0),
    avgScore: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0,
    excellent: results.filter(r => r.score >= 90).length,
    good: results.filter(r => r.score >= 70 && r.score < 90).length,
    needsImprovement: results.filter(r => r.score >= 50 && r.score < 70).length,
    poor: results.filter(r => r.score < 50).length,
    byLang: {}
  };

  for (const [lang, articles] of Object.entries(allArticles)) {
    const scores = articles.map(a => {
      const analysis = analyzeArticle(a, lang, keywords);
      return analysis.score;
    });
    summary.byLang[lang] = {
      count: articles.length,
      avgScore: articles.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    };
  }

  // 常见问题统计
  const allIssues = [];
  for (const [lang, articles] of Object.entries(allArticles)) {
    for (const article of articles) {
      const analysis = analyzeArticle(article, lang, keywords);
      allIssues.push(...analysis.issues);
    }
  }

  const topIssues = {};
  for (const issue of allIssues) {
    const key = issue.field;
    if (!topIssues[key]) topIssues[key] = { count: 0, weight: 0 };
    topIssues[key].count++;
    topIssues[key].weight += (issue.deduct || 5);
  }

  // 排序
  const sortedIssues = Object.entries(topIssues)
    .map(([field, data]) => ({ field, count: data.count, totalDeduction: data.weight }))
    .sort((a, b) => b.totalDeduction - a.totalDeduction);

  // 生成建议
  const recommendations = [];
  for (const issue of sortedIssues.slice(0, 5)) {
    const tips = {
      metaDescription: "为每篇文章补充至少 50 字的 Meta Description",
      content: "文章正文建议至少 300 词，增加深度内容",
      keywords: "在标题和正文中自然融入高优先级关键词",
      faq: "为每篇文章添加 2-3 条常见问题 FAQ",
      title: "控制在 10-70 字，包含核心关键词",
      headings: "使用 H2/H3 划分内容层级，建议至少 2 个",
      links: "添加指向其他相关文章的内链"
    };
    recommendations.push({
      field: issue.field,
      affectedCount: issue.count,
      totalImpact: issue.totalDeduction,
      suggestion: tips[issue.field] || `优化 ${issue.field}`
    });
  }

  return { summary, details: results, recommendations, sortedIssues };
}

// ======== 保存报告 ========
function saveReport(report) {
  const dateStr = new Date().toISOString().split("T")[0];
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const jsonPath = path.join(OUTPUT_DIR, `seo-report-${dateStr}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");

  // 生成可读文本
  const lines = [
    "=".repeat(60),
    `🔍 指南帮旅游 - SEO 监测报告`,
    `📅 ${dateStr}`,
    "=".repeat(60),
    "",
    `📊 总体评分: ${report.summary.avgScore}/100 (${report.summary.totalArticles} 篇文章)`,
    "",
    `   ✅ 优秀(≥90): ${report.summary.excellent} 篇`,
    `   🟢 良好(≥70): ${report.summary.good} 篇`,
    `   🟡 需改善(≥50): ${report.summary.needsImprovement} 篇`,
    `   🔴 不合格(<50): ${report.summary.poor} 篇`,
    "",
    "📈 各语言评分:"
  ];

  for (const [lang, stats] of Object.entries(report.summary.byLang)) {
    lines.push(`   [${lang}] ${LANG_NAMES[lang] || lang}: ${stats.avgScore}/100 (${stats.count}篇)`);
  }

  lines.push(
    "",
    "🔧 主要问题 (TOP 5):"
  );

  for (const r of report.recommendations) {
    lines.push(`   ⚠️ ${r.suggestion} (影响 ${r.affectedCount} 篇文章)`);
  }

  lines.push(
    "",
    "📋 各篇文章评分详情:"
  );

  for (const detail of report.details.slice(0, 20)) {
    const icon = detail.score >= 90 ? "✅" : detail.score >= 70 ? "🟢" : detail.score >= 50 ? "🟡" : "🔴";
    const langName = LANG_NAMES[detail.lang] || detail.lang;
    lines.push(`   ${icon} [${langName}] ${detail.title.substring(0, 50)} - ${detail.score}/100 (问题:${detail.issues})`);
  }

  if (report.details.length > 20) {
    lines.push(`   ... 还有 ${report.details.length - 20} 篇`);
  }

  lines.push(
    "",
    "💡 优化建议:",
    "   1. 接入 Google Search Console 获取真实搜索数据",
    "   2. 定期更新旧文章，增加时效性",
    "   3. 补充更多 FAQ，争取 Google 精选摘要",
    "   4. 加强站内互链，提升页面权重",
    "",
    "=".repeat(60)
  );

  const txtPath = path.join(OUTPUT_DIR, `seo-report-${dateStr}.txt`);
  fs.writeFileSync(txtPath, lines.join("\n"), "utf-8");

  return { jsonPath, txtPath };
}

// ======== 主函数 ========
async function main() {
  const startTime = Date.now();

  console.log("=".repeat(60));
  console.log("🔍 指南帮旅游 - AI SEO 监测器");
  console.log("=".repeat(60));

  // 加载文章
  console.log("\n📖 加载文章...");
  const allArticles = loadAllArticles();
  let total = 0;
  for (const [lang, articles] of Object.entries(allArticles)) {
    console.log(`   [${lang}]: ${articles.length} 篇`);
    total += articles.length;
  }
  console.log(`   总计: ${total} 篇`);

  if (total === 0) {
    console.log("\n⚠️ 暂无文章，请先生成内容");
    return;
  }

  // 分析
  console.log("\n🔎 分析文章 SEO...");
  const report = generateSEOReport(allArticles);

  console.log(`\n📊 总体评分: ${report.summary.avgScore}/100`);
  console.log(`   ✅ 优秀: ${report.summary.excellent}`);
  console.log(`   🟢 良好: ${report.summary.good}`);
  console.log(`   🟡 需改善: ${report.summary.needsImprovement}`);
  console.log(`   🔴 不合格: ${report.summary.poor}`);

  console.log("\n📈 各语言评分:");
  for (const [lang, stats] of Object.entries(report.summary.byLang)) {
    console.log(`   [${lang}] ${stats.avgScore}/100 (${stats.count}篇)`);
  }

  // 保存
  console.log("\n💾 保存报告...");
  const saved = saveReport(report);
  console.log(`   ✅ ${saved.txtPath}`);

  console.log(`\n⏱️  耗时: ${Date.now() - startTime}ms`);
  console.log("=".repeat(60));
}

main().catch(e => {
  console.error("❌ SEO 监测失败:", e.message);
  process.exit(1);
});
