/**
 * 指南帮旅游 - AI 内容生成服务
 * 基于19市县真实信息库
 */
const https = require("https");

const config = {
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  apiUrl: process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1/chat/completions",
  model: process.env.DEEPSEEK_MODEL || "deepseek-chat"
};

const DESTINATIONS = {
  "三亚": { slug:"sanya", spots:["亚龙湾（天下第一湾，7km银色沙滩）","蜈支洲岛（潜水胜地）","南山寺（108米南海观音像）","天涯海角","三亚国际免税城","鹿回头风景区","西岛"], food:["海鲜（第一市场）","文昌鸡","清补凉","椰子饭","海南粉"], bestTime:"10月至次年4月", transport:"三亚凤凰机场、环岛高铁三亚站", tips:["建议住三亚湾或亚龙湾","免税店购物需提前6小时","海鲜建议去第一市场"] },
  "海口": { slug:"haikou", spots:["骑楼老街（南洋建筑群）","火山口地质公园","假日海滩","海南省博物馆","万绿园","五公祠","冯小刚电影公社"], food:["海南粉","老爸茶","斋菜煲","辣汤饭","清补凉"], bestTime:"10月至次年4月", transport:"海口美兰机场、环岛高铁海口东站", tips:["骑楼老街适合傍晚逛","火山口公园建议半天","老爸茶推荐文明东路"] },
  "儋州": { slug:"danzhou", spots:["东坡书院（苏东坡讲学处）","千年古盐田（1200年历史）","石花水洞（喀斯特溶洞）","松涛水库","蓝洋温泉"], food:["儋州粽子","东坡肉","儋州鸡","米烂"], bestTime:"全年皆宜", transport:"环岛高铁白马井站", tips:["东坡书院必去","千年古盐田看日落","蓝洋温泉适合冬季"] },
  "万宁": { slug:"wanning", spots:["日月湾（世界冲浪胜地）","石梅湾（最美滨海公路）","兴隆热带植物园","东山岭","神州半岛","大花角"], food:["兴隆咖啡","东山羊","和乐蟹","后安粉"], bestTime:"10月至次年3月", transport:"环岛高铁万宁站", tips:["日月湾10月-3月浪最好","兴隆咖啡值得品尝","石梅湾适合自驾"] },
  "琼海": { slug:"qionghai", spots:["博鳌亚洲论坛会址","玉带滩","万泉河","红色娘子军纪念园","白石岭","潭门渔港"], food:["嘉积鸭","温泉鹅","潭门海鲜","芒果肠粉"], bestTime:"全年皆宜", transport:"环岛高铁博鳌站", tips:["博鳌论坛会址值得参观","潭门渔港海鲜新鲜","玉带滩建议傍晚去"] },
  "文昌": { slug:"wenchang", spots:["文昌航天发射中心","东郊椰林","铜鼓岭","文南老街","宋氏祖居","八门湾红树林"], food:["文昌鸡（海南四大名菜之首）","文昌糟粕醋","椰子船","抱罗粉"], bestTime:"全年皆宜", transport:"环岛高铁文昌站", tips:["有火箭发射时航天城限制参观","东郊椰林喝新鲜椰子水","铜鼓岭建议上午去"] },
  "五指山": { slug:"wuzhishan", spots:["五指山热带雨林（海南最高峰）","五指山峡谷漂流","黎苗文化村","牙胡梯田","水满乡"], food:["五指山野菜","五脚猪","黎族竹筒饭","山兰酒"], bestTime:"11月至次年4月", transport:"海口/三亚自驾约3小时", tips:["登山需专业装备","漂流建议5月-10月","牙胡梯田6月-7月最美"] },
  "东方": { slug:"dongfang", spots:["鱼鳞洲（灯塔+风车）","大广坝水库","俄贤岭（海南小桂林）","白查村（黎族船型屋）"], food:["东方烤乳猪","四更烤乳猪","东方酸瓜"], bestTime:"全年皆宜", transport:"环岛高铁东方站", tips:["鱼鳞洲看日落最佳","俄贤岭有海南小桂林之称","四更烤乳猪是当地招牌"] },
  "陵水": { slug:"lingshui", spots:["分界洲岛（海南最佳潜水点）","清水湾（会唱歌的沙滩）","南湾猴岛（2000多只猕猴）","椰子岛","香水湾"], food:["陵水酸粉","气鼓鱼粥","海鲜打边炉","椰子鸡"], bestTime:"10月至次年4月", transport:"环岛高铁陵水站", tips:["分界洲岛建议安排一天","南湾猴岛坐缆车看全景","清水湾沙质极细"] },
  "定安": { slug:"dingan", spots:["定安古城","文笔峰（道教文化圣地）","热带飞禽世界","母瑞山革命根据地","南丽湖"], food:["定安粽子","定安黑猪","菜包饭","定安粉"], bestTime:"全年皆宜", transport:"海口自驾约1小时", tips:["文笔峰适合祈福","定安端午粽子节很热闹"] },
  "屯昌": { slug:"tunchang", spots:["梦幻香山（芳香文化园）","木色湖","加乐潭","乌坡温泉"], food:["屯昌黑猪","屯昌阉鸡","枫木苦瓜"], bestTime:"全年皆宜", transport:"海口自驾约1.5小时", tips:["梦幻香山适合亲子游","木色湖钓鱼不错"] },
  "澄迈": { slug:"chengmai", spots:["福山咖啡文化镇","永庆寺","美榔双塔（南宋古塔）","红坎岭陶艺园"], food:["福山咖啡","澄迈白莲鹅","瑞溪牛肉干"], bestTime:"全年皆宜", transport:"环岛高铁福山镇站", tips:["福山咖啡值得一品","永庆寺可以看海"] },
  "临高": { slug:"lingao", spots:["临高角（百年灯塔）","百仞滩","高山岭","彩桥红树林","临高文庙"], food:["临高烤乳猪","临高粉","多文空心菜"], bestTime:"全年皆宜", transport:"环岛高铁临高南站", tips:["临高角有历史纪念意义","烤乳猪是必尝美食"] },
  "昌江": { slug:"changjiang", spots:["霸王岭（黑冠长臂猿保护区）","棋子湾（原生态海湾）","木棉花观景带（2-3月盛开）","皇帝洞","王下乡"], food:["昌江芒果","昌江海鲜","霸王岭山鸡"], bestTime:"2月-3月（木棉花季）", transport:"环岛高铁棋子湾站", tips:["木棉花季2-3月必去","棋子湾适合露营","霸王岭可看长臂猿"] },
  "乐东": { slug:"ledong", spots:["尖峰岭（热带雨林国家公园）","莺歌海盐场（南方最大盐场）","龙沐湾（日落）","毛公山","佳西自然保护区"], food:["乐东香蕉","乐东芒果","黄流老鸭"], bestTime:"全年皆宜", transport:"环岛高铁乐东站", tips:["尖峰岭看日出云海","莺歌海盐场很有特色","龙沐湾日落极美"] },
  "保亭": { slug:"baoting", spots:["七仙岭温泉森林公园","呀诺达雨林（5A级）","槟榔谷黎苗文化区","神玉岛","布隆赛雨林"], food:["黎族竹筒饭","三色饭","五脚猪","山兰糯米酒"], bestTime:"11月至次年4月", transport:"三亚自驾约1小时", tips:["七仙岭泡温泉+登山","呀诺达建议安排一天","槟榔谷了解黎苗文化"] },
  "琼中": { slug:"qiongzhong", spots:["黎母山（黎族始祖山）","百花岭（百花瀑布）","什寒村（海拔最高村落）","鹦哥岭"], food:["琼中绿橙","黎族竹筒饭","山兰酒","五指山野菜"], bestTime:"全年皆宜", transport:"海口/三亚自驾约2小时", tips:["什寒村是海南最美乡村","琼中绿橙11月-1月最甜"] },
  "白沙": { slug:"baisha", spots:["白沙陨石坑（中国唯一陨石坑）","红坎瀑布","九架岭（云海）","黎族村落"], food:["白沙绿茶（陨石坑茶）","白沙咖啡","黎族鱼茶"], bestTime:"全年皆宜", transport:"海口自驾约3小时", tips:["白沙绿茶很有名","陨石坑值得一看"] },
  "三沙": { slug:"sansha", spots:["永兴岛","七连屿","永乐群岛","南海博物馆","石岛"], food:["海鲜","椰子","热带水果"], bestTime:"3月-5月", transport:"三亚乘船/飞机", tips:["前往三沙需提前申请","建议3月-5月前往"] }
};

