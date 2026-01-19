# 🏗️ WhatSaas - Arquitetura Técnica Completa

> **Versão:** 2.0.0  
> **Data:** 11 de Janeiro de 2026  
> **Autor:** Arquitetura de Software  
> **Classificação:** Documento Técnico Interno

---

## 📋 Índice

1. [Visão Executiva](#1-visão-executiva)
2. [Arquitetura de Alto Nível](#2-arquitetura-de-alto-nível)
3. [Arquitetura Modular Detalhada](#3-arquitetura-modular-detalhada)
4. [Modelagem de Dados](#4-modelagem-de-dados)
5. [Fluxo de Execução de Campanhas](#5-fluxo-de-execução-de-campanhas)
6. [Sistema Anti-Ban e Simulação Humana](#6-sistema-anti-ban-e-simulação-humana)
7. [Estratégias de Quebra de Padrão](#7-estratégias-de-quebra-de-padrão)
8. [Gestão de Leads](#8-gestão-de-leads)
9. [Integrações e Webhooks](#9-integrações-e-webhooks)
10. [Observabilidade e Logs](#10-observabilidade-e-logs)
11. [Backlog Técnico Priorizado](#11-backlog-técnico-priorizado)

---

## 1. Visão Executiva

### 1.1 Objetivo do Produto

O **WhatSaas** é uma plataforma enterprise de automação de WhatsApp projetada para **maximizar entregabilidade** e **minimizar riscos de banimento**, superando concorrentes como Dispara.ai através de:

- **Simulação de Comportamento Humano Avançada** (HBS - Human Behavior Simulation)
- **Sistema de Quebra de Padrão** (Pattern Breaking Engine)
- **Arquitetura Multi-Tenant Escalável**
- **Motor de Disparo Inteligente** com rate limiting adaptativo

### 1.2 Diferenciais Competitivos

| Feature | Dispara.ai | WhatSaas |
|---------|------------|----------|
| Randomização de texto | Básica | Multi-camada com IA |
| Delay entre mensagens | Fixo | Gaussiano com jitter |
| Simulação de digitação | Não | Sim (WPM variável) |
| Inversão de ordem mídia/texto | Não | Sim |
| Warmup automático | Manual | Automatizado 14 dias |
| Multi-provider | Único | WAHA + Evolution + WWebJS |

---

## 2. Arquitetura de Alto Nível

### 2.1 Diagrama C4 - Contexto

```mermaid
C4Context
    title WhatSaas - Diagrama de Contexto

    Person(user, "Operador", "Usuário da plataforma")
    Person(lead, "Lead/Contato", "Destinatário das mensagens")
    
    System(whatsaas, "WhatSaas Platform", "Plataforma de automação WhatsApp")
    
    System_Ext(whatsapp, "WhatsApp Network", "Rede do WhatsApp")
    System_Ext(meta, "Meta Cloud API", "API Oficial do WhatsApp Business")
    System_Ext(openai, "OpenAI/LLMs", "Serviços de IA Generativa")
    System_Ext(n8n, "n8n/Webhooks", "Automações externas")
    
    Rel(user, whatsaas, "Gerencia campanhas, fluxos e leads")
    Rel(whatsaas, whatsapp, "Envia/recebe mensagens via Evolution/WAHA")
    Rel(whatsaas, meta, "Templates oficiais e status")
    Rel(whatsaas, openai, "Spinning de conteúdo e IA")
    Rel(whatsaas, n8n, "Webhooks bidirecionais")
    Rel(whatsapp, lead, "Entrega mensagens")
```

### 2.2 Diagrama de Containers

```mermaid
C4Container
    title WhatSaas - Arquitetura de Containers

    Container_Boundary(frontend, "Frontend Layer") {
        Container(web, "Web Dashboard", "Next.js 14", "Interface do operador")
        Container(mobile, "Mobile App", "React Native", "Gestão simplificada [Futuro]")
    }
    
    Container_Boundary(backend, "Backend Layer") {
        Container(api, "API Gateway", "NestJS", "Autenticação, Roteamento, Rate Limit")
        Container(campaign, "Campaign Service", "NestJS", "Orquestração de campanhas")
        Container(dispatcher, "Dispatcher Service", "NestJS + BullMQ", "Motor de disparo")
        Container(hbs, "HBS Engine", "NestJS", "Simulação de comportamento humano")
        Container(ai, "AI Service", "NestJS", "Spinning e geração de conteúdo")
    }
    
    Container_Boundary(infra, "Infrastructure") {
        ContainerDb(postgres, "PostgreSQL", "Database", "Dados persistentes")
        ContainerDb(redis, "Redis", "Cache/Queue", "Filas BullMQ e cache")
        ContainerDb(s3, "S3/MinIO", "Object Storage", "Mídia e arquivos")
    }
    
    Container_Boundary(providers, "WhatsApp Providers") {
        Container(evolution, "Evolution API", "Docker", "Multi-instâncias")
        Container(waha, "WAHA", "Docker", "Sessão única local")
        Container(wwebjs, "WWebJS", "Docker", "Alternativa Puppeteer")
    }
```

### 2.3 Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend** | Next.js 14 + TypeScript | SSR, App Router, Performance |
| **UI Components** | Shadcn/UI + Radix | Acessibilidade, Customização |
| **Backend** | NestJS + TypeScript | Modularidade, DI, Enterprise-ready |
| **Database** | PostgreSQL 15 | JSONB, Full-text search, Confiabilidade |
| **Queue** | Redis + BullMQ | Filas robustas, Retry, Rate limiting |
| **Cache** | Redis | Sessions, Cache de consultas |
| **Object Storage** | MinIO (S3-compatible) | Mídia, Backups |
| **WhatsApp** | Evolution API + WAHA | Redundância, Failover |
| **Observability** | Grafana + Loki + Prometheus | Métricas e logs centralizados |

---

## 3. Arquitetura Modular Detalhada

### 3.1 Módulos do Sistema

```mermaid
graph TB
    subgraph "📦 Core Modules"
        AUTH[Auth Module]
        TENANT[Tenant Module]
        USER[User Module]
    end
    
    subgraph "📱 WhatsApp Layer"
        INSTANCE[Instance Manager]
        PROVIDER[Provider Factory]
        WEBHOOK[Webhook Handler]
    end
    
    subgraph "🎯 Campaign Engine"
        CAMPAIGN[Campaign Module]
        FLOW[Flow Builder]
        SCHEDULER[Scheduler]
        DISPATCHER[Dispatcher]
    end
    
    subgraph "👥 Lead Management"
        LEAD[Lead Module]
        IMPORT[Import Service]
        SEGMENT[Segmentation]
        NORMALIZE[Normalizer]
    end
    
    subgraph "🛡️ Anti-Ban System"
        HBS[Human Behavior Simulator]
        PATTERN[Pattern Breaker]
        WARMUP[Warmup Engine]
        THROTTLE[Throttle Controller]
    end
    
    subgraph "🤖 AI Layer"
        SPINNER[Content Spinner]
        VARIATION[Variation Generator]
        CONTEXT[Context Manager]
    end
    
    AUTH --> TENANT
    CAMPAIGN --> FLOW
    CAMPAIGN --> SCHEDULER
    SCHEDULER --> DISPATCHER
    DISPATCHER --> HBS
    HBS --> PATTERN
    DISPATCHER --> PROVIDER
    LEAD --> NORMALIZE
    LEAD --> SEGMENT
    SPINNER --> VARIATION
```

### 3.2 Descrição dos Módulos

#### 🔐 Auth Module
- JWT com Refresh Tokens
- OAuth2 (Google, Facebook)
- Multi-tenant isolation via `tenant_id`
- RBAC (Owner, Admin, Operator)

#### 📱 Instance Manager
- CRUD de instâncias WhatsApp
- Health check automático
- Reconexão automática
- Métricas por instância

#### 🎯 Campaign Engine
- Orquestração de campanhas
- Estados: DRAFT → SCHEDULED → RUNNING → PAUSED → COMPLETED
- Rollback e retry automático

#### 🛡️ HBS Engine (Human Behavior Simulator)
- Simula digitação com WPM variável (20-60 WPM)
- Estados de presença (online, typing, recording)
- Delays com distribuição gaussiana
- Jitter de ±15% em todos os timings

---

## 4. Modelagem de Dados

### 4.1 Diagrama ER Principal

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ INSTANCE : owns
    TENANT ||--o{ CAMPAIGN : creates
    TENANT ||--o{ LEAD : manages
    TENANT ||--o{ LEAD_LIST : organizes
    
    USER ||--o{ CAMPAIGN : creates
    
    INSTANCE ||--o{ MESSAGE_LOG : sends
    INSTANCE }|--|| WARMUP_STATUS : has
    
    CAMPAIGN ||--o{ CAMPAIGN_LEAD : targets
    CAMPAIGN ||--|| FLOW : uses
    CAMPAIGN ||--o{ MESSAGE_LOG : generates
    
    LEAD_LIST ||--o{ LEAD : contains
    LEAD ||--o{ CAMPAIGN_LEAD : participates
    LEAD ||--o{ MESSAGE_LOG : receives
    
    FLOW ||--o{ FLOW_NODE : contains
    FLOW_NODE ||--o{ FLOW_EDGE : connects
    
    CAMPAIGN {
        uuid id PK
        uuid tenant_id FK
        string name
        enum status
        jsonb settings
        datetime scheduled_at
        datetime started_at
        datetime completed_at
        int total_leads
        int sent_count
        int delivered_count
        int read_count
        int failed_count
    }
    
    LEAD {
        uuid id PK
        uuid tenant_id FK
        string phone
        string phone_normalized
        string name
        jsonb custom_fields
        jsonb tags
        enum status
        datetime last_contact_at
        int message_count
    }
    
    INSTANCE {
        uuid id PK
        uuid tenant_id FK
        string name
        enum provider
        enum status
        int daily_limit
        int sent_today
        datetime last_message_at
        jsonb warmup_config
        int warmup_day
    }
    
    MESSAGE_LOG {
        uuid id PK
        uuid campaign_id FK
        uuid instance_id FK
        uuid lead_id FK
        enum status
        string content_hash
        jsonb timing_metadata
        datetime queued_at
        datetime sent_at
        datetime delivered_at
        datetime read_at
        string error_message
    }
```

### 4.2 Schema SQL Detalhado

```sql
-- =====================================================
-- WHATSAAS DATABASE SCHEMA v2.0
-- =====================================================

-- Tenants (Multi-tenancy)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan ENUM('free', 'starter', 'pro', 'enterprise') DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role ENUM('owner', 'admin', 'operator') DEFAULT 'operator',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Instances
CREATE TABLE instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    provider ENUM('evolution', 'waha', 'wwebjs', 'meta') NOT NULL,
    provider_instance_id VARCHAR(255),
    status ENUM('disconnected', 'connecting', 'connected', 'banned') DEFAULT 'disconnected',
    
    -- Limites e Controle
    daily_limit INT DEFAULT 100,
    sent_today INT DEFAULT 0,
    hourly_limit INT DEFAULT 30,
    sent_this_hour INT DEFAULT 0,
    
    -- Warmup
    warmup_enabled BOOLEAN DEFAULT TRUE,
    warmup_day INT DEFAULT 0, -- 0-14
    warmup_started_at TIMESTAMPTZ,
    
    -- Proxy
    proxy_url VARCHAR(500),
    proxy_enabled BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    last_message_at TIMESTAMPTZ,
    last_health_check TIMESTAMPTZ,
    error_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, name)
);

-- Lead Lists (Listas/Segmentos)
CREATE TABLE lead_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source ENUM('csv', 'txt', 'whatsapp_group', 'manual', 'api') DEFAULT 'manual',
    lead_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (Contatos)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    list_id UUID REFERENCES lead_lists(id) ON DELETE SET NULL,
    
    -- Dados de Contato
    phone_raw VARCHAR(30) NOT NULL, -- Número original importado
    phone_normalized VARCHAR(20) NOT NULL, -- Formato +5511999999999
    name VARCHAR(255),
    
    -- Campos Personalizados
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Status e Métricas
    status ENUM('active', 'blocked', 'invalid', 'opted_out') DEFAULT 'active',
    total_messages_received INT DEFAULT 0,
    total_messages_sent INT DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    last_interaction_at TIMESTAMPTZ,
    
    -- Engajamento
    engagement_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00 a 1.00
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, phone_normalized)
);

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuração
    flow_id UUID, -- Referência ao fluxo
    settings JSONB DEFAULT '{
        "delay_min_seconds": 30,
        "delay_max_seconds": 90,
        "messages_per_hour": 25,
        "active_hours_start": "08:00",
        "active_hours_end": "20:00",
        "days_of_week": [1,2,3,4,5],
        "pattern_breaking": true,
        "human_simulation": true
    }',
    
    -- Status
    status ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed') DEFAULT 'draft',
    
    -- Agendamento
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    
    -- Métricas
    total_leads INT DEFAULT 0,
    queued_count INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    read_count INT DEFAULT 0,
    replied_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Leads (M:N com estado)
CREATE TABLE campaign_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    instance_id UUID REFERENCES instances(id), -- Qual chip vai enviar
    
    status ENUM('pending', 'queued', 'sent', 'delivered', 'read', 'replied', 'failed', 'skipped') DEFAULT 'pending',
    
    -- Variação usada
    content_variation JSONB, -- Qual variação de texto foi usada
    
    -- Timing
    queued_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ, -- Quando deve ser enviado
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Erros
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    UNIQUE(campaign_id, lead_id)
);

-- Message Logs (Histórico detalhado)
CREATE TABLE message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    campaign_id UUID REFERENCES campaigns(id),
    campaign_lead_id UUID REFERENCES campaign_leads(id),
    instance_id UUID REFERENCES instances(id),
    lead_id UUID REFERENCES leads(id),
    
    -- Conteúdo
    message_type ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact') NOT NULL,
    content_hash VARCHAR(64), -- SHA256 do conteúdo para detectar duplicatas
    content_preview TEXT, -- Primeiros 200 chars
    media_url TEXT,
    
    -- Status WhatsApp
    whatsapp_message_id VARCHAR(100),
    status ENUM('queued', 'sending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'queued',
    
    -- Timing Metadata (para análise anti-ban)
    timing_metadata JSONB DEFAULT '{
        "typing_duration_ms": 0,
        "delay_before_send_ms": 0,
        "jitter_applied_ms": 0,
        "total_wait_ms": 0
    }',
    
    -- Timestamps
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Erros
    error_code VARCHAR(50),
    error_message TEXT
);

-- Flows (Fluxos de automação)
CREATE TABLE flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    folder_id UUID,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- React Flow Data
    nodes JSONB DEFAULT '[]',
    edges JSONB DEFAULT '[]',
    viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
    
    -- Configurações
    settings JSONB DEFAULT '{}',
    
    -- Triggers
    triggers JSONB DEFAULT '[]', -- Palavras-chave, webhooks, etc.
    
    is_active BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Instance Warmup Logs
CREATE TABLE warmup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
    day_number INT NOT NULL, -- 1-14
    
    messages_sent INT DEFAULT 0,
    messages_received INT DEFAULT 0,
    conversations_started INT DEFAULT 0,
    
    target_messages INT, -- Meta do dia
    achieved_at TIMESTAMPTZ, -- Quando atingiu a meta
    
    log_date DATE NOT NULL,
    
    UNIQUE(instance_id, log_date)
);

-- Índices para Performance
CREATE INDEX idx_leads_tenant_phone ON leads(tenant_id, phone_normalized);
CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);
CREATE INDEX idx_campaign_leads_status ON campaign_leads(campaign_id, status);
CREATE INDEX idx_message_logs_campaign ON message_logs(campaign_id, sent_at);
CREATE INDEX idx_instances_tenant_status ON instances(tenant_id, status);
```

---

## 5. Fluxo de Execução de Campanhas

### 5.1 Diagrama de Sequência - Disparo

```mermaid
sequenceDiagram
    participant U as Usuário
    participant API as API Gateway
    participant CS as Campaign Service
    participant Q as Redis/BullMQ
    participant D as Dispatcher Worker
    participant HBS as HBS Engine
    participant PB as Pattern Breaker
    participant WP as WhatsApp Provider
    participant WA as WhatsApp Network
    
    U->>API: POST /campaigns/{id}/start
    API->>CS: startCampaign(id)
    CS->>CS: Validar instâncias disponíveis
    CS->>CS: Carregar leads da campanha
    
    loop Para cada lead
        CS->>Q: Enfileirar job com delay calculado
    end
    
    CS-->>API: { status: 'running', queued: 1000 }
    API-->>U: 200 OK
    
    Note over Q,D: Workers processam a fila
    
    Q->>D: Próximo job (lead + campanha)
    D->>D: Verificar janela horária
    D->>D: Selecionar instância (Round-Robin)
    
    D->>HBS: Simular comportamento humano
    HBS->>HBS: Calcular delay de digitação
    HBS->>WP: setPresence('composing')
    HBS->>HBS: Aguardar (2-8 segundos)
    
    D->>PB: Gerar variação do conteúdo
    PB->>PB: Aplicar spinning
    PB->>PB: Randomizar saudação
    PB-->>D: Conteúdo variado
    
    D->>WP: sendMessage(phone, content)
    WP->>WA: Enviar via protocolo
    WA-->>WP: ACK (sent)
    WP-->>D: { messageId, status: 'sent' }
    
    D->>CS: Atualizar métricas
    
    Note over WA,WP: Webhook de status
    WA->>WP: Status update (delivered/read)
    WP->>CS: Webhook: atualizar status
```

### 5.2 Estados da Campanha

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Criar campanha
    
    DRAFT --> SCHEDULED: Agendar
    DRAFT --> RUNNING: Iniciar imediatamente
    
    SCHEDULED --> RUNNING: Horário atingido
    SCHEDULED --> CANCELLED: Cancelar
    
    RUNNING --> PAUSED: Pausar
    RUNNING --> COMPLETED: Todos enviados
    RUNNING --> FAILED: Erro crítico
    
    PAUSED --> RUNNING: Retomar
    PAUSED --> CANCELLED: Cancelar
    
    COMPLETED --> [*]
    CANCELLED --> [*]
    FAILED --> RUNNING: Retry
    FAILED --> [*]
```

### 5.3 Algoritmo de Seleção de Instância

```typescript
// Round-Robin com Health Check e Limites
interface InstanceSelector {
  selectInstance(tenantId: string): Promise<Instance | null>;
}

class SmartInstanceSelector implements InstanceSelector {
  private lastUsedIndex: Map<string, number> = new Map();
  
  async selectInstance(tenantId: string): Promise<Instance | null> {
    // 1. Buscar instâncias elegíveis
    const instances = await this.getEligibleInstances(tenantId);
    
    if (instances.length === 0) return null;
    
    // 2. Round-Robin
    const lastIndex = this.lastUsedIndex.get(tenantId) || 0;
    const nextIndex = (lastIndex + 1) % instances.length;
    this.lastUsedIndex.set(tenantId, nextIndex);
    
    return instances[nextIndex];
  }
  
  private async getEligibleInstances(tenantId: string): Promise<Instance[]> {
    return this.instanceRepo.find({
      where: {
        tenant_id: tenantId,
        status: 'connected',
        // Não atingiu limite diário
        sent_today: LessThan(Raw(alias => `${alias}.daily_limit`)),
        // Não atingiu limite horário
        sent_this_hour: LessThan(Raw(alias => `${alias}.hourly_limit`)),
        // Warmup concluído OU chip maduro
        OR: [
          { warmup_day: GreaterThanOrEqual(14) },
          { warmup_enabled: false }
        ]
      },
      order: {
        sent_today: 'ASC', // Priorizar chips menos usados
        last_message_at: 'ASC' // Distribuir carga temporal
      }
    });
  }
}
```

---

## 6. Sistema Anti-Ban e Simulação Humana

### 6.1 Arquitetura do HBS Engine

```mermaid
graph TB
    subgraph "Human Behavior Simulator (HBS)"
        INPUT[Mensagem Original] --> TIMING[Timing Calculator]
        
        TIMING --> PRESENCE[Presence Manager]
        TIMING --> DELAY[Delay Generator]
        TIMING --> TYPING[Typing Simulator]
        
        PRESENCE --> |online/offline| WP[WhatsApp Provider]
        TYPING --> |composing| WP
        DELAY --> |wait| EXECUTOR[Message Executor]
        
        EXECUTOR --> WP
    end
    
    subgraph "Timing Calculator"
        TC_CONTENT[Análise de Conteúdo]
        TC_WORDS[Contagem de Palavras]
        TC_WPM[WPM Variável 20-60]
        TC_JITTER[Jitter ±15%]
        TC_GAUSSIAN[Distribuição Gaussiana]
    end
```

### 6.2 Configurações de Temporização

```typescript
interface HumanBehaviorConfig {
  // Digitação
  typing: {
    minWPM: 20;           // Palavras por minuto mínimo
    maxWPM: 60;           // Palavras por minuto máximo
    avgCharPerWord: 5;    // Média de caracteres por palavra
    pauseBetweenSentences: [500, 2000]; // ms
    typoChance: 0.02;     // 2% chance de "erro" (não implementado, futuro)
  };
  
  // Delays entre mensagens
  delays: {
    minSeconds: 30;
    maxSeconds: 120;
    distribution: 'gaussian'; // ou 'uniform'
    jitterPercent: 15;        // ±15% variação
  };
  
  // Presença
  presence: {
    showOnlineBeforeSend: true;
    onlineDurationMs: [3000, 10000];
    showTypingDuration: 'calculated'; // baseado no conteúdo
  };
  
  // Janela de operação
  schedule: {
    activeHoursStart: '08:00';
    activeHoursEnd: '20:00';
    timezone: 'America/Sao_Paulo';
    activeDays: [1, 2, 3, 4, 5]; // Segunda a Sexta
    randomStartOffset: [-30, 30]; // ±30 min do horário configurado
  };
}
```

### 6.3 Algoritmo de Delay Gaussiano

```typescript
class GaussianDelayGenerator {
  /**
   * Gera um delay com distribuição normal (gaussiana)
   * para simular variabilidade humana natural
   */
  generateDelay(config: DelayConfig): number {
    const { minSeconds, maxSeconds, jitterPercent } = config;
    
    // 1. Calcular média e desvio padrão
    const mean = (minSeconds + maxSeconds) / 2;
    const stdDev = (maxSeconds - minSeconds) / 6; // 99.7% dentro do range
    
    // 2. Box-Muller transform para gerar valor gaussiano
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    let delay = mean + z * stdDev;
    
    // 3. Aplicar jitter adicional
    const jitter = delay * (jitterPercent / 100) * (Math.random() * 2 - 1);
    delay += jitter;
    
    // 4. Garantir limites
    delay = Math.max(minSeconds, Math.min(maxSeconds, delay));
    
    // 5. Segundos "quebrados" (não inteiros)
    delay = Math.round(delay * 1000) / 1000; // 3 casas decimais
    
    return delay;
  }
}
```

### 6.4 Sistema de Warmup (14 dias)

```mermaid
graph LR
    subgraph "Fase 1: Dias 1-3"
        D1[Dia 1: 5 msgs]
        D2[Dia 2: 8 msgs]
        D3[Dia 3: 12 msgs]
    end
    
    subgraph "Fase 2: Dias 4-7"
        D4[Dia 4: 18 msgs]
        D5[Dia 5: 25 msgs]
        D6[Dia 6: 35 msgs]
        D7[Dia 7: 45 msgs]
    end
    
    subgraph "Fase 3: Dias 8-14"
        D8[Dia 8: 60 msgs]
        D10[Dia 10: 80 msgs]
        D12[Dia 12: 100 msgs]
        D14[Dia 14: 150+ msgs]
    end
    
    D1 --> D2 --> D3 --> D4 --> D5 --> D6 --> D7 --> D8 --> D10 --> D12 --> D14
```

| Dia | Limite Diário | Msgs/Hora | Comportamento Extra |
|-----|---------------|-----------|---------------------|
| 1-3 | 5-12 | 2-3 | Apenas respostas, conversas com outros chips |
| 4-7 | 18-45 | 5-8 | Início de conversas, grupos pequenos |
| 8-10 | 60-80 | 10-15 | Campanhas pequenas |
| 11-14 | 100-150 | 20-25 | Rampa suave para produção |
| 15+ | 200+ | 30+ | Liberado para campanhas completas |

---

## 7. Estratégias de Quebra de Padrão

### 7.1 Pattern Breaking Engine

```mermaid
graph TB
    MSG[Mensagem Template] --> PB[Pattern Breaker]
    
    subgraph "Transformações"
        PB --> T1[Variação de Saudação]
        PB --> T2[Spinning Semântico]
        PB --> T3[Emoji Randomization]
        PB --> T4[Pontuação Variável]
        PB --> T5[Inversão Mídia/Texto]
        PB --> T6[Capitalização Natural]
    end
    
    T1 --> HASH[Content Hash]
    T2 --> HASH
    T3 --> HASH
    T4 --> HASH
    T5 --> HASH
    T6 --> HASH
    
    HASH --> CHECK{Hash único?}
    CHECK -->|Sim| OUTPUT[Mensagem Única]
    CHECK -->|Não| PB
```

### 7.2 Variações de Saudação

```typescript
const GREETING_POOLS = {
  formal: [
    'Olá {{nome}},',
    'Prezado(a) {{nome}},',
    'Bom dia, {{nome}}!',
    'Boa tarde, {{nome}}!',
  ],
  casual: [
    'Oi {{nome}}!',
    'E aí {{nome}}!',
    'Fala {{nome}}!',
    'Opa {{nome}}!',
    '{{nome}}, tudo bem?',
    'Oiee {{nome}} 😊',
  ],
  direct: [
    '{{nome}},',
    'Ei {{nome}},',
    '{{nome}}!',
  ],
  none: [''], // Sem saudação
};

function randomGreeting(name: string, style: 'formal' | 'casual' | 'direct' | 'none'): string {
  const pool = GREETING_POOLS[style];
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace('{{nome}}', name);
}
```

### 7.3 Spinning com IA (OpenAI/Anthropic)

```typescript
interface SpinnerService {
  generateVariations(template: string, count: number): Promise<string[]>;
}

class AIContentSpinner implements SpinnerService {
  async generateVariations(template: string, count: number = 10): Promise<string[]> {
    const prompt = `
Você é um especialista em copywriting para WhatsApp Marketing.

Gere ${count} variações ÚNICAS da mensagem abaixo, mantendo:
- O mesmo significado e call-to-action
- Tom conversacional natural
- Variações sutis (sinônimos, ordem das frases, pontuação)
- Não use exatamente as mesmas palavras

Mensagem original:
"${template}"

Retorne APENAS as ${count} variações, uma por linha, sem numeração.
`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9, // Alta criatividade
    });

    return response.choices[0].message.content
      .split('\n')
      .filter(line => line.trim().length > 0);
  }
}
```

### 7.4 Inversão de Ordem Mídia/Texto

```typescript
interface MediaTextOrder {
  strategy: 'text_first' | 'media_first' | 'random' | 'alternate';
}

class MessageOrderRandomizer {
  private lastOrder: 'text' | 'media' = 'text';
  
  determineOrder(strategy: MediaTextOrder['strategy']): 'text_first' | 'media_first' {
    switch (strategy) {
      case 'text_first':
        return 'text_first';
      case 'media_first':
        return 'media_first';
      case 'random':
        return Math.random() > 0.5 ? 'text_first' : 'media_first';
      case 'alternate':
        this.lastOrder = this.lastOrder === 'text' ? 'media' : 'text';
        return this.lastOrder === 'text' ? 'text_first' : 'media_first';
    }
  }
}
```

### 7.5 Hash de Conteúdo (Anti-Duplicata)

```typescript
import { createHash } from 'crypto';

class ContentHasher {
  /**
   * Gera hash SHA256 normalizado do conteúdo
   * para detectar mensagens duplicadas
   */
  generateHash(content: string, mediaUrl?: string): string {
    // Normalizar: lowercase, remover espaços extras, remover emojis
    const normalized = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[\u{1F600}-\u{1F6FF}]/gu, '') // Remove emojis
      .trim();
    
    const payload = mediaUrl ? `${normalized}|${mediaUrl}` : normalized;
    
    return createHash('sha256').update(payload).digest('hex').substring(0, 16);
  }
  
  /**
   * Verifica se hash já foi usado nas últimas N horas
   */
  async isHashUsedRecently(hash: string, hours: number = 24): Promise<boolean> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const count = await this.messageLogRepo.count({
      where: {
        content_hash: hash,
        sent_at: MoreThan(cutoff),
      },
    });
    
    return count > 0;
  }
}
```

---

## 8. Gestão de Leads

### 8.1 Pipeline de Importação

```mermaid
graph TB
    subgraph "Fontes de Entrada"
        CSV[CSV Upload]
        TXT[TXT Upload]
        WG[Grupos WhatsApp]
        API[API/Webhook]
        MANUAL[Entrada Manual]
    end
    
    CSV --> PARSER[Parser Universal]
    TXT --> PARSER
    WG --> SCRAPER[Group Scraper]
    API --> VALIDATOR[Validador]
    MANUAL --> VALIDATOR
    
    PARSER --> NORMALIZER[Normalizador de Telefone]
    SCRAPER --> NORMALIZER
    VALIDATOR --> NORMALIZER
    
    NORMALIZER --> DEDUP[Deduplicador]
    DEDUP --> ENRICHER[Enriquecedor]
    ENRICHER --> DB[(Database)]
    
    subgraph "Normalizador"
        N1[Remover caracteres especiais]
        N2[Detectar DDI/DDD]
        N3[Adicionar +55 se BR]
        N4[Validar formato E.164]
    end
```

### 8.2 Normalização de Telefones (+55)

```typescript
class PhoneNormalizer {
  private readonly BR_DDDs = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
    '21', '22', '24', // RJ
    '27', '28', // ES
    '31', '32', '33', '34', '35', '37', '38', // MG
    '41', '42', '43', '44', '45', '46', // PR
    '47', '48', '49', // SC
    '51', '53', '54', '55', // RS
    // ... demais DDDs
  ];
  
  normalize(phone: string): NormalizedPhone {
    // 1. Remover tudo que não é número
    let cleaned = phone.replace(/\D/g, '');
    
    // 2. Detectar formato
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      // Já tem DDI Brasil
      return this.validateBrazilian(cleaned);
    }
    
    if (cleaned.length === 11) {
      // DDD + 9 dígitos (celular BR)
      return this.validateBrazilian('55' + cleaned);
    }
    
    if (cleaned.length === 10) {
      // DDD + 8 dígitos (fixo BR ou celular antigo)
      // Adicionar 9 na frente se for celular
      const ddd = cleaned.substring(0, 2);
      const number = cleaned.substring(2);
      if (number.startsWith('9') || number.startsWith('8') || number.startsWith('7')) {
        // Provavelmente celular sem o 9
        cleaned = '55' + ddd + '9' + number;
      } else {
        cleaned = '55' + cleaned;
      }
      return this.validateBrazilian(cleaned);
    }
    
    // Número internacional ou inválido
    if (cleaned.length >= 10) {
      return { 
        normalized: '+' + cleaned, 
        isValid: true, 
        country: 'INTL' 
      };
    }
    
    return { normalized: null, isValid: false, error: 'Número muito curto' };
  }
  
  private validateBrazilian(phone: string): NormalizedPhone {
    const ddd = phone.substring(2, 4);
    
    if (!this.BR_DDDs.includes(ddd)) {
      return { normalized: null, isValid: false, error: `DDD inválido: ${ddd}` };
    }
    
    return {
      normalized: '+' + phone,
      isValid: true,
      country: 'BR',
      ddd: ddd,
    };
  }
}

interface NormalizedPhone {
  normalized: string | null;
  isValid: boolean;
  country?: string;
  ddd?: string;
  error?: string;
}
```

### 8.3 Scraping de Grupos WhatsApp

```typescript
interface GroupScrapingResult {
  groupId: string;
  groupName: string;
  participants: Array<{
    phone: string;
    name?: string;
    isAdmin: boolean;
  }>;
  scrapedAt: Date;
}

class WhatsAppGroupScraper {
  constructor(private provider: IWhatsAppProvider) {}
  
  async scrapeGroup(groupId: string): Promise<GroupScrapingResult> {
    // 1. Obter metadados do grupo
    const groupInfo = await this.provider.getGroupMetadata(groupId);
    
    // 2. Extrair participantes
    const participants = groupInfo.participants.map(p => ({
      phone: this.normalizer.normalize(p.id.user).normalized,
      name: p.name || p.pushName,
      isAdmin: p.isAdmin || p.isSuperAdmin,
    }));
    
    // 3. Filtrar números inválidos
    const validParticipants = participants.filter(p => p.phone);
    
    return {
      groupId,
      groupName: groupInfo.subject,
      participants: validParticipants,
      scrapedAt: new Date(),
    };
  }
}
```

---

## 9. Integrações e Webhooks

### 9.1 Arquitetura de Webhooks

```mermaid
graph TB
    subgraph "Webhooks Inbound"
        WA_WEBHOOK[WhatsApp Provider] -->|message.received| HANDLER[Webhook Handler]
        WA_WEBHOOK -->|status.update| HANDLER
        WA_WEBHOOK -->|connection.update| HANDLER
        
        N8N_IN[n8n/Zapier] -->|trigger| API[API Gateway]
    end
    
    HANDLER --> QUEUE[Event Queue]
    QUEUE --> PROCESSOR[Event Processor]
    
    PROCESSOR --> DB[(Atualizar DB)]
    PROCESSOR --> FLOW_ENGINE[Disparar Fluxo]
    PROCESSOR --> OUTBOUND[Webhook Outbound]
    
    subgraph "Webhooks Outbound"
        OUTBOUND --> N8N_OUT[n8n]
        OUTBOUND --> CUSTOM[URLs Personalizadas]
        OUTBOUND --> SLACK[Slack/Discord]
    end
```

### 9.2 Payload de Webhook Outbound

```typescript
interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string; // ISO 8601
  tenant_id: string;
  data: WebhookEventData;
  signature: string; // HMAC-SHA256
}

type WebhookEventType = 
  | 'message.sent'
  | 'message.delivered'
  | 'message.read'
  | 'message.failed'
  | 'message.received'
  | 'campaign.started'
  | 'campaign.completed'
  | 'instance.connected'
  | 'instance.disconnected'
  | 'lead.created'
  | 'lead.opted_out';

interface WebhookEventData {
  // Varia por evento
  campaign_id?: string;
  lead_id?: string;
  instance_id?: string;
  message_id?: string;
  phone?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

// Exemplo de payload
const examplePayload: WebhookPayload = {
  event: 'message.read',
  timestamp: '2026-01-11T18:30:00.000Z',
  tenant_id: 'abc123',
  data: {
    campaign_id: 'camp_456',
    lead_id: 'lead_789',
    message_id: 'msg_012',
    phone: '+5511999999999',
    read_at: '2026-01-11T18:30:00.000Z',
  },
  signature: 'sha256=abc123...',
};
```

### 9.3 Integração n8n (Exemplo)

```yaml
# n8n Workflow - Novo Lead no WhatSaas
nodes:
  - name: WhatSaas Webhook Trigger
    type: n8n-nodes-base.webhook
    parameters:
      path: /whatsaas/new-lead
      method: POST
    
  - name: Process Lead
    type: n8n-nodes-base.code
    parameters:
      code: |
        const lead = $input.first().json.data;
        return [{
          phone: lead.phone,
          name: lead.name,
          source: 'whatsaas'
        }];
        
  - name: Add to CRM
    type: n8n-nodes-base.httpRequest
    parameters:
      url: https://api.crm.com/contacts
      method: POST
      body: '={{ $json }}'
```

---

## 10. Observabilidade e Logs

### 10.1 Stack de Observabilidade

```mermaid
graph LR
    subgraph "Aplicações"
        API[API Gateway]
        DISPATCHER[Dispatcher]
        WORKERS[Workers]
    end
    
    subgraph "Coleta"
        API -->|logs| LOKI[Loki]
        API -->|metrics| PROMETHEUS[Prometheus]
        API -->|traces| TEMPO[Tempo]
        
        DISPATCHER -->|logs| LOKI
        DISPATCHER -->|metrics| PROMETHEUS
        
        WORKERS -->|logs| LOKI
    end
    
    subgraph "Visualização"
        LOKI --> GRAFANA[Grafana]
        PROMETHEUS --> GRAFANA
        TEMPO --> GRAFANA
    end
    
    GRAFANA --> ALERTS[Alertas]
```

### 10.2 Estrutura de Logs

```typescript
// Logger estruturado com contexto
interface LogContext {
  // Identificadores
  tenant_id: string;
  user_id?: string;
  request_id: string;
  
  // Contexto de negócio
  campaign_id?: string;
  instance_id?: string;
  lead_id?: string;
  
  // Metadata
  action: string;
  duration_ms?: number;
  status: 'success' | 'error' | 'warning';
}

// Exemplo de log de disparo
logger.info({
  tenant_id: 'tenant_123',
  campaign_id: 'camp_456',
  instance_id: 'inst_789',
  lead_id: 'lead_012',
  action: 'message.send',
  duration_ms: 1523,
  status: 'success',
  message: 'Mensagem enviada com sucesso',
  metadata: {
    provider: 'evolution',
    message_type: 'text',
    content_hash: 'abc123',
    timing: {
      typing_duration_ms: 4200,
      delay_before_send_ms: 45000,
      jitter_applied_ms: -2300,
    },
  },
});
```

### 10.3 Métricas Prometheus

```typescript
// Métricas do Dispatcher
const messagesSentTotal = new Counter({
  name: 'whatsaas_messages_sent_total',
  help: 'Total de mensagens enviadas',
  labelNames: ['tenant_id', 'provider', 'status'],
});

const messageLatency = new Histogram({
  name: 'whatsaas_message_latency_seconds',
  help: 'Latência do envio de mensagem',
  labelNames: ['provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const instancesConnected = new Gauge({
  name: 'whatsaas_instances_connected',
  help: 'Instâncias WhatsApp conectadas',
  labelNames: ['tenant_id', 'provider'],
});

const queueDepth = new Gauge({
  name: 'whatsaas_queue_depth',
  help: 'Mensagens na fila de envio',
  labelNames: ['tenant_id', 'campaign_id'],
});
```

### 10.4 Dashboard Grafana (Queries)

```promql
# Taxa de envio por minuto
rate(whatsaas_messages_sent_total{status="success"}[5m]) * 60

# Taxa de falha
rate(whatsaas_messages_sent_total{status="error"}[5m]) 
/ 
rate(whatsaas_messages_sent_total[5m]) * 100

# Latência P95
histogram_quantile(0.95, rate(whatsaas_message_latency_seconds_bucket[5m]))

# Instâncias disponíveis
whatsaas_instances_connected{status="connected"}
```

---

## 11. Backlog Técnico Priorizado

### 11.1 Sprint 1 - Core Anti-Ban (2 semanas)

| # | Tarefa | Prioridade | Estimativa | Complexidade |
|---|--------|------------|------------|--------------|
| 1.1 | Implementar HBS Engine (typing simulation) | 🔴 CRÍTICA | 3d | Alta |
| 1.2 | Delay gaussiano com jitter | 🔴 CRÍTICA | 2d | Média |
| 1.3 | Pattern Breaker: variações de saudação | 🔴 CRÍTICA | 1d | Baixa |
| 1.4 | Content Hasher (anti-duplicata) | 🔴 CRÍTICA | 1d | Baixa |
| 1.5 | Janela horária com randomização | 🟡 ALTA | 1d | Média |

### 11.2 Sprint 2 - Motor de Disparo (2 semanas)

| # | Tarefa | Prioridade | Estimativa | Complexidade |
|---|--------|------------|------------|--------------|
| 2.1 | BullMQ: setup de filas e workers | 🔴 CRÍTICA | 2d | Alta |
| 2.2 | Instance Selector (Round-Robin) | 🔴 CRÍTICA | 2d | Média |
| 2.3 | Rate Limiter por instância | 🔴 CRÍTICA | 2d | Alta |
| 2.4 | Retry com backoff exponencial | 🟡 ALTA | 1d | Média |
| 2.5 | Webhook handler (status updates) | 🟡 ALTA | 2d | Média |

### 11.3 Sprint 3 - Gestão de Leads (2 semanas)

| # | Tarefa | Prioridade | Estimativa | Complexidade |
|---|--------|------------|------------|--------------|
| 3.1 | Importador CSV/TXT com preview | 🔴 CRÍTICA | 2d | Média |
| 3.2 | Normalizador de telefone BR | 🔴 CRÍTICA | 1d | Baixa |
| 3.3 | Deduplicador inteligente | 🟡 ALTA | 1d | Média |
| 3.4 | Scraper de grupos (Evolution/WAHA) | 🟡 ALTA | 3d | Alta |
| 3.5 | Sistema de tags e segmentos | 🟢 MÉDIA | 2d | Média |

### 11.4 Sprint 4 - Warmup & IA (2 semanas)

| # | Tarefa | Prioridade | Estimativa | Complexidade |
|---|--------|------------|------------|--------------|
| 4.1 | Warmup Engine: rampa progressiva | 🔴 CRÍTICA | 3d | Alta |
| 4.2 | Conversas automáticas entre chips | 🟡 ALTA | 2d | Alta |
| 4.3 | AI Spinner (OpenAI integration) | 🟡 ALTA | 2d | Média |
| 4.4 | Logs de warmup por chip | 🟢 MÉDIA | 1d | Baixa |
| 4.5 | Dashboard de maturidade | 🟢 MÉDIA | 2d | Média |

### 11.5 Sprint 5 - Observabilidade (1 semana)

| # | Tarefa | Prioridade | Estimativa | Complexidade |
|---|--------|------------|------------|--------------|
| 5.1 | Logs estruturados (Loki) | 🟡 ALTA | 2d | Média |
| 5.2 | Métricas Prometheus | 🟡 ALTA | 2d | Média |
| 5.3 | Dashboard Grafana | 🟢 MÉDIA | 1d | Baixa |
| 5.4 | Alertas de falha | 🟢 MÉDIA | 1d | Baixa |

### 11.6 Backlog Futuro (Pós-MVP)

| # | Tarefa | Prioridade | Tipo |
|---|--------|------------|------|
| F.1 | Integração n8n nativa | 🟢 MÉDIA | Feature |
| F.2 | App mobile (React Native) | 🟢 MÉDIA | Feature |
| F.3 | Marketplace de fluxos | 🔵 BAIXA | Feature |
| F.4 | Multi-idioma (i18n) | 🔵 BAIXA | Feature |
| F.5 | Billing (Stripe/Asaas) | 🟡 ALTA | Business |
| F.6 | API pública documentada | 🟢 MÉDIA | Feature |

---

## 📎 Anexos

### A. Variáveis de Ambiente (.env)

```env
# ===========================================
# WHATSAAS PRODUCTION CONFIG
# ===========================================

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/whatsaas

# Redis
REDIS_URL=redis://:password@localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret

# Crypto
ENCRYPTION_KEY=64-char-hex-key

# WhatsApp Providers
EVOLUTION_API_URL=http://34.39.235.219:8080
EVOLUTION_API_KEY=whatsaas_evolution_key_2024

WAHA_API_URL=http://localhost:8080
WAHA_API_KEY=wathsaas_waha_key_2024

# AI
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Webhooks
WEBHOOK_SECRET=hmac-secret-for-signatures

# Observability
LOKI_URL=http://localhost:3100
PROMETHEUS_PORT=9090
```

### B. Glossário

| Termo | Definição |
|-------|-----------|
| **HBS** | Human Behavior Simulator - Motor de simulação de comportamento humano |
| **Pattern Breaking** | Técnicas para evitar detecção por padrões repetitivos |
| **Warmup** | Processo de "aquecimento" de chip novo para evitar ban |
| **Jitter** | Variação aleatória adicionada a timings |
| **Spinning** | Geração de variações semânticas de um texto |
| **DDI** | Discagem Direta Internacional (ex: +55) |
| **DDD** | Discagem Direta à Distância (ex: 11, 21) |
| **E.164** | Padrão internacional de formatação de telefones |

---

**Documento preparado por:** Arquitetura de Software WhatSaas  
**Revisão:** 11 de Janeiro de 2026
