@echo off
cd /d "%~dp0"
set "AUREA_NODE=node"
where node >nul 2>&1
if errorlevel 1 set "AUREA_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%AUREA_NODE%" if not "%AUREA_NODE%"=="node" (
  echo Necesitas Node.js 24 o superior para iniciar Aurea.
  pause
  exit /b 1
)
echo Abre http://127.0.0.1:4178 en tu navegador.
echo Conserva esta ventana abierta. Ctrl+C detiene Aurea.
"%AUREA_NODE%" server.cjs
pause
