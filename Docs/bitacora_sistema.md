# 📓 Bitácora del Sistema — Clicks & Go

> **Qué es esto:** el registro cronológico de decisiones de ingeniería, bugs corregidos y sesiones de trabajo. El *por qué* y el *cómo* de cada cambio.
>
> **Dónde está el resto:** las reglas permanentes de arquitectura viven en [`contexto_maestro.md`](contexto_maestro.md); lo que falta por construir vive en [`redesign_plan.md`](redesign_plan.md).
>
> **Nota:** los logs de runtime (boot-ups, ciclos de scraping, scoring automático) son telemetría y viven en MongoDB — no en esta bitácora. Los primeros ciclos automáticos (mayo 2026) se resumen abajo en una sola línea.

---

## 🗂️ Índice de sesiones

| Fecha | Hito |
|---|---|
| 2026-05-07 → 05-23 | *(runtime automático temprano — resumido)* |
| 2026-05-31 | Refactor masivo a **v4.0** (arquitectura de 4 microservicios) |
| 2026-06-05 | Hardening de consistencia **v4.1** (Docs vs código) |
| 2026-06-05 | Rediseño **UI/UX consumer** + estabilización Docker |
| 2026-06-06/07 | **Rust Engine v4.3** (scorer + 4 coprocesadores Gemini) |
| 2026-06-06/07 | **Agente Legal Compliance** (monitoreo de ToS de afiliados) |
| 2026-06-06/07 | **Catálogo SQL v1.0** (seeds: 25 retailers, 40 laptops) |
| 2026-06-07 | Reestructuración **UI v2** + **NewsRadar v2** (11 feeds RSS) |
| 2026-06-09 | **Autenticación v1.0** (OAuth + magic links + legales) |
| 2026-07-03 | **Auditoría de seguridad** + optimización de costos GCP |
| 2026-07-06 | **Dashboard de usuario v1.0** + auditoría login + barrido de bugs |
| 2026-07-06 | Auditoría Zero-Trust → **refactor a Rails** + reorganización de `/Docs` |
| 2026-07-07 | **Rediseño a tema claro** (ADN NVIDIA, acento azul) |
| 2026-07-07 | **Escalado multi-producto v1** (de notebooks a catálogo digital completo) |

---

## 2026-05-07 → 05-23 · Runtime automático temprano *(resumido)*

Durante mayo, el núcleo agéntico corrió decenas de ciclos autónomos de cacería y scoring en la VM (boot-ups, pausas anti-WAF, análisis de Vertex AI). Eran **logs de runtime repetitivos** (ej. "Legion Slim 7 → Score 5.0"), sin valor histórico para ingeniería. Se movieron a telemetría (MongoDB). Hitos reales de esa ventana: se detectó y arregló el `Missing script: "test"` / `vitest: not found` que abortaba el ciclo DevOps, y se estabilizó la suite de pruebas del frontend.

---

## 2026-05-31 · Refactor masivo a v4.0 (microservicios)

- **[Ingeniería]** REFACTORIZACIÓN MASIVA A v4.0.
  - `[Limpieza]`: Se eliminó la lógica de scoring en Next.js y el acoplamiento SQL en Rust.
  - `[Infraestructura]`: Se re-generaron los 4 Dockerfiles bajo el estándar Alpine/Slim para optimizar tiempos de despliegue.
  - `[Seguridad]`: Visibilidad de archivos restaurada en el IDE para garantizar auditorías transparentes.
- **[Ingeniería]** ACTUALIZACIÓN ESTRATÉGICA DE ROADMAP (v4.0).
  - `[Documentación]`: Se reescribió `redesign_plan.md` para reflejar las Fases 1 a 4 de la nueva arquitectura.
  - `[Inteligencia]`: El `MasterOrchestratorAgent` ahora lee `redesign_plan.md` → consciencia de su propio estado de desarrollo.
- **[DevOps]** CORRECCIÓN DE ENTORNO (VS Code): fix case-sensitivity `.Vscode`→`.vscode`; `settings.json` oculta dependencias y excluye carpetas pesadas del indexador (ahorro CPU/RAM).
- **[Ingeniería]** ACTUALIZACIÓN DE SCHEMAS A v4.0: `laptop.json` refleja que `deal_score` es de Rust y SEO/UX de Python; `retailers.json` purga cronjobs de Rust y agrega `python_module_target`.

## 2026-06-05 · Hardening de consistencia v4.1 (Auditoría Docs vs Código)

