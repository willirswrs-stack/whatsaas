# Order Webhooks Module

Módulo para receber webhooks de plataformas de e-commerce e disparar notificações WhatsApp via Evolution API (Cloud API).

## Visão Geral

Este módulo permite que os tenants do WhatSaas:
1. Configurem integrações com suas plataformas de e-commerce (Shopify, WooCommerce, Yampi, etc.)
2. Definam regras para quais eventos disparam mensagens
3. Configurem templates WhatsApp e mapeamento de variáveis
4. Monitorem eventos recebidos e mensagens enviadas

## Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   E-commerce    │────▶│   Webhook        │────▶│   BullMQ        │
│   (Shopify,     │     │   Inbound        │     │   Queue         │
│   WooCommerce)  │     │   Controller     │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌──────────────────┐              ▼
                        │   Message        │     ┌─────────────────┐
                        │   Outbox         │◀────│   Processor     │
                        │                  │     │   (Worker)      │
                        └────────┬─────────┘     └────────┬────────┘
                                 │                        │
                                 ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │   Message        │     │   Evolution     │
                        │   Logs           │     │   API (Cloud)   │
                        └──────────────────┘     └─────────────────┘
```

## Endpoints

### Webhook Público (Inbound)

```
POST /api/v1/webhooks/:tenantSlug/:endpointSlug
```

Este é o endpoint que você fornece para a plataforma de e-commerce. A URL completa será:
```
https://seudominio.com/api/v1/webhooks/{tenant-slug}/{integration-slug}
```

### APIs Administrativas

Todas as rotas abaixo requerem autenticação JWT.

#### Integrações

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/order-webhooks/integrations` | Listar integrações |
| POST | `/api/v1/order-webhooks/integrations` | Criar integração |
| GET | `/api/v1/order-webhooks/integrations/:id` | Detalhes da integração |
| PATCH | `/api/v1/order-webhooks/integrations/:id` | Atualizar integração |
| DELETE | `/api/v1/order-webhooks/integrations/:id` | Excluir integração |
| POST | `/api/v1/order-webhooks/integrations/:id/regenerate-secret` | Regenerar secret |
| POST | `/api/v1/order-webhooks/integrations/:id/test` | Testar payload |

#### Mapeamentos de Eventos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/order-webhooks/mappings` | Listar mapeamentos |
| POST | `/api/v1/order-webhooks/mappings` | Criar mapeamento |
| PATCH | `/api/v1/order-webhooks/mappings/:id` | Atualizar mapeamento |
| DELETE | `/api/v1/order-webhooks/mappings/:id` | Excluir mapeamento |

#### Tipos de Eventos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/order-webhooks/event-types` | Listar tipos de eventos |

#### Monitoramento - Inbox (Eventos)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/order-webhooks/inbox` | Listar eventos recebidos |
| GET | `/api/v1/order-webhooks/inbox/:id` | Detalhes do evento |

#### Monitoramento - Outbox (Mensagens)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/order-webhooks/outbox` | Listar mensagens |
| POST | `/api/v1/order-webhooks/outbox/:id/retry` | Reenviar mensagem falha |

#### Estatísticas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/order-webhooks/statistics` | Estatísticas do módulo |

## Configuração

### 1. Criar Integração

```json
POST /api/v1/order-webhooks/integrations
{
  "name": "Minha Loja Shopify",
  "provider": "shopify",
  "signatureType": "hmac_sha256",
  "signatureHeader": "x-shopify-hmac-sha256"
}
```

Resposta:
```json
{
  "id": "uuid...",
  "name": "Minha Loja Shopify",
  "provider": "shopify",
  "isEnabled": true,
  "inboundSecret": "a1b2c3d4...(hex)",
  "endpointSlug": "minha-loja-shopify",
  "signatureType": "hmac_sha256",
  "signatureHeader": "x-shopify-hmac-sha256"
}
```

### 2. Configurar Webhook na Plataforma

Use a URL e o secret gerados:
- **URL**: `https://seudominio.com/api/v1/webhooks/{tenant-slug}/minha-loja-shopify`
- **Secret**: `a1b2c3d4...`

### 3. Criar Mapeamento de Evento

```json
POST /api/v1/order-webhooks/mappings
{
  "integrationId": "uuid-da-integracao",
  "eventTypeCode": "order_shipped",
  "isEnabled": true,
  "whatsappInstanceId": "uuid-da-instancia-whatsapp",
  "sendMode": "template_only",
  "templateName": "pedido_enviado",
  "templateLanguage": "pt_BR",
  "templateVariablesMap": {
    "1": "customerName",
    "2": "trackingCode",
    "3": "trackingUrl"
  },
  "matchRules": {
    "orderStatus": "shipped"
  }
}
```

