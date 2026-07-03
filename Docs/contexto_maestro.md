# 📖 Constitución Clicks & Go v4.3 (Arquitectura Enterprise de 4 Microservicios)

**FECHA DE REVISIÓN:** 2026-06-07
**ESTADO:** Producción (Zero-Trust) — Persistencia en Google Cloud

Esta es la única fuente de verdad arquitectónica del ecosistema. Todo agente o LLM que lea este documento debe respetar estrictamente estas fronteras. Ningún microservicio debe invadir la responsabilidad de otro.

## 🏛️ Topología Estricta (Zero-Trust Inter-Lenguaje)

### 1. Frontend (Next.js 15+ / React 19) -> La Fachada Pura
* **Misión:** Capa de presentación ultrarrápida (SSR). Renderiza la UI basándose en los diccionarios (i18n) para SEO dinámico.
* **Prohibición de APIs Internas:** La carpeta `/api/` en Next.js fue **eliminada**. Los Server Components hacen `fetch` directamente a la URL interna del microservicio de Rails (`http://rails_backend:3000`).
* **Proxy Edge Perimetral (v4.4):** `middleware.ts` resuelve el país con cadena de prioridad: override `?geo=XX` → cookie `cg_geo` (30 días) → cabeceras de plataforma (`x-vercel-ip-country`/`cf-ipcountry`) → **lookup de IP real** (ip-api.com, agnóstico de nube — funciona en AWS/EC2) → fallback US. El gateway `/out` tiene **allowlist estricta de dominios** (retailers + redes verificadas — anti open-redirect) y todos los enlaces de afiliado llevan `rel="sponsored noopener noreferrer"`.
* **Cumplimiento afiliados:** Divulgación de afiliados visible en el footer (FTC/RGPD) + páginas legales reales en `/{locale}/legal/{privacy|terms|cookies|affiliates}` (es/en/pt) servidas desde `src/lib/legalContent.ts`.
* **Tipografía v4.4:** Inter (cuerpo) + **Space Grotesk** (titulares h1–h3, vía `--font-display`). Contraste elevado: mínimos de gris en `text-gray-400`.
* **Prohibición Total:** El frontend tiene estrictamente prohibido ejecutar lógica de Agentes IA, calcular divisas o conectarse a bases de datos. Su contrato de datos es `laptop.ts` (espejo exacto del JSON de Rails).
* **Orden de página v2 (2026-06-07):** Hero → StatsBanner → WhyTrustUs → Catálogo (`#productos`, con `CatalogSection` client component y filtros) → AIDealsSection (`#ofertas`, top-3 por deal_score) → Noticias (`#noticias`, `HardwareNewsSlider`) . Secciones eliminadas: CTA Banner, HowItWorks. Navbar: "Mejores Ofertas" → `#ofertas`, "Noticias" → `#noticias`, "Buscar" → `#productos`.

### 2. Database & Admin (Ruby on Rails) -> El Guardián Transaccional
* **Misión:** Único microservicio con credenciales de lectura/escritura a **PostgreSQL**.
* **Persistencia:** Implementa el patrón **Upsert** y evita el problema N+1 al consultar la base de datos y el historial de precios.
* **APIs REST:** Expone endpoints `GET` para Next.js (`/api/v1/notebooks`) y endpoints `POST` para que Python inserte la data ya procesada y limpia.

