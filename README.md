# WhatSaas - WhatsApp Automation Platform

Plataforma de automação e gestão de WhatsApp multi-tenant com foco em escalabilidade e estabilidade.

## 🚀 Como Iniciar (Hardening Local)

### 1. Pré-requisitos
- Docker & Docker Compose
- Node.js 20+
- PNPM (recomendado) ou NPM

### 2. Infraestrutura (Determinística)
Sempre suba a infraestrutura primeiro. Isso garante que Postgres, Redis e Evolution API estejam prontos.

```bash
# Na raiz do workspace
docker compose up -d
```

### 3. Backend
O backend agora valida variáveis de ambiente no boot. Se faltar algo, ele não sobe.

1.  **Configuração de Ambiente:**
    *   Copie `.env.example` para `.env` (se não existir).
    *   Certifique-se de que `WEBHOOK_URL` aponta para um endereço acessível (ex: localhost ou ngrok).

2.  **Instalação & Migrations:**
    ```bash
    cd backend
    npm install
    
    # Preparar banco de dados (Cria tabelas + Usuário Admin)
    # ATENÇÃO: Se for a primeira vez, use db:reset (apaga dados!)
    # npm run db:reset 
    
    # Para apenas rodar migrations e seeds sem apagar dados:
    npm run db:migrate
    npm run db:seed
    ```

3.  **Iniciar Servidor:**
    ```bash
    npm run start:dev
    ```

    O servidor estará rodando em:
    *   API: `http://localhost:3333` (Bind em 0.0.0.0, acessível via Docker)
    *   Swagger: `http://localhost:3333/docs`
    *   Health Check: `http://localhost:3333/api/v1/health`

### 4. Frontend
Certifique-se de que o frontend aponta para a URL correta da API.

1.  Verifique `.env.local` no frontend:
    ```
    NEXT_PUBLIC_API_URL=http://localhost:3333
    ```

2.  Inicie:
    ```bash
    cd frontend
    npm run dev
    ```
    Acesse: `http://localhost:3000`

---

## 🛡️ Hardening & Diagnóstico

### ✅ Health Check
Para verificar se todos os serviços (DB, Redis, API) estão operacionais:
```bash
curl http://localhost:3333/api/v1/health
```
Resposta esperada: `{"status":"ok","info":{"database":{"status":"up"},"memory_heap":{"status":"up"}}}`

### 🔍 Logs & Debug
Agora usamos logs estruturados (JSON) com `requestId` para rastreabilidade.
*   Todo erro 500 gera um log de erro detalhado com stack trace no console.
*   O cliente recebe apenas: `{"success":false, "error":{"code":"INTERNAL_ERROR", "message":"Internal server error"}, "meta":{"requestId":"..."}}`.
*   Use o `requestId` retornado para buscar o erro no terminal.

### 🐘 Banco de Dados
*   **Migrations:** Fonte da verdade do schema.
*   **Seed:** Cria tenant `Default Tenant` e usuário `admin@whatsaas.com` / `admin123`.

### 📊 Monitoramento de Filas (Bull Board)
Disponível para monitorar jobs em tempo real:
*   URL: `http://localhost:3333/api/v1/queues`
*   Filas Monitoradas: `dispatch`, `warmup`, `proxy-health`

### 🔄 Ciclo de Vida da Instância
Estados formalizados:
*   `CREATED` -> Instância registrada no banco.
*   `CONNECTING` -> Solicitando criação na API Evolution.
*   `QR_PENDING` -> QR Code gerado, aguardando scan.
*   `CONNECTED` -> WhatsApp conectado e pronto.
*   `DISCONNECTED` -> Desconectado (manual ou erro).
*   `RECONNECTING` -> Tentativa automática de reconexão.
*   `BANNED` -> Número banido pelo WhatsApp.
*   `ERROR` -> Erro irrecuperável.

### 🔌 Reconexão Automática (Auto-Healing)
O sistema tenta recuperar instâncias desconectadas automaticamente.
*   **Configuração via ENV**:
    *   `AUTO_RECONNECT_ENABLED=true` (Default)
    *   `AUTO_RECONNECT_INTERVAL_MINUTES=5`
*   **Monitoramento**:
    *   Endpoint: `GET /api/v1/reconnection/status`
    *   Bull Board: Fila `instance-reconcile-queue`
*   **Comportamento**:
    *   Batch a cada 5 minutos.
    *   Backoff exponencial (1min -> 2min -> 5min -> 15min).
    *   Status `ERROR` persistente (ex: 404) força lock de 6 horas.

### ⚠️ Erros Comuns
*   **IPv6/IPv4:** O backend agora faz bind explícito em `0.0.0.0` para evitar conflitos de localhost no Windows/WSL. Use `127.0.0.1` ou `localhost` sem medo.
*   **Provider Inválido:** WWebJS foi removido. Apenas `evolution` (padrão) e `waha` são aceitos.
