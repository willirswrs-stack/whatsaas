# 📋 WhatSaas - Project Status & Progress Log

> **Última atualização:** 2026-04-28 07:18
> **Status geral:** 🟢 Fase de Go-Live e Infraestrutura SRE

---

## 🚀 Sessão de Trabalho - 2026-05-12

### Resumo das Implementações Críticas
- ✅ **Painel Super Admin Master (Nasa Mode):** Totalmente expandido com grade de 6 cards de telemetria (Clientes, WhatsApp On, Proxies, Volume de Mensagens, Tokens de IA, Vozes Clonadas) e Gráfico de Eficiência de Rotação.
- ✅ **Interruptores Globais (Master Killswitches):** Criado sistema de Feature Flags controláveis pelo Admin que ativa/desativa instantaneamente na memória recursos pesados (ElevenLabs, OpenAI, Proxies) via frontend.
- ✅ **Monetização Inteligente Asaas:** Arquitetura de pagamentos integrada ao `AsaasService` com geração de link/boleto e um Webhook público automático para ativação de conta e bloqueio por inadimplência.
- ✅ **Trava Bancária (TenantGuard):** Blindagem na API que bloqueia qualquer requisição de um cliente se o status dele no banco for alterado para `suspended`.
- ✅ **Login Social Multi-Provedor:** Desenvolvido e ativado motores OAuth2 para Google, Facebook e GitHub, com sistema que provisiona o espaço de trabalho instantaneamente no banco após o primeiro clique.
- ✅ **Estratégia de Preços Elite (Injeção DB):** Remodelados e injetados os 4 planos oficiais no Banco de Dados (Trial 3 dias/1 chip, Starter R$97, Pro R$197, Enterprise R$497).
- ✅ **Estabilização Crítica do Servidor:** Corrigidos erros ocultos de compilação (`JwtAuthGuard` fantasma e tipagem Express), restaurando a compilação com **Sucesso Total (Exit Code 0)**.

### Próximas Etapas Recomendadas (Próxima Sessão)
1. [ ] Configurar chaves reais de API do Google/Meta/GitHub no `.env` para testes reais de autenticação de ponta a ponta.
2. [ ] Validar recepção de eventos webhooks do Asaas usando o sandbox oficial.

---

## 🚀 Sessão de Trabalho - 2026-04-28

### Resumo
- ✅ Integrado monitoramento do Sentry (`@sentry/nestjs` no backend e `@sentry/nextjs` no frontend).
- ✅ Criado script de backup `scripts/backup.js` nativo em Node.js com dump do Postgres (`wathsaas-postgres`), compressão e rotatividade (7 dias).
- ✅ Criado script para teste de carga (`scripts/stress-test.js`) contra API e filas BullMQ.
- ✅ Adicionado componente interativo `SupportWidget` na dashboard do Next.js.
- 🚧 Teste do backup e de scripts foi inicializado, mas necessita de validação definitiva da conexão do pg_dump dentro do container na próxima sessão.

---

## 🚀 Sessão de Trabalho - 2026-01-10

### Resumo
- ✅ Infraestrutura Docker 100% operacional (Evolution v2.3.7, WAHA, WWebJS).
- ✅ Implementado Proxy Admin Seguro no Backend para acesso aos painéis internos.
- ✅ Corrigido problema de autenticação e sessão única no WAHA Core.
- ✅ Backend configurado com Roles (SUPER_ADMIN) e Middlewares de segurança.


## 🚀 Sessão de Trabalho - 2026-01-08

