#!/usr/bin/env bash
# =========================================================
# 🚀 CLICKS & GO — Script de Deploy Automático a Cloud Run
#
# Pre-requisitos (solo primera vez):
#   gcloud auth login
#   gcloud config set project clicks-and-go
#   gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
#   gcloud artifacts repositories create clicks-and-go \
#     --repository-format=docker --location=us-central1
#
# Secretos a crear en Secret Manager (solo primera vez):
#   gcloud secrets create DATABASE_URL  --replication-policy=automatic
#   gcloud secrets create MONGODB_URI   --replication-policy=automatic
#   gcloud secrets create SECRET_KEY_BASE --replication-policy=automatic
#   gcloud secrets create REDIS_URL     --replication-policy=automatic
#   printf 'postgresql://...' | gcloud secrets versions add DATABASE_URL --data-file=-
#   (repetir para cada secreto con el valor real del .env)
#
# Uso normal:
#   bash Infra/cloud/deploy.sh
#   bash Infra/cloud/deploy.sh --only rails   # solo un servicio
# =========================================================
set -euo pipefail

PROJECT_ID="clicks-and-go"
REGION="us-central1"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/clicks-and-go"
GIT_SHA=$(git rev-parse --short HEAD)
ONLY="${2:-all}"   # --only rails|python|rust|web

log()  { echo "▶ $*"; }
ok()   { echo "✅ $*"; }
err()  { echo "❌ $*" >&2; exit 1; }

# ── Autenticación Docker con Artifact Registry ───────────────────────────────
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

build_and_push() {
  local svc="$1"   # e.g. rails
  local ctx="$2"   # e.g. ./Rails
  local tag="${REGISTRY}/${svc}:${GIT_SHA}"
  local latest="${REGISTRY}/${svc}:latest"

  log "Building ${svc} (${GIT_SHA})..."
  docker build --platform linux/amd64 -t "$tag" -t "$latest" "$ctx"
  docker push "$tag"
  docker push "$latest"
  ok "${svc} pushed → ${tag}"
}

deploy_service() {
  local svc="$1"
  local yaml="Infra/cloud/cloudrun-${svc}.yaml"
  local tag="${REGISTRY}/${svc}:${GIT_SHA}"

  log "Deploying ${svc} from ${yaml}..."
  gcloud run services replace "$yaml" --region "$REGION" --quiet

  # ⚠️ `services replace` con un YAML BYTE-IDÉNTICO al desplegado es un no-op,
  # aunque `:latest` ya apunte a una imagen nueva: Cloud Run compara la
  # especificación, no el contenido del tag. El resultado es un deploy que
  # imprime "Done" mientras producción sigue sirviendo el binario viejo.
  # Pasó el 2026-07-27 (Rails quedó 10 días atrás) y volvió a pasar el
  # 2026-08-25 con Rust — la segunda vez con un arreglo de seguridad dentro.
  #
  # Se fuerza siempre la imagen por SHA: el tag cambia en cada commit, así que
  # la especificación SIEMPRE difiere y la revisión se crea de verdad.
  gcloud run services update "clicks-${svc}" \
    --region "$REGION" --image "$tag" --quiet >/dev/null

  # Verificación dura: el digest servido debe ser el de la imagen recién
  # publicada. Sin esto, "Done" no prueba nada.
  local servido esperado
  servido=$(gcloud run services describe "clicks-${svc}" --region "$REGION" \
    --format="value(spec.template.spec.containers[0].image)" 2>/dev/null)
  esperado="$tag"
  if [[ "$servido" != "$esperado" ]]; then
    err "${svc}: la revisión activa sirve '${servido}' y se esperaba '${esperado}'"
  fi
  ok "${svc} deployed (${GIT_SHA})"
}

# ── Build & Push ─────────────────────────────────────────────────────────────
if [[ "$ONLY" == "all" || "$ONLY" == "rails"  ]]; then build_and_push rails  ./Rails;  fi
if [[ "$ONLY" == "all" || "$ONLY" == "python" ]]; then build_and_push python ./Python; fi
if [[ "$ONLY" == "all" || "$ONLY" == "rust"   ]]; then build_and_push rust   ./Rust;   fi
if [[ "$ONLY" == "all" || "$ONLY" == "web"    ]]; then build_and_push web    ./Web;    fi

# ── Deploy a Cloud Run ────────────────────────────────────────────────────────
# Orden importante: backends primero, frontend al final
if [[ "$ONLY" == "all" || "$ONLY" == "rust"   ]]; then deploy_service rust;   fi
if [[ "$ONLY" == "all" || "$ONLY" == "rails"  ]]; then deploy_service rails;  fi
if [[ "$ONLY" == "all" || "$ONLY" == "python" ]]; then deploy_service python; fi
if [[ "$ONLY" == "all" || "$ONLY" == "web"    ]]; then deploy_service web;    fi

# ── Mostrar URLs tras deploy ───────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo "  URLS DE CLOUD RUN (copiar a los YAMLs)"
echo "══════════════════════════════════════════"
for svc in rust rails python web; do
  url=$(gcloud run services describe "clicks-${svc}" \
    --region "$REGION" --format="value(status.url)" 2>/dev/null || echo "no desplegado aún")
  printf "  %-10s → %s\n" "$svc" "$url"
done
echo ""
echo "⚠️  Actualizar RAILS_API_URL / RUST_API_URL en cloudrun-python.yaml y cloudrun-web.yaml"
echo "   luego re-deploy: bash Infra/cloud/deploy.sh --only python && bash Infra/cloud/deploy.sh --only web"