const EN_DEST = {
  "Sanya": { spots:["Yalong Bay (7km beach)","Wuzhizhou Island (diving)","Nanshan Temple","Sanya Duty Free"], food:["Seafood","Wenchang chicken","Qingbuliang"], bestTime:"Oct-Apr" },
  "Haikou": { spots:["Qilou Old Street","Volcanic Geopark","Holiday Beach","Hainan Museum"], food:["Hainan noodles","Seafood congee"], bestTime:"Oct-Apr" },
  "Danzhou": { spots:["Dongpo Academy","Ancient Salt Field","Shihua Cave"], food:["Danzhou zongzi","Dongpo pork"], bestTime:"Year-round" },
  "Wanning": { spots:["Riyue Bay (surfing)","Shimei Bay","Xinglong Garden"], food:["Xinglong coffee","Hele crab"], bestTime:"Oct-Mar" },
  "Lingshui": { spots:["Fenjiezhou Island","Clear Water Bay","Monkey Island"], food:["Sour noodles","Pufferfish porridge"], bestTime:"Oct-Apr" },
  "Baoting": { spots:["Qixian Ridge Hot Spring","Yanoda Rainforest","Binglanggu Park"], food:["Bamboo rice","Three-color rice"], bestTime:"Nov-Apr" }
};

