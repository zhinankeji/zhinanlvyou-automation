/**
 * 批量内容填充脚本 V2 — 全海南19市县 × 12内容类型
 * 用法: node scripts/batch-generate.js
 */

const path = require("path");
const fs = require("fs");
const content = require("../services/content");

const CONTENT_TYPES = {
  zh: ["海南景点", "三亚旅游", "海南自由行", "海南亲子游", "海南美食", "海南海滩",
       "海南旅游路线", "海南文化", "海南入境指南", "海南门票咨询", "海南本地玩法", "海南避坑指南"],
  en: ["Hainan Attractions", "Sanya Travel", "Hainan Free Travel", "Hainan Family Travel",
       "Hainan Food", "Hainan Beaches", "Hainan Travel Routes", "Hainan Culture",
       "Hainan Entry Guide", "Hainan Tickets", "Hainan Local Tips", "Hainan Pitfall Guide"]
};

const DESTINATIONS = {
  zh: ["三亚", "海口", "儋州", "万宁", "琼海", "文昌", "五指山", "东方",
       "陵水", "定安", "屯昌", "澄迈", "临高", "昌江", "乐东", "保亭", "琼中", "白沙", "三沙"],
  en: ["Sanya", "Haikou", "Danzhou", "Wanning", "Qionghai", "Wenchang", "Lingshui", "Baoting"]
};

async function main() {
  console.log("=".repeat(60));
  console.log("📦 指南帮旅游 - 全海南批量内容填充 V2");
  console.log("=".repeat(60));
  
  let totalGenerated = 0;
  let totalErrors = 0;
  
  console.log("\n📝 中文 — " + DESTINATIONS.zh.length + "市县 × 12类型:");
  for (const dest of DESTINATIONS.zh) {
    let count = 0;
    for (const type of CONTENT_TYPES.zh) {
      try {
        const article = await content.generateArticle("zh", type, dest);
        if (article) { content.saveArticle("zh", article); count++; totalGenerated++; }
        else { totalErrors++; }
      } catch (e) { totalErrors++; }
    }
    console.log("  " + dest + ": " + count + " 篇");
  }
  
  console.log("\n📝 English — " + DESTINATIONS.en.length + " cities × 12 types:");
  for (const dest of DESTINATIONS.en) {
    let count = 0;
    for (const type of CONTENT_TYPES.en) {
      try {
        const article = await content.generateArticle("en", type, dest);
        if (article) { content.saveArticle("en", article); count++; totalGenerated++; }
        else { totalErrors++; }
      } catch (e) { totalErrors++; }
    }
    console.log("  " + dest + ": " + count + " articles");
  }
  
  console.log("\n📝 Other languages:");
  for (const lang of ["ru", "ko", "ja", "th"]) {
    let count = 0;
    for (const type of ["Attractions", "Travel Tips", "Food", "Culture"]) {
      try {
        const article = await content.generateArticle(lang, type, "Hainan");
        if (article) { content.saveArticle(lang, article); count++; totalGenerated++; }
        else { totalErrors++; }
      } catch (e) { totalErrors++; }
    }
    console.log("  [" + lang + "]: " + count + " articles");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ 完成: 成功 " + totalGenerated + " 篇, 失败 " + totalErrors + " 篇");
  console.log("=".repeat(60));
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
