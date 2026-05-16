/**
 * 指南帮旅游 - 免费图片采集器
 *
 * 从 Unsplash 下载海南各市县的真实配图（免费、无版权）
 * Unsplash 图片可免费用于商业用途，无需署名
 *
 * 用法: node scripts/fetch-images.js
 *
 * 注意：由于 Unsplash API 需要注册，本脚本使用 Unsplash 的直链 CDN 下载
 * 图片来源均为 Unsplash 上公开的海南/中国旅游摄影作品
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const IMG_DIR = path.join(ROOT, "output", "site", "images");

// 海南各市县对应的 Unsplash 真实图片直链
// 这些图片来自 Unsplash 摄影师上传的海南/中国旅游摄影作品
const DEST_IMAGES = {
  // === 热门目的地 ===
  "三亚":   "https://images.unsplash.com/photo-1530878902700-2a0c00b1e724?w=800&q=80",
  "sanya":  "https://images.unsplash.com/photo-1530878902700-2a0c00b1e724?w=800&q=80",
  "海口":   "https://images.unsplash.com/photo-1596178060671-7a80dc8058e8?w=800&q=80",
  "haikou": "https://images.unsplash.com/photo-1596178060671-7a80dc8058e8?w=800&q=80",
  
  // === 其他目的地（使用通用中国/海南旅游图片） ===
  "万宁":   "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800&q=80",
  "wanning":"https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800&q=80",
  "儋州":   "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "danzhou":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "陵水":   "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&q=80",
  "lingshui":"https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&q=80",
  "文昌":   "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
  "wenchang":"https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80",
  "琼海":   "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  "qionghai":"https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  "五指山": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "wuzhishan":"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  
  // === 备用通用图片 ===
  "东方":   "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80",
  "定安":   "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
  "屯昌":   "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  "澄迈":   "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  "临高":   "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80",
  "昌江":   "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "乐东":   "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  "保亭":   "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "琼中":   "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "白沙":   "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
  "三沙":   "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&q=80",

  // 默认
  "default":"https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"
};

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    https.get(url, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(destPath).size;
        resolve(size);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log("=".repeat(60));
  console.log("📸 指南帮旅游 - 免费图片采集");
  console.log("=".repeat(60));
  
  // 创建图片目录
  if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
  }
  
  const dests = [
    "三亚", "sanya", "海口", "haikou", "万宁", "wanning", "儋州", "danzhou",
    "陵水", "lingshui", "文昌", "wenchang", "琼海", "qionghai", "五指山", "wuzhishan",
    "东方", "定安", "屯昌", "澄迈", "临高", "昌江", "乐东", "保亭", "琼中", "白沙", "三沙"
  ];
  
  let success = 0;
  let failed = 0;
  
  for (const dest of dests) {
    const url = DEST_IMAGES[dest] || DEST_IMAGES["default"];
    const filename = dest.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".jpg";
    const destPath = path.join(IMG_DIR, filename);
    
    if (fs.existsSync(destPath)) {
      const size = fs.statSync(destPath).size;
      console.log(`  ⏭️  ${dest}: 已缓存 (${Math.round(size/1024)}KB)`);
      success++;
      continue;
    }
    
    try {
      process.stdout.write(`  📥 ${dest}... `);
      const size = await downloadImage(url, destPath);
      console.log(`${Math.round(size/1024)}KB ✅`);
      success++;
    } catch (e) {
      console.log(`失败 ❌ (${e.message})`);
      failed++;
    }
    
    // 避免请求过快
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`✅ 完成: 成功 ${success} 张, 失败 ${failed} 张`);
  console.log(`📁 图片目录: ${IMG_DIR}`);
  console.log("=".repeat(60));
}

main().catch(e => {
  console.error("❌ 采集失败:", e.message);
  process.exit(1);
});
