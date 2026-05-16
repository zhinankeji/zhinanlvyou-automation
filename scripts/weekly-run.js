/**
 * 指南帮旅游 - 每周运营脚本
 * 生成运营周报
 */

const report = require("../services/report");

async function main() {
  console.log("=".repeat(60));
  console.log("📊 指南帮旅游 - 每周运营报告生成");
  console.log(`📅 ${new Date().toISOString()}`);
  console.log("=".repeat(60));
  
  try {
    const weeklyReport = report.generateWeeklyReport();
    console.log(`\n✅ 周报已生成`);
    console.log(`📄 ${weeklyReport.path}`);
    console.log("\n" + weeklyReport.report);
  } catch (e) {
    console.error(`\n❌ 周报生成失败: ${e.message}`);
    process.exit(1);
  }
}

main();
