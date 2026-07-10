# 🚀 Runbook de Deploy — Clicks & Go → Google Cloud Run

Guía paso a paso para publicar los 4 microservicios en Cloud Run. Ejecutar
desde una terminal con `gcloud` autenticado (no desde el codespace, que no
tiene `gcloud` ni sesión interactiva). Todo aquí está alineado con los
manifests reales de `Infra/cloud/`.

> **Bloqueante de negocio:** sin URL pública no hay aprobación de afiliados.
> Este deploy es lo que desbloquea el registro en Awin / CJ / Amazon Associates.

**Datos fijos del proyecto** (de los manifests):
- Proyecto GCP: `clicks-and-go` (número `798903122073`)
- Región: `us-central1`
- Artifact Registry: `us-central1-docker.pkg.dev/clicks-and-go/clicks-and-go`
- Cloud SQL: `clicks-and-go:us-central1:clicks-db`
- Service Account: `clicks-sa@clicks-and-go.iam.gserviceaccount.com`
- Servicios: `clicks-rust`, `clicks-rails`, `clicks-python`, `clicks-web`

---

## 0. Prerrequisitos (solo la primera vez)

```bash
# Instalar gcloud (si no está): https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project clicks-and-go

# Habilitar APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  cloudbuild.googleapis.com

# Repositorio de imágenes Docker
gcloud artifacts repositories create clicks-and-go \
  --repository-format=docker --location=us-central1 || true

# Service account que usan los manifests (si no existe)
gcloud iam service-accounts create clicks-sa \
  --display-name="Clicks & Go runtime" || true
# Permisos mínimos: leer secretos + conectar a Cloud SQL
for role in roles/secretmanager.secretAccessor roles/cloudsql.client \
            roles/aiplatform.user; do
  gcloud projects add-iam-policy-binding clicks-and-go \
    --member="serviceAccount:clicks-sa@clicks-and-go.iam.gserviceaccount.com" \
    --role="$role"
done
```

> ⚠️ **Facturación Vertex AI:** el proyecto tenía un HTTP 403 `dunning` por
> billing. Si sigue sin regularizarse, el sistema corre igual con Antigravity
> (heurística costo-cero). Resolver en GCP → Facturación cuando se pueda.

---

## 1. Secretos en Secret Manager (solo la primera vez)

Los manifests referencian estos secretos por `secretKeyRef → key: latest`:

| Secreto | Usado por | Valor |
|---|---|---|
| `DATABASE_URL` | rails, web | `postgresql://USER:PASS@/clicksandgo?host=/cloudsql/clicks-and-go:us-central1:clicks-db` |
| `MONGODB_URI` | rust, python | `mongodb+srv://USER:PASS@cluster.mongodb.net/clicksandgo` |
| `SECRET_KEY_BASE` | rails | `openssl rand -hex 64` |
| `AUTH_SECRET` | web | `openssl rand -base64 33` |
| `INTERNAL_API_KEY` | rails, web | `openssl rand -hex 32` |

> `REDIS_URL` **no** es necesario: sin él, Rails cae a `memory_store` (así se
> ahorró Memorystore). Los manifests no lo montan.

> `INTERNAL_API_KEY` protege `/api/v1/users/**` (perfil, favoritos, alertas)
> mientras Rails tenga `ingress: all` — **debe ser el mismo valor** en el
> secreto de `rails` y de `web` (es una clave compartida, no un par
> público/privado).

```bash
for s in DATABASE_URL MONGODB_URI SECRET_KEY_BASE AUTH_SECRET INTERNAL_API_KEY; do
  gcloud secrets create "$s" --replication-policy=automatic || true
done

# Cargar el valor real de cada uno (ejemplo):
printf 'postgresql://USER:PASS@/clicksandgo?host=/cloudsql/clicks-and-go:us-central1:clicks-db' \
  | gcloud secrets versions add DATABASE_URL --data-file=-
# ... repetir para MONGODB_URI, SECRET_KEY_BASE, AUTH_SECRET, INTERNAL_API_KEY
```

---

## 2. Base de datos (solo si Cloud SQL está vacía)

El `entrypoint.sh` de Rails corre `rails db:prepare` al bootear (crea/migra el
esquema base). Pero el catálogo y auth son SQL aparte. Si la instancia
`clicks-db` es nueva, aplicá en orden vía `gcloud sql connect` o Cloud SQL Studio:

1. `Infra/db/esquema_postgres.sql` — esquema base
2. `Infra/db/migration_auth_v1.sql` — columnas de perfil + tablas `sessions` / `verification_tokens`
3. `Infra/db/seeds_catalog.sql` — 25 retailers + 40 laptops + 40 price_histories (idempotente)

> Si reutilizás la Cloud SQL que ya venía cargada (docs 2026-06/07), **saltear
> este paso**: los scripts son idempotentes pero no hace falta re-correrlos.

---

## 3. Build, push y deploy (script automatizado)

El script buildea las 4 imágenes (`linux/amd64`), las pushea a Artifact
Registry y hace `gcloud run services replace` en el orden correcto
(backends → frontend).

```bash
# Todo de una:
bash Infra/cloud/deploy.sh

# O servicio por servicio:
bash Infra/cloud/deploy.sh --only rust
bash Infra/cloud/deploy.sh --only rails
bash Infra/cloud/deploy.sh --only python
bash Infra/cloud/deploy.sh --only web
```

Las URLs inter-servicio ya están **pre-cableadas** en los manifests con el
número de proyecto (`...-798903122073.us-central1.run.app`), así que el paso de
"actualizar URLs y re-deployar" que imprime el script al final normalmente
**no hace falta** (las URLs de Cloud Run son deterministas por proyecto+región).

---

## 4. Verificación post-deploy

```bash
# URLs finales
for svc in rust rails python web; do
  gcloud run services describe "clicks-$svc" --region us-central1 \
    --format="value(status.url)"
done

# Health checks (reemplazar por las URLs reales que devuelva lo de arriba)
curl -fsS https://clicks-rust-798903122073.us-central1.run.app/health
curl -fsS https://clicks-rails-798903122073.us-central1.run.app/api/v1/notebooks | head -c 300
curl -fsS https://clicks-python-798903122073.us-central1.run.app/api/v1/legal/status
# Frontend (debe devolver HTML del home en /es)
curl -fsS https://clicks-web-798903122073.us-central1.run.app/es | head -c 300
```

Checklist funcional:
- [ ] `/health` de Rust responde `ok`.
- [ ] Rails devuelve el catálogo JSON (40 laptops) con `deal_score` 1.0–10.0.
- [ ] Home `/es` renderiza catálogo + ofertas + noticias.
- [ ] **Disclosure de afiliados visible** en footer y bajo cada botón de compra.
- [ ] Login `/es/login` carga (OAuth aparecerá cuando se configuren las apps).

---

## 5. Dominio propio + AUTH_URL (cuando haya dominio)

En prod detrás del Load Balancer / dominio `clicksandgo.com`:
1. Mapear el dominio al servicio `clicks-web` (o al LB `clicks-lb`).
2. En `Infra/cloud/cloudrun-web.yaml` cambiar `AUTH_URL` →
   `https://clicksandgo.com` y re-deployar `--only web`.
3. Configurar los redirect URIs en Google / Azure / Facebook con ese dominio.

---

## 6. Costos (leer antes de dejarlo prendido)

Ver [`COSTOS.md`](./COSTOS.md). Resumen pre-lanzamiento:
- Los 4 servicios ya tienen `cpu-throttling: true` y `minScale` bajo (web/rails
  pueden ir a `0` para gasto casi nulo, tolerando cold-start ~2-4s).
- NewsRadar por Cloud Scheduler (`scheduler-news.yaml`), Python en `minScale: 0`.
- Crear presupuesto con alertas (`gcloud billing budgets create ...`, ver COSTOS.md).
- Cloud SQL es el mayor costo fijo → tier chico (`db-f1-micro`/`db-g1-small`).
- Apagar la VM de Compute Engine si no se usa.

---

## ⚠️ Notas / detalles menores detectados

- **`entrypoint.sh` (Rails, línea 8):** `command -v bundle exec rails` chequea
  solo `bundle` (command -v toma un único comando). Funciona igual —`bundle`
  existe y las migraciones corren— pero el guard es engañoso. Mejor:
  `if command -v bundle >/dev/null 2>&1; then`.
- **`deploy.sh` no falla si un push falla a mitad** de un `--only all` por el
  `set -e`; correr servicio por servicio da más control la primera vez.
- **Vertex AI 403 billing** sigue pendiente a nivel operativo (no bloquea el
  deploy — Antigravity cubre).
