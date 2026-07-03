#!/usr/bin/env bash
# =========================================================
# 🚀 CLICKS & GO — DEPLOY EN AWS EC2 (migración desde GCP)
# Ejecutar DENTRO de una instancia EC2 Ubuntu 22.04+ recién creada.
# Levanta el stack completo con Docker Compose:
#   Postgres + MongoDB (contenedores) + Rails + Python + Rust + Web
# Uso:
#   bash deploy-ec2.sh https://github.com/franco8706/ClicksAndGo.git
# =========================================================
set -euo pipefail

REPO_URL="${1:-https://github.com/franco8706/ClicksAndGo.git}"
APP_DIR="$HOME/clicksandgo"

echo "▶ 1/5 Instalando Docker y Docker Compose..."
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y ca-certificates curl git
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
fi

echo "▶ 2/5 Clonando el repositorio..."
if [ ! -d "$APP_DIR" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull
fi
cd "$APP_DIR"

echo "▶ 3/5 Verificando .env..."
if [ ! -f .env ]; then
  cat > .env <<'ENV'
# ⚙️ Completar antes de arrancar (ver Infra/aws/README.md)
SECRET_KEY_BASE=CAMBIAME_llave_larga_aleatoria
MONGODB_URI=mongodb://mongodb_lake:27017
GCP_PROJECT_ID=
GCP_LOCATION=us-central1
# 🔷 Gemini API key (https://aistudio.google.com/apikey) — gratis, SIN billing GCP
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
ENV
  echo "⚠️  .env creado con placeholders — editalo (nano .env) y volvé a correr este script."
  exit 1
fi

echo "▶ 4/5 Placeholder de credenciales Vertex (opcional)..."
# El compose monta gcp-vertex.json; si no usás Vertex (billing GCP caído),
# un JSON vacío evita el error de montaje y el sistema usa Gemini API / Antigravity.
[ -f gcp-vertex.json ] || echo '{}' > gcp-vertex.json

echo "▶ 5/5 Levantando el stack..."
sudo docker compose -f docker-compose.yaml -f docker-compose.local.yml up -d --build

echo ""
echo "✅ Listo. Verificá con: sudo docker compose ps"
echo "   Web:    http://$(curl -s ifconfig.me 2>/dev/null || echo '<IP-PUBLICA>')/"
echo "   (Asegurate de abrir el puerto 80 en el Security Group de la instancia)"
