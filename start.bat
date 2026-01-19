@echo off
title WhatSaas - Iniciando...
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║   📱 WhatSaas - WhatsApp Marketing Platform              ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Verificar se Docker esta rodando
echo [1/4] Verificando Docker...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Docker Desktop nao esta rodando!
    echo.
    echo    Por favor, inicie o Docker Desktop e tente novamente.
    echo.
    pause
    exit /b 1
)
echo ✅ Docker OK

:: Subir containers
echo.
echo [2/4] Iniciando PostgreSQL e Redis...
cd /d "%~dp0backend"
docker-compose up -d postgres redis
if %ERRORLEVEL% neq 0 (
    echo ❌ Erro ao iniciar containers
    pause
    exit /b 1
)
echo ✅ Containers OK

:: Aguardar banco ficar pronto
echo.
echo [3/4] Aguardando banco de dados...
timeout /t 5 /nobreak >nul
echo ✅ Banco de dados pronto

:: Iniciar Backend e Frontend em janelas separadas
echo.
echo [4/4] Iniciando Backend e Frontend...

:: Backend
start "WhatSaas Backend" cmd /k "cd /d %~dp0backend && npm run start:dev"

:: Aguardar backend iniciar
timeout /t 8 /nobreak >nul

:: Frontend
start "WhatSaas Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║   ✅ WhatSaas iniciado com sucesso!                      ║
echo  ║                                                          ║
echo  ║   🌐 Frontend: http://localhost:3000                     ║
echo  ║   🔧 Backend:  http://localhost:3333                     ║
echo  ║   📚 API Docs: http://localhost:3333/docs                ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo Abrindo navegador em 5 segundos...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo Pressione qualquer tecla para fechar esta janela...
echo (Backend e Frontend continuarao rodando)
pause >nul
