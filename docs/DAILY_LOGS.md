# 📅 WhatSaas - Daily Development Logs

> Registro diário de progresso, decisões e próximos passos do projeto.

---

## 📆 2026-01-06 (Segunda-feira)

### ✅ O que foi feito

#### Integração Global de LLMs
**Objetivo:** Implementar sistema completo para múltiplas LLMs (GPT, Gemini, Llama, Groq, Anthropic)

**Backend:**
- Criada interface `ILLMProvider` para abstração de providers
- Implementados 4 adapters: `openai.adapter.ts`, `anthropic.adapter.ts`, `gemini.adapter.ts`, `groq.adapter.ts`
- Criado `LLMProviderFactory` para seleção de providers por tenant
- Expandido `TenantSettings` com campos `geminiKey` e `groqKey`
- Atualizado `SettingsService` com getters para todas as 4 API keys

**Frontend - Configurações:**
- Expandida tab "Integrações IA" em `/configuracoes` com 4 cards:
  - OpenAI (GPT-4) ✨
  - Anthropic (Claude) 🧠
  - Google Gemini 💎
  - Groq (Llama, Mixtral) ⚡
- Adicionado indicador de status (configurado/não configurado)

**Frontend - Editor de Fluxos:**
- Atualizado `NODE_CATEGORIES` com categoria "Integrações IA"
- Nós de IA disponíveis: ChatGPT, Claude, Gemini, Groq/Llama
- Atualizado `nodeTypes` com mapeamentos `openai` e `groq`

### 🔧 Arquivos Criados/Modificados
- `backend/src/modules/ai/providers/llm-provider.interface.ts` [NEW]
- `backend/src/modules/ai/providers/openai.adapter.ts` [NEW]
- `backend/src/modules/ai/providers/anthropic.adapter.ts` [NEW]
- `backend/src/modules/ai/providers/gemini.adapter.ts` [NEW]
- `backend/src/modules/ai/providers/groq.adapter.ts` [NEW]
- `backend/src/modules/ai/providers/llm-provider.factory.ts` [NEW]
- `backend/src/modules/ai/providers/index.ts` [NEW]
- `backend/src/modules/settings/entities/tenant-settings.entity.ts` [MODIFIED]
- `backend/src/modules/settings/settings.service.ts` [MODIFIED]
- `frontend/src/app/configuracoes/page.tsx` [MODIFIED]
- `frontend/src/lib/flows.ts` [MODIFIED]
- `frontend/src/app/flows/[id]/page.tsx` [MODIFIED]

### ⏸️ Onde paramos
- Sistema de LLM implementado e pronto para teste
- Próximos passos: rodar backend/frontend e validar visualmente

### 📊 Tokens Gastos
> ⚠️ **Nota:** Contagem não disponível

---

## 📆 2026-01-05 (Domingo)

### ✅ O que foi feito

#### 1. Implementação de Flow Folders API
- Criação do backend API para pastas de fluxos
  - Entity `Folder` para persistência
  - `FoldersService` com CRUD completo
  - `FoldersController` com endpoints REST
- Integração frontend ↔ backend
- Correção de problema de CORS
- Configuração correta da porta do backend (3333)
- Página de listagem de fluxos com gerenciamento de pastas funcional

#### 2. Implementação de Flow Editor Nodes
Criação de novos tipos de nós para o editor de fluxos:

**Templates Meta:**
- Nó de template de texto
- Nó de template com botões
- Modal para criação de templates

**Nó Link:**
- Envio de URLs

**Nós de Botões:**
- Botão padrão
- Botão copy/paste
- Botão de ações

**Nós de Integração IA:**
- ChatGPT
- Gemini
- Llama
- Anthropic

**Webhook:**
- Nó para integração via webhook

### 🔧 Arquivos Modificados/Criados
- `frontend/src/app/fluxos/*` - Página de fluxos
- `frontend/src/components/flow-editor/*` - Componentes do editor
- `backend/src/modules/folders/*` - Módulo de pastas

### ⏸️ Onde paramos
- Editor de fluxos com nós funcionais
- Aguardando validação visual e testes de integração

### 📊 Tokens Gastos
> ⚠️ **Nota:** O sistema não fornece contagem de tokens por sessão. Esta informação precisa ser obtida manualmente através do painel de uso da API.

---

## 📆 2026-01-04 (Sábado)

### ✅ O que foi feito
- Mudança de estratégia: Oracle Cloud → Google Cloud Platform
- VM `whatsaas-vm` configurada (IP: 34.39.235.219)
- Guia `docs/DEPLOY_GOOGLE_CLOUD.md` criado
- `.env` atualizado com URL e API Key do GCP
- Debug de autenticação (401 Unauthorized)
- Correção do fluxo de login antes de criar instâncias

### 📊 Tokens Gastos
> ⚠️ **Nota:** Contagem não disponível

---

## 🔄 Template para Novos Dias

```markdown
## 📆 YYYY-MM-DD (Dia da Semana)

### ✅ O que foi feito
- Item 1
- Item 2

### 🔧 Arquivos Modificados/Criados
- `path/to/file` - descrição

### ⏸️ Onde paramos
- Estado atual

### ❓ Pendências/Bloqueios
- Item pendente

### 📊 Tokens Gastos
> Inserir manualmente se disponível
```
