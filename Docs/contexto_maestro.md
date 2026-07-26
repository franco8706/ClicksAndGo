# 📖 Constitución Clicks & Go v4.5 (Arquitectura Enterprise de 4 Microservicios)

**FECHA DE REVISIÓN:** 2026-07-07
**ESTADO:** Producción (Zero-Trust) — Persistencia en Google Cloud — Catálogo multi-producto

> **Producto:** arrancó con notebooks pero el catálogo es **multi-producto** (`product_type`): computación (laptop·desktop·monitor), periféricos (keyboard·mouse·headphones·webcam) e impresión (printer·supplies). La taxonomía canónica vive en `Web/src/types/product.ts`. La UI, el tema (claro, ADN NVIDIA con acento azul) y el dashboard son agnósticos al tipo.

Esta es la única fuente de verdad arquitectónica del ecosistema. Todo agente o LLM que lea este documento debe respetar estrictamente estas fronteras. Ningún microservicio debe invadir la responsabilidad de otro.

> Este documento describe el **estado actual** de la arquitectura. El historial de cómo se llegó hasta acá (bugs, decisiones, sesiones de trabajo) vive en `bitacora_sistema.md`; lo que falta por construir vive en `redesign_plan.md`.

---

## 🧭 Mapa rápido (de un vistazo)

**Qué es:** plataforma global de comparación de precios y afiliación. Arrancó con notebooks; hoy es un catálogo **multi-producto**. El corazón es el sistema agéntico de IA.

**Los 4 microservicios — Zero-Trust, cada uno en su carril:**

| Servicio | Rol | Su frontera |
|---|---|---|
| **Next.js** (Web) | Fachada SSR pura | Solo habla con Rails (REST). No toca la DB — salvo el adapter de NextAuth. |
| **Rails** | Guardián transaccional | **Único** dueño de PostgreSQL. Expone la API REST. |
| **Python** (FastAPI) | Cerebro / agentes IA | Recolecta (APIs oficiales), enriquece, persiste **vía Rails**. |
| **Rust** (Axum) | Motor matemático | Scoring y cálculo puro. Escribe telemetría a MongoDB. |

**Reglas de oro (inviolables):**
1. **Rails es el único con credenciales a Postgres.** (Única excepción: el adapter de NextAuth.)
2. **La matemática** (scores, divisas) vive en **Rust/Rails**, nunca en la Web.
3. **La Web nunca llama a Python ni a Rust** directo — solo a Rails.
4. **La IP se usa en tránsito**; se persiste solo el país derivado (GDPR/Ley 25.326).

**Flujo de datos:**
`Navegador → Next.js → Rails → PostgreSQL` · `Python → Rust (cálculo) → Rails (persistencia)` · `Rust/Python → MongoDB (telemetría/cuotas)`

---

## 🏛️ Topología Estricta (Zero-Trust Inter-Lenguaje)

