; 指南帮 AI 助手 v1.2 -- Inno Setup 安装脚本

; 编译命令: ISCC.exe "installer\ZhinanAI_Setup_v1.2.iss"

; 需要 Inno Setup 6+ (https://jrsoftware.org/isdl.php)



#define MyAppName "指南帮 AI 助手"

#define MyAppVersion "1.2.0"

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

OutputBaseFilename=ZhinanAI_Setup_v1.2

SetupIconFile=..\assets\icon.ico

Compression=lzma2/ultra64

SolidCompression=yes

WizardStyle=modern

LanguageDetectionMethod=locale

DisableProgramGroupPage=yes

UninstallDisplayIcon={app}\assets\icon.ico

UninstallDisplayName={#MyAppName}



[Languages]


Name: "english"; MessagesFile: "compiler:Default.isl"



[Types]

Name: "full"; Description: "完整安装（所有组件）"

Name: "compact"; Description: "紧凑安装（仅 Hermes + Python）"

Name: "custom"; Description: "自定义安装"; Flags: iscustom



[Components]

Name: "main"; Description: "Hermes Agent + 配置文件"; Types: full compact custom; Flags: fixed

Name: "python"; Description: "Python 3.11 (10MB)"; Types: full compact

Name: "node"; Description: "Node.js 22 LTS (33MB)"; Types: full

Name: "git"; Description: "Git Portable 2.48 (60MB)"; Types: full

Name: "ripgrep"; Description: "ripgrep 14.1 (10MB)"; Types: full

Name: "ffmpeg"; Description: "FFmpeg (160MB)"; Types: full



[Tasks]

Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "快捷方式:"

Name: "startup"; Description: "开机自动启动"; GroupDescription: "启动选项:"



[Files]

Source: "..\install.ps1"; DestDir: "{app}"; Components: main; Flags: ignoreversion

Source: "..\uninstall.ps1"; DestDir: "{app}"; Components: main; Flags: ignoreversion

Source: "..\build.ps1"; DestDir: "{app}"; Components: main; Flags: ignoreversion

Source: "..\dependencies.lock.json"; DestDir: "{app}"; Components: main; Flags: ignoreversion

Source: "..\config\*"; DestDir: "{app}\config"; Components: main; Flags: ignoreversion recursesubdirs

Source: "..\assets\*"; DestDir: "{app}\assets"; Components: main; Flags: ignoreversion recursesubdirs

Source: "..\scripts\*"; DestDir: "{app}\scripts"; Components: main; Flags: ignoreversion recursesubdirs

Source: "..\packages\hermes\*"; DestDir: "{app}\packages\hermes"; Components: main; Flags: ignoreversion recursesubdirs

Source: "..\packages\python\python-3.11.9-embed-amd64.zip"; DestDir: "{app}\packages\python"; Components: python; Flags: ignoreversion

Source: "..\packages\node\node-v22.14.0-win-x64.zip"; DestDir: "{app}\packages\node"; Components: node; Flags: ignoreversion

Source: "..\packages\git\PortableGit-2.48.1-64-bit.7z.exe"; DestDir: "{app}\packages\git"; Components: git; Flags: ignoreversion

Source: "..\packages\ripgrep\ripgrep-14.1.1-x86_64-pc-windows-gnu.zip"; DestDir: "{app}\packages\ripgrep"; Components: ripgrep; Flags: ignoreversion

Source: "..\packages\ffmpeg\ffmpeg-master-latest-win64-gpl.zip"; DestDir: "{app}\packages\ffmpeg"; Components: ffmpeg; Flags: ignoreversion



[Icons]

Name: "{commondesktop}\指南帮 AI 助手"; Filename: "{app}\scripts\hermes-launcher.bat"; WorkingDir: "{app}"; Tasks: desktopicon

Name: "{userstartup}\指南帮 AI 助手"; Filename: "{app}\scripts\hermes-launcher.bat"; WorkingDir: "{app}"; Tasks: startup

Name: "{group}\指南帮 AI 助手"; Filename: "{app}\scripts\hermes-launcher.bat"; WorkingDir: "{app}"

Name: "{group}\诊断工具"; Filename: "{app}\scripts\diagnose.bat"; WorkingDir: "{app}"

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