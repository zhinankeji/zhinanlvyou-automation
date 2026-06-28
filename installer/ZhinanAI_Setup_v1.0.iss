; 指南帮 AI 助手 - Inno Setup 安装脚本
; 需要 Inno Setup 6+ (https://jrsoftware.org/isdl.php)

#define MyAppName "指南帮 AI 助手"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "指南帮科技"
#define MyAppURL "https://zhinanbang.cn"
#define MyAppExeName "scripts\\hermes-launcher.bat"

[Setup]
AppId={{B3A2F1C0-8D5E-4A6C-9B1D-2E3F4A5B6C7D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\\ZhinanAI
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=auto
OutputBaseFilename=ZhinanAI_Setup_v1.0
OutputDir=..\\output
SetupIconFile=..\\assets\\icon.ico
WizardImageFile=..\\assets\\banner.bmp
Compression=lzma2/max
SolidCompression=yes
UninstallDisplayIcon={app}\\scripts\\hermes-launcher.bat
UninstallDisplayName={#MyAppName} {#MyAppVersion}
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DisableWelcomePage=no
WizardStyle=modern
LanguageDetectionMethod=locale

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "full"; Description: "完整安装（全部组件）"
Name: "custom"; Description: "自定义安装"; Flags: iscustom

[Components]
Name: "core"; Description: "核心程序 (Hermes Agent)"; Types: full custom; Flags: fixed
Name: "python"; Description: "Python 3.11.11 运行时"; Types: full
Name: "node"; Description: "Node.js 22.14.0 LTS"; Types: full
Name: "git"; Description: "Git Portable 2.48.1"; Types: full
Name: "ripgrep"; Description: "ripgrep 14.1.1 搜索工具"; Types: full
Name: "ffmpeg"; Description: "FFmpeg 多媒体工具"; Types: full

[Files]
; Hermes Agent 核心
Source: "..\\packages\\hermes\\*.whl"; DestDir: "{app}\\packages\\hermes"; Flags: ignoreversion; Components: core
Source: "..\\packages\\hermes\\get-pip.py"; DestDir: "{app}\\packages\\hermes"; Flags: ignoreversion; Components: core
Source: "..\\scripts\\hermes-launcher.bat"; DestDir: "{app}\\scripts"; Flags: ignoreversion; Components: core
Source: "..\\install.ps1"; DestDir: "{app}"; Flags: ignoreversion; Components: core
Source: "..\\uninstall.ps1"; DestDir: "{app}"; Flags: ignoreversion; Components: core
Source: "..\\config\\deepseek.template.yaml"; DestDir: "{app}\\config"; Flags: ignoreversion; Components: core
; Python 3.11
Source: "..\\build\\python\\*"; DestDir: "{app}\\python"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: python
; Node.js
Source: "..\\build\\node\\*"; DestDir: "{app}\\node"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: node
; Git
Source: "..\\build\\git\\*"; DestDir: "{app}\\git"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: git
; Ripgrep
Source: "..\\build\\rg\\*"; DestDir: "{app}\\ripgrep"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: ripgrep
; FFmpeg
Source: "..\\build\\ffmpeg\\*"; DestDir: "{app}\\ffmpeg"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: ffmpeg

[Dirs]
Name: "{app}\\python"
Name: "{app}\\node"
Name: "{app}\\git"
Name: "{app}\\ripgrep"
Name: "{app}\\ffmpeg"
Name: "{app}\\packages"

[Icons]
Name: "{group}\\指南帮 AI 助手"; Filename: "{app}\\scripts\\hermes-launcher.bat"
Name: "{group}\\卸载 指南帮 AI 助手"; Filename: "{uninstallexe}"
Name: "{commondesktop}\\指南帮 AI 助手"; Filename: "{app}\\scripts\\hermes-launcher.bat"
Name: "{userstartup}\\指南帮 AI 助手"; Filename: "{app}\\scripts\\hermes-launcher.bat"

[Run]
Filename: "{app}\\scripts\\first-run.ps1"; Flags: postinstall nowait skipifsilent shellexec runasoriginaluser; Parameters: "-ExecutionPolicy Bypass -NoProfile -File \"{app}\\scripts\\first-run.ps1\""

[UninstallRun]
Filename: "{app}\\uninstall.ps1"; Flags: runhidden shellexec; Parameters: "-ExecutionPolicy Bypass -NoProfile -File \"{app}\\uninstall.ps1\""