async function generate(systemPrompt, userPrompt, options) {
  if (config.apiKey) return callDeepSeekAPI(systemPrompt, userPrompt, (options||{}).temperature||0.7, (options||{}).maxTokens||4096);
  return getTemplateContent(systemPrompt, userPrompt);
}

function callDeepSeekAPI(sp, up, temp, maxT) {
  return new Promise(function(resolve) {
    var data = JSON.stringify({model:config.model, messages:[{role:"system",content:sp},{role:"user",content:up}], temperature:temp, max_tokens:maxT});
    var url = new URL(config.apiUrl);
    var req = https.request({hostname:url.hostname,path:url.pathname,method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+config.apiKey,"Content-Length":Buffer.byteLength(data)}}, function(res) {
      var body=""; res.on("data",function(c){body+=c}); res.on("end",function(){
        try{var j=JSON.parse(body); if(j.choices&&j.choices[0]) resolve(j.choices[0].message.content); else resolve(JSON.stringify(getTemplateContent(sp,up)));}
        catch(e){resolve(JSON.stringify(getTemplateContent(sp,up)));}
      });
    });
    req.on("error",function(){resolve(JSON.stringify(getTemplateContent(sp,up)));});
    req.write(data); req.end();
  });
}

function getTemplateContent(systemPrompt, userPrompt) {
  var isZh = systemPrompt.indexOf("你是指南帮") >= 0 || userPrompt.indexOf("目标地") >= 0 || userPrompt.indexOf("关于「") >= 0;
  var destMatch = userPrompt.match(/[目标地|Destination][：:]\s*([^\n\r,，]+)/i);
  var catMatch = userPrompt.match(/关于[「「]([^」」]+)[」」]/) || userPrompt.match(/about ["']([^"']+)["']/i);
  var category = (catMatch ? catMatch[1] : "海南景点").trim();
  var destination = (destMatch ? destMatch[1] : "三亚").trim();
  if (isZh) return generateZh(category, destination);
  return generateEn(category, destination);
}

