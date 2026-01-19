# 🎯 PLANO DE AÇÃO - WhatSaas
## Resolução de Problemas Identificados na Auditoria
### Data: 15 de Janeiro de 2026

---

# 📋 CHECKLIST DE EXECUÇÃO

## 🔴 SPRINT 1: Correções Críticas de Segurança (URGENTE)
**Prazo:** 5 dias úteis
**Responsável:** Dev Senior
**Status:** ⬜ Não Iniciado

### Dia 1 - Credenciais e Configurações

- [x] **CRIT-001** - Desabilitar synchronize em produção
  - Arquivo: `backend/src/app.module.ts`
  - Linha 48
  - Alteração:
    ```typescript
    synchronize: configService.get<string>('NODE_ENV') !== 'production',
    ```

- [x] **CRIT-002** - Externalizar credenciais do docker-compose
  - Criar arquivo `.env.docker` (NÃO commitar!)
  - Atualizar `docker-compose.yml` para usar variáveis
  - Atualizar `.gitignore` para incluir `.env.docker`

### Dia 2 - Autenticação

- [x] **CRIT-003** - Remover senha admin hardcoded
  - Arquivo: `backend/src/modules/auth/auth.service.ts`
  - Linhas 166, 183
  - Adicionar variável `ADMIN_DEFAULT_PASSWORD` no `.env`
  - Aumentar bcrypt cost factor para 12

- [x] **HIGH-001** - Corrigir URL de refresh token
  - Arquivo: `frontend/src/lib/api.ts`
  - Linha 41: Remover `/api/v1` duplicado

### Dia 3-4 - Validação de Tenant

- [x] **CRIT-004** - Validar tenant em operações críticas
  - Arquivo: `backend/src/modules/dispatcher/dispatcher.service.ts`
  - Método: `enqueueCampaign`
  - Adicionar validação: campanha pertence ao tenant
  
  ```typescript
  async enqueueCampaign(campaignId: string, tenantId: string): Promise<number> {
      const campaign = await this.campaignRepo.findOne({
          where: { id: campaignId, tenantId }
      });
      if (!campaign) {
          throw new ForbiddenException('Campanha não encontrada');
      }
      // ... resto do código
  }
  ```

### Dia 5 - Tipos e Testes

- [x] **HIGH-003** - Refatorar tipos `any` críticos
  - Focar em: `whatsapp/adapters/*.ts`
  - Criar interfaces para erros de API
  - Tipar retornos de `request()`

- [x] Executar testes unitários
  ```bash
  cd backend && npm run test
  ```

- [x] Deploy patch de segurança

---

## 🟠 SPRINT 2: Estabilização e Qualidade
**Prazo:** 5 dias úteis
**Responsável:** Dev Backend
**Status:** ⬜ Não Iniciado

### Dia 1 - Logging

- [x] **HIGH-002** - Substituir console.log por Logger
  - Arquivo: `backend/src/modules/campaigns/campaigns.service.ts`
  - Linhas: 150, 172, 196, 209
  
  ```typescript
  // Antes
  console.log(`🤖 Gerando ${campaign.variationCount} variações...`);
  
  // Depois
  this.logger.log(`🤖 Gerando ${campaign.variationCount} variações...`);
  ```

### Dia 2-3 - TODOs Críticos

- [x] **HIGH-004** - Implementar TODOs do dispatcher
  - `conversationActive` detection (linha 162)
  - `isFirstContactMessage` tracking (linha 163)
  - Provider availability check (linha 526)
  - Admin role check em analytics (analytics.controller.ts:196)

### Dia 4 - Frontend Fixes

- [x] **HIGH-007** - Implementar saveConfig
  - Arquivo: `frontend/src/app/chips/page.tsx`
  - Linha 233-243
  - Chamar endpoint real de configuração

- [x] **HIGH-008** - Remover manipulação DOM direta
  - Arquivo: `frontend/src/app/campaigns/page.tsx`
  - Linha 125
  - Usar state do React

### Dia 5 - Migrations e Segurança

- [x] **MED-005** - Criar migrations formais
  ```bash
  cd backend
  npm run migration:generate -- -n InitialSchema
  npm run migration:run
  ```

- [x] **MED-006** - Aumentar bcrypt cost factor
  - Já incluído em CRIT-003

- [ ] Executar testes completos
  ```bash
  npm run test:cov
  ```

---

## 🟡 SPRINT 3: Performance e Escalabilidade
**Prazo:** 5 dias úteis
**Responsável:** Dev Backend + DBA
**Status:** ⬜ Não Iniciado

### Dia 1 - Rate Limiting

- [x] **HIGH-005** - Rate limiting por tenant
  - Criar `TenantThrottlerGuard`
  - Configurar múltiplos níveis (short, medium, long)
  
  ```typescript
  @Injectable()
  export class TenantThrottlerGuard extends ThrottlerGuard {
      protected async getTracker(req: Record<string, any>): Promise<string> {
          return req.user?.tenantId ?? req.ip;
      }
  }
  ```

### Dia 2 - Validação de Input

- [x] **HIGH-006** - DTOs com validação
  - Criar/atualizar: `campaigns.dto.ts`
  - Adicionar decoradores de validação
  - Validar: minDelayMs, maxDelayMs, variationCount

