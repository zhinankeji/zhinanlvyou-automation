/**
 * 指南帮旅游 - 短视频脚本生成器
 * 生成 30s/60s 短视频脚本，含分镜、旁白、字幕
 */

const CONTENT_TYPES = [
  "三亚景点", "海南海滩", "海南亲子游", "海南避坑",
  "海南自由行", "海南本地玩法", "海南美食", "海南旅游路线"
];

/**
 * 获取今日视频主题（轮换）
 */
function getTodaysVideoTopic(index) {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const offset = (dayOfYear + index) % CONTENT_TYPES.length;
  return CONTENT_TYPES[offset];
}

/**
 * 生成 30 秒短视频脚本
 */
function generate30sScript(topic) {
  return {
    duration: "30秒",
    scenes: [
      {
        time: "0-5s",
        scene: "开场 - 震撼航拍海滩/景点全景",
        narration: `${topic}，来海南绝对不能错过！今天带你一分钟了解。`,
        subtitle: `${topic} | 必打卡`,
        onScreen: "大字标题 + 目的地名"
      },
      {
        time: "5-15s",
        scene: "中景 - 展示核心景点/美食/活动",
        narration: "这里有着中国最美丽的海岸线，椰风海韵，让人流连忘返。",
        subtitle: "绝美海岸线",
        onScreen: "展示图片/视频素材"
      },
      {
        time: "15-25s",
        scene: "特写 - 体验细节/实用信息",
        narration: "最佳游玩时间是上午，人少景美。建议安排半天到一天时间。",
        subtitle: "最佳游玩时间：上午",
        onScreen: "实用信息展示"
      },
      {
        time: "25-30s",
        scene: "结尾 - 引导联系",
        narration: "想知道更多攻略？关注指南帮旅游，带你玩转海南！",
        subtitle: "关注指南帮旅游",
        onScreen: "公众号二维码 + 联系方式"
      }
    ],
    coverTitle: `${topic}攻略 | 来海南必看`,
    tags: ["海南旅游", topic, "旅行攻略", "海南", "旅游"],
    hashtags: "#海南旅游 #海南攻略 #海南景点 #旅行"
  };
}

/**
 * 生成 60 秒短视频脚本
 */
function generate60sScript(topic) {
  return {
    duration: "60秒",
    scenes: [
      {
        time: "0-8s",
        scene: "开场 - 航拍全景+特写",
        narration: `如果你第一次来海南，${topic}一定不要错过。`,
        subtitle: `${topic} | 详细攻略`,
        onScreen: "慢动作开场 + 地点名"
      },
      {
        time: "8-20s",
        scene: "介绍 - 背景/位置/特色",
        narration: "这里位于海南岛最南端，拥有得天独厚的热带气候和自然风光。",
        subtitle: "热带天堂",
        onScreen: "地图位置 + 景点展示"
      },
      {
        time: "20-35s",
        scene: "详解 - 核心亮点/必做事项",
        narration: "必玩项目包括：看日出、吃海鲜、玩水上运动。每一个都是绝佳体验。",
        subtitle: "必体验项目",
        onScreen: "分屏展示各项目"
      },
      {
        time: "35-50s",
        scene: "实用信息 - 交通/门票/时间",
        narration: "交通很方便，从三亚市区出发约30分钟车程。建议提前在网上咨询门票信息。",
        subtitle: "交通便利 | 建议提前咨询门票",
        onScreen: "实用信息卡展示"
      },
      {
        time: "50-60s",
        scene: "结尾 - 品牌引导",
        narration: "关注指南帮旅游，咨询海南景点门票、旅游路线，让你的海南之旅更轻松！",
        subtitle: "指南帮旅游 - 你的海南旅行助手",
        onScreen: "品牌LOGO + 微信/WhatsApp二维码"
      }
    ],
    coverTitle: `${topic}完整攻略 | 建议收藏`,
    tags: ["海南旅游", topic, "旅行攻略", "自由行", "避坑指南", "海南"],
    hashtags: "#海南旅游 #海南攻略 #海南 #旅行 #自由行"
  };
}

/**
 * 生成一条完整视频脚本
 */
function generateVideoScript(index = 0) {
  const topic = getTodaysVideoTopic(index);
  const script30 = generate30sScript(topic);
  const script60 = generate60sScript(topic);
  
  return {
    title: `${topic}攻略`,
    topic,
    date: new Date().toISOString().split("T")[0],
    shortsVersion: script30,
    fullVersion: script60,
    coverTitle: script60.coverTitle,
    tags: script60.tags,
    hashtags: script60.hashtags,
    // 封面文案（用于小红书/抖音封面）
    coverCopy: `${topic} 🏝️ 来海南千万别错过！\n👇 收藏这份攻略`
  };
}

/**
 * 生成每日 3 条视频脚本
 */
function generateDailyVideoScripts() {
  const scripts = [];
  for (let i = 0; i < 3; i++) {
    scripts.push(generateVideoScript(i));
  }
  return scripts;
}

module.exports = {
  generateVideoScript,
  generateDailyVideoScripts,
  getTodaysVideoTopic
};
