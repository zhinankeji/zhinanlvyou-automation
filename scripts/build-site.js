/**
 * 指南帮旅游 - 静态网站生成器 V2.0
 * 将 JSON 文章转换为完整 SEO 优化静态网站
 * 用法: node scripts/build-site.js
 */

const fs = require("fs");
const path = require("path");

// ========== 配置 ==========
const SITE_CONFIG = {
  name: "指南帮旅游",
  nameEn: "Guide to Hainan",
  domain: "https://www.zhinanlvyou.com",
  desc: "全球游客的海南旅行入口 - 多语种旅游攻略",
  descEn: "Global travelers' gateway to Hainan - multilingual travel guides",
  wechat: "指南帮旅游",
  whatsapp: "Guide to Hainan",
  email: "info@zhinanlvyou.com",
  contactZh: "如需咨询海南景点门票、旅游路线或本地旅行服务，可通过微信、WhatsApp 或邮箱联系指南帮旅游。",
  contactEn: "For Hainan attraction tickets, travel routes or local trip support, contact Guide to Hainan."
};

const LANGUAGES = {
  zh: { name: "中文", locale: "zh-CN", ogLocale: "zh_CN", dir: "zh", flag: "🇨🇳",
        siteTitle: "指南帮旅游", siteDesc: "全球游客的海南旅行入口",
        heroTitle: "🌴 欢迎来到指南帮旅游", heroDesc: "全球游客的海南旅行入口 - 多语种旅游攻略",
        sectionTitle: "最新文章", emptyText: "暂无文章，敬请期待",
        backText: "返回首页", faqTitle: "常见问题", readMore: "阅读全文" },
  en: { name: "English", locale: "en-US", ogLocale: "en_US", dir: "en", flag: "🇺🇸",
        siteTitle: "Guide to Hainan", siteDesc: "Global travelers' gateway to Hainan",
        heroTitle: "🌴 Welcome to Guide to Hainan", heroDesc: "Your ultimate guide to Hainan travel - attractions, food, routes & tips",
        sectionTitle: "Latest Articles", emptyText: "No articles yet, stay tuned",
        backText: "Back to Home", faqTitle: "FAQ", readMore: "Read More" },
  ru: { name: "Русский", locale: "ru-RU", ogLocale: "ru_RU", dir: "ru", flag: "🇷🇺",
        siteTitle: "Guide to Hainan - Русский", siteDesc: "Путеводитель по Хайнань",
        heroTitle: "🌴 Добро пожаловать!", heroDesc: "Ваш путеводитель по Хайнаню",
        sectionTitle: "Последние статьи", emptyText: "Статьи скоро появятся",
        backText: "На главную", faqTitle: "Часто задаваемые вопросы", readMore: "Читать далее" },
  ko: { name: "한국어", locale: "ko-KR", ogLocale: "ko_KR", dir: "ko", flag: "🇰🇷",
        siteTitle: "Guide to Hainan - 한국어", siteDesc: "하이난 여행 가이드",
        heroTitle: "🌴 환영합니다!", heroDesc: "하이난 여행의 모든 것",
        sectionTitle: "최신 글", emptyText: "아직 글이 없습니다",
        backText: "홈으로", faqTitle: "자주 묻는 질문", readMore: "더 읽기" },
  ja: { name: "日本語", locale: "ja-JP", ogLocale: "ja_JP", dir: "ja", flag: "🇯🇵",
        siteTitle: "Guide to Hainan - 日本語", siteDesc: "海南島旅行ガイド",
        heroTitle: "🌴 ようこそ!", heroDesc: "海南島旅行の完全ガイド",
        sectionTitle: "最新記事", emptyText: "記事はまだありません",
        backText: "ホームへ", faqTitle: "よくある質問", readMore: "続きを読む" },
  th: { name: "ไทย", locale: "th-TH", ogLocale: "th_TH", dir: "th", flag: "🇹🇭",
        siteTitle: "Guide to Hainan - ไทย", siteDesc: "คู่มือท่องเที่ยวไหหลำ",
        heroTitle: "🌴 ยินดีต้อนรับ!", heroDesc: "คู่มือท่องเที่ยวไหหลำ",
        sectionTitle: "บทความล่าสุด", emptyText: "ยังไม่มีบทความ",
        backText: "กลับหน้าแรก", faqTitle: "คำถามที่พบบ่อย", readMore: "อ่านเพิ่มเติม" }
};

// ========== 路径 ==========
const ROOT = path.join(__dirname, "..");
const ARTICLES_DIR = path.join(ROOT, "articles");
const TEMPLATES_DIR = path.join(ROOT, "templates");
const OUTPUT_DIR = path.join(ROOT, "output", "site");

// ========== 工具函数 ==========
function readFileSync(filepath) {
  try { return fs.readFileSync(filepath, "utf-8"); } catch (e) { return null; }
}

function writeFileSync(filepath, content) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, content, "utf-8");
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getDateStr() {
  return new Date().toISOString().split("T")[0];
}

