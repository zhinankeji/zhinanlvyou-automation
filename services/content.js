/**
 * 指南帮旅游 - 多语言内容生成引擎
 * 负责：文章生成、图文提示词、联系模块嵌入
 */

const fs = require("fs");
const path = require("path");
const ai = require("./ai");
const seo = require("./seo");
const wp = require("./wordpress");

const DATA_DIR = path.join(__dirname, "../data");
const ARTICLES_DIR = path.join(__dirname, "../articles");

/**
 * 文章内容类型列表
 */
const CONTENT_TYPES = {
  zh: [
    "海南景点", "三亚旅游", "海南自由行", "海南亲子游",
    "海南美食", "海南海滩", "海南旅游路线", "海南文化",
    "海南入境指南", "海南门票咨询", "海南本地玩法", "海南避坑指南"
  ],
  en: [
    "Hainan Attractions", "Sanya Travel", "Hainan Free Travel", "Hainan Family Travel",
    "Hainan Food", "Hainan Beaches", "Hainan Travel Routes", "Hainan Culture",
    "Hainan Entry Guide", "Hainan Tickets", "Hainan Local Tips", "Hainan Pitfall Guide"
  ]
};

/**
 * 加载目标地数据
 */
function loadDestinations(lang = "zh") {
  try {
    const all = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "destinations.json"), "utf-8"));
    return all[lang] || all["zh"] || [];
  } catch (e) {
    return [];
  }
}

/**
 * 加载语言配置
 */
function loadLanguages() {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "languages.json"), "utf-8"));
  } catch (e) {
    return {};
  }
}

/**
 * 获取今日内容类型（轮换）
 */
function getTodaysContentTypes(lang, index) {
  const types = CONTENT_TYPES[lang] || CONTENT_TYPES["zh"];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const offset = (dayOfYear + index) % types.length;
  return types[offset];
}

/**
 * 获取文章生成提示词
 */
function getPrompt(lang, category, destination) {
  const langs = loadLanguages();
  const langInfo = langs[lang] || langs["zh"];
  
  const prompts = {
    zh: {
      system: `你是指南帮旅游的 AI 内容运营专家。你负责撰写专业、实用的海南旅游攻略文章。

要求：
1. 文章必须专业、可信、实用
2. 标题和内容要包含 SEO 关键词
3. 不要编造具体的门票价格、开放时间等官方数据
4. 使用友好、热情的中文语调
5. 所有底部必须加上联系模块
6. 内容要突显海南本地服务的专业性

文章必须包含以下结构：
- title: 文章标题
- seoTitle: SEO 优化标题（含关键词）
- metaDescription: 160字以内的 Meta 描述
- slug: URL Slug
- summary: 文章摘要
- content: HTML 格式正文（h2/h3/p/ul）
- faq: 常见问题数组 [{q, a}]
- tags: 标签数组
- category: 分类
- internalLinks: 内链数组 [{text, url}]
- imageAlt: 封面图 ALT 描述
- contactModule: 联系咨询模块`,
      user: `请写一篇关于「${category}」的海南旅游攻略文章。
目标地：${destination || "海南"}
语言：中文
风格：实用攻略型，对自由行游客有帮助
要求：包含 FAQ 和内链，使用 HTML 格式正文。`
    },
    en: {
      system: `You are an AI content operations expert for Guide to Hainan. Write professional, practical Hainan travel guide articles.

Requirements:
1. Professional, trustworthy, and practical
2. Titles and content must include SEO keywords
3. Don't fabricate specific ticket prices, opening hours, etc.
4. Use friendly, welcoming English tone
5. Include contact module at the bottom
6. Highlight local Hainan service expertise

Article structure:
- title: Article title
- seoTitle: SEO optimized title
- metaDescription: Meta description (max 160 chars)
- slug: URL slug
- summary: Article summary
- content: HTML body (h2/h3/p/ul)
- faq: FAQ array [{q, a}]
- tags: Tags array
- category: Category
- internalLinks: Internal links [{text, url}]
- imageAlt: Cover image ALT description
- contactModule: Contact inquiry module`,
      user: `Write a travel guide article about "${category}" in Hainan.
Destination: ${destination || "Hainan"}
Language: English
Style: Practical guide for independent travelers
Include FAQ and internal links in HTML format.`
    }
  };

  return prompts[lang] || prompts["en"];
}