### 3. El Cerebro (Python / FastAPI) -> Orquestador e Inteligencia
* **Misión:** Coordina la adquisición y enriquecimiento semántico. Coordina 4 sub-agentes sin bloquear el hilo principal (Background Tasks):
  * **LegalComplianceAgent (step 0 — máxima prioridad):** Monitorea 12 URLs de ToS/privacidad de redes de afiliados (Awin, CJ, Amazon Associates, MercadoLibre, HP, Dell, Lenovo, Asus) diariamente. SHA-256 hash por fuente, diff con snapshot en MongoDB, pre-procesamiento por Rust `/api/v1/legal/diff` antes de Gemini (ahorra ~98% tokens). Alertas HIGH/CRITICAL se postean a Rails `hardware_news`. Endpoints: `POST /api/v1/legal/audit` (mode=full|check) y `GET /api/v1/legal/status`. Schedulers: diario completo (3 AM UTC) + check cada 6h.
  * **MarketHunter:** Extrae ofertas usando **APIs Oficiales** (MercadoLibre, Awin, CJ). 100% legal.
  * **NewsRadar v2:** Scraper de 11 feeds RSS especializados en hardware/tech (Tom's Hardware, The Verge, Ars Technica, Engadget, TechRadar, CNET, Wired, Xataka ES, NotebookCheck, Digital Trends, Laptop Mag). 6 ítems/feed con filtro de keywords para descartar contenido off-topic. Parser `lxml-xml` (fallback `html.parser`). Se ejecuta automáticamente al boot (delay 30s) y cada 6h vía `_news_radar_loop()` en lifespan — sin cron externo. LIMIT de noticias en Rails: 20.
  * **BenchmarkScraper:** Extractor asíncrono masivo (`aiohttp` + `lxml`) para alimentar el motor matemático.
* **Semantic Engine:** Consolida UX, UI (Tailwind) y SEO en una sola llamada al proveedor cognitivo para optimizar el presupuesto de tokens.
* **Capa de Proveedores Cognitivos (v4.4 — cascada de 3 niveles):** Toda la IA pasa por `src/providers/` con una interfaz única (`LLMProvider`) y un `ProviderRouter` con failover automático en cascada. Constantes de tarea: `TASK_SCORE`, `TASK_SEO`, `TASK_NEWS`, `TASK_LEGAL_AUDIT`.
  * **VertexProvider (nivel 1 — primario):** Vertex AI sobre Google Cloud (`gemini-2.5-flash` / `gemini-2.5-pro`), autenticado por **service account** (`GOOGLE_APPLICATION_CREDENTIALS`), mismo proyecto/billing/region (`GCP_PROJECT_ID`, `GCP_LOCATION`). Salida JSON estructurada estricta. Requiere billing GCP activo; se reactiva solo al volver el billing.
  * **GeminiProvider (nivel 2 — secundario):** Gemini API de AI Studio por **API key** (`GEMINI_API_KEY`) — free tier, **sin billing GCP** y agnóstico de nube (funciona desde AWS). Implementado con stdlib (`urllib`), cero dependencias nuevas. Mismo contrato JSON estricto que Vertex.
  * **AntigravityProvider (nivel 3 — fallback):** Heurística determinista de **costo cero**. Soporta `TASK_LEGAL_AUDIT` con detección de señales CRITICAL/HIGH/MEDIUM y `significant_shrink` (texto actual < 85% del anterior). Garantiza Zero-Downtime cognitivo.
* **Propiedad Exclusiva:** Python es el **único** con permisos para leer/escribir en la carpeta `/Docs` (Maneja cuotas y Bitácora).

### 3.5 App Móvil (React Native / Expo) -> La Fachada de Bolsillo (v5.0)
* **Misión:** Cliente Android/iOS en `Mobile/` que consume la **misma API de Rails** que la web (cero lógica de negocio propia). TypeScript + Expo, tema oscuro espejo de la identidad web.
* **Geo compartida:** Arranca llamando a `GET /api/v1/geo` (Rails) — el mismo punto de verdad de país/moneda/idioma para todas las plataformas. Selector manual de región con persistencia de sesión.
* **Regla de afiliación inquebrantable:** El botón de compra abre `{WEB_BASE_URL}/out?url=...` — el gateway blindado de la web (allowlist + inyección de tags). **Prohibido** abrir `affiliate_raw` directo: se pierde la comisión y la trazabilidad legal.
* **Config de entorno:** `Mobile/src/config.ts` (`API_BASE_URL`, `WEB_BASE_URL`). Identificadores de tienda: `com.clicksandgo.app`.

### 4. Motor Físico (Rust / Axum) -> Calculadora Multinúcleo, Telemetría y Coprocesador Gemini
* **Misión:** Ultra baja latencia. API REST puerto 8080. Versión actual: **v4.3**.
* **Scoring (`deal_score`):** `HardwareScorerAgent` v4.3 — Intel Core Ultra 5/7/9 (Meteor Lake/Arrow Lake), Apple M4 Pro/Max/Ultra, RTX 4050, Snapdragon X Elite/Plus, RTX 2060–2080 legacy. Escala 1.0–10.0.
* **Concurrencia:** `ConcurrencyRouter` — Rayon work-stealing sobre todos los núcleos. Toma ownership del batch (sin clone). `#[inline]` en funciones críticas.
* **Coprocesador Gemini (v4.3) — 4 nuevos agentes:**
  * **HardwareCanonicalizer** (`POST /api/v1/hardware/canonicalize`): Normaliza nombres CPU/GPU cross-retailer, asigna tier, genera `gemini_context` estructurado listo para inyectar en prompt.
  * **PriceSentinel** (`POST /api/v1/price/anomalies`): Moving average + z-score (|z| > 2.0 OR |pct| > 20%) → anomaly detection. `gemini_trigger: bool`. Flash sale heuristic.
  * **LegalDiffer** (`POST /api/v1/legal/diff`): FNV-1a 64-bit hash (zero deps), risk scoring 0–100, `gemini_priority: "SKIP"|"NORMAL"|"URGENT"`. Reduce ~98% tokens en auditorías legales.
  * **LinkValidator** (`POST /api/v1/links/validate`): HEAD concurrente con `Arc<Semaphore>` (MAX=20), seguimiento manual de redirecciones (máx 5 hops), timeout 12s.
* **`AppState`:** `http_client` (pool tuneado: connect_timeout 5s, idle 10/host, keepalive 60s), `mongo_client`, `health_cache` (TTL 5s — evita ping MongoDB en cada request de Cloud Run).
* **Middleware:** `CompressionLayer` (gzip/deflate −70% payload), body limit 4 MB, CORS interno (solo `python_ai:5001` y `rails_backend:3000`).
* **DevOps Agent:** Ejecuta `healthchecks` asíncronos y escribe logs de salud del sistema directamente en **MongoDB** (El Data Lake). `/health` usa `HealthCache` — `MutexGuard` siempre suelto antes de `.await`.

## 🗄️ Estrategia de Persistencia Políglota (Cloud-First desde v4.1)
* **PostgreSQL — Google Cloud SQL:** Modelo relacional transaccional estricto (ACID). Conexión por `DATABASE_URL` con `sslmode=require`. Tabla de historial: `price_histories` (plural, convención ActiveRecord). El enum `currency_type` soporta las 7 monedas (USD, ARS, EUR, MXN, BRL, COP, CLP).
* **MongoDB — Atlas:** Sumidero NoSQL de datos no estructurados, cuotas de IA y logs asíncronos de telemetría técnica. Conexión por `MONGODB_URI` (alias interno `MONGO_URI`).
* **Modo híbrido:** `docker-compose.yaml` apunta a la nube por defecto; `docker-compose.local.yml` levanta Postgres/Mongo en contenedores para desarrollo aislado.

## 🛡️ Protocolos de Contingencia
* **Antigravity Fallback:** Si Vertex AI falla o Python agota su cuota límite diaria, el `ProviderRouter` conmuta automáticamente al `AntigravityProvider`, que inyecta SEO, categoría y tags UX usando heurística determinista (Costo Cero).
* **Fail-Fast Boot:** En `docker-compose`, los contenedores abortan su arranque (`depends_on: condition: service_healthy`) si su API padre no está saludable.

## 📐 Contrato de Datos (Sincronización estricta v4.1 — Catálogo v1.0)
El serializer de Rails es espejo exacto de `Web/src/types/laptop.ts`: devuelve `currency`, `financials.applied_exchange_rate` (tipo de cambio real persistido), `financials.discount_pct` (calculado en backend), e `intelligence` completo (`deal_score` en escala **1.0–10.0**, `ai_score_label`, `price_trend`, `category`) más `seo`. El frontend NO recalcula divisas: solo formatea.

**Catálogo inicial (`Infra/db/seeds_catalog.sql`):** 25 retailers (AR/US/ES/MX/BR), 40 laptops con `metadata_extra` JSONB (`category`, `ai_badge`, `ui_accent_color`, `seo_title`, `seo_description`, `condition`), 40 registros en `price_histories`. Scripts idempotentes (`ON CONFLICT DO NOTHING/UPDATE`).

## ⚖️ Sistema de Monitoreo Legal (v4.3)
Arquitectura de 3 capas para prevención de baneos en redes de afiliados:
1. **Rust `LegalDiffer`** (gratuito, instantáneo): FNV-1a hash + keyword scoring → `gemini_priority`. Si es "SKIP", Gemini no se consulta.
2. **Antigravity** (gratuito, siempre disponible): Señales CRITICAL/HIGH/MEDIUM + detección de `significant_shrink` (texto < 85% del anterior).
3. **Gemini** (pago, solo cuando necesario): Recibe únicamente el `gemini_brief` (resumen compacto), no el texto completo. Reducción ~98% de tokens.

Schedulers: auditoría completa diaria (03:00 UTC) + check ligero cada 6h (auto-regulado por MongoDB `legal_state`).