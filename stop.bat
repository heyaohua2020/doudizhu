@echo off
chcp 65001 >nul
title 斗地主 - 停止服务

echo ========================================
echo    🛑 斗地主 - 停止所有服务
echo ========================================
echo.

:: ① 关 ngrok
echo [1/3] 关闭 ngrok 隧道...
taskkill /F /IM ngrok.exe >nul 2>&1
echo    ✓ ngrok 已停止
echo.

:: ② 按端口杀
echo [2/3] 关闭游戏服务器（端口 3001）...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":3001"') do (
    if not "%%a"=="" (
        taskkill /F /PID %%a >nul 2>&1 && echo    ✓ 已杀 PID=%%a
    )
)
echo.

:: ③ 补杀残留的本项目 node 进程
echo [3/3] 清理残留 node 进程...
for /f "tokens=2 delims==" %%a in (
    'wmic process where "name='node.exe' and commandline like '%%doudizhu%%'" get processid /format:value 2^>nul'
) do (
    if not "%%a"=="" (
        taskkill /F /PID %%a >nul 2>&1 && echo    ✓ 已杀残留 PID=%%a
    )
)
echo.

echo ========================================
echo    所有服务已停止，再见 👋
echo ========================================
timeout /t 3 /nobreak >nul
