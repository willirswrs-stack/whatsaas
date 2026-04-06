#!/bin/bash
# ============================================================
#  WhatSaas — Oracle Cloud Bootstrap Script
#  Roda UMA VEZ na VM recém-criada para preparar o ambiente.
#
#  Uso:
#    chmod +x oracle-bootstrap.sh
#    sudo ./oracle-bootstrap.sh
# ============================================================

set -e  # Aborta em qualquer erro

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
fail() { echo -e "${RED}[✘]${NC} $1"; exit 1; }

echo ""
echo "========================================================"
echo "   WhatSaas — Oracle Cloud VM Bootstrap"
echo "========================================================"
echo ""

# ── 1. Atualizar sistema ─────────────────────────────────────
log "Atualizando pacotes do sistema..."
dnf update -y -q 2>/dev/null || apt-get update -y -q && apt-get upgrade -y -q 2>/dev/null || true

# ── 2. Instalar dependências básicas ────────────────────────
log "Instalando ferramentas base (git, curl, wget, unzip)..."
if command -v dnf &>/dev/null; then
    dnf install -y git curl wget unzip nano htop
elif command -v apt-get &>/dev/null; then
    apt-get install -y git curl wget unzip nano htop
fi

# ── 3. Instalar Docker ───────────────────────────────────────
log "Instalando Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    log "Docker instalado e iniciado."
else
    warn "Docker já está instalado. Pulando."
fi

# ── 4. Adicionar usuário ao grupo docker ────────────────────
CURRENT_USER="${SUDO_USER:-$(whoami)}"
if [ "$CURRENT_USER" != "root" ]; then
    usermod -aG docker "$CURRENT_USER"
    log "Usuário '$CURRENT_USER' adicionado ao grupo docker."
    warn "Será necessário fazer logout/login para aplicar o grupo docker."
fi

# ── 5. Instalar Docker Compose (plugin) ─────────────────────
log "Instalando Docker Compose Plugin..."
if ! docker compose version &>/dev/null 2>&1; then
    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p "$DOCKER_CONFIG/cli-plugins"
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
    ARCH=$(uname -m)
    [ "$ARCH" = "aarch64" ] && ARCH="aarch64" || ARCH="x86_64"
    curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${ARCH}" \
        -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
    chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"
    log "Docker Compose ${COMPOSE_VERSION} instalado."
else
    warn "Docker Compose já está instalado: $(docker compose version --short)"
fi

# ── 6. Configurar firewall (Oracle usa iptables por padrão) ─
log "Configurando firewall (portas 80, 443, 22)..."

# Oracle Linux / iptables
if command -v firewall-cmd &>/dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --reload
    log "firewalld configurado."
elif command -v ufw &>/dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    log "ufw configurado."
else
    # Fallback iptables direto
    iptables -I INPUT -p tcp --dport 80 -j ACCEPT
    iptables -I INPUT -p tcp --dport 443 -j ACCEPT
    warn "iptables configurado manualmente (não persiste reboot). Configure via painel Oracle."
fi

# ATENÇÃO: Oracle Cloud bloqueia portas também no painel (Security List)
warn "Lembrete: Abrir portas 80 e 443 no painel Oracle Cloud → VCN → Security Lists!"

# ── 7. Criar diretório do projeto ───────────────────────────
APP_DIR="/opt/whatsaas"
log "Criando diretório do projeto em $APP_DIR..."
mkdir -p "$APP_DIR"
if [ "$CURRENT_USER" != "root" ]; then
    chown "$CURRENT_USER:$CURRENT_USER" "$APP_DIR"
fi

# ── 8. Instalar Certbot (SSL gratuito Let's Encrypt) ────────
log "Instalando Certbot (SSL)..."
if ! command -v certbot &>/dev/null; then
    if command -v dnf &>/dev/null; then
        dnf install -y epel-release 2>/dev/null || true
        dnf install -y certbot
    elif command -v apt-get &>/dev/null; then
        apt-get install -y certbot
    fi
    log "Certbot instalado."
else
    warn "Certbot já está instalado."
fi

# ── 9. Ajustes de performance para ARM ─────────────────────
log "Ajustando parâmetros do kernel para performance..."
cat >> /etc/sysctl.conf << 'EOF'
# WhatSaas performance tuning
net.core.somaxconn = 65535
net.ipv4.tcp_tw_reuse = 1
vm.overcommit_memory = 1
EOF
sysctl -p -q

# ── 10. Swap (segurança para picos de memória) ──────────────
if [ ! -f /swapfile ]; then
    log "Criando swapfile de 2GB (segurança)..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log "Swap de 2GB ativado."
else
    warn "Swapfile já existe."
fi

# ── Resumo final ─────────────────────────────────────────────
echo ""
echo "========================================================"
echo "  ✅ Bootstrap concluído!"
echo "========================================================"
echo ""
echo "  Docker:         $(docker --version)"
echo "  Docker Compose: $(docker compose version --short 2>/dev/null || echo 'veja acima')"
echo "  Certbot:        $(certbot --version 2>&1 | head -1)"
echo "  App dir:        $APP_DIR"
echo ""
echo "  PRÓXIMOS PASSOS:"
echo "  1. Faça logout e login novamente (para aplicar grupo docker)"
echo "  2. Copie o projeto para $APP_DIR"
echo "  3. Configure o .env.production"
echo "  4. Abra portas 80/443 no painel Oracle Cloud"
echo "  5. Execute: ./deploy.sh"
echo ""
