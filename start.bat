@echo off
title WhatSaas - Iniciando...
color 0A
setlocal

set PROJECT_DIR=%~dp0
set BACKEND_DIR=%~dp0backend
set FRONTEND_DIR=%~dp0frontend
set COMPOSE_FILE=%~dp0backend\docker-compose.yml
set ENV_FILE=%~dp0backend\.env

echo.
echo  ==========================================================
echo     WhatSaas - WhatsApp Marketing Platform
echo  ==========================================================
echo.

:: ── 1. Verificar Docker ───────────────────────────────────────
echo [1/5] Verificando Docker Desktop...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERRO: Docker Desktop nao esta rodando!
    echo  Iniciando Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo  Aguardando Docker iniciar (30s)...
    timeout /t 30 /nobreak >nul
    docker info >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo  ERRO: Docker ainda nao respondeu. Inicie manualmente e tente novamente.
        pause
        exit /b 1
    )
)
echo  OK - Docker esta rodando

:: ── 2. Limpeza de processos Node antigos ─────────────────────
echo.
echo [2/5] Limpando processos Node anteriores...
taskkill /F /IM node.exe /T >nul 2>&1
echo  OK - Processos anteriores finalizados

:: ── 3. Subir containers Docker ────────────────────────────────
echo.
echo [3/5] Verificando/Iniciando containers Docker...

:: Checar se postgres ja esta rodando
docker inspect -f "{{.State.Running}}" wathsaas-postgres >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo  OK - Containers ja estao rodando, pulando...
) else (
    echo  Iniciando containers...
    docker compose -f "%COMPOSE_FILE%" --env-file "%ENV_FILE%" up -d postgres redis evolution waha
    if %ERRORLEVEL% neq 0 (
        echo  ERRO: Falha ao iniciar containers Docker!
        echo  Verifique: docker compose -f backend\docker-compose.yml --env-file backend\.env up -d
        pause
        exit /b 1
    )
    echo  OK - Containers iniciando em background
)

:: ── 4. Aguardar PostgreSQL estar pronto (max 45s) ────────────
echo.
echo [4/5] Aguardando banco de dados ficar pronto...
set /a TRIES=0
:waitdb
set /a TRIES+=1
if %TRIES% gtr 22 (
    echo  AVISO: Timeout aguardando DB, iniciando assim mesmo...
    goto startapp
)
docker exec wathsaas-postgres pg_isready -U wathsaas >nul 2>&1
if %ERRORLEVEL% neq 0 (
    timeout /t 2 /nobreak >nul
    goto waitdb
)
echo  OK - Banco de dados pronto

:: ── 5. Iniciar Backend e Frontend ────────────────────────────
:startapp
echo.
echo [5/5] Iniciando Backend e Frontend...

start "WhatSaas Backend (porta 3333)" cmd /k "title WhatSaas Backend && cd /d %BACKEND_DIR% && npm run start:dev"
start "WhatSaas Frontend (porta 3000)" cmd /k "title WhatSaas Frontend && cd /d %FRONTEND_DIR% && npm run dev"

:: ── Aguardar backend responder (max 60s) ─────────────────────
echo.
echo  Aguardando backend inicializar (pode levar 20-30s)...
set /a BTRIES=0
:waitbackend
set /a BTRIES+=1
if %BTRIES% gtr 30 (
    echo  AVISO: Backend demorou mais que o esperado, abrindo browser...
    goto openbrowser
)
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3333/api/v1/health 2>nul | findstr "200" >nul
if %ERRORLEVEL% neq 0 (
    <nul set /p=.
    goto waitbackend
)
echo.
echo  OK - Backend respondendo!

:: ── Abrir browser ─────────────────────────────────────────────
:openbrowser
echo.
echo  ==========================================================
echo.
echo    WHATSAAS INICIADO COM SUCESSO!
echo.
echo    Frontend:   http://localhost:3000
echo    Backend:    http://localhost:3333
echo    API Docs:   http://localhost:3333/docs
echo    Bull Board: http://localhost:3333/bull-board
echo    Evolution:  http://localhost:8081
echo    WAHA:       http://localhost:8080
echo.
echo  ==========================================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo  Pressione qualquer tecla para fechar esta janela.
echo  (Backend e Frontend continuarao rodando nas janelas abertas)
pause >nul
endlocal