- `[Cloud SQL]`: Corregido `deal_score` (escala 0-100 → 1.0-10.0), país alineado con moneda, enum `currency_type` completado (+EUR/MXN/BRL/COP/CLP), `hardware_news.country_code` agregado y catálogo + noticias multi-región (AR/US/ES/MX) sembrados. Confirmada tabla `price_histories` (plural).
- `[Rails]`: Serializer reescrito como espejo exacto de `laptop.ts` (currency, `applied_exchange_rate`, `discount_pct` calculado, `ai_score_label`, `price_trend`, `category`, `seo`). Noticias filtradas por país.
- `[Rust]`: Reparado el `ScoreResult` que impedía compilar (`cargo check` ✅), `serde(default)` en campos financieros y nueva ruta `POST /api/v1/benchmarks/run`.
- `[Python]`: Nueva capa `src/providers/` — `VertexProvider` (primario), `AntigravityProvider` (fallback) y `ProviderRouter` con failover. MercadoLibre con `site_id` LATAM correcto.
- `[Web]`: i18n completo (es/en/pt), divisas/USD desde backend, imágenes AVIF/WebP (q90-95), tags de afiliado BR/CO/CL, idioma por geolocalización.
- `[Infra]`: `docker-compose` híbrido (cloud / `docker-compose.local.yml`), `MONGO_URI`/`MONGODB_URI` unificado, credenciales Vertex montadas.
- `[DevOps_Alerta]`: ⚠️ Vertex AI devuelve HTTP 403 `dunning` por facturación del proyecto GCP `clicks-and-go` (798903122073). Operando con Antigravity hasta regularizar billing.

## 2026-06-05 · Rediseño UI/UX consumer + estabilización Docker

- `[Frontend — Imágenes]`: Reemplazado `<Image fill>` por `<img>` nativo en el slider. Causa raíz: Next.js proxea imágenes externas vía `/_next/image` (server-side) y la VM GCP no alcanzaba `images.unsplash.com` → placeholders. Con `<img>` el browser fetcha directo.
- `[UX — Copy Consumer]`: Eliminado todo lenguaje técnico/agéntico del UI público ("Auditoría Neuronal" → "Precios verificados"; "Motor Rust"/"Agente Python" → ausentes). Principio: el usuario ve una plataforma de comparación de precios, no un sistema agéntico.
- `[UX — Layout]`: Catálogo por encima de noticias. Agregadas `StatsBanner`, `WhyTrustUs`, `HowItWorks`, `CTA Banner`.
- `[CSS]`: `scroll-padding-top: 6rem` — la navbar fija ya no tapa los anclas.
- `[Bug — next.config.ts]`: Faltaba `export default nextConfig` → `output: 'standalone'` se ignoraba → Docker build fallaba en `COPY .next/standalone`.
- `[Bug — LanguageSelector]`: Eliminado `useSearchParams()` (requería Suspense). Simplificado a `usePathname` + `useRouter`.
- `[Docker — Healthcheck]`: `wget localhost:3000` resolvía a IPv6 (`::1`) pero Next.js standalone escucha en `0.0.0.0` (IPv4) → `(unhealthy)` → reinicio en loop. Fix: `127.0.0.1:3000` + `start-period` 15s.

## 2026-06-06/07 · Rust Engine v4.3 — Auditoría y optimización total

- `[hardware_scorer.rs v4.3]`: Intel Core Ultra 5/7/9 (Meteor/Arrow/Lunar Lake), Apple M4 Pro/Max/Ultra, RTX 4050 (bug silencioso: score 0.0 antes), Snapdragon X Elite/Plus, RTX 2060/2070/2080 legacy. Elite tier 2.5; 64 GB RAM → +2.5. `cpu_score()`/`gpu_score()` extraídos como `#[inline]` públicos.
- `[concurrency_router.rs]`: `process_batch()` toma ownership del `Vec` (sin `&`); `truncate()` en vez de `.to_vec()`; error logging en panics de `spawn_blocking`.
- `[hardware_canonicalizer.rs]` NUEVO (447 líneas): normalización cross-retailer CPU/GPU, `HardwareTier` enum, `build_gemini_context()`.
- `[price_sentinel.rs]` NUEVO (177 líneas): moving average + z-score (|z|>2.0 OR |pct|>20% = anomalía), flash sale heuristic, `gemini_trigger`.
- `[legal_differ.rs]` NUEVO (215 líneas): FNV-1a 64-bit hash (zero deps), `risk_score` 0–100, `gemini_priority` SKIP/NORMAL/URGENT, `gemini_brief`. Ahorra ~98% tokens.
- `[link_validator.rs]` NUEVO (212 líneas): Tokio concurrente `Arc<Semaphore>` (MAX=20), HEAD manual con redirects (máx 5 hops), timeout 12s.
- `[main.rs v4.3]`: 4 rutas nuevas, `HealthCache` (TTL 5s), HTTP client tuning, `CompressionLayer` (−70% payload), body limit 4 MB.
- `[Cargo.toml]`: `reqwest` 0.12 + `rustls-tls` + `http2` (elimina hyper 0.14/rustls 0.21 duplicados).
- `[Bug E0277 Fix]`: `MutexGuard<HealthCache>` cruzaba el `.await` del ping a MongoDB → futuro `!Send` → axum rechazaba el handler. Fix: lock suelto antes del `.await`. `cargo check` ✅.

