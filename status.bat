@echo off
title WhatSaas - Status
color 0A

echo.
echo  ==========================================================
echo     WhatSaas - Status dos Servicos
echo  ==========================================================
echo.

:: Docker containers
echo  [CONTAINERS DOCKER]
docker ps --format "  {{.Names}}: {{.Status}}" --filter "name=wathsaas*" 2>nul || echo   Docker nao disponivel
echo.

:: Backend
curl -s -o nul -w "%%{http_code}" http://localhost:3333/api/v1/health 2>nul > %temp%\health.tmp
set /p HEALTH_CODE=<%temp%\health.tmp
if "%HEALTH_CODE%"=="200" (
    echo  [BACKEND]  http://localhost:3333 - ONLINE
) else (
    echo  [BACKEND]  http://localhost:3333 - OFFLINE
)

:: Frontend
curl -s -o nul -w "%%{http_code}" http://localhost:3000 2>nul > %temp%\front.tmp
set /p FRONT_CODE=<%temp%\front.tmp
if "%FRONT_CODE%"=="200" (
    echo  [FRONTEND] http://localhost:3000 - ONLINE
) else (
    echo  [FRONTEND] http://localhost:3000 - OFFLINE
)

echo.
echo  Pressione qualquer tecla para fechar...
pause >nul
