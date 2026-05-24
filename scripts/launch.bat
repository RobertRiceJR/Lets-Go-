@echo off
:: launch.bat — Build and start Let's Go! under PM2 (Windows)
::
:: Usage: Double-click this file, or run from PowerShell:
::   .\scripts\launch.bat

setlocal EnableDelayedExpansion

:: Always operate from the project root
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
cd /d "%ROOT_DIR%"

echo.
echo =================================
echo  ^🗺️  Let's Go! -- Launch Script
echo =================================
echo  Project root: %CD%
echo.

:: ── 1. Install dependencies ──────────────────────────────────────────────────
echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 ( echo ERROR: npm install failed & pause & exit /b 1 )

call npm install --prefix server
if %errorlevel% neq 0 ( echo ERROR: server npm install failed & pause & exit /b 1 )

call npm install --prefix client
if %errorlevel% neq 0 ( echo ERROR: client npm install failed & pause & exit /b 1 )

:: ── 2. Build client ──────────────────────────────────────────────────────────
echo.
echo [2/4] Building client (Vite)...
call npm run build
if %errorlevel% neq 0 ( echo ERROR: build failed & pause & exit /b 1 )

:: ── 3. Start PM2 ─────────────────────────────────────────────────────────────
echo.
echo [3/4] Starting PM2...
call pm2 start ecosystem.config.js
if %errorlevel% neq 0 ( echo ERROR: PM2 start failed & pause & exit /b 1 )

:: ── 4. Save PM2 process list ─────────────────────────────────────────────────
echo.
echo [4/4] Saving PM2 process list...
call pm2 save

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
echo ==========================================
echo   Let's Go! is running!
echo.
echo   Local:       http://localhost:3001
echo   Status page: http://localhost:3001/status
echo   PM2 logs:    npm run pm2:logs
echo   PM2 status:  npm run pm2:status
echo.
echo   To expose publicly (no account needed):
echo   cloudflared tunnel --url http://localhost:3001
echo ==========================================
echo.
echo NOTE: To survive reboots on Windows, set PM2 as a startup service.
echo See SPARE_PC_SETUP.md for instructions.
echo.
pause
