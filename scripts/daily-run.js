/**
 * 指南帮旅游 - 每日自动运营脚本
 * 1. 生成多语言文章
 * 2. 生成视频脚本
 * 3. 生成社媒文案
 * 4. 更新 Sitemap
 * 5. SEO 检查
 * 6. 生成日报
 */

const path = require("path");
const fs = require("fs");

// 动态加载服务模块
const content = require("../services/content");
const videoScript = require("../services/videoScript");
const social = require("../services/social");
const seoService = require("../services/seo");
const report = require("../services/report");
const wp = require("../services/wordpress");
const logger = require("../src/utils/logger");

const OUTPUT_DIR = path.join(__dirname, "../output");

async function main() {
  const startTime = Date.now();
  console.log("=".repeat(60));
  console.log("🌴 指南帮旅游 - 每日自动运营开始");
  console.log(`📅 ${new Date().toISOString()}`);
  console.log("=".repeat(60));
  
  const summary = {
    date: new Date().toISOString().split("T")[0],
    articles: 0,
    drafts: 0,
    videoScripts: 0,
    socialCopy: 0,
    errors: 0,
    warnings: 0
  };
  
  try {
    // ======== 1. 生成多语言文章 ========
    console.log("\n📝 Step 1: 生成多语言文章");
    const contentResult = await content.generateDailyContent();
    summary.articles = contentResult.total;
    summary.errors += contentResult.errors;
    console.log(`   ✅ 生成 ${contentResult.total} 篇, 失败 ${contentResult.errors} 篇`);
    
    // ======== 2. 保存文章草稿 ========
    console.log("\n📄 Step 2: 保存草稿");
    // 文章已由 content.generateDailyContent 自动保存
    // 如果 WordPress 已配置，推送草稿
    const wpConfig = wp.getConfig();
    if (wpConfig.username) {
      console.log("   WordPress 已配置，尝试推送草稿...");
      // wp.createPost() 将在配置后自动调用
    } else {
      console.log("   ⚠️ WordPress 未配置，文章仅保存至本地");
    }
    
    // ======== 3. 生成视频脚本 ========
    console.log("\n🎬 Step 3: 生成短视频脚本");
    const videoScripts = videoScript.generateDailyVideoScripts();
    summary.videoScripts = videoScripts.length;
    
    const videoDir = path.join(OUTPUT_DIR, "video");
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });
    
    videoScripts.forEach((script, i) => {
      const filename = `${summary.date}-video-script-${i + 1}.json`;
      fs.writeFileSync(
        path.join(videoDir, filename),
        JSON.stringify(script, null, 2),
        "utf-8"
      );
      console.log(`   ✅ 视频脚本 ${i + 1}: ${script.title}`);
    });
    
    // ======== 4. 生成社媒文案 ========
    console.log("\n📱 Step 4: 生成社媒文案");
    const socialDir = path.join(OUTPUT_DIR, "social");
    if (!fs.existsSync(socialDir)) fs.mkdirSync(socialDir, { recursive: true });
    
    const articles = report.getTodayArticles();
    for (const article of articles) {
      const socialCopy = social.generateAllSocialCopy(article, article.lang);
      if (socialCopy) {
        const filename = `${summary.date}-social-${article.lang}-${article.slug || "article"}.json`;
        fs.writeFileSync(
          path.join(socialDir, filename),
          JSON.stringify(socialCopy, null, 2),
          "utf-8"
        );
        summary.socialCopy++;
      }
    }
    console.log(`   ✅ 生成 ${summary.socialCopy} 组社媒文案`);
    
    // ======== 5. 更新 Sitemap ========
    console.log("\n🗺️ Step 5: 更新 Sitemap");
    const sitemapResult = await seoService.updateSitemap();
    console.log(`   ✅ Sitemap: 共 ${sitemapResult.total} 条, 新增 ${sitemapResult.new} 条`);
    
    // ======== 6. SEO 检查 ========
    console.log("\n🔍 Step 6: SEO 检查");
    const seoResult = await seoService.runSEOCheck();
    console.log(`   ✅ 检查 ${seoResult.checked} 篇文章, 发现 ${seoResult.issues.length} 个问题`);
    if (seoResult.issues.length > 0) {
      summary.warnings = seoResult.issues.length;
      seoResult.issues.slice(0, 10).forEach(issue => {
        console.log(`   ⚠️  [${issue.lang}] ${issue.file}: ${issue.message}`);
      });
    }
    
    // ======== 7. 生成日报 ========
    console.log("\n📊 Step 7: 生成运营日报");
    const dailyReport = report.generateDailyReport();
    console.log(`   ✅ 日报已保存: ${dailyReport.path}`);
    
    // ======== 完成 ========
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n" + "=".repeat(60));
    console.log("✅ 每日运营完成!");
    console.log(`⏱️  耗时: ${elapsed} 秒`);
    console.log(`📝 文章: ${summary.articles} 篇`);
    console.log(`🎬 视频脚本: ${summary.videoScripts} 条`);
    console.log(`📱 社媒文案: ${summary.socialCopy} 组`);
    console.log(`⚠️  SEO 问题: ${summary.warnings} 个`);
    console.log("=".repeat(60));
    
    return summary;
  } catch (e) {
    console.error(`\n❌ 每日运营失败: ${e.message}`);
    console.error(e.stack);
    summary.errors++;
    return summary;
  }
}

// 执行
main().then(summary => {
  process.exit(summary.errors > 0 ? 1 : 0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
