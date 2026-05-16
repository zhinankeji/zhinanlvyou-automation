/**
 * 指南帮旅游 - WordPress API 客户端
 * 用于自动发布草稿到 WordPress
 */

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "../config/wordpress.json");

// 默认配置
let wpConfig = {
  siteUrl: process.env.WP_SITE_URL || "https://www.zhinanlvyou.com",
  apiBase: process.env.WP_API_BASE || "https://www.zhinanlvyou.com/wp-json/wp/v2",
  authEndpoint: process.env.WP_AUTH_ENDPOINT || "https://www.zhinanlvyou.com/wp-json/jwt-auth/v1/token",
  username: process.env.WP_USERNAME || "",
  applicationPassword: process.env.WP_APPLICATION_PASSWORD || "",
  status: process.env.WP_POST_STATUS || "draft"
};

// 尝试加载本地配置
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const local = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    wpConfig = { ...wpConfig, ...local };
  }
} catch (e) {
  // 忽略配置文件读取错误
}

/**
 * 获取 JWT Token（用于认证）
 */
function getAuthToken() {
  return new Promise((resolve, reject) => {
    if (!wpConfig.username || !wpConfig.applicationPassword) {
      resolve({ token: null, basic: Buffer.from(`${wpConfig.username}:${wpConfig.applicationPassword}`).toString("base64") });
      return;
    }

    const data = JSON.stringify({
      username: wpConfig.username,
      password: wpConfig.applicationPassword
    });

    const url = new URL(wpConfig.authEndpoint);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          resolve({ token: json.token, basic: null });
        } catch (e) {
          resolve({ token: null, basic: null });
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

/**
 * 获取授权头
 */
async function getAuthHeaders() {
  const auth = await getAuthToken();
  if (auth.token) {
    return { Authorization: `Bearer ${auth.token}` };
  }
  if (auth.basic) {
    return { Authorization: `Basic ${auth.basic}` };
  }
  return {};
}

/**
 * 创建 WordPress 文章草稿
 * @param {object} postData - 文章数据
 * @param {string} postData.title - 标题
 * @param {string} postData.content - HTML 正文
 * @param {string} postData.slug - URL Slug
 * @param {string} postData.excerpt - 摘要
 * @param {string} [postData.status] - draft / publish / pending
 * @param {string[]} [postData.tags] - 标签数组
 * @param {number[]} [postData.categories] - 分类 ID 数组
 * @param {string} [postData.metaDescription] - SEO 描述
 * @returns {Promise<object>} WordPress 响应
 */
async function createPost(postData) {
  if (!wpConfig.username) {
    console.warn("⚠️ WordPress 未配置用户名，跳过发布");
    return { id: null, link: null, status: "skipped", message: "WordPress 未配置" };
  }

  const headers = await getAuthHeaders();
  const postBody = {
    title: postData.title,
    content: postData.content,
    slug: postData.slug,
    excerpt: postData.excerpt || "",
    status: postData.status || wpConfig.status || "draft",
    comment_status: "closed",
    ping_status: "closed"
  };

  // 添加 Yoast SEO Meta Description（如果 WP 有 Yoast）
  if (postData.metaDescription) {
    postBody.meta = {
      _yoast_wpseo_metadesc: postData.metaDescription
    };
  }

  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(postBody);
    const url = new URL(`${wpConfig.apiBase}/posts`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ id: json.id, link: json.link, status: json.status, slug: json.slug });
          } else {
            resolve({ id: null, link: null, status: "error", error: json.message || body.substring(0, 200) });
          }
        } catch (e) {
          resolve({ id: null, link: null, status: "error", error: `解析失败: ${body.substring(0, 200)}` });
        }
      });
    });
    req.on("error", (e) => resolve({ id: null, link: null, status: "error", error: e.message }));
    req.write(bodyStr);
    req.end();
  });
}

/**
 * 更新已有文章
 */
async function updatePost(postId, postData) {
  const headers = await getAuthHeaders();
  const bodyStr = JSON.stringify(postData);
  
  return new Promise((resolve, reject) => {
    const url = new URL(`${wpConfig.apiBase}/posts/${postId}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          resolve({ id: json.id, link: json.link, status: json.status });
        } catch (e) {
          resolve({ id: null, status: "error", error: e.message });
        }
      });
    });
    req.on("error", (e) => resolve({ id: null, status: "error", error: e.message }));
    req.write(bodyStr);
    req.end();
  });
}

/**
 * 配置 WordPress 连接信息
 */
function configure(config) {
  wpConfig = { ...wpConfig, ...config };
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(wpConfig, null, 2), "utf-8");
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { createPost, updatePost, configure, getConfig: () => ({ ...wpConfig }) };
