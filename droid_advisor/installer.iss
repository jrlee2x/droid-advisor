#define MyAppName "Droid Advisor"
#define MyAppVersion "0.7.0"
#define MyAppPublisher "Droid Advisor Contributors"

#define MyAppExeName "DroidAdvisor.exe"

[Setup]
AppId={{8DA9B049-8751-4FF8-A842-BB483C52C472}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\DroidAdvisor
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=dist-installer
OutputBaseFilename=DroidAdvisor-Setup-{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#MyAppExeName}
CloseApplications=yes
RestartApplications=no
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription=Passive Droid Tycoon rebirth-cycle advisor
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked
Name: "startup"; Description: "Start Droid Advisor when I sign in"; GroupDescription: "Startup:"; Flags: unchecked

[Files]
Source: "dist\DroidAdvisor\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Droid Advisor"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Droid Advisor"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userstartup}\Droid Advisor"; Filename: "{app}\{#MyAppExeName}"; Tasks: startup

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Droid Advisor"; Flags: nowait postinstall skipifsilent
