/**
 * 指南帮旅游 - SEO 自动优化服务
 * 负责关键词检查、标题优化、Meta 标签、内链检查、Sitemap 更新
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const ARTICLES_DIR = path.join(__dirname, "../articles");
const LOG_DIR = path.join(__dirname, "../logs");

/**
 * 加载关键词配置
 */
function loadKeywords() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "keywords.json"), "utf-8"));
  } catch (e) {
    return {};
  }
}

/**
 * 检查文章标题是否包含目标关键词
 */
function checkTitleSEO(title, keywords) {
  const results = [];
  for (const kw of keywords) {
    if (title.toLowerCase().includes(kw.keyword.toLowerCase())) {
      results.push({ keyword: kw.keyword, found: true, priority: kw.priority });
    }
  }
  return results;
}

/**
 * 生成 SEO 优化的 Meta Description
 */
function generateMetaDescription(content, keyword, maxLen = 160) {
  let desc = content.replace(/<[^>]*>/g, "").substring(0, maxLen - 3);
  if (desc.length >= maxLen - 3) desc += "...";
  
  // 确保包含关键词
  if (!desc.toLowerCase().includes(keyword.toLowerCase())) {
    desc = `${keyword} - ${desc}`;
    if (desc.length > maxLen) desc = desc.substring(0, maxLen - 3) + "...";
  }
  
  return desc;
}

/**
 * 生成 Slug
 */
function generateSlug(title, lang = "zh") {
  // 多语言 Slug 处理
  if (lang === "en") {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\-\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80);
  }
  
  // 中文使用拼音音译 + 关键词
  return title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

/**
 * 检查文章内链
 */
function checkInternalLinks(content, internalLinks) {
  const issues = [];
  for (const link of internalLinks) {
    if (!content.includes(link.url)) {
      issues.push({ link: link.text, url: link.url, status: "missing" });
    }
  }
  return issues;
}

/**
 * 生成文章 URL 记录表
 */
function generateSitemapEntry(lang, slug, date) {
  const langDir = { zh: "/zh/", en: "/en/", ru: "/ru/", ko: "/ko/", ja: "/ja/", th: "/th/" };
  return {
    loc: `${langDir[lang] || "/zh/"}blog/${slug}/`,
    lastmod: date || new Date().toISOString().split("T")[0],
    changefreq: "weekly",
    priority: 0.8
  };
}

/**
 * 更新本地 Sitemap 记录
 */
async function updateSitemap() {
  const sitemapPath = path.join(DATA_DIR, "sitemap-records.json");
  let records = [];
  
  // 加载已有记录
  try {
    records = JSON.parse(fs.readFileSync(sitemapPath, "utf-8"));
  } catch (e) {
    records = [];
  }
  
  // 扫描所有文章目录
  const langDirs = fs.readdirSync(ARTICLES_DIR).filter(d => !d.startsWith("."));
  let newCount = 0;
  
  for (const lang of langDirs) {
    const langPath = path.join(ARTICLES_DIR, lang);
    const files = fs.readdirSync(langPath).filter(f => f.endsWith(".json"));
    
    for (const file of files) {
      try {
        const article = JSON.parse(fs.readFileSync(path.join(langPath, file), "utf-8"));
        if (article.slug) {
          const existing = records.find(r => r.slug === article.slug && r.lang === lang);
          if (!existing) {
            records.push({
              lang,
              slug: article.slug,
              title: article.title,
              url: `${lang === "en" ? "/en" : "/zh"}/blog/${article.slug}/`,
              created: article.savedAt || new Date().toISOString(),
              lastmod: new Date().toISOString().split("T")[0]
            });
            newCount++;
          }
        }
      } catch (e) {
        // 跳过无效文件
      }
    }
  }
  
  fs.writeFileSync(sitemapPath, JSON.stringify(records, null, 2), "utf-8");
  return { total: records.length, new: newCount };
}

/**
 * 运行完整 SEO 检查
 */
async function runSEOCheck(lang = null) {
  const keywords = loadKeywords();
  const results = {
    checked: 0,
    issues: [],
    passed: 0,
    timestamp: new Date().toISOString()
  };
  
  const langsToCheck = lang ? [lang] : Object.keys(keywords);
  
  for (const l of langsToCheck) {
    const langPath = path.join(ARTICLES_DIR, l);
    if (!fs.existsSync(langPath)) continue;
    
    const files = fs.readdirSync(langPath).filter(f => f.endsWith(".json"));
    const langKeywords = keywords[l] || [];
    
    for (const file of files) {
      try {
        const article = JSON.parse(fs.readFileSync(path.join(langPath, file), "utf-8"));
        results.checked++;
        
        // 检查标题
        if (article.title && langKeywords.length > 0) {
          const titleKeywords = checkTitleSEO(article.title, langKeywords);
          if (titleKeywords.length === 0) {
            results.issues.push({ file, lang: l, type: "title_keyword", message: "标题不含目标关键词" });
          }
        }
        
        // 检查 Meta Description
        if (!article.metaDescription || article.metaDescription.length < 50) {
          results.issues.push({ file, lang: l, type: "meta_description", message: "Meta Description 缺失或过短" });
        }
        
        // 检查 FAQ
        if (!article.faq || article.faq.length < 2) {
          results.issues.push({ file, lang: l, type: "faq", message: "FAQ 不足 2 条" });
        }
        
        // 检查图片 ALT
        if (!article.imageAlt) {
          results.issues.push({ file, lang: l, type: "image_alt", message: "缺少图片 ALT 描述" });
        }
        
        results.passed++;
      } catch (e) {
        results.issues.push({ file, lang: l, type: "parse_error", message: e.message });
      }
    }
  }
  
  return results;
}

module.exports = {
  checkTitleSEO,
  generateMetaDescription,
  generateSlug,
  checkInternalLinks,
  generateSitemapEntry,
  updateSitemap,
  runSEOCheck,
  loadKeywords
};
