@echo off
chcp 65001 >nul
setlocal EnableExtensions

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [错误] 未检测到 Node.js，请先安装 Node.js 18+：
  echo   https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo.
  echo [错误] 请在 llm-director-hitman 仓库根目录运行此启动器。
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo 首次运行：正在安装依赖（仅需一次）…
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [错误] npm install 失败，请查看上方报错。
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Hitman 演示启动中…
echo   玩家页面： http://127.0.0.1:8747/play/index.html
echo   请勿关闭本窗口（Ctrl+C 可停止服务）
echo.

call npm run play
if errorlevel 1 (
  echo.
  echo [错误] 启动失败，请查看上方报错。
  echo.
  pause
  exit /b 1
)

endlocal
