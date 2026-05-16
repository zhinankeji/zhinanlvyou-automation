/**
 * 指南帮旅游 - 日志系统
 */
const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "../../logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getDateStr() {
  return new Date().toISOString().split("T")[0];
}

function getTimestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function log(level, module, message, data) {
  const timestamp = getTimestamp();
  const line = `[${timestamp}] [${level}] [${module}] ${message}`;
  const colors = { INFO: "\x1b[32m", WARN: "\x1b[33m", ERROR: "\x1b[31m", DEBUG: "\x1b[36m" };
  const color = colors[level] || "\x1b[0m";
  console.log(`${color}${line}\x1b[0m`);
  if (data) console.log(`  ${JSON.stringify(data, null, 2)}`);
  
  const logFile = path.join(LOG_DIR, `${getDateStr()}.log`);
  fs.appendFileSync(logFile, `${line}\n`, "utf-8");
  if (data) fs.appendFileSync(logFile, `  ${JSON.stringify(data)}\n`, "utf-8");
}

module.exports = {
  info: (m, msg, d) => log("INFO", m, msg, d),
  warn: (m, msg, d) => log("WARN", m, msg, d),
  error: (m, msg, d) => log("ERROR", m, msg, d),
  debug: (m, msg, d) => log("DEBUG", m, msg, d),
  getTodayLog() {
    const logFile = path.join(LOG_DIR, `${getDateStr()}.log`);
    return fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf-8") : "";
  }
};
