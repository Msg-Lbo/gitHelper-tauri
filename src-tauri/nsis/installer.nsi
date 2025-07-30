; WorkHelper NSIS Installer Script
; 使用英文路径和Msg-Lbo发布者信息

!define PRODUCT_NAME "WorkHelper"
!define PRODUCT_VERSION "0.1.0"
!define PRODUCT_PUBLISHER "Msg-Lbo"
!define PRODUCT_WEB_SITE "https://github.com/msg-lbo"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\WorkHelper.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

; 设置安装目录为英文路径
InstallDir "$PROGRAMFILES\Msg-Lbo\WorkHelper"

; 现代UI设置
!include "MUI2.nsh"

; MUI 设置
!define MUI_ABORTWARNING
!define MUI_ICON "icons\icon.ico"
!define MUI_UNICON "icons\icon.ico"

; 安装页面
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; 卸载页面
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; 语言文件
!insertmacro MUI_LANGUAGE "SimpChinese"

; 安装程序属性
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "WorkHelper_${PRODUCT_VERSION}_x64-setup.exe"
ShowInstDetails show
ShowUnInstDetails show

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  SetOverwrite ifnewer
  
  ; 安装主程序文件
  File "WorkHelper.exe"
  
  ; 创建桌面快捷方式
  CreateShortCut "$DESKTOP\WorkHelper.lnk" "$INSTDIR\WorkHelper.exe"
  
  ; 创建开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\Msg-Lbo"
  CreateShortCut "$SMPROGRAMS\Msg-Lbo\WorkHelper.lnk" "$INSTDIR\WorkHelper.exe"
  CreateShortCut "$SMPROGRAMS\Msg-Lbo\卸载 WorkHelper.lnk" "$INSTDIR\uninst.exe"
SectionEnd

Section -AdditionalIcons
  WriteIniStr "$INSTDIR\${PRODUCT_NAME}.url" "InternetShortcut" "URL" "${PRODUCT_WEB_SITE}"
  CreateShortCut "$SMPROGRAMS\Msg-Lbo\Website.lnk" "$INSTDIR\${PRODUCT_NAME}.url"
SectionEnd

Section -Post
  WriteUninstaller "$INSTDIR\uninst.exe"
  WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\WorkHelper.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninst.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\WorkHelper.exe"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
SectionEnd

Function un.onUninstSuccess
  HideWindow
  MessageBox MB_ICONINFORMATION|MB_OK "$(^Name) 已成功地从你的计算机中移除。"
FunctionEnd

Function un.onInit
  MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "你确实要完全移除 $(^Name) ，其及所有的组件？" IDYES +2
  Abort
FunctionEnd

Section Uninstall
  Delete "$INSTDIR\${PRODUCT_NAME}.url"
  Delete "$INSTDIR\uninst.exe"
  Delete "$INSTDIR\WorkHelper.exe"

  Delete "$SMPROGRAMS\Msg-Lbo\Website.lnk"
  Delete "$SMPROGRAMS\Msg-Lbo\卸载 WorkHelper.lnk"
  Delete "$SMPROGRAMS\Msg-Lbo\WorkHelper.lnk"

  Delete "$DESKTOP\WorkHelper.lnk"

  RMDir "$SMPROGRAMS\Msg-Lbo"
  RMDir "$INSTDIR"

  DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
  SetAutoClose true
SectionEnd
