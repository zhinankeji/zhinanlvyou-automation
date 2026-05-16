/**
 * 指南帮旅游 - Cloudflare Pages 自动部署脚本
 * 使用 wrangler CLI 部署
 * 用法: node scripts/deploy.js
 */

// 加载 .env (不需要再 require path/fs，后面已声明)
(function() {
  try {
    const envPath = require("path").join(__dirname, "..", ".env");
    if (require("fs").existsSync(envPath)) {
      const envContent = require("fs").readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const [key, ...vals] = line.split("=");
        if (key && vals.length > 0 && !key.startsWith("#")) {
          process.env[key.trim()] = vals.join("=").trim();
        }
      }
    }
  } catch(e) { /* ignore .env errors */ }
})();

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const SITE_DIR = path.join(ROOT, "output", "site");
const WRANGLER = path.join(ROOT, "node_modules", ".bin", "wrangler");
const PROJECT_NAME = process.env.CLOUDFLARE_PAGES_PROJECT || "zhinanlvyou";

function main() {
  console.log("=".repeat(60));
  console.log("🌐 指南帮旅游 - Cloudflare Pages 部署");
  console.log("=".repeat(60));

  if (!fs.existsSync(SITE_DIR)) {
    console.error(`❌ 站点目录不存在: ${SITE_DIR}`);
    console.log("   请先运行: npm run build-site");
    process.exit(1);
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    console.error("❌ 请在 .env 中配置 CLOUDFLARE_API_TOKEN");
    process.exit(1);
  }

  // 统计文件
  let count = 0;
  function countFiles(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) countFiles(full);
      else count++;
    }
  }
  countFiles(SITE_DIR);
  console.log(`\n📦 发现 ${count} 个文件`);
  console.log(`📤 部署到 Cloudflare Pages (${PROJECT_NAME})...\n`);

  try {
    const cmd = `"${WRANGLER}" pages deploy "${SITE_DIR}" --project-name=${PROJECT_NAME} --branch main`;
    const result = execSync(cmd, {
      cwd: ROOT,
      env: { ...process.env, CLOUDFLARE_API_TOKEN: token },
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
      shell: true
    });
    console.log(result.stdout?.toString() || "");
    
    // 提取部署 URL
    const match = result.stdout?.toString().match(/https:\/\/[^\s]+\.pages\.dev/);
    if (match) {
      console.log("=".repeat(60));
      console.log("✅ 部署成功!");
      console.log(`🌐 在线预览: ${match[0]}`);
      console.log(`🌐 正式域名: https://www.${PROJECT_NAME}.com/zh/`);
      console.log("=".repeat(60));
    }
  } catch (e) {
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
    console.error(`\n❌ 部署失败: ${e.message}`);
    process.exit(1);
  }
}

main();
