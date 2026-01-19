# 🚀 Deploy Evolution API - Google Cloud Platform

> Guia de deploy da Evolution API no Google Cloud para integração com WhatSaas

---

## 📋 Informações da VM

| Campo | Valor |
|-------|-------|
| **Nome** | `whatsaas-vm` |
| **Zona** | `southamerica-east1-a` |
| **IP Interno** | `10.158.0.2` |
| **IP Externo** | `34.39.235.219` |
| **Disco** | 50 GB |
| **Arquitetura** | x86/64 |
| **Status** | ✅ Ativa |

---

## 🔧 Configuração do Firewall (VPC)

Certifique-se de que as seguintes portas estão liberadas:

| Porta | Protocolo | Descrição |
|-------|-----------|-----------|
| 22 | TCP | SSH |
| 8080 | TCP | Evolution API |
| 5432 | TCP | PostgreSQL (opcional, só se precisar acesso externo) |

### Como configurar:
1. Vá em **VPC Network > Firewall**
2. Crie uma regra de entrada (Ingress)
3. Origem: `0.0.0.0/0`
4. Portas: `tcp:8080`
5. Aplique à VM `whatsaas-vm`

---

## 🐳 Passo 1: Conectar via SSH e Instalar Docker

```bash
# Conectar via SSH (pelo console GCP ou terminal)
gcloud compute ssh whatsaas-vm --zone=southamerica-east1-a

# Ou via SSH direto
ssh -i ~/.ssh/google_compute_engine usuario@34.39.235.219

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y

# Relogar para aplicar permissões
exit
# Conectar novamente

# Verificar instalação
docker --version
docker compose version
```

---

## 📦 Passo 2: Deploy Evolution API

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
      AUTHENTICATION_API_KEY: whatsaas_evolution_key_2024
      AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES: "true"
      # Server
      SERVER_TYPE: http
      SERVER_PORT: "8080"
      SERVER_URL: http://34.39.235.219:8080
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

# Iniciar containers
docker compose up -d

# Verificar logs
docker compose logs -f evolution

# Testar API (em outro terminal)
curl http://localhost:8080/instance/fetchInstances -H "apikey: whatsaas_evolution_key_2024"
```

---

## ✅ Passo 3: Testar Acesso Externo

Do seu computador local, teste:

```bash
curl http://34.39.235.219:8080/instance/fetchInstances -H "apikey: whatsaas_evolution_key_2024"
```

Se funcionar, você verá `[]` (lista vazia de instâncias).

---

## 🔧 Passo 4: Configurar WhatSaas Local

Atualize o arquivo `.env` do backend:

```env
# Evolution API (Google Cloud)
EVOLUTION_API_URL=http://34.39.235.219:8080
EVOLUTION_API_KEY=whatsaas_evolution_key_2024
```

Reinicie o backend e teste criar uma instância com provider "Evolution"!

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

## 🔐 Credenciais

| Serviço | Usuário | Senha |
|---------|---------|-------|
| PostgreSQL | `evolution` | `evolution_secure_2024` |
| Evolution API Key | - | `whatsaas_evolution_key_2024` |

---

## 📅 Histórico

- **28/12/2025** - VM criada no GCP
- **04/01/2026** - Documentação criada