### Resumo
- ✅ Verificado estado geral do projeto
- ✅ Todos os containers Docker rodando (PostgreSQL, Redis, WAHA, Evolution, WWebJS)
- ✅ Backend iniciado (http://localhost:3333)
- ✅ Frontend iniciado (http://localhost:3000)
- ✅ Criado arquivo `.env.production` com secrets seguros

### Secrets de Produção Gerados
- `JWT_SECRET` - 60 caracteres aleatórios
- `JWT_REFRESH_SECRET` - 60 caracteres aleatórios
- `ENCRYPTION_KEY` - 64 caracteres hexadecimais
- `DATABASE_PASSWORD` - 24 caracteres aleatórios
- `REDIS_PASSWORD` - 24 caracteres aleatórios

### Pendências para Produção
1. [ ] Configurar domínio e SSL
2. [ ] Substituir placeholders no `.env.production`
3. [ ] Re-salvar chave OpenAI (perdida do tenant_settings)
4. [ ] Testar fluxo completo WhatsApp
5. [ ] Deploy final

---

---

## 🎯 Objetivo do Projeto

SaaS para disparo massivo de mensagens WhatsApp com:
- Suporte a múltiplos provedores (WAHA + Evolution API)
- Gestão de chips/instâncias WhatsApp
- Sistema de warmup para novos números
- Proxy rotation
- Controle de limites diários

---

## 🏗️ Arquitetura Implementada

### Backend (NestJS)
```
backend/
├── src/
│   ├── modules/
│   │   ├── instances/          # Gestão de instâncias WhatsApp
│   │   │   ├── instances.service.ts
│   │   │   ├── instances.controller.ts
│   │   │   └── entities/
│   │   ├── whatsapp/           # Abstração de provedores
│   │   │   ├── adapters/
│   │   │   │   ├── waha.adapter.ts      # WAHA (1 sessão)
│   │   │   │   └── evolution.adapter.ts  # Evolution (múltiplas)
│   │   │   ├── whatsapp-provider.factory.ts
│   │   │   └── whatsapp-provider.interface.ts
│   │   └── auth/, users/, ...
│   └── ...
├── docker-compose.yml          # PostgreSQL, Redis, WAHA, Evolution
└── .env
```

### Frontend (Next.js)
```
frontend/
├── src/
│   ├── app/
│   │   ├── chips/page.tsx      # Página de gestão de chips
│   │   └── ...
│   ├── components/
│   │   ├── ChipCard.tsx
│   │   └── ...
│   └── lib/
│       └── instances.ts        # API client
└── ...
```

---

## ✅ O que já foi feito

### Sprint 1 - Setup Inicial
- [x] Estrutura do projeto backend (NestJS)
- [x] Estrutura do projeto frontend (Next.js)
- [x] Docker Compose com PostgreSQL e Redis
- [x] Módulo de autenticação JWT
- [x] Módulo de usuários
- [x] Design system moderno (glassmorphism, dark mode)

### Sprint 2 - Integração WAHA
- [x] Adapter WAHA implementado
- [x] Criação de instância via API
- [x] Geração e display de QR Code
- [x] Polling de status de conexão
- [x] **Limitação identificada:** WAHA Core suporta apenas 1 sessão "default"

### Sprint 3 - Dual Provider (WAHA + Evolution)
- [x] Interface `IWhatsAppProvider` criada
- [x] Factory pattern para selecionar provider
- [x] Adapter Evolution API implementado
- [x] Seletor de provider no frontend
- [x] Banco de dados separado para Evolution (evita conflito de migrations)
- [x] Configuração Evolution no docker-compose.yml

---

## 🎯 Plano Atual (2025-12-19)

### Estratégia de Deploy

| Componente | Ambiente | Motivo |
|------------|----------|--------|
| **WAHA** | 🏠 Local (Docker) | Testes rápidos, 1 sessão gratuita |
| **Evolution API** | ☁️ Oracle Cloud Free Tier | Múltiplas instâncias, sempre grátis |

### Oracle Cloud Free Tier (Always Free)
- **2 VMs AMD** - 1GB RAM cada
- **4 VMs ARM Ampere** - 24GB RAM total (recomendado para Evolution)
- **200GB** de armazenamento em bloco
- **Sempre gratuito** (não expira após período trial)

### Tarefas Pendentes

#### 1. WAHA Local [ ] Em progresso
- [ ] Subir container WAHA via Docker
- [ ] Testar conexão backend → WAHA
- [ ] Criar instância "default" e gerar QR Code
- [ ] Validar fluxo completo no frontend

#### 2. Evolution API no Oracle Cloud [ ] Aguardando
- [ ] Criar conta Oracle Cloud (se não tiver)
- [ ] Provisionar VM ARM (4 OCPUs, 24GB RAM)
- [ ] Instalar Docker na VM
- [ ] Deploy Evolution API + PostgreSQL
- [ ] Configurar firewall (porta 8080)
- [ ] Atualizar .env do WhatSaas com URL do Oracle
- [ ] Testar integração remota

---

## 🔧 Configuração Atual

### .env (Backend)
```env
# WAHA
WAHA_API_URL=http://localhost:8080
WAHA_API_KEY=wathsaas_waha_key_2024

# Evolution API
EVOLUTION_API_URL=http://localhost:8081
EVOLUTION_API_KEY=evolution_key_2024
```

### docker-compose.yml - Evolution
```yaml
evolution:
  image: atendai/evolution-api:v2.1.1
  ports:
    - "8081:8080"
  environment:
    AUTHENTICATION_TYPE: apikey
    AUTHENTICATION_API_KEY: evolution_key_2024
    DATABASE_CONNECTION_URI: postgresql://...:5432/wathsaas_evolution
    CACHE_REDIS_ENABLED: "false"
    CACHE_LOCAL_ENABLED: "true"
```

---

## 📝 Sessões de Trabalho

### 2026-01-05 - Flow Editor & Folders API ⏸️

**Resumo da sessão:**
- ✅ **Flow Folders API** implementada:
  - Entity, Service e Controller para pastas
  - CRUD completo integrado ao frontend
  - Correção de CORS e porta do backend
- ✅ **Flow Editor Nodes** implementados:
  - Templates Meta (texto + botões) com modal
  - Nó Link para envio de URLs
  - Nós de Botões (padrão, copy/paste, ações)
  - Nós IA (ChatGPT, Gemini, Llama, Anthropic)
  - Nó Webhook

**Arquivos principais:**
- `frontend/src/app/fluxos/*`
- `frontend/src/components/flow-editor/*`
- `backend/src/modules/folders/*`

**PRÓXIMOS PASSOS:**
1. Validar visualmente os nós do editor
2. Testar integração pastas ↔ fluxos
3. Verificar persistência dos fluxos no backend

---

### 2026-01-04 02:00 - Deploy GCP ⏸️

**Resumo da sessão:**
- ✅ Mudança de estratégia: Oracle Cloud → **Google Cloud Platform**
- ✅ VM `whatsaas-vm` identificada (IP: 34.39.235.219)
- ✅ Guia completo criado: `docs/DEPLOY_GOOGLE_CLOUD.md`
- ✅ `.env` atualizado com URL e API Key do GCP

**Informações da VM GCP:**
| Campo | Valor |
|-------|-------|
| Nome | `whatsaas-vm` |
| Zona | `southamerica-east1-a` |
| IP Externo | `34.39.235.219` |
| Disco | 50 GB |

**PRÓXIMOS PASSOS:**

#### 1. 🐳 Verificar Docker na VM
- Conectar via SSH
- Verificar se Docker está instalado
- Instalar se necessário

#### 2. 📦 Deploy Evolution API
- Criar diretório ~/evolution
- Criar docker-compose.yml
- Subir containers

#### 3. 🔓 Configurar Firewall
- Liberar porta 8080 no VPC
- Testar acesso externo

#### 4. ✅ Testar Integração
- Reiniciar backend WhatSaas local
- Criar instância Evolution no frontend
- Verificar QR Code

**Status dos containers locais:** Backend e Frontend prontos para reconexão

---

### 2025-12-21 00:01 - Sessão Anterior

**Resumo:**
- Decidido deploy no Oracle Cloud Free Tier (depois alterado para GCP)
- Guia Oracle criado em `docs/DEPLOY_ORACLE_CLOUD.md`

**Status dos containers locais:** Backend e Frontend rodando (5h+)

---

### Sessões Anteriores
- **Objetivo:** Fixing Evolution API QR Code
- **Progresso:** Debug de timeouts e erros de conexão

### 2025-12-18 (Sessão cf06a6b1)
- **Objetivo:** Fixing Evolution API Integration
- **Progresso:** 
  - Identificado conflito de banco de dados
  - Configurado banco separado para Evolution
  - Erro P3005 de migrations resolvido

### 2025-12-18 (Sessão 725ceca7)
- **Objetivo:** WhatSaas Dual Provider & QR Test
- **Progresso:**
  - Implementada arquitetura dual provider
  - Criado Evolution Adapter
  - Frontend atualizado com seletor de provider

---

## 🚀 Roadmap Pendente

### Fase 1 - Estabilização (Atual)
- [ ] Evolution API funcionando e gerando QR codes
- [ ] WAHA funcionando para sessão única
- [ ] Fluxo completo: criar → QR → conectar → enviar mensagem

### Fase 2 - Funcionalidades Core
- [ ] Envio de mensagens de texto
- [ ] Envio de mídia (imagens, documentos, áudio)
- [ ] Recebimento de webhooks
- [ ] Histórico de mensagens

### Fase 3 - Disparo Massivo
- [ ] Fila de mensagens (Bull/Redis)
- [ ] Rate limiting inteligente
- [ ] Distribuição entre chips
- [ ] Relatórios de entrega

### Fase 4 - Segurança Anti-ban
- [ ] Sistema de warmup (14 dias)
- [ ] Limites progressivos
- [ ] Proxy rotation
- [ ] Detecção de comportamento humano

---

## 📌 Notas Importantes

1. **WAHA Core vs Plus:** A versão gratuita (Core) suporta apenas 1 sessão chamada "default". Para múltiplas sessões, usar Evolution API ou WAHA Plus (pago).

2. **Evolution API v2:** Usa Baileys internamente, suporta instâncias ilimitadas. Requer banco PostgreSQL separado para evitar conflitos.

3. **Portas:**
   - PostgreSQL: 5433 (mapeado de 5432)
   - Redis: 6379
   - WAHA: 8080
   - Evolution: 8081
   - Backend: 3333
   - Frontend: 3000

---

## 🔗 Links Úteis

- [Evolution API Docs](https://doc.evolution-api.com/)
- [WAHA Docs](https://waha.devlike.pro/)
- [Projeto GitHub](#) (adicionar quando criar repo)