## 2026-06-06/07 · Agente Legal Compliance ("Abogado Digital")

- `[legal_agent.py]` NUEVO (~400 líneas): `LegalComplianceAgent` con 12 URLs de ToS/privacidad (Awin, CJ, Amazon Associates, MercadoLibre, HP/Dell/Lenovo/Asus). SHA-256 hash, snapshot en MongoDB, llama a Rust `/api/v1/legal/diff` primero (si `SKIP`, omite Gemini), solo envía `gemini_brief`. Postea alertas HIGH/CRITICAL a `hardware_news`. Colecciones: `legal_snapshots`, `legal_alerts`, `legal_state`.
- `[master_orchestrator.py]`: Legal Agent como **step 0**.
- `[main.py]`: `POST /api/v1/legal/audit` (mode=full|check) + `GET /api/v1/legal/status`.
- `[antigravity_provider.py]`: `TASK_LEGAL_AUDIT` con señales CRITICAL/HIGH/MEDIUM + `significant_shrink` (<85%).
- `[scheduler-legal.yaml]` NUEVO: diario 03:00 UTC (full) + cada 6h (check, auto-regulado por MongoDB state).

## 2026-06-06/07 · Catálogo SQL v1.0 (preparación aprobación de afiliados)

- `[seeds_catalog.sql]` NUEVO (~300 líneas): 25 retailers (AR/US/ES/MX/BR) con `ON CONFLICT DO NOTHING`, 40 laptops con `ON CONFLICT DO UPDATE` (idempotente), 40 `price_histories` por moneda. `metadata_extra` JSONB (category, ai_badge, ui_accent_color, seo, condition).
- `[cloudrun-rust.yaml]`: Eliminado emoji del comentario (warning non-ASCII en YAML).

## 2026-06-07 · Reestructuración UI v2 + NewsRadar v2

- `[page.tsx]`: CTA Banner y `HowItWorks` eliminados (redundantes). Orden final: Hero → Stats → WhyTrustUs → Catálogo (`#productos`) → Mejores Ofertas (`#ofertas`) → Noticias (`#noticias`).
- `[news_radar.py v2]`: 2 → 11 feeds especializados; 3 → 6 ítems/feed; filtro por keywords (descarta off-topic); parser `lxml-xml` con fallback `html.parser`.
- `[main.py]`: `_news_radar_loop()` en lifespan — arranca 30s post-boot y repite cada 6h.
- `[Resultado]`: 3 → 96 noticias en Cloud SQL; API devuelve 20 artículos reales.

## 2026-06-09 · Autenticación v1.0 (OAuth + Magic Links + legales)

- `[Stack]`: `next-auth@5.0.0-beta.31` + `pg@8.13`. Adapter custom `ClicksAdapter()` (el oficial `@auth/pg-adapter` es incompatible por camelCase/snake_case). Providers condicionales Google/Microsoft/Facebook + Resend magic link. Sin contraseñas.
- `[DB]`: `migration_auth_v1.sql` en Cloud SQL — `last_name/phone/city` en `users`, tablas `sessions` y `verification_tokens`. Session strategy: database.
- `[UI]`: `/login`, `/register` (Server Components + inline Server Actions), `MagicLinkForm` (Client, `useActionState`), `/panel` protegido.
- `[i18n]`: Sección `auth` (30+ claves) en es/en/pt. `[Legal]`: `/privacidad` y `/terminos` (GDPR/LGPD/Ley 25.326).
- `[Pendiente — manual]`: OAuth apps reales, verificar dominio en Resend, registro AAIP, `AUTH_URL` prod.

