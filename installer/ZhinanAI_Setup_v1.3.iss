; 指南帮 AI 助手 v1.3 -- Inno Setup 安装脚本（图形安装向导）
; 
; 编译命令: ISCC.exe "installer\ZhinanAI_Setup_v1.3.iss"
; 需要 Inno Setup 6+ (https://jrsoftware.org/isdl.php)
;
; v1.3 更新:
;   - Win7 兼容（含 Node 18 + MinGit）
;   - 版本更新机制（update.ps1 在线/离线双模式）
;   - 诊断导出工具（diagnose.ps1）
;   - GPO 批量部署（gpo-deploy.ps1）
;   - 镜像加速检测（mirror.ps1）
;   - MinGit 替代旧版 PortableGit（减小 59MB）

#define MyAppName "指南帮 AI 助手"
#define MyAppVersion "1.3.0"
#define MyAppPublisher "海南指南帮科技有限公司"
#define MyAppURL "https://zhinanai.zhinanbang.cn"
#define MyAppContact "微信: hibeike"

[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppContact={#MyAppContact}
DefaultDirName={localappdata}\ZhinanAI
DefaultGroupName={#MyAppName}
PrivilegesRequired=lowest
OutputDir=..\output
OutputBaseFilename=ZhinanAI_Setup_v1.3
SetupIconFile=..\assets\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
LanguageDetectionMethod=locale
DisableProgramGroupPage=yes
DisableWelcomePage=no
DisableDirPage=no
UninstallDisplayIcon={app}\assets\icon.ico
UninstallDisplayName={#MyAppName} {#MyAppVersion}
ShowLanguageDialog=no
VersionInfoVersion=1.3.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} 全量离线安装包
VersionInfoProductName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Types]
Name: "full"; Description: "完整安装（所有组件，推荐）"
Name: "compact"; Description: "紧凑安装（仅 Hermes + Python）"
Name: "custom"; Description: "自定义安装"; Flags: iscustom

[Components]
Name: "main"; Description: "Hermes Agent + 配置文件 + 工具脚本"; Types: full compact custom; Flags: fixed
Name: "python"; Description: "Python 3.11 运行时 (10MB)"; Types: full compact
Name: "node"; Description: "Node.js (Win10+ 用 v22 / Win7 用 v18) (46MB)"; Types: full
Name: "git"; Description: "MinGit 便携版 (1MB)"; Types: full
Name: "ripgrep"; Description: "ripgrep 搜索工具 (10MB)"; Types: full
Name: "ffmpeg"; Description: "FFmpeg 多媒体工具 (160MB)"; Types: full

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "快捷方式:"
Name: "startup"; Description: "开机自动启动指南帮 AI 助手"; GroupDescription: "启动选项:"

[Files]
; 核心脚本和配置
Source: "..\install.ps1"; DestDir: "{app}"; Components: main; Flags: ignoreversion
Source: "..\uninstall.ps1"; DestDir: "{app}"; Components: main; Flags: ignoreversion
Source: "..\build.ps1"; DestDir: "{app}"; Components: main; Flags: ignoreversion
Source: "..\update.ps1"; DestDir: "{app}"; Components: main; Flags: ignoreversion
Source: "..\dependencies.lock.json"; DestDir: "{app}"; Components: main; Flags: ignoreversion
Source: "..\config\*"; DestDir: "{app}\config"; Components: main; Flags: ignoreversion recursesubdirs
Source: "..\assets\*"; DestDir: "{app}\assets"; Components: main; Flags: ignoreversion recursesubdirs
Source: "..\scripts\*"; DestDir: "{app}\scripts"; Components: main; Flags: ignoreversion recursesubdirs

; Hermes Agent + pip 依赖
Source: "..\packages\hermes\*"; DestDir: "{app}\packages\hermes"; Components: main; Flags: ignoreversion recursesubdirs

; Python
Source: "..\packages\python\python-3.11.9-embed-amd64.zip"; DestDir: "{app}\packages\python"; Components: python; Flags: ignoreversion

; Node.js -- 两个版本都打包，install.ps1 自动选择
Source: "..\packages\node\node-v22.14.0-win-x64.zip"; DestDir: "{app}\packages\node"; Components: node; Flags: ignoreversion
Source: "..\packages\node\node-v18.20.4-win-x64.zip"; DestDir: "{app}\packages\node"; Components: node; Flags: ignoreversion

; Git -- MinGit 替代旧版 PortableGit (节省 59MB)
Source: "..\packages\git\MinGit-2.35.5-64-bit.zip"; DestDir: "{app}\packages\git"; Components: git; Flags: ignoreversion

; Ripgrep
Source: "..\packages\ripgrep\ripgrep-14.1.1-x86_64-pc-windows-gnu.zip"; DestDir: "{app}\packages\ripgrep"; Components: ripgrep; Flags: ignoreversion

; FFmpeg
Source: "..\packages\ffmpeg\ffmpeg-master-latest-win64-gpl.zip"; DestDir: "{app}\packages\ffmpeg"; Components: ffmpeg; Flags: ignoreversion

[Icons]
Name: "{commondesktop}\指南帮 AI 助手"; Filename: "{app}\scripts\hermes-launcher.bat"; WorkingDir: "{app}"; Tasks: desktopicon; Comment: "启动指南帮 AI 助手 v1.3"
Name: "{userstartup}\指南帮 AI 助手"; Filename: "{app}\scripts\hermes-launcher.bat"; WorkingDir: "{app}"; Tasks: startup
Name: "{group}\指南帮 AI 助手"; Filename: "{app}\scripts\hermes-launcher.bat"; WorkingDir: "{app}"
Name: "{group}\诊断工具"; Filename: "{app}\scripts\diagnose.bat"; WorkingDir: "{app}"
Name: "{group}\企业部署工具"; Filename: "{app}\scripts\gpo-deploy.bat"; WorkingDir: "{app}"
Name: "{group}\卸载 指南帮 AI 助手"; Filename: "{uninstallexe}"

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File \""{app}\scripts\first-run.ps1\"""; Flags: postinstall nowait shellexec skipifsilent; Description: "运行首次配置向导"
Filename: "{app}\scripts\hermes-launcher.bat"; Flags: postinstall nowait skipifsilent; Description: "启动指南帮 AI 助手"

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File \""{app}\uninstall.ps1\"""; Flags: runhidden

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  PathStr: String;
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    PathStr := ExpandConstant('{app}\python;{app}\node;{app}\git\bin;{app}\ripgrep');
    RegWriteExpandStringValue(HKEY_CURRENT_USER, 'Environment', 'Path',
      PathStr + ';' + GetEnv('Path'));
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpSelectDir then
  begin
    WizardForm.NextButton.Caption := '安装(&I)';
  end;
  if CurPageID = wpInstalling then
  begin
    WizardForm.StatusLabel.Caption := '正在安装指南帮 AI 助手，请稍候...';
    WizardForm.FilenameLabel.Caption := '解压组件包中...';
  end;
end;