// ========== 加载文章 ==========
function loadAllArticles() {
  const allArticles = {};
  
  if (!fs.existsSync(ARTICLES_DIR)) return allArticles;
  
  const langDirs = fs.readdirSync(ARTICLES_DIR).filter(d => !d.startsWith("."));
  
  for (const lang of langDirs) {
    const langPath = path.join(ARTICLES_DIR, lang);
    if (!fs.existsSync(langPath)) continue;
    allArticles[lang] = [];
    
    const files = fs.readdirSync(langPath).filter(f => f.endsWith(".json"));
    for (const file of files) {
      try {
        const article = JSON.parse(fs.readFileSync(path.join(langPath, file), "utf-8"));
        article._lang = lang;
        article._file = file;
        article._date = file.split("-").slice(0, 3).join("-");
        allArticles[lang].push(article);
      } catch (e) {
        console.warn(`  ⚠️ 读取失败: ${lang}/${file} - ${e.message}`);
      }
    }
    
    // 按日期排序（最新在前）
    allArticles[lang].sort((a, b) => b._date.localeCompare(a._date));
  }
  
  return allArticles;
}

// ========== 生成 Hreflang 标签 ==========
function generateHreflangTags(lang, slug, baseUrl) {
  const tags = [];
  for (const [l, info] of Object.entries(LANGUAGES)) {
    const href = slug
      ? `${baseUrl}/${info.dir}/blog/${slug}/`
      : `${baseUrl}/${info.dir}/`;
    tags.push(`  <link rel="alternate" hreflang="${l}" href="${href}">`);
  }
  // x-default = English
  const defaultSlug = slug;
  const defaultUrl = defaultSlug
    ? `${baseUrl}/en/blog/${defaultSlug}/`
    : `${baseUrl}/en/`;
  tags.push(`  <link rel="alternate" hreflang="x-default" href="${defaultUrl}">`);
  return tags.join("\n");
}

function generateIndexHreflang(lang, baseUrl) {
  return generateHreflangTags(lang, null, baseUrl);
}

function generateArticleHreflang(lang, slug, baseUrl) {
  return generateHreflangTags(lang, slug, baseUrl);
}

// ========== 生成结构化数据 ==========
function generateArticleStructuredData(article, lang) {
  const langInfo = LANGUAGES[lang] || LANGUAGES.en;
  const baseUrl = SITE_CONFIG.domain;
  const slug = article.slug || "article";
  
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title || "",
    description: (article.metaDescription || article.summary || "").substring(0, 200),
    inLanguage: langInfo.locale,
    author: { "@type": "Organization", name: SITE_CONFIG.name },
    publisher: { "@type": "Organization", name: SITE_CONFIG.name },
    datePublished: article.generatedAt || article.savedAt || getDateStr(),
    dateModified: getDateStr(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/${langInfo.dir}/blog/${slug}/`
    }
  };
  
  let output = JSON.stringify(data, null, 2);
  
  // FAQ 结构化数据
  if (article.faq && Array.isArray(article.faq) && article.faq.length > 0) {
    const faqData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: article.faq.map(item => ({
        "@type": "Question",
        name: item.q || "",
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a || ""
        }
      }))
    };
    output += "\n\n" + JSON.stringify(faqData, null, 2);
  }
  
  return output;
}

// ========== 生成 Open Graph 标签 ==========
function generateOGTags(article, lang, isIndex = false) {
  const langInfo = LANGUAGES[lang] || LANGUAGES.en;
  const baseUrl = SITE_CONFIG.domain;
  let title, desc, url;
  
  if (isIndex) {
    title = langInfo.siteTitle;
    desc = langInfo.siteDesc;
    url = `${baseUrl}/${langInfo.dir}/`;
  } else {
    title = `${article.title || ""} | ${langInfo.siteTitle}`;
    desc = (article.metaDescription || article.summary || langInfo.siteDesc).substring(0, 200);
    url = `${baseUrl}/${langInfo.dir}/blog/${article.slug || "article"}/`;
  }
  
  return [
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:site_name" content="${SITE_CONFIG.name}">`,
    `<meta property="og:locale" content="${langInfo.ogLocale}">`,
    `<meta property="og:type" content="${isIndex ? "website" : "article"}">`
  ].join("\n");
}

// ========== 生成 Google 关键词标签 ==========
function generateKeywords(article) {
  if (!article) return "";
  const tags = article.tags || [];
  const cat = article.category || "";
  const keywords = [cat, ...tags].filter(Boolean).join(", ");
  return keywords;
}

// ========== 生成导航栏语言切换 ==========
function generateLangNav(currentLang) {
  // 主导航 — 目的地链接
  const mainNavItems = [];
  const mainLinks = [
    { label: "Destinations", labelZh: "目的地", url: "/" + currentLang + "/" },
    { label: "Travel Tips", labelZh: "攻略", url: "/" + currentLang + "/" }
  ];
  for (const item of mainLinks) {
    mainNavItems.push(`<a href="${item.url}">${currentLang === "zh" ? item.labelZh : item.label}</a>`);
  }
  // 关于链接指向 /about/
  mainNavItems.push(`<a href="/about/">${currentLang === "zh" ? "关于" : "About"}</a>`);
  
  // 语言切换器 — 紧凑格式
  const langItems = [];
  const langOrder = ["zh", "en", "ru", "ko", "ja", "th"];
  for (const lang of langOrder) {
    const info = LANGUAGES[lang];
    if (!info) continue;
    const isActive = lang === currentLang;
    const btnClass = isActive ? 'class="lang-btn active"' : 'class="lang-btn"';
    langItems.push(`<a href="/${info.dir}/" ${btnClass}>${info.flag}</a>`);
    if (lang !== langOrder[langOrder.length - 1]) {
      langItems.push(`<span class="lang-divider">|</span>`);
    }
  }
  
  return {
    mainNav: mainNavItems.join("\n          "),
    langSwitcher: langItems.join("\n          ")
  };
}

