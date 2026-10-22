@echo off
title Stream Code - publish the README screenshots
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================================
echo   Uploads extension\images\*.webp to the Cloudflare Pages
echo   project "stream-code" (https://stream-code.pages.dev/), which
echo   the extension page's screenshots link to. Re-run after
echo   changing a screenshot, then re-run install-stream-code.bat.
echo   Needs: npx wrangler login (once).
echo ================================================================
echo.
call npx --yes wrangler pages deploy extension\images --project-name=stream-code --branch=main --commit-dirty=true
echo.
pause
