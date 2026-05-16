/**
 * 指南帮旅游 - 社媒文案自动生成
 * 小红书、微信公众号、Facebook、Instagram、Twitter、TikTok、YouTube Shorts
 */

/**
 * 根据文章生成所有社媒文案
 */
function generateAllSocialCopy(article, lang = "zh") {
  return {
    xiaohongshu: generateXiaohongshu(article, lang),
    wechat: generateWechat(article, lang),
    facebook: generateFacebook(article, lang),
    instagram: generateInstagram(article, lang),
    twitter: generateTwitter(article, lang),
    tiktok: generateTikTok(article, lang),
    youtubeShorts: generateYouTubeShorts(article, lang)
  };
}

/**
 * 小红书文案
 */
function generateXiaohongshu(article, lang = "zh") {
  if (lang !== "zh") return null;
  const title = article.title || "海南旅游攻略";
  return {
    platform: "小红书",
    title: `🏝️ ${title} | 保姆级攻略合集`,
    content: [
      `📍 ${article.destination || "海南"}`,
      "",
      "✨ 姐妹们，这份攻略一定要收藏！",
      "",
      "📌 核心亮点：",
      article.summary || "",
      "",
      "📝 详细攻略请看图片 ⇧",
      "",
      "💡 实用Tips：",
      "✅ 建议游玩时间",
      "✅ 交通方式推荐",
      "✅ 周边美食推荐",
      "",
      "💬 有任何问题欢迎评论区留言～",
      "",
      "📱 私信可获取最新门票信息",
      "",
      "#海南旅游 #旅游攻略 #旅行 #自由行 #度假"
    ].join("\n"),
    images: 6,
    hashtags: "#海南旅游 #旅游攻略 #旅行 #自由行 #度假"
  };
}

/**
 * 微信公众号头图文案
 */
function generateWechat(article, lang = "zh") {
  if (lang !== "zh") return null;
  return {
    platform: "微信公众号",
    title: article.title || "海南旅游攻略",
    summary: article.summary || "",
    coverDescription: article.imageAlt || "海南旅游风景",
    original: true,
    tags: (article.tags || []).slice(0, 5)
  };
}

/**
 * Facebook 文案
 */
function generateFacebook(article, lang = "en") {
  const title = article.title || "Hainan Travel Guide";
  return {
    platform: "Facebook",
    content: lang === "zh" 
      ? `🌴 ${title}\n\n${article.summary || ""}\n\n📌 详细攻略：${article.slug ? "https://www.zhinanlvyou.com/zh/blog/" + article.slug + "/" : "联系我们"}\n\n💬 私信咨询海南景点门票和旅游路线\n\n#Hainan #Travel #Tourism #三亚 #海南`
      : `🌴 ${title}\n\n${article.summary || ""}\n\n📌 Full guide: ${article.slug ? "https://www.zhinanlvyou.com/en/blog/" + article.slug + "/" : "Contact us"}\n\n💬 DM us for Hainan ticket consultation & travel routes\n\n#Hainan #Travel #Sanya #Tourism #ChinaTravel`,
    hashtags: "#Hainan #Travel #Sanya #Tourism"
  };
}

/**
 * Instagram 文案
 */
function generateInstagram(article, lang = "en") {
  return {
    platform: "Instagram",
    content: lang === "zh"
      ? `🌴 ${article.title || "海南旅游"}\n\n${article.summary || ""}\n\n📍 ${article.destination || "海南"}\n\n👇 点击链接查看完整攻略\n\n#Hainan #Travel #Sanya #Beach #Vacation`
      : `🌴 ${article.title || "Hainan Travel"}\n\n${article.summary || ""}\n\n📍 ${article.destination || "Hainan"}\n\n👇 Click link for full guide\n\n#Hainan #Travel #Sanya #Beach #Vacation #China`,
    hashtags: "#Hainan #Travel #Sanya #Beach"
  };
}

/**
 * Twitter/X 文案
 */
function generateTwitter(article, lang = "en") {
  const url = article.slug ? `zhinanlvyou.com/${lang}/blog/${article.slug}/` : "zhinanlvyou.com";
  return {
    platform: "X/Twitter",
    content: lang === "zh"
      ? `🏝️ ${article.title || "海南旅游"}\n\n${(article.summary || "").substring(0, 120)}\n\n🔗 ${url}\n\n#海南旅游 #海南攻略`
      : `🏝️ ${article.title || "Hainan Travel"}\n\n${(article.summary || "").substring(0, 120)}\n\n🔗 ${url}\n\n#Hainan #Travel #Sanya`,
    hashtags: "#Hainan #Travel"
  };
}

/**
 * TikTok 标题
 */
function generateTikTok(article, lang = "en") {
  return {
    platform: "TikTok",
    title: lang === "zh" 
      ? `${article.title || "海南旅游"} 🏝️ 来海南必看！`
      : `${article.title || "Hainan Travel"} 🏝️ You MUST see this!`,
    description: (article.summary || "").substring(0, 150),
    hashtags: "#hainan #travel #sanya #chinatravel"
  };
}

/**
 * YouTube Shorts 标题
 */
function generateYouTubeShorts(article, lang = "en") {
  return {
    platform: "YouTube Shorts",
    title: lang === "zh"
      ? `${article.title || ""} 🏝️ 海南旅游攻略 #Shorts`
      : `${article.title || ""} 🏝️ Hainan Travel Guide #Shorts`,
    tags: ["Hainan", "Travel", "Sanya", "Shorts"]
  };
}

module.exports = {
  generateAllSocialCopy,
  generateXiaohongshu,
  generateWechat,
  generateFacebook,
  generateInstagram,
  generateTwitter,
  generateTikTok,
  generateYouTubeShorts
};