// ========== 生成文章 HTML ==========

function generateFeaturedImage(article, lang) {
  if (!article) return "";
  const dest = article.destination || "default";
  const destMap = {
  "三亚":"sanya","海口":"haikou","儋州":"danzhou","万宁":"wanning",
  "琼海":"qionghai","文昌":"wenchang","五指山":"wuzhishan","东方":"dongfang",
  "陵水":"lingshui","定安":"dingan","屯昌":"tunchang","澄迈":"chengmai",
  "临高":"lingao","昌江":"changjiang","乐东":"ledong","保亭":"baoting",
  "琼中":"qiongzhong","白沙":"baisha","三沙":"sansha",
  "Sanya":"sanya","Haikou":"haikou","Danzhou":"danzhou","Wanning":"wanning",
  "Qionghai":"qionghai","Wenchang":"wenchang","Lingshui":"lingshui","Baoting":"baoting",
  "Hainan":"default"
};
  const imgFile = (destMap[dest] || "default") + ".jpg";
  const alt = escapeHtml(article.title || "Hainan travel");
  const featImgUrls = {"sanya.jpg": "https://images.unsplash.com/photo-1530878902700-2a0c00b1e724?w=800&q=80", "haikou.jpg": "https://images.unsplash.com/photo-1596178060671-7a80dc8058e8?w=800&q=80", "wanning.jpg": "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800&q=80", "danzhou.jpg": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", "lingshui.jpg": "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&q=80", "wenchang.jpg": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80", "qionghai.jpg": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", "wuzhishan.jpg": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", "dongfang.jpg": "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", "dingan.jpg": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", "tunchang.jpg": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80", "chengmai.jpg": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80", "lingao.jpg": "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", "changjiang.jpg": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", "ledong.jpg": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", "baoting.jpg": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", "qiongzhong.jpg": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", "baisha.jpg": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", "sansha.jpg": "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&q=80", "default.jpg": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"};
return '<div class="featured-image" style="background-image:url(' + (featImgUrls[imgFile] || featImgUrls["default.jpg"]) + ');background-size:cover;background-position:center;min-height:320px"></div>';
}

function generateArticlePage(article, lang) {
  const langInfo = LANGUAGES[lang] || LANGUAGES.en;
  const baseUrl = SITE_CONFIG.domain;
  const slug = article.slug || "article";
  const canonicalUrl = `${baseUrl}/${langInfo.dir}/blog/${slug}/`;
  
  const template = readFileSync(path.join(TEMPLATES_DIR, "article.html"));
  if (!template) {
    console.error("❌ 模板文件 article.html 未找到");
    return null;
  }
  
  // FAQ
  let faqHtml = "";
  if (article.faq && Array.isArray(article.faq)) {
    faqHtml = article.faq.map(item => `
    <div class="faq-item">
      <div class="faq-q">${escapeHtml(item.q || "")}</div>
      <div class="faq-a">${item.a || ""}</div>
    </div>`).join("\n");
  }
  
  // Tags
  let tagsHtml = "";
  if (article.tags && Array.isArray(article.tags)) {
    tagsHtml = article.tags.map(t => `<span>#${escapeHtml(t)}</span>`).join("\n      ");
  }
  
  // 联系模块
  const contactHtml = lang === "zh"
    ? `<div class="contact-module"><p style="color:#075CB8;font-weight:bold;font-size:18px;margin-bottom:10px">📞 联系我们</p><p>${SITE_CONFIG.contactZh}</p><p style="margin-top:10px">📱 微信：${SITE_CONFIG.wechat} | 💬 WhatsApp：${SITE_CONFIG.whatsapp} | 📧 ${SITE_CONFIG.email}</p></div>`
    : `<div class="contact-module"><p style="color:#075CB8;font-weight:bold;font-size:18px;margin-bottom:10px">📞 Contact Us</p><p>${SITE_CONFIG.contactEn}</p><p style="margin-top:10px">💬 WhatsApp: ${SITE_CONFIG.whatsapp} | 📧 ${SITE_CONFIG.email}</p></div>`;
  
  const html = template
    .replace(/{{LANG}}/g, lang)
    .replace(/{{SEO_TITLE}}/g, escapeHtml(`${article.title || ""} | ${langInfo.siteTitle}`))
    .replace(/{{META_DESC}}/g, escapeHtml((article.metaDescription || article.summary || langInfo.siteDesc).substring(0, 200)))
    .replace(/{{KEYWORDS}}/g, escapeHtml(generateKeywords(article)))
    .replace(/{{CANONICAL_URL}}/g, canonicalUrl)
    .replace(/{{HREFLANG_TAGS}}/g, generateArticleHreflang(lang, slug, baseUrl))
    .replace(/{{STRUCTURED_DATA}}/g, `<script type="application/ld+json">\n${generateArticleStructuredData(article, lang)}\n</script>`)
    .replace(/{{OG_TAGS}}/g, generateOGTags(article, lang))
    .replace(/{{SITE_NAME}}/g, SITE_CONFIG.name)
    .replace(/{{LANG_NAME}}/g, langInfo.name)
    .replace(/{{TITLE}}/g, article.title || "")
    .replace(/{{PUBLISH_DATE}}/g, article._date || getDateStr())
    .replace(/{{CATEGORY}}/g, escapeHtml(article.category || ""))
    .replace(/{{FEATURED_IMAGE}}/g, generateFeaturedImage(article, lang))
    .replace(/{{CONTENT}}/g, (article.content || "") + "\n\n" + contactHtml)
    .replace(/{{FAQ_TITLE}}/g, langInfo.faqTitle)
    .replace(/{{FAQ_ITEMS}}/g, faqHtml)
    .replace(/{{TAGS}}/g, tagsHtml ? `标签：${tagsHtml}` : "")
    .replace(/{{BACK_TEXT}}/g, langInfo.backText)
    .replace(/{{WECHAT}}/g, SITE_CONFIG.wechat)
    .replace(/{{WHATSAPP}}/g, SITE_CONFIG.whatsapp)
    .replace(/{{EMAIL}}/g, SITE_CONFIG.email)
    .replace(/{{SITE_DESC}}/g, langInfo.siteDesc)
    .replace(/{{MAIN_NAV}}/g, generateLangNav(lang).mainNav)
    .replace(/{{LANG_SWITCHER}}/g, generateLangNav(lang).langSwitcher);
  
  return html;
}

// ========== 生成首页 HTML ==========
function generateIndexPage(lang, articles) {
  const langInfo = LANGUAGES[lang] || LANGUAGES.en;
  const baseUrl = SITE_CONFIG.domain;
  
  const template = readFileSync(path.join(TEMPLATES_DIR, "index.html"));
  if (!template) {
    console.error("❌ 模板文件 index.html 未找到");
    return null;
  }
  
      // 按目的地分组
      let cards = "";
      let listCards = "";
      
      if (articles && articles.length > 0) {
        // 将文章按目的地分组
        const groups = {};
        for (const a of articles) {
          const dest = a.destination || "Hainan";
          if (!groups[dest]) groups[dest] = [];
          groups[dest].push(a);
        }
        
        // 按目的地名称排序
        const destOrder = Object.keys(groups).sort();
        
        // 每个目的地取前 3 篇展示
        const allCards = [];
        for (const dest of destOrder) {
          const destArticles = groups[dest].slice(0, 4);
          // 添加目的地标题
          allCards.push('<div class="dest-section">');
          allCards.push('<h3 class="dest-heading"><span class="dest-icon">\u{1F3D4}</span> ' + escapeHtml(dest) + '</h3>');
          allCards.push('<div class="dest-grid">');
          
          for (const a of destArticles) {
            const slug = a.slug || "article";
            const summary = (a.summary || "").substring(0, 100);
            const destClass = "dest-" + dest.toLowerCase().replace(/[^a-z]/g, "");
            const destMap = {
  "三亚": "sanya", "海口": "haikou", "儋州": "danzhou", "万宁": "wanning",
  "琼海": "qionghai", "文昌": "wenchang", "五指山": "wuzhishan", "东方": "dongfang",
  "陵水": "lingshui", "定安": "dingan", "屯昌": "tunchang", "澄迈": "chengmai",
  "临高": "lingao", "昌江": "changjiang", "乐东": "ledong", "保亭": "baoting",
  "琼中": "qiongzhong", "白沙": "baisha", "三沙": "sansha",
  "Sanya": "sanya", "Haikou": "haikou", "Danzhou": "danzhou", "Wanning": "wanning",
  "Qionghai": "qionghai", "Wenchang": "wenchang", "Lingshui": "lingshui", "Baoting": "baoting",
  "Hainan": "default"
};
const imgFile = (destMap[a.destination] || "default") + ".jpg";
            const imgPath = '/images/' + imgFile;
            allCards.push('<div class="summary-item">');
            const imgUrls = {"sanya.jpg": "https://images.unsplash.com/photo-1530878902700-2a0c00b1e724?w=800&q=80", "haikou.jpg": "https://images.unsplash.com/photo-1596178060671-7a80dc8058e8?w=800&q=80", "wanning.jpg": "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=800&q=80", "danzhou.jpg": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", "lingshui.jpg": "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&q=80", "wenchang.jpg": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80", "qionghai.jpg": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", "wuzhishan.jpg": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", "dongfang.jpg": "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", "dingan.jpg": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", "tunchang.jpg": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80", "chengmai.jpg": "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80", "lingao.jpg": "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", "changjiang.jpg": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", "ledong.jpg": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", "baoting.jpg": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", "qiongzhong.jpg": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", "baisha.jpg": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", "sansha.jpg": "https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=800&q=80", "default.jpg": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"};
allCards.push('<div class="summary-item-image ' + destClass + '" style="background-image:url(' + (imgUrls[imgFile] || imgUrls["default.jpg"]) + ');background-size:cover;background-position:center"></div>');
            allCards.push('<div class="meta">' + escapeHtml(a.category || "") + '</div>');
            allCards.push('<h4><a href="/' + langInfo.dir + '/blog/' + slug + '/">' + escapeHtml(a.title || "") + '</a></h4>');
            allCards.push('<p>' + escapeHtml(summary) + '</p>');
            allCards.push('</div>');
          }
          
          allCards.push('</div></div>');
        }
        cards = allCards.join("\n");
      }
      const emptyState = (!articles || articles.length === 0)
    ? `<div class="empty-state"><div class="empty-icon">🏝️</div><p>${langInfo.emptyText}</p></div>`
    : "";
  
    const heroHtml = "";
  
  const html = template
    .replace(/{{LANG}}/g, lang)
    .replace(/{{PAGE_TITLE}}/g, escapeHtml(langInfo.siteTitle))
    .replace(/{{META_DESC}}/g, escapeHtml(langInfo.siteDesc))
    .replace(/{{CANONICAL_URL}}/g, `${baseUrl}/${langInfo.dir}/`)
    .replace(/{{HREFLANG_TAGS}}/g, generateIndexHreflang(lang, baseUrl))
    .replace(/{{OG_TAGS}}/g, generateOGTags(null, lang, true))
    .replace(/{{SITE_NAME}}/g, SITE_CONFIG.name)
    .replace(/{{LANG_NAME}}/g, langInfo.name)
        .replace(/{{SECTION_TITLE}}/g, langInfo.sectionTitle)
    .replace(/{{GRID_CARDS}}{{LIST_CARDS}}/g, cards)
    .replace(/{{GRID_CARDS}}/g, cards)
    
    .replace(/{{EMPTY_STATE}}/g, emptyState)
    .replace(/{{WECHAT}}/g, SITE_CONFIG.wechat)
    .replace(/{{WHATSAPP}}/g, SITE_CONFIG.whatsapp)
    .replace(/{{EMAIL}}/g, SITE_CONFIG.email)
    .replace(/{{SITE_DESC}}/g, langInfo.siteDesc)
    .replace(/{{OG_LOCALE}}/g, langInfo.ogLocale)
    .replace(/{{MAIN_NAV}}/g, generateLangNav(lang).mainNav)
    .replace(/{{LANG_SWITCHER}}/g, generateLangNav(lang).langSwitcher);
  
  return html;
}

// ========== 生成 Sitemap XML ==========
function generateSitemap(allArticles) {
  const baseUrl = SITE_CONFIG.domain;
  const today = getDateStr();
  
  let urls = [];
  
  // 首页
  for (const [lang, info] of Object.entries(LANGUAGES)) {
    let url = `  <url>\n    <loc>${baseUrl}/${info.dir}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n`;
    for (const [l2, info2] of Object.entries(LANGUAGES)) {
      url += `    <xhtml:link rel="alternate" hreflang="${l2}" href="${baseUrl}/${info2.dir}/"/>\n`;
    }
    url += `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/en/"/>\n`;
    url += `  </url>`;
    urls.push(url);
  }
  
  // 文章
  for (const [lang, articles] of Object.entries(allArticles)) {
    for (const article of articles) {
      const slug = article.slug || "article";
      let url = `  <url>\n    <loc>${baseUrl}/${LANGUAGES[lang].dir}/blog/${slug}/</loc>\n    <lastmod>${article._date || today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n`;
      for (const [l2, info2] of Object.entries(LANGUAGES)) {
        const otherSlug = l2 === lang ? slug : (article.slug || slug);
        url += `    <xhtml:link rel="alternate" hreflang="${l2}" href="${baseUrl}/${info2.dir}/blog/${l2 === lang ? slug : (article.slug)}/"/>\n`;
      }
      url += `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/en/blog/${slug}/"/>\n`;
      url += `  </url>`;
      urls.push(url);
    }
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>`;
}

// ========== 生成 robots.txt ==========
function generateRobotsTxt() {
  const baseUrl = SITE_CONFIG.domain;
  return `User-agent: *
Allow: /
Disallow: /en/blog/*?*
Disallow: /*?sort=

Sitemap: ${baseUrl}/sitemap.xml

# 各语言 Sitemap
Sitemap: ${baseUrl}/feed.xml
`;
}

// ========== 生成 RSS Feed ==========
function generateRssFeed(articles, lang) {
  const langInfo = LANGUAGES[lang] || LANGUAGES.en;
  const baseUrl = SITE_CONFIG.domain;
  
  let items = "";
  if (articles) {
    items = articles.slice(0, 20).map(a => {
      const slug = a.slug || "article";
      return `  <item>
    <title>${escapeHtml(a.title || "")}</title>
    <link>${baseUrl}/${langInfo.dir}/blog/${slug}/</link>
    <guid>${baseUrl}/${langInfo.dir}/blog/${slug}/</guid>
    <description>${escapeHtml((a.summary || "").substring(0, 200))}</description>
    <pubDate>${new Date(a._date || getDateStr()).toUTCString()}</pubDate>
    <category>${escapeHtml(a.category || "")}</category>
  </item>`;
    }).join("\n");
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${langInfo.siteTitle}</title>
    <link>${baseUrl}/${langInfo.dir}/</link>
    <description>${escapeHtml(langInfo.siteDesc)}</description>
    <language>${langInfo.locale}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

// ========== 主函数 ==========

// ========== 生成关于页面 ==========
function generateAboutPage(lang) {
  const langInfo = LANGUAGES[lang] || LANGUAGES.en;
  const baseUrl = SITE_CONFIG.domain;
  const isZh = lang === "zh";
  
  const template = readFileSync(path.join(TEMPLATES_DIR, "about.html"));
  if (!template) return null;
  
  // 中文内容
  const zhContent = `<div class="about-hero">
    <span class="about-icon">🌴</span>
    <h1>指南帮旅游</h1>
    <p class="about-tagline">专注海南 · 深耕十七年 · 全球游客的海南旅行入口</p>
  </div>
  
  <div class="about-description">
    <p><strong>指南帮旅游</strong>（海南指南帮科技有限公司）成立于2007年，总部位于海南三亚，是海南本地领先的旅游服务企业。十七年来，我们始终扎根海南，专注于为全球游客提供专业、可靠、有温度的海南旅行服务。</p>
    <p>从2007年三亚本地地接服务起步，到2014年正式成立公司，再到今天覆盖全海南19个市县、服务来自50多个国家游客的综合性旅游平台——我们一步一个脚印，用心服务每一位来到海南的客人。</p>
  </div>
  
  <div class="timeline">
    <div class="timeline-item">
      <div class="timeline-year">2007</div>
      <div class="timeline-content">
        <h3>始于三亚</h3>
        <p>在三亚成立，专注于海南旅游地接服务，为第一批自由行游客提供专业向导。</p>
      </div>
    </div>
    <div class="timeline-item">
      <div class="timeline-year">2014</div>
      <div class="timeline-content">
        <h3>正式成立公司</h3>
        <p>海南指南帮科技有限公司正式注册成立，业务从三亚扩展到全海南。</p>
      </div>
    </div>
    <div class="timeline-item">
      <div class="timeline-year">2018</div>
      <div class="timeline-content">
        <h3>多元发展</h3>
        <p>建立自有网站平台，启动多语种服务。与海南多家五星级酒店、景区达成战略合作，年服务游客突破万人次。</p>
      </div>
    </div>
    <div class="timeline-item">
      <div class="timeline-year">至今</div>
      <div class="timeline-content">
        <h3>持续服务</h3>
        <p>经过十七年的发展，我们建立了完善的服务体系。坚持人工对接、一对一服务，用专业和真诚让每位客人玩得放心。</p>
      </div>
    </div>
  </div>
  
  <div class="stats-row">
    <div class="stat-item">
      <span class="stat-number">17</span>
      <span class="stat-label">年行业经验</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">19</span>
      <span class="stat-label">覆盖海南市县</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">6</span>
      <span class="stat-label">服务语言</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">50+</span>
      <span class="stat-label">服务国家</span>
    </div>
  </div>

  <div class="service-list">
    <h2>我们的服务</h2>
    <div class="service-grid">
      <div class="service-card">
        <span class="service-icon">🏖️</span>
        <h3>景点门票</h3>
        <p>海南各大景区门票代购，比现场购票更优惠</p>
      </div>
      <div class="service-card">
        <span class="service-icon">🏨</span>
        <h3>酒店预订</h3>
        <p>合作酒店覆盖全海南，享受协议价</p>
      </div>
      <div class="service-card">
        <span class="service-icon">🚗</span>
        <h3>交通接送</h3>
        <p>机场接送、景点往返、包车服务</p>
      </div>
      <div class="service-card">
        <span class="service-icon">🗺️</span>
        <h3>定制路线</h3>
        <p>根据您的需求定制专属海南旅行路线</p>
      </div>
    </div>
  </div>
  
  <div class="contact-block">
    <h2>📞 联系我们</h2>
    <p>📱 微信：指南帮旅游</p>
    <p>💬 WhatsApp：Guide to Hainan</p>
    <p>📧 邮箱：info@zhinanlvyou.com</p>
    <p><strong>📍 办公地址：</strong>海南省三亚市</p>
    <p style="margin-top:16px;font-size:13px;color:var(--text-light)">🕐 工作时间：周一至周日 8:00 - 22:00（全年无休）</p>
  </div>`;
  
  // 英文内容
  const enContent = `<div class="about-hero">
    <span class="about-icon">🌴</span>
    <h1>Guide to Hainan</h1>
    <p class="about-tagline">Dedicated to Hainan · 17 Years of Excellence · Your Gateway to Hainan</p>
  </div>
  
  <div class="about-description">
    <p>Guide to Hainan was founded in 2007, headquartered in Sanya, Hainan. For 17 years, we have been dedicated to developing and operating Hainan's tourism resources, providing professional and reliable travel services to global visitors.</p>
    <p>From our beginnings as a Sanya local tour operator, we have grown into a comprehensive travel platform covering all 19 Hainan cities and counties, supporting 6 languages, and serving travelers from around the world.</p>
  </div>
  
  <div class="timeline">
    <div class="timeline-item">
      <div class="timeline-year">2007</div>
      <div class="timeline-content">
        <h3>Founded in Sanya</h3>
        <p>Started as a local tour operator in Sanya, providing professional guiding services to independent travelers.</p>
      </div>
    </div>
    <div class="timeline-item">
      <div class="timeline-year">2014</div>
      <div class="timeline-content">
        <h3>Company Established</h3>
        <p>Guide to Hainan Technology Co., Ltd. was officially incorporated, expanding services across all of Hainan.</p>
      </div>
    </div>
    <div class="timeline-item">
      <div class="timeline-year">2026</div>
      <div class="timeline-content">
        <h3>AI-Powered Operations</h3>
        <p>Launched AI-powered automated operations system with multi-language content generation and global SEO optimization.</p>
      </div>
    </div>
    <div class="timeline-item">
      <div class="timeline-year">至今</div>
      <div class="timeline-content">
        <h3>持续服务</h3>
        <p>经过十七年的发展，我们建立了完善的服务体系。坚持人工对接、一对一服务，用专业和真诚让每位客人玩得放心。</p>
      </div>
    </div>
  </div>
  
  <div class="stats-row">
    <div class="stat-item">
      <span class="stat-number">17</span>
      <span class="stat-label">年行业经验</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">19</span>
      <span class="stat-label">覆盖海南市县</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">6</span>
      <span class="stat-label">服务语言</span>
    </div>
    <div class="stat-item">
      <span class="stat-number">50+</span>
      <span class="stat-label">服务国家</span>
    </div>
  </div>

  <div class="service-list">
    <h2>我们的服务</h2>
    <div class="service-grid">
      <div class="service-card">
        <span class="service-icon">🏖️</span>
        <h3>景点门票</h3>
        <p>海南各大景区门票代购，比现场购票更优惠</p>
      </div>
      <div class="service-card">
        <span class="service-icon">🏨</span>
        <h3>酒店预订</h3>
        <p>合作酒店覆盖全海南，享受协议价</p>
      </div>
      <div class="service-card">
        <span class="service-icon">🚗</span>
        <h3>交通接送</h3>
        <p>机场接送、景点往返、包车服务</p>
      </div>
      <div class="service-card">
        <span class="service-icon">🗺️</span>
        <h3>定制路线</h3>
        <p>根据您的需求定制专属海南旅行路线</p>
      </div>
    </div>
  </div>
  
  <div class="contact-block">
    <h2>📞 Contact Us</h2>
    <p>💬 WhatsApp：Guide to Hainan</p>
    <p>📧 Email：info@zhinanlvyou.com</p>
    <p>📍 Address：Sanya, Hainan, China</p>
  </div>`;
  
  const content = isZh ? zhContent : enContent;
  const aboutText = isZh ? "关于" : "About";
  
  const html = template
    .replace(/{{LANG}}/g, lang)
    .replace(/{{PAGE_TITLE}}/g, escapeHtml(isZh ? "关于指南帮旅游" : "About Guide to Hainan"))
    .replace(/{{META_DESC}}/g, escapeHtml(isZh ? "指南帮旅游成立于2007年，专注海南旅游17年。了解我们的故事。" : "Guide to Hainan was founded in 2007. Learn our story."))
    .replace(/{{CANONICAL_URL}}/g, baseUrl + "/about/")
    .replace(/{{HREFLANG_TAGS}}/g, "  <link rel=\"alternate\" hreflang=\"zh\" href=\"" + baseUrl + "/about/\">")
    .replace(/{{SITE_NAME}}/g, SITE_CONFIG.name)
    .replace(/{{SITE_DESC}}/g, isZh ? SITE_CONFIG.desc : SITE_CONFIG.descEn)
    .replace(/{{CONTACT_LINE}}/g, isZh 
      ? "📱 微信：指南帮旅游 | 💬 WhatsApp：Guide to Hainan | 📧 info@zhinanlvyou.com"
      : "💬 WhatsApp: Guide to Hainan | 📧 info@zhinanlvyou.com")
    .replace(/{{ABOUT_TEXT}}/g, aboutText)
    .replace(/{{CONTENT}}/g, content)
    .replace(/{{LANG_SWITCHER}}/g, generateLangNav(lang).langSwitcher);
  
  return html;
}
async function main() {
  console.log("=".repeat(60));
  console.log("🌴 指南帮旅游 - 静态网站生成器");
  console.log("=".repeat(60));
  
  // 清空输出目录
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // 加载文章
  console.log("\n📖 加载文章...");
  const allArticles = loadAllArticles();
  let totalArticles = 0;
  for (const [lang, articles] of Object.entries(allArticles)) {
    console.log(`  [${lang}]: ${articles.length} 篇`);
    totalArticles += articles.length;
  }
  console.log(`  总计: ${totalArticles} 篇`);
  
  // 复制 CSS
  console.log("\n🎨 复制样式...");
  const cssContent = readFileSync(path.join(TEMPLATES_DIR, "style.css"));
  if (cssContent) {
    writeFileSync(path.join(OUTPUT_DIR, "style.css"), cssContent);
    console.log("  ✅ style.css");
  }
  
  // 生成首页
  console.log("\n🏠 生成首页...");
  for (const [lang, info] of Object.entries(LANGUAGES)) {
    const langArticles = allArticles[lang] || [];
    const html = generateIndexPage(lang, langArticles);
    if (html) {
      const dir = path.join(OUTPUT_DIR, info.dir);
      writeFileSync(path.join(dir, "index.html"), html);
      console.log(`  ✅ /${info.dir}/ (${langArticles.length} 篇)`);
    }
  }
  
  // 生成文章页
  console.log("\n📝 生成文章页...");
  let articleCount = 0;
  for (const [lang, articles] of Object.entries(allArticles)) {
    const langInfo = LANGUAGES[lang] || LANGUAGES.en;
    for (const article of articles) {
      const slug = article.slug || "article";
      const html = generateArticlePage(article, lang);
      if (html) {
        const dir = path.join(OUTPUT_DIR, langInfo.dir, "blog", slug);
        writeFileSync(path.join(dir, "index.html"), html);
        articleCount++;
      }
    }
  }
  console.log(`  ✅ ${articleCount} 篇文章页`);
  
  // 生成 Sitemap
  console.log("\n🗺️ 生成 Sitemap...");
  writeFileSync(path.join(OUTPUT_DIR, "sitemap.xml"), generateSitemap(allArticles));
  console.log("  ✅ sitemap.xml");
  
  // 生成 robots.txt
  console.log("\n🤖 生成 robots.txt...");
  writeFileSync(path.join(OUTPUT_DIR, "robots.txt"), generateRobotsTxt());
  console.log("  ✅ robots.txt");
  
  // 生成关于页面（只生成中文版 = 默认）
  console.log("\nℹ️  生成关于页面...");
  const aboutHtml = generateAboutPage("zh");
  if (aboutHtml) {
    writeFileSync(path.join(OUTPUT_DIR, "about", "index.html"), aboutHtml);
    console.log("  ✅ /about/ (中文)");
  }
  
  // 生成 RSS Feed
  console.log("\n📡 生成 RSS Feed...");
  for (const [lang, articles] of Object.entries(allArticles)) {
    writeFileSync(path.join(OUTPUT_DIR, `feed-${lang}.xml`), generateRssFeed(articles, lang));
  }
  // 主 Feed（中文）
  writeFileSync(path.join(OUTPUT_DIR, "feed.xml"), generateRssFeed(allArticles["zh"] || [], "zh"));
  console.log("  ✅ feed.xml + 6 语言 feed");
  
  // 生成根首页（301重定向到 /zh/）
  const rootIndexPath = path.join(OUTPUT_DIR, "index.html");
  if (!fs.existsSync(rootIndexPath)) {
    const baseUrl = SITE_CONFIG.domain;
    const rootHtml = [
      '<!DOCTYPE html>',
      '<html lang="zh-CN">',
      '<head>',
      '    <meta charset="UTF-8">',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '    <title>' + LANGUAGES.zh.siteTitle + '</title>',
      '    <meta http-equiv="refresh" content="0; url=/zh/">',
      '    <link rel="canonical" href="' + baseUrl + '/zh/">',
      '    <link rel="alternate" hreflang="zh" href="' + baseUrl + '/zh/">',
      '    <link rel="alternate" hreflang="en" href="' + baseUrl + '/en/">',
      '    <link rel="alternate" hreflang="ru" href="' + baseUrl + '/ru/">',
      '    <link rel="alternate" hreflang="ko" href="' + baseUrl + '/ko/">',
      '    <link rel="alternate" hreflang="ja" href="' + baseUrl + '/ja/">',
      '    <link rel="alternate" hreflang="th" href="' + baseUrl + '/th/">',
      '    <link rel="alternate" hreflang="x-default" href="' + baseUrl + '/en/">',
      '    <meta name="description" content="' + LANGUAGES.zh.siteDesc + '">',
      '    <meta property="og:title" content="' + LANGUAGES.zh.siteTitle + '">',
      '    <meta property="og:description" content="' + LANGUAGES.zh.siteDesc + '">',
      '    <meta property="og:url" content="' + baseUrl + '/zh/">',
      '    <script>window.location.href="/zh/";</script>',
      '</head>',
      '<body>',
      '    <p><a href="/zh/">' + LANGUAGES.zh.siteTitle + '</a></p>',
      '</body>',
      '</html>'
    ].join('\n');
    fs.writeFileSync(rootIndexPath, rootHtml, 'utf-8');
    console.log("  ✅ /index.html (301 \u2192 /zh/)");
  }

  // 输出统计
  console.log("\n" + "=".repeat(60));
  console.log("✅ 网站生成完成!");
  
  // 统计文件
  let fileCount = 0;
  function countFiles(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        countFiles(full);
      } else {
        fileCount++;
      }
    }
  }
  countFiles(OUTPUT_DIR);
  
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  console.log(`📄 文件总数: ${fileCount}`);
  console.log(`🌐 在线预览: file://${OUTPUT_DIR}/zh/index.html`);
  console.log("=".repeat(60));
}

main().catch(e => {
  console.error("❌ 构建失败:", e.message);
  process.exit(1);
});
