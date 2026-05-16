# 🌴 指南帮旅游 - AI 自动化运营系统

## Guide to Hainan - AI Automation System V1.0

### 📋 项目信息

| 项目 | 内容 |
|------|------|
| 项目名称 | 指南帮旅游（Guide to Hainan） |
| 官网 | https://www.zhinanlvyou.com |
| 公司 | 海南指南帮科技有限公司 |
| 成立时间 | 2007年 |
| 定位于 | 全球游客的海南旅行入口 |

### 🏗️ 技术架构

```
WordPress + Node.js + Hermes Agent + DeepSeek API
```

### 📁 项目结构

```
zhinanlvyou-automation/
├── server.js              # 主入口（多模式运行）
├── package.json           # 项目配置
├── .env.example           # 环境变量模板
├── README.md              # 本文件
│
├── config/
│   ├── config.js          # 全局配置
│   └── wordpress.json     # WordPress 凭证
│
├── services/
│   ├── ai.js              # AI 内容生成（DeepSeek API 封装）
│   ├── wordpress.js       # WordPress API 客户端
│   ├── content.js         # 多语言内容生成引擎
│   ├── seo.js             # SEO 自动优化
│   ├── imagePrompt.js     # 图片提示词生成
│   ├── videoScript.js     # 短视频脚本生成
│   ├── social.js          # 社媒文案生成
│   └── report.js          # 日报/周报生成
│
├── src/utils/
│   └── logger.js          # 日志系统
│
├── data/
│   ├── keywords.json      # 多语言 SEO 关键词
│   ├── destinations.json  # 海南目的地数据
│   ├── languages.json     # 多语言配置
│   └── sitemap-records.json # Sitemap 记录
│
├── scripts/
│   ├── daily-run.js       # 每日运营脚本
│   └── weekly-run.js      # 每周运营脚本
│
├── articles/              # 生成的文章（JSON 格式）
│   ├── zh/                # 中文
│   ├── en/                # English
│   ├── ru/                # Русский
│   ├── ko/                # 한국어
│   ├── ja/                # 日本語
│   └── th/                # ไทย
│
├── output/                # 输出文件
│   ├── video/             # 视频脚本
│   ├── social/            # 社媒文案
│   └── *.txt / *.json     # 日报/周报
│
└── logs/                  # 日志文件（按天）
    └── YYYY-MM-DD.log
```

### 🚀 快速开始

#### 1. 安装依赖

```bash
cd zhinanlvyou-automation
npm install
```

#### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入以下信息：
# - DEEPSEEK_API_KEY：DeepSeek API Key（用于 AI 内容生成）
# - WP_USERNAME / WP_APPLICATION_PASSWORD：WordPress 账号
```

#### 3. 运行系统

```bash
# 查看系统状态
node server.js status

# 运行每日运营（生成文章 + 视频脚本 + 社媒文案 + 日报）
node server.js daily

# 生成周报
node server.js weekly

# 生成日报
node server.js report

# 更新 Sitemap
node server.js sitemap

# 生成初始种子内容
node server.js seed
```

### 📅 每日自动运营流程

1. ✅ 生成多语言文章（中文 2 + 英文 2 + 俄文 1 + 韩文 1 + 日文 1 + 泰文 1 = 8 篇）
2. ✅ 保存为 WordPress 草稿（如已配置）
3. ✅ 生成短视频脚本 3 条
4. ✅ 生成社媒文案（小红书/微信/Facebook/Instagram/Twitter/TikTok/YouTube）
5. ✅ 更新 Sitemap
6. ✅ SEO 自动检查
7. ✅ 生成运营日报

### 🔒 安全边界

以下内容由 AI 生成，**必须人工确认**：

- ⚠️ 门票价格
- ⚠️ 景区开放时间
- ⚠️ 签证政策
- ⚠️ 酒店价格
- ⚠️ 包车价格
- ⚠️ 退款承诺
- ⚠️ 商务合作

**禁止虚构**：景区、门票、酒店、交通、优惠政策、官方信息。

### 📊 内容质量要求

每篇文章包含：
- ✅ 标题 & SEO 标题
- ✅ Meta Description（≤160字符）
- ✅ URL Slug
- ✅ 摘要
- ✅ HTML 正文（h2/h3/p/ul 结构）
- ✅ FAQ（3-5条）
- ✅ Tags & 分类
- ✅ 内链（3条+）
- ✅ 图片 ALT 描述
- ✅ 联系咨询模块

### 📱 联系转化方式

- **中国用户**：微信（指南帮旅游）
- **国际用户**：WhatsApp（Guide to Hainan）
- **备用**：邮箱（info@zhinanlvyou.com）

### 🎯 网站定位

> 把 www.zhinanlvyou.com 建设成：
> **全球游客了解海南、咨询海南、进入海南旅游服务的 AI 自动化国际流量入口。**

---

*指南帮科技有限公司 - 技术运营中心*