function generateZh(cat, dest) {
  var info = DESTINATIONS[dest];
  if (!info) return defaultZh(dest);
  var spots = info.spots.slice(0,5);
  var food = info.food.slice(0,4);
  var title,summary;
  if (cat.indexOf("美食")>=0) { title=dest+"美食指南"; summary=dest+"必吃美食："+food.join("、"); }
  else if (cat.indexOf("亲子")>=0) { title=dest+"亲子游攻略"; summary="带娃去"+dest+"怎么玩？推荐适合亲子的景点和酒店。"; }
  else if (cat.indexOf("海滩")>=0) { title=dest+"最美海滩推荐"; summary=dest+"有哪些值得去的海滩？这份攻略帮你找到最适合的。"; }
  else if (cat.indexOf("路线")>=0) { title=dest+"旅游路线规划"; summary=dest+"旅游路线推荐，含景点安排和住宿建议。"; }
  else if (cat.indexOf("自由行")>=0) { title=dest+"自由行攻略"; summary=dest+"自由行攻略："+spots.slice(0,3).join("、")+"等经典路线推荐。"; }
  else if (cat.indexOf("避坑")>=0) { title=dest+"避坑指南"; summary=dest+"旅游避坑攻略，常见陷阱和注意事项。"; }
  else if (cat.indexOf("门票")>=0) { title=dest+"门票价格一览"; summary=dest+"主要景点门票参考价格，提前规划更省钱。"; }
  else if (cat.indexOf("文化")>=0) { title=dest+"文化探索之旅"; summary="了解"+dest+"的历史文化，感受海南独特魅力。"; }
  else if (cat.indexOf("入境")>=0) { title=dest+"入境旅游指南"; summary=dest+"入境指南：签证、交通、住宿全攻略。"; }
  else if (cat.indexOf("本地")>=0) { title=dest+"本地人玩法"; summary="像当地人一样玩"+dest+"，避开游客的深度游攻略。"; }
  else { title=dest+"景点大全"; summary=dest+"必去景点推荐："+spots.slice(0,3).join("、")+"，附门票参考和游玩攻略。"; }
  
  var html = [
    "<h2>"+dest+"概况</h2>",
    "<p>"+dest+"是"+info.desc+"。"+info.bestTime+"是最佳旅游季节，可通过"+info.transport+"抵达。</p>",
    "<h2>必去景点</h2><ul>"
  ];
  spots.forEach(function(s){ html.push("<li><strong>"+s.split("（")[0]+"</strong>"+(s.indexOf("（")>=0?" — "+s.match(/（([^）]+)/)[1]:"")+"</li>"); });
  html.push("</ul><h2>美食推荐</h2><ul>");
  food.forEach(function(f){ html.push("<li>"+f+"</li>"); });
  html.push("</ul><h2>旅游小贴士</h2><ul>");
  (info.tips||[]).slice(0,3).forEach(function(t){ html.push("<li>"+t+"</li>"); });
  html.push("</ul>");
  
  return {
    title:title, summary:summary,
    seoTitle:title+" | 指南帮旅游",
    metaDescription:summary.substring(0,160),
    slug:info.slug+"-"+cat.replace(/海南|旅游/g,"").replace(/\s+/g,"-").toLowerCase()||info.slug,
    content:html.join("\n"),
    faq:[{q:dest+"什么时候去最好？",a:info.bestTime+"。"},{q:dest+"有哪些必去景点？",a:"推荐："+spots.slice(0,3).join("、")+"。"},{q:dest+"有什么特色美食？",a:"推荐："+food.slice(0,2).join("、")+"。"}],
    tags:[dest+"旅游","海南旅游",cat], category:cat, destination:dest,
    imageAlt:dest+"旅游风景"
  };
}

function generateEn(cat, dest) {
  var info = EN_DEST[dest];
  if (!info) return defaultEn(dest);
  var spots = info.spots.slice(0,4);
  var title,summary;
  if (cat.indexOf("Food")>=0) { title=dest+" Food Guide"; summary="Best food in "+dest; }
  else if (cat.indexOf("Beach")>=0) { title="Best Beaches in "+dest; summary="Beautiful beaches in "+dest; }
  else { title="Top Attractions in "+dest; summary="Must-visit attractions in "+dest; }
  var html = ["<h2>About "+dest+"</h2><p>Best visited "+info.bestTime+".</p><h2>Top Attractions</h2><ul>"];
  spots.forEach(function(s){ html.push("<li>"+s+"</li>"); });
  html.push("</ul><h2>Local Food</h2><ul>");
  (info.food||[]).slice(0,3).forEach(function(f){ html.push("<li>"+f+"</li>"); });
  html.push("</ul>");
  return {
    title:title, summary:summary,
    seoTitle:title+" | Guide to Hainan",
    metaDescription:(summary||"").substring(0,160),
    slug:dest.toLowerCase()+"-"+cat.toLowerCase().replace(/[\s]+/g,"-"),
    content:html.join("\n"),
    faq:[{q:"Best time to visit "+dest+"?",a:info.bestTime+"."}],
    tags:[dest+" travel","Hainan travel"], category:cat, destination:dest,
    imageAlt:dest+" travel"
  };
}

function defaultZh(d) {
  return { title:d+"旅游攻略", seoTitle:d+"旅游攻略 | 指南帮旅游", metaDescription:d+"旅游攻略", slug:d.replace(/[^a-z0-9]/gi,"").toLowerCase(), summary:d+"是海南旅游的好去处。", content:"<h2>"+d+"旅游推荐</h2><p>"+d+"值得探索。</p>", faq:[{q:d+"怎么去？",a:"可自驾或高铁前往。"}], tags:[d+"旅游","海南旅游"], category:"海南旅游", destination:d, imageAlt:d+"旅游" };
}

function defaultEn(d) {
  return { title:d+" Travel Guide", seoTitle:d+" Travel Guide | Guide to Hainan", metaDescription:"Guide to "+d, slug:d.toLowerCase().replace(/[^a-z]/g,"")+"-guide", summary:"Discover "+d+".", content:"<h2>About "+d+"</h2><p>Best visited in dry season.</p>", faq:[{q:"How to get to "+d+"?","a":"By high-speed rail or car."}], tags:[d+" travel","Hainan travel"], category:"Hainan Travel", destination:d, imageAlt:d+" travel" };
}

module.exports = { generate };