/**
 * 生成一篇文章（单篇）
 */
async function generateArticle(lang, category = null, destination = null) {
  const langs = loadLanguages();
  const langInfo = langs[lang] || langs["zh"];
  const prompt = getPrompt(lang, category || getTodaysContentTypes(lang, 0), destination);
  
  try {
    const result = await ai.generate(prompt.system, prompt.user, { temperature: 0.8 });
    let article;
    
    if (typeof result === "object" && result !== null && result.title) {
      // 模板模式：直接返回对象
      article = result;
    } else {
      try {
        article = JSON.parse(result);
      } catch (e) {
        // 从文本中提取 JSON
        const jsonMatch = result.match(/{[\s\S]*}/);
        if (jsonMatch) {
          article = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("无法解析 AI 返回内容");
        }
      }
    }
    
    // 补充必需字段
    article.lang = lang;
    article.destination = destination || "Hainan";
    article.generatedAt = new Date().toISOString();
    
    // 确保联系模块
    if (!article.contactModule) {
      article.contactModule = lang === "zh"
        ? "如需咨询海南景点门票、旅游路线或本地旅行服务，可通过微信、WhatsApp 或邮箱联系指南帮旅游。"
        : "For Hainan attraction tickets, travel routes or local trip support, contact Guide to Hainan by WhatsApp or email.";
    }
    

    return article;
  } catch (e) {
    console.error(`生成文章失败 [${lang}/${category}]: ${e.message}`);
    return null;
  }
}

/**
 * 保存文章到本地
 */
function saveArticle(lang, article) {
  const langDir = path.join(ARTICLES_DIR, lang);
  if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });
  
  const dateStr = new Date().toISOString().split("T")[0];
  const slug = article.slug || seo.generateSlug(article.title, lang);
  const filename = `${dateStr}-${slug}.json`;
  const filepath = path.join(langDir, filename);
  
  article.savedAt = new Date().toISOString();
  article.filePath = filepath;
  
  fs.writeFileSync(filepath, JSON.stringify(article, null, 2), "utf-8");
  return filepath;
}

/**
 * 为某语言生成所有今日文章
 */
async function generateAll(lang) {
  const langs = loadLanguages();
  const langInfo = langs[lang];
  if (!langInfo) {
    console.error(`不支持的语言: ${lang}`);
    return { lang, generated: 0, errors: 0, articles: [] };
  }
  
  const count = langInfo.daily || 1;
  const destinations = loadDestinations(lang);
  const results = [];
  let errors = 0;
  
  for (let i = 0; i < count; i++) {
    const category = getTodaysContentTypes(lang, i);
    const dest = destinations.length > 0 ? destinations[i % destinations.length].name : null;
    
    console.log(`📝 生成 [${lang}] 第 ${i + 1}/${count} 篇 - ${category}`);
    const article = await generateArticle(lang, category, dest);
    
    if (article) {
      const savedPath = saveArticle(lang, article);
      results.push({ title: article.title, category, savedPath });
      console.log(`  ✅ 已保存: ${article.title}`);
    } else {
      errors++;
      console.log(`  ❌ 生成失败: ${category}`);
    }
  }
  
  return { lang, generated: results.length, errors, articles: results };
}

/**
 * 批量生成所有语言的文章
 */
async function generateDailyContent() {
  const langs = loadLanguages();
  const results = [];
  let total = 0;
  let errors = 0;
  
  for (const lang of Object.keys(langs)) {
    const result = await generateAll(lang);
    results.push(result);
    total += result.generated;
    errors += result.errors;
  }
  
  return { total, errors, results };
}

module.exports = {
  generateArticle,
  generateAll,
  generateDailyContent,
  saveArticle,
  getTodaysContentTypes,
  CONTENT_TYPES
};
