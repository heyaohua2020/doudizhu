@echo off
chcp 65001 >nul
title 斗地主 - 启动中...
cd /d "H:\doudizhu"

echo ========================================
echo    🃏 斗地主 - 一键启动
echo ========================================
echo.

:: ═══════════════════════════════════════
::  1. 清理旧进程（三重保险）
:: ═══════════════════════════════════════
echo [1/4] 清理旧服务...

:: ① 按端口杀 — 找到 3001 端口上的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":3001"') do (
    if not "%%a"=="" (
        taskkill /F /PID %%a >nul 2>&1 && echo    ✓ 已杀 PID=%%a (端口 3001)
    )
)

:: ② 按进程名杀 — 关掉残留的 node.exe（来自本项目目录的）
for /f "tokens=2 delims==" %%a in (
    'wmic process where "name='node.exe' and commandline like '%%doudizhu%%'" get processid /format:value 2^>nul'
) do (
    if not "%%a"=="" (
        taskkill /F /PID %%a >nul 2>&1 && echo    ✓ 已杀残留 PID=%%a (node.exe)
    )
)

:: ③ 关 ngrok
taskkill /F /IM ngrok.exe >nul 2>&1
echo    ✓ ngrok 已清理
echo.

:: ═══════════════════════════════════════
::  2. 启动游戏服务器
:: ═══════════════════════════════════════
echo [2/4] 启动游戏服务器（端口 3001）...
:: ⚠️ 如果 pnpm 在新窗口找不到，取消下行注释，注释掉再下一行
:: start "斗地主-服务端" cmd /c "C:\Users\西城望月\AppData\Local\fnm\fnm.exe env --use-on-cd && pnpm --filter server dev && pause"
start "斗地主-服务端" cmd /c "pnpm --filter server dev && pause"
echo    ✓ 服务端启动中...
echo.

:: ═══════════════════════════════════════
::  3. 等待服务器就绪
:: ═══════════════════════════════════════
echo [3/4] 等待服务器就绪...
:wait_server
timeout /t 2 /nobreak >nul
curl -s -o nul http://localhost:3001/ 2>nul
if errorlevel 1 goto wait_server
echo    ✓ 服务器就绪 (http://localhost:3001)
echo.

:: ═══════════════════════════════════════
::  4. 启动 ngrok 隧道
:: ═══════════════════════════════════════
echo [4/4] 启动 ngrok 公网隧道...
start "斗地主-ngrok" cmd /c ""C:\Users\西城望月\AppData\Local\ngrok\ngrok.exe" http 3001 --log=stdout"
echo    ✓ ngrok 启动中...
echo.

:: ═══════════════════════════════════════
::  5. 等 ngrok 就绪，显示地址
:: ═══════════════════════════════════════
echo ========================================
echo    ⏳ 获取公网地址...
echo ========================================
:wait_ngrok
timeout /t 3 /nobreak >nul
curl -s http://127.0.0.1:4040/api/tunnels 2>nul | findstr "public_url" >nul
if errorlevel 1 goto wait_ngrok

:: 用 Python 脚本提取公网 URL
for /f "usebackq delims=" %%a in (`python get_ngrok_url.py`) do set "ngrok_url=%%a"

cls
echo ========================================
echo    DOUDIZHU - STARTED
echo ========================================
echo.
echo  1. Local     http://localhost:3001
echo  2. Public    %ngrok_url%
echo  3. Debug     http://127.0.0.1:4040
echo  Q. Quit
echo.

:choose_action
set /p INPUT="Select [1/2/3/Q]: "
if /i "%INPUT%"=="Q" goto :done
if "%INPUT%"=="1" start http://localhost:3001
if "%INPUT%"=="1" echo.
if "%INPUT%"=="1" echo    Opened local address
if "%INPUT%"=="2" start "" "%ngrok_url%"
if "%INPUT%"=="2" echo.
if "%INPUT%"=="2" echo    Opened public address
if "%INPUT%"=="3" start http://127.0.0.1:4040
if "%INPUT%"=="3" echo.
if "%INPUT%"=="3" echo    Opened ngrok debug console
if "%INPUT%"=="" goto :choose_action
if not "%INPUT%"=="1" if not "%INPUT%"=="2" if not "%INPUT%"=="3" if /i not "%INPUT%"=="Q" echo    Invalid choice, try again
goto :choose_action

:done
echo.
echo  Press any key to exit...
pause >nul