## 2026-07-03 · Auditoría de seguridad + optimización de costos GCP

- `[SEC-crítico] Open-redirect en /out`: reincorporada la allowlist de dominios con match exacto/subdominio + revalidación tras traducción de dominio. Verificado: lenovo ✔, evil.com ✘, lenovo.com.evil.com ✘.
- `[SEC] XSS/URI injection en ticker`: `sourceUrl` de RSS externos usado como href sin validar. Nuevo `safeHttpUrl()` (solo http(s)) + `rel` correctos.
- `[SEC] Headers globales`: CSP, HSTS (2 años), X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy vía `applySecurityHeaders()`.
- `[SEC] Auth`: `trustHost: true` + doc `AUTH_URL` (anti host-header injection). `.env.example` creado.
- `[SEC] SSRF en geo_controller`: IP del lookup salía de `X-Forwarded-For` interpolado a la URL de ip-api → `@evil.com` desviaba el host. Añadido `valid_ip?` (IPAddr) + rate-limit 60/min.
- `[SEC] pg SSL`: verifica el CA de Cloud SQL si se provee (`PG_SSL_CA`/`PG_SSL_CA_CONTENT`).
- `[COSTO]`: `cpu-throttling:true` en los 4 servicios; NewsRadar opt-out (`NEWS_LOOP_ENABLED`) + `scheduler-news.yaml` → Python escala a 0; `AI_DAILY_LIMIT` configurable; guía `Infra/cloud/COSTOS.md`.

## 2026-07-06 · Dashboard de usuario v1.0 + auditoría login + barrido de bugs

- `[Auth — Auditoría]`: Sistema código-completo. Gap corregido: `/login` muestra banners para `?error=` (fallo OAuth) y `?verify=1` (magic link enviado).
- `[Dashboard /panel]`: Stats (guardados/alertas/región), favoritos con último precio (sin N+1) + crear-alerta inline, alertas con estado, perfil con país preferido.
- `[Geo global]`: `migration_user_v2.sql` — `country_code` (preferido), `detected_country` (derivado de IP, no la IP cruda — GDPR), `preferred_locale`, `last_seen_at`; índices para dashboard y para el futuro PriceAlertAgent.
- `[Bugs corregidos (barrido total)]`: **Python** — `extract_number` destruía precios LATAM ("1.000.000"→0.0), regex storage tomaba la RAM, MongoClient lazy (pipeline moría con Mongo caído). **Rails** — cache key sin `limit` (cache poisoning), slug regenerado en cada upsert (rompía permalinks/SEO). **Web** — RangeError en currency.ts, tag de afiliado por substring, `/out` por prefijo. ESLint 28 → 0 (tipo `Dict` elimina todos los `any`). Tests 5/5.
- `[FX real]`: `data_normalizer` con tasas en vivo (open.er-api.com, TTL 6h, fallback). `[Afiliados]`: disclosure FTC/RGPD en footer/cards/deals.
- ⚠️ **Nota (corregido en la sesión siguiente):** este dashboard consultaba Postgres directo desde Next.js (`pool.query`) — violación Zero-Trust. Ver abajo.

## 2026-07-06 · Auditoría Zero-Trust → refactor a Rails + reorganización de /Docs

- `[Auditoría]`: Dos hallazgos — (1) el dashboard saltaba a Postgres directo desde Next.js, violando "Rails es el único dueño de Postgres"; (2) drift: la Constitución describía una sección `#noticias` con `HardwareNewsSlider` que ya no existe (las noticias son un ticker inline `NewsTicker` en `HeroSection`; el slider quedó como código muerto).
- `[Rails — nuevos dueños de datos de usuario]`: Modelos `User`, `UserFavorite` (PK compuesta, Rails 7.1), `PriceAlert`. Controllers Users/Favorites/PriceAlerts bajo `scope "users/:user_id"`.
- `[SEC] IDOR cerrado con InternalApiAuth`: Rails corre con `ingress: all` → sin protección, cualquiera llamaría `/api/v1/users/:user_id/favorites` con un UUID ajeno. Nuevo concern exige header `X-Internal-Key` (comparación en tiempo constante). Documentado en `.env.example`, `RUNBOOK_DEPLOY.md`, manifests.
- `[Web — reescritura]`: Nuevo `src/lib/railsApi.ts` (`server-only`). `page.tsx`/`panel/page.tsx` sin una línea de `pool.query` — todo por Rails. Único acceso directo a Postgres restante: el adapter de NextAuth (inevitable).
- `[No verificado]`: `bundle install` no completó en el sandbox (sin red a rubygems) — boot real de Rails pendiente pre-deploy. Sintaxis validada con `ruby -c`.
- `[Docs]`: `contexto_maestro.md` reescrito a estado-actual con el drift corregido; `redesign_plan.md` recortado a roadmap; bitácora reordenada.
- `[Verificación]`: tsc ✅, ESLint 0 ✅, vitest 5/5 ✅, `ruby -c` ✅.

