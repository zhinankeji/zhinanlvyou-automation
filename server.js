/**
 * 指南帮旅游 - 自动化系统主入口
 * 
 * 用途：启动自动运营系统，或作为定时任务触发点
 * 模式：
 *   node server.js          → 直接运行每日运营
 *   node server.js daily    → 运行每日运营
 *   node server.js weekly   → 运行周报生成
 *   node server.js report   → 生成日报
 *   node server.js status   → 查看系统状态
 */

const path = require("path");
const fs = require("fs");

// 加载 .env 文件（如果存在）
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
      const [key, ...vals] = line.split("=");
      if (key && vals.length > 0 && !key.startsWith("#")) {
        process.env[key.trim()] = vals.join("=").trim();
      }
    });
    console.log("✅ .env 配置已加载");
  } else {
    console.log("ℹ️  .env 文件不存在，使用默认配置");
  }
} catch (e) {
  // 忽略
}

const mode = process.argv[2] || "daily";

async function main() {
  console.log("");
  console.log("  🌴 指南帮旅游 - AI 自动化运营系统 V1.0");
  console.log("  ========================================");
  console.log("");
  
  switch (mode) {
    case "daily":
    case "start":
      console.log("▶️  模式: 每日运营\n");
      const daily = require("./scripts/daily-run");
      await daily();
      break;
      
    case "weekly":
      console.log("▶️  模式: 周报生成\n");
      const weekly = require("./scripts/weekly-run");
      await weekly();
      break;
      
    case "report":
      console.log("▶️  模式: 日报生成\n");
      const report = require("./services/report");
      const result = report.generateDailyReport();
      console.log(result.report);
      break;
      
    case "status":
      console.log("▶️  模式: 系统状态\n");
      showStatus();
      break;
      
    case "sitemap":
      console.log("▶️  模式: 更新 Sitemap\n");
      const seo = require("./services/seo");
      const sitemap = await seo.updateSitemap();
      console.log(`✅ Sitemap 更新完成: 共 ${sitemap.total} 条, 新增 ${sitemap.new} 条`);
      break;
      
    case "seed":
      console.log("▶️  模式: 生成种子内容\n");
      const content = require("./services/content");
      // 为所有语言生成一篇示例文章
      for (const lang of ["zh", "en", "ru", "ko", "ja", "th"]) {
        console.log(`\n生成 [${lang}] 示例文章...`);
        const article = await content.generateArticle(lang);
        if (article) {
          content.saveArticle(lang, article);
          console.log(`  ✅ ${article.title}`);
        }
      }
      break;
      
    default:
      console.log(`❌ 未知模式: ${mode}`);
      console.log("用法: node server.js [daily|weekly|report|status|sitemap|seed]");
  }
}

function showStatus() {
  const articlesDir = path.join(__dirname, "articles");
  const outputDir = path.join(__dirname, "output");
  const logDir = path.join(__dirname, "logs");
  
  let totalArticles = 0;
  const langCounts = {};
  
  if (fs.existsSync(articlesDir)) {
    const langs = fs.readdirSync(articlesDir).filter(d => !d.startsWith("."));
    for (const lang of langs) {
      const langPath = path.join(articlesDir, lang);
      if (fs.existsSync(langPath)) {
        const count = fs.readdirSync(langPath).filter(f => f.endsWith(".json")).length;
        langCounts[lang] = count;
        totalArticles += count;
      }
    }
  }
  
  const videoCount = fs.existsSync(path.join(outputDir, "video")) 
    ? fs.readdirSync(path.join(outputDir, "video")).length : 0;
  const socialCount = fs.existsSync(path.join(outputDir, "social"))
    ? fs.readdirSync(path.join(outputDir, "social")).length : 0;
  const logCount = fs.existsSync(logDir)
    ? fs.readdirSync(logDir).filter(f => f.endsWith(".log")).length : 0;
  
  console.log("📊 系统状态:");
  console.log(`  📝 文章总数: ${totalArticles}`);
  for (const [lang, count] of Object.entries(langCounts)) {
    console.log(`     [${lang}]: ${count} 篇`);
  }
  console.log(`  🎬 视频脚本: ${videoCount} 条`);
  console.log(`  📱 社媒文案: ${socialCount} 组`);
  console.log(`  📋 日志文件: ${logCount} 个`);
  console.log(`  📂 项目路径: ${__dirname}`);
  console.log("");
  console.log("📌 配置检查:");
  console.log(`  WordPress: ${process.env.WP_USERNAME ? "已配置 ✅" : "未配置 ⚠️"}`);
  console.log(`  DeepSeek: ${process.env.DEEPSEEK_API_KEY ? "已配置 ✅" : "未配置 ⚠️"}`);
  console.log(`  AUTO_PUBLISH: ${process.env.AUTO_PUBLISH || "false"} ⚠️`);
}

main().catch(e => {
  console.error("❌ 系统错误:", e.message);
  process.exit(1);
});