### Dia 3 - Banco de Dados

- [x] **MED-001** - Adicionar índices
  ```sql
  CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);
  CREATE INDEX idx_campaigns_tenant_created ON campaigns(tenant_id, created_at);
  CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
  CREATE INDEX idx_instances_tenant_status ON instances(tenant_id, status);
  ```

- [x] **MED-002** - Implementar paginação
  - Atualizar services: campaigns, contacts, instances
  - Atualizar controllers para aceitar `page` e `limit`

### Dia 4 - Real-time Updates

- [ ] **MED-004** - WebSocket/SSE
  - Substituir polling por WebSocket Gateway
  - Eventos: instance.status, campaign.progress

### Dia 5 - Health Check

- [x] **MED-009** - Health check endpoint
  - Criar `health.controller.ts`
  - Verificar: database, redis, whatsapp providers
  
  ```typescript
  @Controller('health')
  export class HealthController {
      @Get()
      check() {
          return {
              status: 'ok',
              timestamp: new Date().toISOString(),
          };
      }
  }
  ```

---

## 🔵 SPRINT 4: Observabilidade e Compliance
**Prazo:** 5 dias úteis
**Responsável:** Dev Full-stack
**Status:** ⬜ Não Iniciado

### Dia 1 - Segurança HTTP

- [ ] **MED-007** - Configurar Helmet CSP
  ```typescript
  app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
          directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", "data:", "blob:"],
          }
      } : false,
  }));
  ```

### Dia 2 - Audit Trail

- [ ] **MED-008** - Implementar auditoria
  - Criar tabela `audit_logs`
  - Criar `AuditInterceptor`
  - Logar ações: create, update, delete, start, stop

### Dia 3 - Frontend Improvements

- [ ] **MED-003** - Melhorar tratamento de erros
  - Revisar todos os catchs silenciosos
  - Adicionar toast/notificação para erros

- [ ] **MED-010** - Fallbacks CSS
  - Adicionar valores default para variáveis CSS

### Dia 4 - Documentação

- [ ] **LOW-004** - Documentar API no Swagger
  - Adicionar `@ApiOperation` em todos os endpoints
  - Adicionar `@ApiBody` e `@ApiResponse`
  - Adicionar exemplos

### Dia 5 - Testes E2E

- [ ] **LOW-005** - Testes E2E
  - Criar estrutura em `backend/test/`
  - Implementar testes para:
    - Autenticação (login, register, refresh)
    - Campanhas (CRUD + start/pause)
    - Instances (create, status, delete)

---

# 📊 TRACKING DE PROGRESSO

## Sprint 1
| Tarefa | Responsável | Início | Fim | Status |
|--------|-------------|--------|-----|--------|
| CRIT-001 | | | | ⬜ |
| CRIT-002 | | | | ⬜ |
| CRIT-003 | | | | ⬜ |
| CRIT-004 | | | | ⬜ |
| HIGH-001 | | | | ⬜ |
| HIGH-003 | | | | ⬜ |

## Sprint 2
| Tarefa | Responsável | Início | Fim | Status |
|--------|-------------|--------|-----|--------|
| HIGH-002 | | | | ⬜ |
| HIGH-004 | | | | ⬜ |
| HIGH-007 | | | | ⬜ |
| HIGH-008 | | | | ⬜ |
| MED-005 | | | | ⬜ |
| MED-006 | | | | ⬜ |

## Sprint 3
| Tarefa | Responsável | Início | Fim | Status |
|--------|-------------|--------|-----|--------|
| HIGH-005 | | | | ⬜ |
| HIGH-006 | | | | ⬜ |
| MED-001 | | | | ⬜ |
| MED-002 | | | | ⬜ |
| MED-004 | | | | ⬜ |
| MED-009 | | | | ⬜ |

## Sprint 4
| Tarefa | Responsável | Início | Fim | Status |
|--------|-------------|--------|-----|--------|
| MED-007 | | | | ⬜ |
| MED-008 | | | | ⬜ |
| MED-003 | | | | ⬜ |
| MED-010 | | | | ⬜ |
| LOW-004 | | | | ⬜ |
| LOW-005 | | | | ⬜ |

---

# 🚀 COMANDOS ÚTEIS

## Iniciar Ambiente de Desenvolvimento
```bash
cd D:\Projetos\WhatSaas\backend
docker-compose up -d
npm run start:dev
```

## Rodar Testes
```bash
# Unitários
npm run test

# Com cobertura
npm run test:cov

# E2E
npm run test:e2e
```

## Migrations
```bash
# Gerar migration a partir das entidades
npm run migration:generate -- -n NomeDaMigration

# Executar migrations pendentes
npm run migration:run

# Reverter última migration
npm run typeorm -- migration:revert -d src/config/database.config.ts
```

## Build Produção
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

---

# 📝 NOTAS DE REUNIÃO

## Decisões Pendentes
- [ ] Definir responsáveis para cada sprint
- [ ] Confirmar datas de início
- [ ] Aprovar orçamento de horas

## Riscos Identificados
1. Sprint 1 deve ser priorizada antes de qualquer deploy produtivo
2. Migrations podem requerer downtime
3. WebSocket requer configuração adicional de infra

---

*Plano criado em 15/01/2026*
*Próxima revisão: Após completar Sprint 1*
