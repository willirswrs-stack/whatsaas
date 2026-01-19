@echo off
title WhatSaas - Parando...
color 0C

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║   🛑 WhatSaas - Parando todos os servicos                ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Parar processos Node
echo [1/2] Parando Backend e Frontend...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Processos Node encerrados

:: Parar containers Docker
echo.
echo [2/2] Parando containers Docker...
cd /d "%~dp0backend"
docker-compose down
echo ✅ Containers parados

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║   ✅ WhatSaas encerrado com sucesso!                     ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
pause
