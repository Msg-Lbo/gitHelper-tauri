@echo off
chcp 65001
echo 正在启动 Git Helper 中文安装程序...
echo Starting Git Helper Chinese Installer...
echo.

REM 设置中文语言环境
set LANG=zh_CN.UTF-8
set LC_ALL=zh_CN.UTF-8

REM 优先检查是否存在 NSIS 安装程序（支持中文界面）
if exist "src-tauri\target\release\bundle\nsis\Git Helper_0.1.0_x64-setup.exe" (
    echo 找到 NSIS 安装程序（中文界面），正在启动...
    echo Found NSIS installer (Chinese interface), launching...
    start "" "src-tauri\target\release\bundle\nsis\Git Helper_0.1.0_x64-setup.exe"
    goto :end
)

REM 备选：检查是否存在 MSI 安装程序
if exist "src-tauri\target\release\bundle\msi\Git Helper_0.1.0_x64_en-US.msi" (
    echo 找到 MSI 安装程序（英文界面），正在启动...
    echo Found MSI installer (English interface), launching...
    start "" "src-tauri\target\release\bundle\msi\Git Helper_0.1.0_x64_en-US.msi"
    goto :end
)

echo 错误：未找到安装程序文件
echo Error: Installer file not found
echo 请先运行 'pnpm tauri build' 来生成安装程序
echo Please run 'pnpm tauri build' first to generate the installer
pause

:end
echo.
echo 安装程序已启动。NSIS 安装程序支持完整中文界面！
echo Installer launched. NSIS installer supports full Chinese interface!
echo 如果使用的是 MSI 安装程序，界面可能显示英文，但应用程序本身是中文的。
echo If using MSI installer, interface may be in English, but the app itself is in Chinese.
echo.
pause
