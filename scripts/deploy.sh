#!/bin/bash
# ============================================================
#  WhatSaas — Script de Deploy para Produção
#  Executa na VM após bootstrap e configuração do .env.production
#
#  Uso:
#    chmod +x deploy.sh
#    ./deploy.sh
#
#  Para atualizar após novo código:
#    ./deploy.sh --update
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✔]${NC} $1"; }
info()  { echo -e "${BLUE}[ℹ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[⚠]${NC} $1"; }
fail()  { echo -e "${RED}[✘]${NC} $1"; exit 1; }

UPDATE_MODE=false
[ "$1" = "--update" ] && UPDATE_MODE=true

echo ""
echo "========================================================"
echo "   WhatSaas — Deploy de Produção"
echo "========================================================"
echo ""

# ── Verificações pré-deploy ──────────────────────────────────
[ ! -f ".env.production" ] && fail ".env.production não encontrado! Crie-o primeiro (veja .env.production.example)."
[ ! -f "docker-compose.prod.yml" ] && fail "docker-compose.prod.yml não encontrado!"
command -v docker &>/dev/null || fail "Docker não está instalado. Execute oracle-bootstrap.sh primeiro."

# ── Validar variáveis críticas ──────────────────────────────
info "Validando variáveis de ambiente..."
source .env.production

MISSING=()
[ -z "$DATABASE_PASSWORD" ] && MISSING+=("DATABASE_PASSWORD")
[ -z "$REDIS_PASSWORD" ]    && MISSING+=("REDIS_PASSWORD")
[ -z "$JWT_SECRET" ]        && MISSING+=("JWT_SECRET")
[ -z "$EVOLUTION_API_KEY" ] && MISSING+=("EVOLUTION_API_KEY")
[ -z "$WEBHOOK_URL" ]       && MISSING+=("WEBHOOK_URL")
[ -z "$CORS_ORIGINS" ]      && MISSING+=("CORS_ORIGINS")

if [ ${#MISSING[@]} -gt 0 ]; then
    fail "Variáveis obrigatórias não preenchidas no .env.production: ${MISSING[*]}"
fi

# Avisar sobre valores placeholder ainda não preenchidos
if echo "$DATABASE_PASSWORD" | grep -qi "generate\|your_\|GENERATE\|CHANGE"; then
    fail "DATABASE_PASSWORD ainda contém valor placeholder. Preencha com uma senha real."
fi

log "Variáveis validadas."

# ── Modo Update: pull do repositório ────────────────────────
if $UPDATE_MODE; then
    info "Modo update: puxando código mais recente do git..."
    git pull origin main || warn "git pull falhou — continuando com código local"
fi

# ── Parar containers antigos (graceful) ─────────────────────
info "Parando containers existentes (se houver)..."
docker compose -f docker-compose.prod.yml --env-file .env.production down --remove-orphans 2>/dev/null || true

# ── Build das imagens ────────────────────────────────────────
info "Fazendo build das imagens (pode demorar alguns minutos)..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

log "Build concluído."

# ── Subir infraestrutura primeiro (banco + redis) ───────────
info "Subindo infraestrutura (postgres + redis)..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

info "Aguardando banco de dados ficar saudável..."
RETRIES=15
while [ $RETRIES -gt 0 ]; do
    if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U "$DATABASE_USER" > /dev/null 2>&1; then
        log "PostgreSQL pronto."
        break
    fi
    RETRIES=$((RETRIES - 1))
    [ $RETRIES -eq 0 ] && fail "PostgreSQL não ficou saudável a tempo."
    echo -n "."
    sleep 3
done

# ── Subir Evolution API ──────────────────────────────────────
info "Subindo Evolution API..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d evolution

# ── Subir Backend ────────────────────────────────────────────
info "Subindo Backend (NestJS)..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend

info "Aguardando backend ficar saudável..."
RETRIES=20
while [ $RETRIES -gt 0 ]; do
    if docker compose -f docker-compose.prod.yml exec -T backend wget -qO- http://localhost:3333/api/v1/health > /dev/null 2>&1; then
        log "Backend pronto."
        break
    fi
    RETRIES=$((RETRIES - 1))
    [ $RETRIES -eq 0 ] && warn "Backend não respondeu ao healthcheck — verifique os logs."
    echo -n "."
    sleep 5
done

# ── Subir Frontend e Nginx ───────────────────────────────────
info "Subindo Frontend (Next.js) e Nginx..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend nginx

# ── Status final ─────────────────────────────────────────────
echo ""
echo "========================================================"
log "Deploy concluído! Status dos containers:"
echo "========================================================"
docker compose -f docker-compose.prod.yml ps
echo ""

# ── IP público ───────────────────────────────────────────────
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || echo "desconhecido")
echo ""
echo "  🌐 Acesse: http://$PUBLIC_IP"
echo ""
echo "  Comandos úteis:"
echo "  Ver logs backend:    docker compose -f docker-compose.prod.yml logs -f backend"
echo "  Ver logs evolution:  docker compose -f docker-compose.prod.yml logs -f evolution"
echo "  Parar tudo:          docker compose -f docker-compose.prod.yml down"
echo "  Atualizar:           ./deploy.sh --update"
echo ""
