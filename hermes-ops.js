#!/usr/bin/env node
/**
 * 指南帮旅游 - AI 自动运营总控调度器 V2.0
 *
 * 一条命令，全自动完成：
 *   采集 → 生成 → SEO检查 → 建站 → 部署
 *
 * 用法:
 *   node hermes-ops.js            # 完整运营管线
 *   node hermes-ops.js collect    # 仅信息采集
 *   node hermes-ops.js generate   # 仅内容生成
 *   node hermes-ops.js build      # 仅构建 + 部署
 *   node hermes-ops.js seo        # 仅 SEO 检查
 *   node hermes-ops.js status     # 查看系统状态
 *   node hermes-ops.js auto       # 完全自动模式（含部署）
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const LOG_DIR = path.join(ROOT, "logs");
const DATA_DIR = path.join(ROOT, "data");


// 加载 .env
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const [key, ...vals] = line.split("=");
    if (key && vals.length > 0 && !key.startsWith("#")) {
      process.env[key.trim()] = vals.join("=").trim();
    }
  }
}
// ======== 配置 ========
const MODE = process.argv[2] || "full";

// ======== 日志工具 ========
function log(level, msg) {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  const dateStr = new Date().toISOString().split("T")[0];
  fs.appendFileSync(path.join(LOG_DIR, `${dateStr}.log`), line + "\n", "utf-8");
}

function runScript(scriptName, args = []) {
  const scriptPath = path.join(ROOT, "scripts", scriptName);
  if (!fs.existsSync(scriptPath)) {
    log("ERROR", `脚本不存在: ${scriptName}`);
    return null;
  }

  log("INFO", `▶️ 运行: node scripts/${scriptName} ${args.join(" ")}`);
  try {
    const result = execSync(
      `node "${scriptPath}" ${args.join(" ")}`,
      { cwd: ROOT, timeout: 300000, maxBuffer: 50 * 1024 * 1024, shell: true }
    );
    log("INFO", `✅ 完成: ${scriptName}`);
    return result.toString();
  } catch (e) {
    log("ERROR", `❌ 失败: ${scriptName} - ${e.message}`);
    if (e.stdout) log("INFO", e.stdout.toString().substring(0, 500));
    return null;
  }
}

// ======== 模式: 信息采集 ========
async function runCollect() {
  console.log("\n" + "=".repeat(60));
  console.log("📰 [1/5] AI 信息采集");
  console.log("=".repeat(60));

  const result = runScript("news-harvester.js");
  if (!result) return false;

  // 读取摘要信息
  const dateStr = new Date().toISOString().split("T")[0];
  const digestPath = path.join(LOG_DIR, `digest-${dateStr}.json`);
  if (fs.existsSync(digestPath)) {
    try {
      const digest = JSON.parse(fs.readFileSync(digestPath, "utf-8"));
      const urgent = digest.recommendedContentTypes?.zh?.filter(t => t.priority === "urgent") || [];
      if (urgent.length > 0) {
        log("INFO", `🔥 需要注意: ${urgent.map(t => t.type).join(", ")}`);
      }
    } catch (e) { /* ignore */ }
  }
  return true;
}

// ======== 模式: 内容生成 ========
async function runGenerate() {
  console.log("\n" + "=".repeat(60));
  console.log("📝 [2/5] AI 内容生成");
  console.log("=".repeat(60));

  return runScript("daily-run.js");
}

// ======== 模式: SEO 分析 ========
async function runSEO() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 [3/5] SEO 质量检查");
  console.log("=".repeat(60));

  return runScript("seo-monitor.js");
}

// ======== 模式: 构建静态站 ========
async function runBuild() {
  console.log("\n" + "=".repeat(60));
  console.log("🏗️  [4/5] 构建静态网站");
  console.log("=".repeat(60));

  return runScript("build-site.js");
}

// ======== 模式: 部署 ========
async function runDeploy() {
  console.log("\n" + "=".repeat(60));
  console.log("🌐 [5/5] 部署到 Cloudflare Pages");
  console.log("=".repeat(60));

  // 检查是否配置了部署
  const hasToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!hasToken) {
    log("WARN", "CLOUDFLARE_API_TOKEN 未配置，跳过部署");
    log("WARN", "配置方式：在 .env 文件中设置 CLOUDFLARE_API_TOKEN");
    return null;
  }

  return runScript("deploy.js");
}

