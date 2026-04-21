@echo off
echo ==========================================
echo   Hermes Mission Control — Dev Server
echo ==========================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Download from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo Node.js: %NODE_VER%
echo.

if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
    echo.
)

echo Starting Hermes Mission Control...
npm run dev
