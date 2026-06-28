# 指南帮 AI 助手 (DeepSeek版) - 离线安装包 v1.0

## 简介

**指南帮 AI 助手** 是基于 Hermes Agent 的 AI 编程/任务助手，
预配置为仅支持 DeepSeek API。一键安装，离线运行，
适用于全新 Windows 10/11 电脑。

### 包含组件

| 组件 | 版本 | 用途 |
|------|------|------|
| Hermes Agent | 0.17.0 | AI 助手核心引擎 |
| Python | 3.11.9 | 脚本运行时 |
| Node.js | 22.14.0 LTS | JavaScript 运行时 |
| Git | 2.48.1 (Portable) | 版本控制 |
| ripgrep | 14.1.1 | 代码搜索 |
| FFmpeg | 最新版 | 媒体处理 |

## 系统要求

- Windows 10 (64-bit) 或 Windows 11
- 4GB+ 内存（推荐 8GB+）
- 2GB+ 可用磁盘空间
- 无需管理员权限
- 需 Internet 连接（首次配置 DeepSeek API Key）

## 安装方法

### 方法 1：运行安装程序（推荐）

1. 双击 `ZhinanAI_Setup_v1.0.exe`
2. 按向导提示完成安装
3. 首次运行时会引导输入 DeepSeek API Key

### 方法 2：手动运行安装脚本

```powershell
cd E:\ZhinanAI-DeepSeek-Offline
powershell -ExecutionPolicy Bypass -File install.ps1
```

## 首次使用

1. 双击桌面快捷方式 "指南帮 AI 助手"
2. 终端中运行 `/model` 选择 provider 为 `deepseek`
3. 设置模型为 `deepseek-v4-pro`
4. 开始使用！

### 获取 DeepSeek API Key

1. 访问 https://platform.deepseek.com/
2. 注册账号 -> 创建 API Key
3. 在安装向导或配置文件中填写

## 配置文件

**路径**: `%APPDATA%\ZhinanAI\config.yaml`

```yaml
deepseek:
  api_key: "sk-xxxxxxxxxxxxxxxx"
  base_url: "https://api.deepseek.com"
  model: "deepseek-v4-pro"
```

## 卸载

### 通过开始菜单
开始菜单 -> 指南帮 AI 助手 -> 卸载 指南帮 AI 助手

### 通过卸载脚本
```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

## 升级

1. 运行最新版本安装程序（覆盖安装）
2. 配置文件保留，无需重新配置 API Key

## 常见问题

### 安装时提示"无法执行脚本"
A: PowerShell 执行策略限制。运行：
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 启动后找不到 hermes 命令
A: 关闭当前终端，重新打开。或注销后重新登录。

### 如何更换 DeepSeek 模型？
A: 编辑 `%APPDATA%\ZhinanAI\config.yaml`，修改 `model` 字段。
支持的模型：
- `deepseek-chat` (DeepSeek-V3)
- `deepseek-reasoner` (DeepSeek-R1)
- `deepseek-v4-pro` (默认)
- `deepseek-v4-flash`

### 如何添加视觉模型？
A: DeepSeek 不支持看图，需配置 auxiliary.vision：
```bash
hermes config set auxiliary.vision.provider openai
hermes config set auxiliary.vision.model qwen-vl-max
hermes config set auxiliary.vision.base_url https://dashscope.aliyuncs.com/compatible-mode/v1
```
需要设置 `DASHSCOPE_API_KEY` 环境变量。

### 安装包体积为什么这么大？
A: 包含完整的 Python、Node.js、Git 等运行时，确保离线可用。

## 构建说明

如需自行构建安装包：

1. 安装 Inno Setup 6 (https://jrsoftware.org/isdl.php)
2. 以管理员身份运行 PowerShell
3. 执行 `build.ps1`
4. 生成的安装包在 `output\` 目录

## 许可

- Hermes Agent: MIT License (Nous Research)
- 其他组件遵循各自的开源许可证