## 2026-07-07 · Rediseño a tema claro (ADN NVIDIA, sin su verde)

- Extracción del diseño de nvidia.com (DOM real): tipografía tipo NVIDIA-NALA → **Barlow** (pesos 300–700, titulares bold sentence-case), esquinas nítidas (radios 0–4px), transiciones ~0.2s ease-out, nav blanco y aireado. **Se ignoró el verde corporativo** — acento azul (#2563eb).
- `globals.css` reescrito a "Light Design System v5.0" (superficie blanca, tinta #0a0e14, acento azul, timing NVIDIA). `ThemeProvider` dark→light. Toda la web convertida a claro (home, navbar, hero, cards, catálogo, ofertas, footer, login/register/panel/perfil, legales, detalle). Motivo de producto: un fondo oscuro dificulta atraer afiliados.
- Verificado en vivo (home con datos), `next build` ✅, tsc/eslint/vitest ✅.

## 2026-07-07 · Escalado multi-producto v1 (de notebooks a catálogo digital completo)

- **Decisión de producto**: taxonomía de 2 niveles. Familia → `product_type`. Computación (laptop·desktop·monitor), Periféricos (keyboard·mouse·headphones·webcam), Impresión (printer·supplies). Objetivo: cubrir la mayor cantidad de productos de los retailers.
- `[DB]` `migration_products_v3.sql` — ADITIVA y retrocompatible: `laptops.product_type VARCHAR(30) DEFAULT 'laptop'` + `laptops.specs JSONB` + índices (`(product_type,country_code)` y GIN). Nada se rompe; la tabla sigue siendo `laptops` (FKs intactas) pero es ya el catálogo de productos.
- `[Rails]` serializer emite `product_type` + `specs` uniformes (laptops derivan de columnas dedicadas; el resto del JSONB). `index` acepta `?type=`; nuevo endpoint `/api/v1/products` (`notebooks` queda como alias). Modelo con scope `por_tipo`; `PersistenceOrchestrator` persiste tipo/specs. Todo con `has_attribute?`/`column_names` para degradar sin la migración. `ruby -c` ✅.
- `[Rust]` `calculate_generic_score(discount_pct, rating, reviews)` para productos sin CPU/GPU. `HardwareSpecs` suma `product_type`/`rating`/`reviews`; `ConcurrencyRouter` despacha: laptop/desktop → hardware, resto → genérico. La matemática sigue **100% en Rust**. Pendiente: `cargo check` real.
- `[Python]` `data_normalizer` pasa `product_type`/`specs` (passthrough). `master_orchestrator` incluye tipo + señales de reputación en el payload a Rust. `py_compile` ✅.
- `[Web]` `types/product.ts` = fuente única de la taxonomía (tipos, familias, `SPEC_SCHEMA`, `formatSpec`). DTO `Laptop` extendido con `product_type`/`specs` (+ alias `Product`). `CatalogSection` filtra por tipo con chips dinámicos. `LaptopCard` **y la página de detalle `[slug]`** renderizan specs por tipo + badge de categoría (la impresora muestra Tecnología/ppm/WiFi, no "RAM 0GB"). i18n `categories`/`specs`/`typeTagline` en es/en/pt.
- `[Verificación en vivo]`: mock de Rails con 16 productos (9 tipos) → home + detalle renderizan los 9 tipos con sus chips y specs (165Hz, 8000 DPI, ANC, switch, IPS, ppm). `next build` ✅, tsc 0, ESLint 0, vitest 5/5. `/es`, `/es/login`, `/es?cat=printer`, detalles no-laptop → 200.
- `[Pendiente]`: correr `migration_products_v3.sql` en Cloud SQL; `cargo check` de Rust; sembrar catálogo real multi-producto; afinar specs/scoring por tipo con datos reales.
