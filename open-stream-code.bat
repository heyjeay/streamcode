@echo off
title Stream Code - DEBUG view
echo ================================================================
echo   Opening the Stream Code overlay in DEBUG mode
echo   (green HUD: connection state, update count, language)
echo ================================================================
echo.
echo   NOTE: VS Code must be open with the Stream Code extension
echo   installed - it is the server. Add ?demo to the URL instead
echo   to see canned code without VS Code.
echo.
start "" "http://127.0.0.1:7331/?debug"
timeout /t 3 >nul
