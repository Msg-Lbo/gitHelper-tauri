; Tauri NSIS 安装脚本模板 - 中文版
; 此模板由 Tauri 使用，支持中文界面

Unicode True
!define PRODUCT_NAME "{{product_name}}"
!define PRODUCT_VERSION "{{version}}"
!define PRODUCT_PUBLISHER "{{publisher}}"
!define PRODUCT_WEB_SITE "{{homepage}}"

; 设置压缩方式
SetCompressor /SOLID lzma

; 现代界面设置
!include "MUI2.nsh"

; 界面设置
!define MUI_ABORTWARNING
!define MUI_ICON "{{icon_path}}"
!define MUI_UNICON "{{icon_path}}"

; 自定义中文文本
!define MUI_WELCOMEPAGE_TITLE "欢迎使用 ${PRODUCT_NAME} 安装向导"
!define MUI_WELCOMEPAGE_TEXT "安装向导将引导您完成 ${PRODUCT_NAME} 的安装过程。$\r$\n$\r$\n在开始安装之前，建议先关闭其他所有应用程序。这将允许安装程序更新相关的系统文件，而不需要重新启动您的计算机。$\r$\n$\r$\n点击 下一步 继续。"

!define MUI_DIRECTORYPAGE_TEXT_TOP "安装程序将安装 ${PRODUCT_NAME} 到下列文件夹。要安装到不同文件夹，点击 浏览 并选择其他文件夹。点击 下一步 继续。"

!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "安装完成"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "安装已成功完成。"

!define MUI_FINISHPAGE_TITLE "完成 ${PRODUCT_NAME} 安装向导"
!define MUI_FINISHPAGE_TEXT "${PRODUCT_NAME} 已安装在您的计算机上。$\r$\n$\r$\n点击 完成 关闭此向导。"
!define MUI_FINISHPAGE_RUN_TEXT "运行 ${PRODUCT_NAME}"

; 页面定义
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; 卸载页面
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; 语言文件 - 简体中文
!insertmacro MUI_LANGUAGE "SimpChinese"

; 安装程序信息
Name "${PRODUCT_NAME}"
OutFile "{{out_file}}"
InstallDir "{{install_dir}}"
ShowInstDetails show
ShowUnInstDetails show

; 版本信息
VIProductVersion "{{version_with_build}}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "Comments" "专业的 Git 版本控制管理工具"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "LegalCopyright" "© ${PRODUCT_PUBLISHER}"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "FileDescription" "${PRODUCT_NAME} 安装程序"
VIAddVersionKey /LANG=${LANG_SIMPCHINESE} "FileVersion" "${PRODUCT_VERSION}"

; 安装部分
Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer

  {{#each binaries}}
  File "{{this.path}}"
  {{/each}}

  {{#each resources}}
  File /r "{{this}}"
  {{/each}}

  ; 创建卸载程序
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; 注册表项
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayIcon" "$INSTDIR\{{main_binary_name}}.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "InstallLocation" "$INSTDIR"
SectionEnd

; 快捷方式
Section -AdditionalIcons
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\{{main_binary_name}}.exe"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk" "$INSTDIR\uninstall.exe"
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\{{main_binary_name}}.exe"
SectionEnd

; 卸载部分
Section Uninstall
  ; 删除注册表项
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

  ; 删除快捷方式
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"

  ; 删除安装文件
  {{#each binaries}}
  Delete "$INSTDIR\{{this.name}}"
  {{/each}}

  Delete "$INSTDIR\uninstall.exe"
  RMDir /r "$INSTDIR"

  SetAutoClose true
SectionEnd

; 初始化函数
Function .onInit
  ; 设置默认语言为简体中文
  StrCpy $LANGUAGE ${LANG_SIMPCHINESE}
FunctionEnd