### 1. Frontend (Next.js 15+ / React 19) -> La Fachada Pura
* **Misión:** Capa de presentación ultrarrápida (SSR). Renderiza la UI basándose en los diccionarios (i18n) para SEO dinámico.
* **Prohibición de APIs Internas:** La carpeta `/api/` en Next.js no existe (excepto el route handler de NextAuth, exigido por el framework). Los Server Components hacen `fetch` directamente a la URL interna del microservicio de Rails (`http://rails_backend:3000`).
* **Proxy Edge Perimetral:** El archivo `middleware.ts` intercepta `x-vercel-ip-country`/`cf-ipcountry` para inyectar la región y ofuscar las rutas de afiliados mediante el gateway seguro `/out` (allowlist de dominios — cierra open-redirect).
* **Prohibición Total (frontera Zero-Trust):** El frontend tiene estrictamente prohibido ejecutar lógica de Agentes IA, calcular divisas o conectarse a bases de datos. Su contrato de datos es `laptop.ts` (espejo exacto del JSON de Rails). **Única excepción documentada:** el adapter custom de NextAuth (`auth.ts`) — el patrón de sesión `"database"` de NextAuth exige queries directas a `users`/`accounts`/`sessions`/`verification_tokens` a nivel de framework; no hay forma de proxear esto por REST sin reimplementar NextAuth. Todo lo demás — catálogo, precios, favoritos, alertas de precio, perfil de usuario — pasa por Rails vía `src/lib/railsApi.ts` (helper `server-only`). Las rutas por-usuario (`/api/v1/users/:user_id/*`) están protegidas por una clave compartida (`INTERNAL_API_KEY`, header `X-Internal-Key`) porque Rails corre con `ingress: all` en Cloud Run.
* **Página de inicio:** Hero (con ticker de noticias inline, `NewsTicker`) → `EventBanner` (cartel de evento comercial — solo si el `MarketIntelligenceAgent` marcó productos con `is_promo_season`) → `WhyTrustUs` → `CategoryShowcase` (cards de categoría con contador; filtran el catálogo) → `ForYouRail` ("Elegidos para vos" — invisible para visitantes sin historial) → Catálogo (`#productos`, `CatalogSection` con filtro por tipo/familia y pill removible) → `PromoBanners` (por familia, "Hasta X% OFF" con el máximo `discount_pct` del backend) → Mejores Ofertas (`#ofertas`, `AIDealsSection`, escaparate con tabs de progreso 7s, top-3 por `deal_score`). Catálogo y noticias se sirven según el país del visitante: preferido por el usuario (si lo configuró en `/panel`) o detectado por IP.
* **Capa promocional agéntica (solo lectura):** la Web renderiza los campos que el `MarketIntelligenceAgent` (Python → Rails) persiste en `metadata_extra` — `promo_event` (chip sobre la imagen de la card), `fomo_message`/`market_urgency` (EventBanner). Cero lógica de IA en el frontend.
* **Personalización conductual (presentacional):** `src/lib/affinity.ts` + `ForYouRail` — señales locales (expandir card, click de compra, favorito, filtro) en `localStorage` con decaimiento 7 días; re-ordena el catálogo YA servido por Rails. **Nada viaja al servidor** (más restrictivo que la política de IP-en-tránsito); la matemática de negocio (precios/scores) sigue llegando calculada del backend. El análisis agéntico profundo (Vertex/Gemini) para usuarios logueados es fase 2 — ver `redesign_plan.md`.
* **Autenticación:** `NextAuth.js 5.0.0-beta.31` con adapter custom `ClicksAdapter()` (snake_case PostgreSQL). Providers condicionales: Google OAuth, Microsoft Entra ID, Facebook, Resend magic link — cada uno se activa solo si sus credenciales están seteadas. Sesión strategy: `"database"` (tabla `sessions` en Cloud SQL). Rutas: `/login` (con feedback de error OAuth / magic link enviado), `/register`, `/panel`. Páginas legales: `/{locale}/privacidad` y `/{locale}/terminos` (es/en/pt, GDPR/LGPD/Ley 25.326).
* **Dashboard de usuario (`/panel`):** stats (favoritos/alertas activas/región detectada), lista de favoritos con último precio y alta de alerta inline, alertas de precio con estado (alcanzada/esperando), perfil con selector de país preferido del catálogo. Todo consumido de Rails — cero acceso directo a Postgres.
* **Afiliación global:** el `/out` gateway detecta el país (IP o preferencia guardada) e inyecta el tag de afiliado correcto por red (Amazon Associates ES/US, MercadoLibre AR/MX/BR/CO/CL) decidiendo por **hostname** de la URL destino, no por substring — evita atribuir comisión a la red equivocada. Disclosure de afiliados (FTC/RGPD) visible en footer, cards de producto y sección de ofertas (es/en/pt).

### 2. Database & Admin (Ruby on Rails) -> El Guardián Transaccional
* **Misión:** Único microservicio con credenciales de lectura/escritura a **PostgreSQL**. Ningún otro servicio toca la base directo (ver excepción de NextAuth arriba).
* **Persistencia:** Implementa el patrón **Upsert** y evita el problema N+1 al consultar la base de datos y el historial de precios (`has_one :latest_price` con scope ordenado; `includes` en las queries de favoritos/alertas).
* **APIs REST — Catálogo (consumidas por Next.js y Python):**
  * `GET /api/v1/products` — catálogo multi-producto por país; filtro opcional `?type=<product_type>` (laptop|desktop|monitor|keyboard|mouse|headphones|webcam|printer|supplies). `?slug=` — detalle. `notebooks` queda como alias histórico (mismo controller/serializer).
  * `GET /api/v1/notebooks/hardware_news` — noticias por país.
  * `POST /api/v1/products` (o `.../notebooks`) y `POST .../hardware_news` — Python inserta datos ya procesados (incluye `product_type` + `specs`).
  * `GET /api/v1/geo` — resolución de país compartida (Web + Mobile) por IP, cabeceras de plataforma u override manual.