// ======== 模式: 系统状态 ========
async function showStatus() {
  console.log("\n" + "=".repeat(60));
  console.log("🌴 指南帮旅游 - 系统状态");
  console.log("=".repeat(60));

  // 文章统计
  const articlesDir = path.join(ROOT, "articles");
  let totalArticles = 0;
  const langCounts = {};

  if (fs.existsSync(articlesDir)) {
    for (const lang of fs.readdirSync(articlesDir)) {
      const langPath = path.join(articlesDir, lang);
      if (!fs.existsSync(langPath)) continue;
      const count = fs.readdirSync(langPath).filter(f => f.endsWith(".json")).length;
      if (count > 0) {
        langCounts[lang] = count;
        totalArticles += count;
      }
    }
  }

  console.log(`\n📝 文章总数: ${totalArticles}`);
  for (const [lang, count] of Object.entries(langCounts)) {
    console.log(`   [${lang}]: ${count} 篇`);
  }

  // 网站信息
  const siteDir = path.join(ROOT, "output", "site");
  if (fs.existsSync(siteDir)) {
    let fileCount = 0;
    function countFiles(dir) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) countFiles(full);
        else fileCount++;
      }
    }
    countFiles(siteDir);
    console.log(`\n🌐 静态网站: ${fileCount} 个文件`);
  }

  // 域名
  console.log(`\n🔗 域名: www.zhinanlvyou.com (Cloudflare Pages)`);

  // 配置检查
  console.log(`\n📌 配置:`);
  console.log(`   AI_PROVIDER: ${process.env.AI_PROVIDER || "mock"}`);
  console.log(`   CLOUDFLARE_API_TOKEN: ${process.env.CLOUDFLARE_API_TOKEN ? "已配置 ✅" : "未配置 ⚠️"}`);
  console.log(`   CLOUDFLARE_PAGES_PROJECT: ${process.env.CLOUDFLARE_PAGES_PROJECT || "zhinanlvyou"}`);
  console.log(`   AUTO_PUBLISH: ${process.env.AUTO_PUBLISH || "false"}`);

  // 日志
  const dateStr = new Date().toISOString().split("T")[0];
  const logFile = path.join(LOG_DIR, `${dateStr}.log`);
  if (fs.existsSync(logFile)) {
    const logs = fs.readFileSync(logFile, "utf-8").split("\n").filter(l => l.trim());
    const errors = logs.filter(l => l.includes("[ERROR]"));
    console.log(`\n📋 今日日志: ${logs.length} 条, 错误 ${errors.length} 条`);
  }

  console.log("\n" + "=".repeat(60));
}

// ======== 主函数 ========
async function main() {
  const startTime = Date.now();

  console.log("");
  console.log("  🌴 指南帮旅游 - AI 自动运营系统 V2.0");
  console.log("  ========================================");

  switch (MODE) {
    case "collect":
      await runCollect();
      break;

    case "generate":
      await runGenerate();
      break;

    case "build":
      await runBuild();
      break;

    case "deploy":
      await runDeploy();
      break;

    case "seo":
      await runSEO();
      break;

    case "status":
      await showStatus();
      break;

    case "full":
      // 完整管线（不含部署）
      await runCollect();
      await runGenerate();
      await runSEO();
      await runBuild();
      break;

    case "auto":
      // 自动模式（含部署）
      await runCollect();
      await runGenerate();
      await runSEO();
      await runBuild();
      await runDeploy();
      break;

    default:
      console.log(`\n❌ 未知模式: ${MODE}`);
      console.log("用法: node hermes-ops.js [collect|generate|build|deploy|seo|status|full|auto]");
      process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  总耗时: ${elapsed}s`);
  console.log("");
  log("INFO", `✅ 运营完成 (模式: ${MODE}, 耗时: ${elapsed}s)`);
}

main().catch(e => {
  log("ERROR", `系统故障: ${e.message}`);
  process.exit(1);
});
