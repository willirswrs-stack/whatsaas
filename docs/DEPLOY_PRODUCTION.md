# 🚀 WhatSaas - Guia de Deploy para Produção

## Pré-requisitos

- **Servidor**: VPS com mínimo 4GB RAM, 2 CPUs (recomendado: 8GB RAM)
- **Docker**: Docker Engine 24+ com Docker Compose V2
- **Domínio**: Domínio apontando para o IP do servidor
- **SSL**: Certificado SSL (Let's Encrypt recomendado)

---

## 1. Preparar o Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose (V2 - plugin)
sudo apt install docker-compose-plugin -y

# Verificar
docker --version
docker compose version
```

## 2. Clonar o Projeto

```bash
cd /opt
git clone <your-repo-url> whatsaas
cd whatsaas
```

## 3. Configurar Variáveis de Ambiente

```bash
# Copiar template
cp .env.production.example .env.production

# Gerar secrets
echo "JWT_SECRET=$(openssl rand -base64 30)"
echo "DATABASE_PASSWORD=$(openssl rand -base64 18)"
echo "REDIS_PASSWORD=$(openssl rand -base64 18)"
echo "EVOLUTION_API_KEY=$(openssl rand -hex 20)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"

# Editar .env.production com os valores gerados
nano .env.production
```

### Variáveis obrigatórias:
| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `DATABASE_PASSWORD` | `generated...` | Senha do PostgreSQL |
| `REDIS_PASSWORD` | `generated...` | Senha do Redis |
| `JWT_SECRET` | `generated...` | Secret para JWT tokens |
| `EVOLUTION_API_KEY` | `generated...` | API key do Evolution |
| `WEBHOOK_URL` | `https://api.suaempresa.com/api/v1/webhooks/evolution` | URL pública para webhooks |
| `CORS_ORIGINS` | `https://app.suaempresa.com` | URL do frontend |
| `NEXT_PUBLIC_API_URL` | `https://api.suaempresa.com/api/v1` | URL da API para o frontend |
| `UPLOADS_BASE_URL` | `https://api.suaempresa.com/uploads` | URL pública para arquivos |

## 4. Configurar SSL (Let's Encrypt)

```bash
# Instalar certbot
sudo apt install certbot -y

# Gerar certificado (antes de subir nginx)
sudo certbot certonly --standalone -d api.suaempresa.com -d app.suaempresa.com

# Copiar certificados para o projeto
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/api.suaempresa.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/api.suaempresa.com/privkey.pem nginx/ssl/
sudo chown -R $(whoami):$(whoami) nginx/ssl/

# Descomentar linhas de SSL no nginx/nginx.conf
```

## 5. Build e Deploy

```bash
# Build e iniciar todos os serviços
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Verificar se todos os containers estão healthy
docker compose -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.prod.yml logs -f backend

# Rodar migrations
docker compose -f docker-compose.prod.yml exec backend node dist/scripts/seed.js
```

## 6. Verificar Deploy

```bash
# Health check
curl https://api.suaempresa.com/api/v1/health

# Verificar frontend
curl -I https://app.suaempresa.com

# Verificar Evolution API (interno)
docker compose -f docker-compose.prod.yml exec evolution curl http://localhost:8080
```

---

## 📋 Comandos Úteis

```bash
# Parar tudo
docker compose -f docker-compose.prod.yml down

# Reiniciar backend
docker compose -f docker-compose.prod.yml restart backend

# Ver logs do backend
docker compose -f docker-compose.prod.yml logs -f --tail=100 backend

# Backup do banco
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U wathsaas wathsaas > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U wathsaas wathsaas

# Atualizar (rebuild)
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔒 Checklist de Segurança

- [ ] Todas as senhas geradas com `openssl rand`
- [ ] SSL/HTTPS ativo para todos os domínios
- [ ] Firewall: apenas portas 80 e 443 abertas
- [ ] Rate limiting configurado no Nginx
- [ ] `.env.production` NÃO está no git
- [ ] Swagger desabilitado em produção (se necessário)
- [ ] Bull Board restrito por IP
- [ ] Senha padrão do admin alterada após primeiro login
- [ ] Logs monitorados (journalctl, docker logs)
- [ ] Backups automáticos configurados

---

## 📊 Monitoramento

| Serviço | URL | Descrição |
|---------|-----|-----------|
| Health Check | `/api/v1/health` | Status do backend |
| Bull Board | `/api/v1/queues` | Monitoramento de filas |
| Swagger | `/docs` | Documentação da API |

---

## 🏗️ Arquitetura de Produção

```
Internet
    │
    ▼
[Nginx :80/:443]
    │
    ├──▶ /api/*         → [Backend :3333]
    │                        ├── PostgreSQL
    │                        ├── Redis (BullMQ)
    │                        └── Evolution API
    │
    ├──▶ /uploads/*     → [Static Files]
    │
    ├──▶ /socket.io/*   → [WebSocket]
    │
    └──▶ /*             → [Frontend :3000]
```