## Providers Suportados

| Provider | Detecção de Evento | Normalização |
|----------|-------------------|--------------|
| `generic` | Campo `event_type` no payload | Campos padrão |
| `shopify` | Header `X-Shopify-Topic` | Estrutura Shopify |
| `woocommerce` | Campo `status` | Estrutura WooCommerce |
| `yampi` | Campo `event` | Estrutura Yampi |
| `cartpanda` | Campo `event` | Estrutura CartPanda |
| `nuvemshop` | Campo `event` | Estrutura Nuvemshop |
| `tray` | Campo `scope` | Estrutura Tray |

## Tipos de Assinatura

| Tipo | Descrição |
|------|-----------|
| `none` | Sem validação (não recomendado) |
| `token_header` | Valida que o header especificado contém o secret |
| `hmac_sha256` | Valida HMAC-SHA256 do body com o secret |

## Payload Normalizado

Todos os payloads são normalizados para esta estrutura:

```typescript
interface NormalizedPayload {
  orderId: string;
  orderNumber?: string;
  orderStatus?: string;
  customerName: string;
  customerEmail?: string;
  phoneE164: string;        // +5511999999999
  trackingCode?: string;
  trackingUrl?: string;
  shippingDate?: string;
  estimatedDeliveryDate?: string;
  cancelReason?: string;
  itemsCount?: number;
  totalAmount?: number;
  currency?: string;
  storeName?: string;
  shippingMethod?: string;
  eventType: string;
  occurredAt: Date;
}
```

## Template Variables Map

O mapeamento de variáveis suporta paths aninhados:

```json
{
  "1": "customerName",
  "2": "orderId",
  "3": "trackingCode",
  "4": "order.shipping.carrier"  // Acessa payload bruto
}
```

## Match Rules

Regras para filtrar quando um evento deve disparar mensagem:

```json
{
  "orderStatus": "shipped",              // Valor exato
  "shippingMethod": ["motoboy", "sedex"], // Um dos valores
  "cancelReason": { "exists": true }     // Campo existe
}
```

## Integração com n8n

Para enviar eventos processados também para n8n:

```json
{
  "forwardToN8n": true,
  "n8nWebhookUrl": "https://seu-n8n.com/webhook/abc123"
}
```

Payload enviado para n8n:
```json
{
  "tenant_id": "uuid",
  "event_type_code": "order_shipped",
  "order_id": "12345",
  "phone_e164": "+5511999999999",
  "occurred_at": "2026-02-04T15:30:00Z",
  "data": { ...normalizedPayload }
}
```

## Retry e Backoff

Mensagens são reenviadas com backoff exponencial:
- Tentativa 1: imediato
- Tentativa 2: após 5 segundos
- Tentativa 3: após 15 segundos
- Tentativa 4: após 1 minuto
- Tentativa 5: após 5 minutos

Após 5 tentativas, a mensagem é marcada como `failed` e pode ser reenviada manualmente.

## Seed de Event Types

Para popular os tipos de eventos padrão, execute:

```bash
npm run db:seed
# ou chame o endpoint admin de seed
```

## Exemplo de Payload Shopify

```json
{
  "id": 12345678,
  "order_number": "1001",
  "financial_status": "paid",
  "fulfillment_status": "fulfilled",
  "customer": {
    "first_name": "João",
    "last_name": "Silva",
    "email": "joao@email.com",
    "phone": "+5511999999999"
  },
  "fulfillments": [
    {
      "tracking_number": "ABC123",
      "tracking_url": "https://tracking.com/ABC123",
      "tracking_company": "Correios"
    }
  ],
  "total_price": "199.90",
  "currency": "BRL"
}
```

## Troubleshooting

### Webhook retorna 404
- Verifique se o tenant slug e endpoint slug estão corretos
- Verifique se a integração está habilitada

### Webhook retorna 400 (Invalid signature)
- Verifique se o secret configurado na plataforma é o mesmo da integração
- Verifique se o tipo de assinatura e header estão corretos

### Mensagem não é enviada
- Verifique se há um mapeamento habilitado para o tipo de evento
- Verifique se o match_rules corresponde ao payload
- Verifique se a instância WhatsApp está conectada
- Consulte os logs em `/order-webhooks/inbox/:id`

### Mensagem falha repetidamente
- Verifique os logs de erro em `/order-webhooks/outbox`
- Verifique se o template existe na conta WhatsApp Business
- Verifique se os parâmetros do template estão corretos