* **APIs REST — Cuenta de usuario (consumidas solo por Next.js, protegidas por `INTERNAL_API_KEY`):**
  * `GET/PATCH /api/v1/users/:user_id/profile` — perfil (nombre, teléfono, ciudad, país preferido del catálogo).
  * `PATCH /api/v1/users/:user_id/geo` — registra país detectado por IP + última visita (nunca la IP cruda).
  * `GET/POST/DELETE /api/v1/users/:user_id/favorites` (+ `POST .../favorites/toggle`) — favoritos del catálogo.
  * `GET/POST/DELETE /api/v1/users/:user_id/price_alerts` — alertas de precio objetivo.
* **APIs REST — Despacho de alertas (system-level, consumidas por el PriceAlertAgent de Python, protegidas por `INTERNAL_API_KEY`):**
  * `GET /api/v1/price_alerts/pending` — alertas activas cuyo precio actual ya cayó ≤ objetivo y aún no fueron notificadas (con email del usuario + datos del producto).
  * `POST /api/v1/price_alerts/mark_notified` `{ ids }` — marca `notified_at` en las alertas cuyo email se envió (evita renotificar).
* **Modelos:** `User`, `UserFavorite` (PK compuesta `user_id`+`laptop_id`, soportada nativamente desde Rails 7.1), `PriceAlert`, además de `Laptop`, `Retailer`, `PriceHistory`, `HardwareNews`. `Laptop` es de hecho el **catálogo de productos**: columna `product_type` (discriminador) + `specs` JSONB (specs propias de cada tipo); las columnas laptop dedicadas (`procesador`/`ram_gb`/…) se mantienen para laptops/desktops.

