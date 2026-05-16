/**
 * 指南帮旅游 - 图片提示词生成器
 * 生成封面图、配图、ALT 描述的 AI 提示词
 */

/**
 * 根据文章主题生成封面图提示词
 */
function generateCoverPrompt(article, lang = "zh") {
  const category = article.category || "海南旅游";
  const dest = article.destination || "Hainan";
  
  const prompts = {
    zh: {
      style: "专业旅游摄影风格，高清晰度，色彩鲜艳，阳光明媚",
      aspect: "16:9",
      mood: "温暖、热情、度假氛围",
      composition: "前景为主景，背景为海滩/大海/椰树，蓝天白云"
    },
    en: {
      style: "Professional travel photography, high resolution, vibrant colors, sunny",
      aspect: "16:9",
      mood: "Warm, welcoming, vacation atmosphere",
      composition: "Foreground main subject, background beach/ocean/palm trees, blue sky"
    }
  };
  
  const p = prompts[lang] || prompts["en"];
  
  return {
    prompt: `${category} ${dest} travel photography, ${p.style}, ${p.mood}, ${p.composition}, ultra HD, realistic`,
    negativePrompt: "text, watermark, logo, low quality, blurry, cartoon, illustration, dark, gloomy",
    style: p.style,
    aspect: p.aspect,
    alt: `${category} - ${dest} - ${article.title || "travel scenery"}`
  };
}

/**
 * 小红书封面提示词
 */
function generateXiaohongshuCover(article, lang = "zh") {
  const title = article.title || "海南旅游攻略";
  
  return {
    prompt: `小红书封面风格, "${title}", 旅游攻略, 文字排版, 清新风格, 
             白色/浅蓝背景, 手绘风格插画, 简约设计, 社交媒体风格, 
             高分辨率, 适合9:16竖版`,
    alt: `${title} - 小红书封面`
  };
}

/**
 * 配图提示词列表
 */
function generateInlineImagePrompts(article, lang = "zh", count = 3) {
  const prompts = [];
  const keywords = (article.content || "").match(/<h[23]>[^<]+<\/h[23]>/g) || ["景点", "美食", "海滩"];
  
  for (let i = 0; i < Math.min(count, keywords.length); i++) {
    const topic = keywords[i].replace(/<\/?h[23]>/g, "");
    prompts.push({
      topic,
      prompt: `${topic}, ${article.destination || "Hainan"}, travel photography, 
               professional, high quality, natural lighting, vibrant`,
      alt: `${topic} - ${article.destination || "Hainan"} - ${article.title || "travel"}`
    });
  }
  
  return prompts;
}

module.exports = {
  generateCoverPrompt,
  generateXiaohongshuCover,
  generateInlineImagePrompts
};
