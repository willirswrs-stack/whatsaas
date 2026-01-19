# 🚀 Deploy Evolution API - Oracle Cloud Free Tier

> Guia completo para deploy da Evolution API no Oracle Cloud gratuitamente

---

## 📋 Pré-requisitos

- Conta Oracle Cloud (criar em: https://cloud.oracle.com)
- Cartão de crédito para verificação (NÃO será cobrado no Free Tier)

---

## 🔧 Passo 1: Criar Conta Oracle Cloud

1. Acesse: https://cloud.oracle.com/free
2. Clique em "Start for free"
3. Preencha os dados e verifique o email
4. Adicione cartão de crédito (apenas verificação, não cobra)
5. Aguarde aprovação (geralmente instantâneo)

---

## 💻 Passo 2: Criar VM ARM (Always Free)

1. No Console Oracle Cloud, vá em: **Compute > Instances > Create Instance**

2. Configure:
   - **Name:** `evolution-api`
   - **Compartment:** (deixe o padrão)
   - **Image:** Ubuntu 22.04 (Canonical)
   - **Shape:** Clique em "Change Shape"
     - Selecione **Ampere** (ARM)
     - **4 OCPUs** e **24 GB RAM** (máximo do free tier)
   - **Networking:** Criar nova VCN ou usar existente
   - **SSH Key:** Gerar nova ou usar existente (SALVE A CHAVE PRIVADA!)

3. Clique em **Create** e aguarde a VM ficar "Running"

4. Anote o **IP Público** da VM

---

## 🔓 Passo 3: Configurar Firewall (Security List)

1. Vá em: **Networking > Virtual Cloud Networks > [Sua VCN]**
2. Clique em **Security Lists > Default Security List**
3. Adicione Ingress Rules:

| Source CIDR | Protocol | Port | Descrição |
|-------------|----------|------|-----------|
| 0.0.0.0/0 | TCP | 8080 | Evolution API |
| 0.0.0.0/0 | TCP | 5432 | PostgreSQL (opcional, só se precisar acesso externo) |

---

## 🐳 Passo 4: Conectar e Instalar Docker

```bash
# Conectar via SSH
ssh -i sua_chave_privada.key ubuntu@SEU_IP_PUBLICO

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y

# Relogar para aplicar grupo docker
exit
# Conectar novamente
ssh -i sua_chave_privada.key ubuntu@SEU_IP_PUBLICO

# Verificar instalação
docker --version
docker compose version
```

---

## 📦 Passo 5: Deploy Evolution API

```bash
# Criar diretório
mkdir -p ~/evolution && cd ~/evolution

# Criar docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: evolution-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: evolution_secure_2024
      POSTGRES_DB: evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evolution"]
      interval: 10s
      timeout: 5s
      retries: 5

  evolution:
    image: atendai/evolution-api:v2.1.1
    container_name: evolution-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      # Authentication
      AUTHENTICATION_TYPE: apikey
      AUTHENTICATION_API_KEY: SUA_API_KEY_SECRETA_AQUI
      AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES: "true"
      # Server
      SERVER_TYPE: http
      SERVER_PORT: "8080"
      SERVER_URL: http://SEU_IP_PUBLICO:8080
      CORS_ORIGIN: "*"
      CORS_METHODS: "POST,GET,PUT,DELETE"
      CORS_CREDENTIALS: "true"
      # Database
      DATABASE_ENABLED: "true"
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: postgresql://evolution:evolution_secure_2024@postgres:5432/evolution
      # Cache
      CACHE_REDIS_ENABLED: "false"
      CACHE_LOCAL_ENABLED: "true"
      # Webhooks - URL do seu backend WhatSaas
      WEBHOOK_GLOBAL_URL: https://seu-backend.com/api/v1/webhooks/evolution
      WEBHOOK_GLOBAL_ENABLED: "true"
      # QR Code
      QRCODE_LIMIT: 30
      CONFIG_SESSION_PHONE_CLIENT: "WhatSaas"
      # Storage
      STORE_MESSAGES: "true"
      STORE_CONTACTS: "true"
      STORE_CHATS: "true"
      # WebSocket
      WEBSOCKET_ENABLED: "true"
      # Log
      LOG_LEVEL: "WARN"
    ports:
      - "8080:8080"
    volumes:
      - evolution_data:/evolution/instances

volumes:
  postgres_data:
  evolution_data:
EOF
```

---

## ▶️ Passo 6: Iniciar Serviços

```bash
# Editar docker-compose.yml com suas configurações
nano docker-compose.yml

# Alterar:
# - SUA_API_KEY_SECRETA_AQUI → sua chave de API (ex: evolution_whatssaas_2024)
# - SEU_IP_PUBLICO → IP público da sua VM Oracle

# Iniciar
docker compose up -d

# Verificar logs
docker compose logs -f evolution

# Testar API
curl http://localhost:8080/instance/fetchInstances -H "apikey: SUA_API_KEY"
```

---

## ✅ Passo 7: Configurar WhatSaas

No arquivo `.env` do backend WhatSaas, atualize:

```env
# Evolution API (Oracle Cloud)
EVOLUTION_API_URL=http://SEU_IP_PUBLICO:8080
EVOLUTION_API_KEY=SUA_API_KEY_SECRETA_AQUI
```

Reinicie o backend e teste criar uma instância com provider "Evolution"!

---

## 🔒 Segurança (Recomendado)

1. **Usar HTTPS:** Configure Nginx + Certbot para SSL gratuito
2. **Firewall:** Limite acesso por IP se possível
3. **API Key forte:** Use chave longa e aleatória
4. **Backups:** Configure backup do PostgreSQL

---

## 📝 Comandos Úteis

```bash
# Ver logs
docker compose logs -f

# Reiniciar
docker compose restart

# Parar
docker compose down

# Atualizar Evolution
docker compose pull
docker compose up -d

# Ver uso de recursos
docker stats
```

---

## 🆘 Troubleshooting

### Erro: "Out of host capacity"
O Oracle Free Tier tem disponibilidade limitada. Tente:
- Mudar a região (São Paulo, Vinhedo)
- Usar menos OCPUs (2 em vez de 4)
- Tentar em diferentes horários

### Erro: "Cannot pull image"
```bash
docker compose pull
```

### Evolution não inicia
```bash
docker compose logs evolution
# Verificar se PostgreSQL está healthy
docker compose ps
```
