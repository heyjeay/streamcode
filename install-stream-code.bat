@echo off
title Stream Code - build + install the VS Code extension
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================================
echo   Building stream-code.vsix and installing it into VS Code
echo   (re-run this after editing stream_code.html or extension\*)
echo ================================================================
echo.
where python >nul 2>nul
if %errorlevel%==0 (
  python build_vsix.py
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    py build_vsix.py
  ) else (
    echo Python was not found on PATH. Install it from python.org
  )
)
echo.
pause