### 3. El Cerebro (Python / FastAPI) -> Orquestador e Inteligencia
* **Misión:** Coordina la adquisición y enriquecimiento semántico. Orquesta los sub-agentes sin bloquear el hilo principal (Background Tasks):
  * **LegalComplianceAgent (step 0 — máxima prioridad):** Monitorea 12 URLs de ToS/privacidad de redes de afiliados (Awin, CJ, Amazon Associates, MercadoLibre, HP, Dell, Lenovo, Asus) diariamente. SHA-256 hash por fuente, diff con snapshot en MongoDB, pre-procesamiento por Rust `/api/v1/legal/diff` antes de Gemini (ahorra ~98% tokens). Alertas HIGH/CRITICAL se postean a Rails `hardware_news`. Endpoints: `POST /api/v1/legal/audit` (mode=full|check) y `GET /api/v1/legal/status`. Schedulers: diario completo (3 AM UTC) + check cada 6h.
  * **MarketHunter:** Extrae ofertas usando **APIs Oficiales** (MercadoLibre, Awin, CJ). 100% legal.
  * **NewsRadar:** Scraper de 11 feeds RSS especializados en hardware/tech (Tom's Hardware, The Verge, Ars Technica, Engadget, TechRadar, CNET, Wired, Xataka ES, NotebookCheck, Digital Trends, Laptop Mag). 6 ítems/feed con filtro de keywords para descartar contenido off-topic. Parser `lxml-xml` (fallback `html.parser`). **Geo:** mapa `feed_country` etiqueta feeds regionales (Xataka→ES); Rails persiste `country_code` y sirve cada noticia solo a su país (NULL = global). Se ejecuta automáticamente al boot (delay 30s) y cada 6h vía `_news_radar_loop()` en lifespan, opt-out por `NEWS_LOOP_ENABLED` (en Cloud Run lo dispara Cloud Scheduler en su lugar). LIMIT de noticias en Rails: 20.
  * **BenchmarkScraper:** Extractor asíncrono masivo (`aiohttp` + `lxml`) para alimentar el motor matemático.
  * **PriceAlertAgent (paso 9 — re-engagement):** tras persistir los precios nuevos, consulta a Rails las alertas alcanzadas (`GET /price_alerts/pending`), envía el email "bajó de precio" vía Resend (`AUTH_RESEND_KEY`) y marca las enviadas (`POST /mark_notified`). Zero-Trust: no toca Postgres — Rails resuelve la comparación precio≤objetivo. Sin API key de Resend, detecta pero no envía (deja pendiente).
* **Ingesta / FX:** `DataNormalizerAgent` sanea strings, extrae RAM/storage por regex ancladas (no confunde RAM con almacenamiento) y precios en formato US/LATAM/EU. Tipo de cambio en vivo (`open.er-api.com`, caché TTL 6h) con fallback determinista si la API falla — nunca bloquea la ingesta.
* **Semantic Engine:** Consolida UX, UI (Tailwind) y SEO en una sola llamada al proveedor cognitivo para optimizar el presupuesto de tokens.
* **Capa de Proveedores Cognitivos:** Toda la IA pasa por `src/providers/` con una interfaz única (`LLMProvider`) y un `ProviderRouter` con failover automático. Constantes de tarea: `TASK_SCORE`, `TASK_SEO`, `TASK_NEWS`, `TASK_LEGAL_AUDIT`.
  * **VertexProvider (primario):** Vertex AI sobre Google Cloud (`gemini-2.5-flash` / `gemini-2.5-pro`), autenticado por **service account** (`GOOGLE_APPLICATION_CREDENTIALS`), mismo proyecto/billing/region (`GCP_PROJECT_ID`, `GCP_LOCATION`). Salida JSON estructurada estricta.
  * **AntigravityProvider (fallback):** Heurística determinista de **costo cero**. Soporta `TASK_LEGAL_AUDIT` con detección de señales CRITICAL/HIGH/MEDIUM y `significant_shrink` (texto actual < 85% del anterior). Garantiza Zero-Downtime cognitivo.
* **Propiedad Exclusiva:** Python es el único microservicio en tiempo de ejecución con permisos de escritura sobre `/Docs` (gestiona cuotas y telemetría); ningún otro contenedor (Rails/Rust/Web) lee ni escribe ahí.

### 4. Motor Físico (Rust / Axum) -> Calculadora Multinúcleo, Telemetría y Coprocesador Gemini
* **Misión:** Ultra baja latencia. API REST puerto 8080.
* **Scoring (`deal_score`):** `HardwareScorerAgent` — Intel Core Ultra 5/7/9 (Meteor Lake/Arrow Lake), Apple M4 Pro/Max/Ultra, RTX 4050, Snapdragon X Elite/Plus, RTX 2060–2080 legacy. Escala 1.0–10.0. **Multi-producto:** `laptop`/`desktop` usan el scorer de hardware; el resto de tipos (sin CPU/GPU) usan `calculate_generic_score(discount_pct, rating, reviews)` **+ `type_spec_bonus(product_type, specs)`** — un bonus (0–1.5) por señales de calidad propias de cada tipo leídas del JSONB `specs` (monitor→refresh_hz/4K/panel, teclado→mecánico/wireless, mouse→dpi, auriculares→ANC, webcam→4K/fps, impresora→wifi/ppm, insumos→rendimiento). El `ConcurrencyRouter` despacha según `product_type`. La matemática vive **siempre en Rust** (Python nunca calcula scores).
* **Concurrencia:** `ConcurrencyRouter` — Rayon work-stealing sobre todos los núcleos. Toma ownership del batch (sin clone). `#[inline]` en funciones críticas.
* **Coprocesador Gemini — 4 agentes:**
  * **HardwareCanonicalizer** (`POST /api/v1/hardware/canonicalize`): Normaliza nombres CPU/GPU cross-retailer, asigna tier, genera `gemini_context` estructurado listo para inyectar en prompt.
  * **PriceSentinel** (`POST /api/v1/price/anomalies`): Moving average + z-score (|z| > 2.0 OR |pct| > 20%) → anomaly detection. `gemini_trigger: bool`. Flash sale heuristic.
  * **LegalDiffer** (`POST /api/v1/legal/diff`): FNV-1a 64-bit hash (zero deps), risk scoring 0–100, `gemini_priority: "SKIP"|"NORMAL"|"URGENT"`. Reduce ~98% tokens en auditorías legales.
  * **LinkValidator** (`POST /api/v1/links/validate`): HEAD concurrente con `Arc<Semaphore>` (MAX=20), seguimiento manual de redirecciones (máx 5 hops), timeout 12s.
* **`AppState`:** `http_client` (pool tuneado: connect_timeout 5s, idle 10/host, keepalive 60s), `mongo_client`, `health_cache` (TTL 5s — evita ping MongoDB en cada request de Cloud Run).
* **Middleware:** `CompressionLayer` (gzip/deflate −70% payload), body limit 4 MB, CORS interno (solo `python_ai:5001` y `rails_backend:3000`).
* **DevOps Agent:** Ejecuta `healthchecks` asíncronos y escribe logs de salud del sistema directamente en **MongoDB** (El Data Lake). `/health` usa `HealthCache` — `MutexGuard` siempre suelto antes de `.await`.

## 🗄️ Estrategia de Persistencia Políglota (Cloud-First)
* **PostgreSQL — Google Cloud SQL:** Modelo relacional transaccional estricto (ACID). Conexión por `DATABASE_URL` con `sslmode=require` (o socket unix en Cloud Run). Tabla de historial: `price_histories` (plural, convención ActiveRecord). El enum `currency_type` soporta 7 monedas (USD, ARS, EUR, MXN, BRL, COP, CLP). Tabla `users` extendida con `last_name`, `phone`, `city`, `country_code` (preferido), `detected_country` (derivado de IP, no se persiste la IP cruda), `preferred_locale`, `last_seen_at`. Tablas de auth: `accounts`, `sessions` (strategy database), `verification_tokens`. Tablas de negocio de usuario: `user_favorites` (PK compuesta), `price_alerts`. La tabla `laptops` (catálogo de productos) suma `product_type VARCHAR(30) DEFAULT 'laptop'` y `specs JSONB` (índices por `(product_type,country_code)` y GIN sobre specs). **Integridad (v5):** tabla lookup `product_categories` (code PK, family, label) con FK desde `laptops.product_type` (rechaza tipos inválidos; sumar un tipo = INSERT, no ALTER); CHECKs (`deal_score` ∈ [1,10], `precio_actual`≥0, `target_price`>0); `price_alerts.user_id`/`laptop_id` NOT NULL; índice único de una alerta activa por usuario+producto; índices en FKs (`accounts.user_id`, `user_favorites.laptop_id`). Migraciones: `migration_auth_v1.sql`, `migration_user_v2.sql`, `migration_products_v3.sql`, `migration_alerts_v4.sql`, `migration_integrity_v5.sql`.
* **MongoDB — Atlas:** Sumidero NoSQL de datos no estructurados, cuotas de IA y logs asíncronos de telemetría técnica. Conexión por `MONGODB_URI` (alias interno `MONGO_URI`).
* **Modo híbrido:** `docker-compose.yaml` apunta a la nube por defecto; `docker-compose.local.yml` levanta Postgres/Mongo en contenedores para desarrollo aislado.

## 🛡️ Protocolos de Contingencia
* **Antigravity Fallback:** Si Vertex AI falla o Python agota su cuota límite diaria, el `ProviderRouter` conmuta automáticamente al `AntigravityProvider`, que inyecta SEO, categoría y tags UX usando heurística determinista (Costo Cero).
* **Fail-Fast Boot:** En `docker-compose`, los contenedores abortan su arranque (`depends_on: condition: service_healthy`) si su API padre no está saludable.

## 📐 Contrato de Datos (Sincronización estricta — Catálogo)
El serializer de Rails es espejo exacto de `Web/src/types/laptop.ts`: devuelve `currency`, `financials.applied_exchange_rate` (tipo de cambio real persistido), `financials.discount_pct` (calculado en backend), e `intelligence` completo (`deal_score` en escala **1.0–10.0**, `ai_score_label`, `price_trend`, `category`) más `seo`. El frontend NO recalcula divisas: solo formatea. **Multi-producto:** el DTO incluye `product_type` y `specs` (bag genérico por tipo); Rails llena `specs` de forma uniforme (laptops/desktops derivan de sus columnas, el resto lee el JSONB) y la card las renderiza vía `SPEC_SCHEMA` en `Web/src/types/product.ts`.

**Catálogo inicial:** `Infra/db/seeds_catalog.sql` — 25 retailers (AR/US/ES/MX/BR), 40 laptops con `metadata_extra` JSONB, 40 `price_histories`. `Infra/db/seeds_products_multi.sql` — 22 productos multi-tipo (monitores·teclados·mouse·auriculares·webcams·impresoras·desktops·insumos) en US/ES/MX con `product_type` + `specs`. Scripts idempotentes (`ON CONFLICT DO NOTHING/UPDATE`), 62 productos totales.

## ⚖️ Sistema de Monitoreo Legal
Arquitectura de 3 capas para prevención de baneos en redes de afiliados:
1. **Rust `LegalDiffer`** (gratuito, instantáneo): FNV-1a hash + keyword scoring → `gemini_priority`. Si es "SKIP", Gemini no se consulta.
2. **Antigravity** (gratuito, siempre disponible): Señales CRITICAL/HIGH/MEDIUM + detección de `significant_shrink` (texto < 85% del anterior).
3. **Gemini** (pago, solo cuando necesario): Recibe únicamente el `gemini_brief` (resumen compacto), no el texto completo. Reducción ~98% de tokens.

Schedulers: auditoría completa diaria (03:00 UTC) + check ligero cada 6h (auto-regulado por MongoDB `legal_state`).
