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
| 2026-07-10 | Docs reorganizados (legibilidad) · commit+push · **PriceAlertAgent v1** (re-engagement) |
| 2026-07-10 | Seed multi-producto · **Integridad DB v5** · scoring por tipo · buscador generalizado |
| 2026-07-14 | **DEPLOY A PRODUCCIÓN** 🚀 — multiproducto EN VIVO en Cloud Run (migraciones + imágenes + schedulers) |
| 2026-07-17 | Crisis de billing · **OAuth en vivo** · recorte de costos 3x (LB, minScale, Cloud SQL) |
| 2026-07-19 | **Los agentes toman el control** 🛡️ — vigilancia legal autónoma con alertas por email + 2 bugs reales |
| 2026-07-21 | **SEO indexable** 🔍 — `robots.txt`/`sitemap.xml` reales en la raíz (fix del redirect i18n que los mataba) |
| 2026-07-23 | **Dominio propio EN VIVO** 🌐 — `clicks-and-go.com` + email routing + parches pre-afiliación |
| 2026-07-24 | **Alta en redes de afiliados** 🤝 — Awin + CJ (HP/Dell/ASUS) + Impact (Lenovo) · limpieza de tags falsos ML |
| 2026-07-26 | **Overhaul UI/UX consumer v2** 🎨 — patrones NVIDIA/ML aplicados + capa promocional agéntica visible + personalización conductual |

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

## 2026-07-10 · Reorganización de /Docs + commit/push + PriceAlertAgent v1

- `[Docs — legibilidad]`: la bitácora tenía ~133 líneas de logs automáticos de runtime (boot-ups, "pausa táctica 5s", "Score 5.0" repetido) que ahogaban las entradas de ingeniería → resumidas a un bloque, entradas reordenadas cronológicamente y agrupadas por sesión con índice. Nuevo `Docs/README.md` (puerta de entrada). `contexto_maestro` con **mapa rápido** de un vistazo; `redesign_plan` con **backlog priorizado** arriba (🔴 lanzar · 🟠 agéntico · 🟡 hardening · 🟢 producto).
- `[Git]`: commit único de 58 archivos (multi-producto + rediseño claro + backend Zero-Trust + docs) → `b495a0c`, push a `main`. El token del Codespace "blank" no tenía escritura sobre ClicksAndGo; se pusheó con credencial provista por el titular (a revocar).
- `[PriceAlertAgent v1 — re-engagement]`: el corazón agéntico de traer al usuario de vuelta.
  - `[DB]` `migration_alerts_v4.sql` — `price_alerts.notified_at` (evita renotificar) + índice parcial de pendientes. Aditiva.
  - `[Rails]` `AlertDispatchController` (InternalApiAuth): `GET /api/v1/price_alerts/pending` (alertas activas con precio≤objetivo, no notificadas, + email y datos del producto) y `POST /api/v1/price_alerts/mark_notified`. Rails resuelve la comparación (dueño de la DB). `ruby -c` ✅.
  - `[Python]` `PriceAlertAgent` — paso 9 del `MasterOrchestrator` (tras persistir precios): consulta pendientes, envía email "bajó de precio" vía Resend (`AUTH_RESEND_KEY`/`AUTH_FROM_EMAIL`), marca notificadas. Zero-Trust (no toca Postgres). Sin API key: detecta pero no envía (deja pendiente). Nueva env `PUBLIC_WEB_URL` para el link del email.
  - `[Verificación]`: test de comportamiento con `requests` simulado — caso sin key (guard: no envía/no marca) y caso con key (2 emails con subject/precio/link correctos + marcado de ids). `py_compile` ✅.
  - `[Pendiente]`: correr `migration_alerts_v4.sql` en Cloud SQL; configurar Resend; re-armado de alerta si el precio vuelve a subir.
- **[2026-07-10]** `[Datos]`: SEED MULTI-PRODUCTO v1.
  - `[seeds_products_multi.sql]` NUEVO: 4 retailers de marketplace/periféricos (Amazon US/ES, Best Buy US, MercadoLibre MX) + 22 productos de 8 tipos (monitor·keyboard·mouse·headphones·webcam·printer·desktop·supplies) en US/ES/MX, con `product_type` + `specs` JSONB y su `price_histories`. Idempotente (`ON CONFLICT`).
  - `[Verificación real]`: levantado Postgres 16 en Docker → aplicados esquema + las 4 migraciones + ambos seeds con `ON_ERROR_STOP=1` (todo exit 0). Confirmado: 62 productos totales (40 laptops + 22 nuevos), 62 price_histories, specs por tipo correctas, y la query del serializer (join + `specs->>'...'`) y el filtro `?type=` devuelven bien. La fuente definitiva del catálogo sigue siendo la ingesta agéntica; este seed es para demo/QA.

## 2026-07-10 · Integridad DB + scoring por tipo + buscador generalizado

- `[Integridad DB — auditoría real]`: levantado Postgres 16 (Docker), cargado todo y corrida una batería de diagnósticos. **Datos limpios** (0 huérfanos, 0 scores fuera de rango, 0 tipos inválidos, 0 precios negativos, 0 alertas duplicadas), pero **faltaban guardas de esquema**: FKs sin índice (`accounts.user_id`, `user_favorites.laptop_id`), `price_alerts.user_id/laptop_id` nullable, cero CHECKs, `product_type` sin integridad referencial.
  - `[migration_integrity_v5.sql]` NUEVO (idempotente): índices en esas FKs; `price_alerts` FKs → NOT NULL; CHECKs (`deal_score` ∈ [1,10], `precio_actual`≥0, `target_price`>0); índice único de una alerta activa por (user, laptop); y **normalización de la taxonomía** con tabla lookup `product_categories` (code PK, family, label) + FK desde `laptops.product_type` — integridad referencial sin perder flexibilidad (sumar tipo = INSERT). Verificado que **rechaza** datos malos (product_type='banana' → FK, deal_score=99 → CHECK, target=0 → CHECK), que es idempotente y que ya **ninguna FK queda sin índice**.
- `[Scoring por tipo — Rust]`: nueva `type_spec_bonus(product_type, specs)` (0–1.5) que suma calidad por señales propias de cada tipo leídas del JSONB: monitor→refresh_hz/4K/panel, teclado→mecánico/wireless/backlit, mouse→dpi/wireless, auriculares→ANC/wireless, webcam→4K/fps, impresora→wifi/color/ppm, insumos→rendimiento. `HardwareSpecs` suma el campo `specs`; el `ConcurrencyRouter` lo agrega al scorer genérico. `master_orchestrator` envía `specs` a Rust. La matemática sigue 100% en Rust. Pendiente: `cargo check` (sin red a crates.io).
- `[Buscador predictivo — Web]`: sugería categorías de laptop (gaming/business) que ya **no filtraban** (el catálogo filtra por `product_type`). Generalizado: sugiere los 9 tipos con ícono + tagline localizado, navega todas al enfocar sin texto, y dispara `catalog:filter` con el `product_type`. Placeholder i18n cambiado a genérico ("¿Qué producto estás buscando?"). `SearchSuggestion` (laptop) reemplazado por `TypeSuggestion` derivado de la taxonomía.
- `[Verificación]`: Postgres real (migración aplica/rechaza/idempotente) ✅ · `tsc` 0 · ESLint 0 · `next build` ✅ · vitest 5/5 ✅ · `py_compile` ✅ · `ruby -c` (sin cambios Ruby esta vez). Rust queda para `cargo check` pre-deploy.

## 2026-07-14 · 🚀 DEPLOY A PRODUCCIÓN — multiproducto EN VIVO en Cloud Run

- `[Contexto]`: se descubrió que la infra GCP **ya estaba desplegada** (4 servicios Cloud Run activos, Cloud SQL `clicks-db` RUNNABLE, Artifact Registry, `clicks-sa` con IAM correcto) — la sesión fue una **actualización en caliente**, no un deploy desde cero. gcloud ya estaba autenticado en el entorno (cuenta del titular).
- `[Validación previa en Docker]` (antes de tocar prod): build real de las 4 imágenes `linux/amd64` (valida `cargo build` y `bundle install`, los 2 bloqueantes históricos del sandbox) + smoke-tests de boot + cadena completa Web→Rails→Postgres local sirviendo el catálogo multiproducto.
  - `[Bug de producción detectado y corregido]`: el boot de Rust **bloqueaba >30s** si MongoDB estaba caído (default del driver) — superaba el `startupProbe` de Cloud Run (~20s) → riesgo de crash-loop en cold-start. Fix en `main.rs`: `server_selection_timeout`/`connect_timeout` = 2s (espeja `serverSelectionTimeoutMS=2000` de Python). Boot verificado: >30s → **~4s**.
- `[DB de producción]`: inspección solo-lectura primero → solo `auth_v1` estaba aplicada; pre-chequeos de `integrity_v5` sobre datos vivos = **0 violaciones**. Backup on-demand → migraciones `user_v2`→`products_v3`→`alerts_v4`→`integrity_v5` + `seeds_products_multi` con `ON_ERROR_STOP`. Resultado: **70 productos en 9 tipos**, 0 tipos inválidos, 0 sin precio.
  - `[Fix de seed]`: prod tiene `uq_retailer_name_country` (de `cloud_fix.sql`) y Best Buy ya existía como slug `best_buy_us` → el seed (que usaba `bestbuy_us`) chocaba. Alineado el slug + `ON CONFLICT DO NOTHING` catch-all en el INSERT de retailers. La DB local no tenía esa constraint — por eso el test local no lo detectó.
  - `[Password Cloud SQL]`: el password dentro de `DATABASE_URL` está **URL-encoded** — hay que decodificarlo (`urllib.parse.unquote`) antes de usarlo con psql/PGPASSWORD.
- `[Secretos]`: creado `INTERNAL_API_KEY` (64 hex; `clicks-sa` ya tenía `secretAccessor` a nivel proyecto). `AUTH_RESEND_KEY` **comentado** en los manifests de web/python hasta que exista la cuenta Resend (referenciar un secreto inexistente hace fallar el deploy; el código maneja su ausencia con gracia).
- `[Deploy]`: push de las 4 imágenes a Artifact Registry (`:54654ad` + `:latest`) → `gcloud run services replace` rust→rails→python→web. Revisiones nuevas Ready. Verificado público: Rust `/health` ok (mongo:true), Rails `/up` 200 + catálogo con los 9 tipos, home `/es` renderizando Impresoras/Monitores/Teclados/Auriculares.
- `[Schedulers]`: creados `full-cycle-daily` (04:00 UTC — **el pipeline comercial no tenía disparador**: nunca corría solo), `legal-audit-daily` (03:00) y `legal-audit-6h`. Ya existía `news-radar-6h`. Disparo manual de `full-cycle` validó el cableado end-to-end (LegalAgent auditando ToS; los WARNINGs de fetch a Awin/CJ son anti-bot esperado).
- `[URLs Cloud Run]`: ambas formas (`clicks-*-798903122073.us-central1.run.app` determinística y `clicks-*-2myrvivvhq-uc.a.run.app` legacy) **funcionan** — un timeout inicial desde el codespace fue un falso positivo de red.
- `[Estado final]`: sistema multiproducto EN VIVO. Bloqueantes de negocio restantes: registro en redes de afiliados (manual del titular), cuenta Resend + descomentar `AUTH_RESEND_KEY`, OAuth providers, dominio propio + `AUTH_URL`, billing Vertex (opera con Antigravity).

## 2026-07-17 · 🔥 Crisis de billing + OAuth en vivo + recorte de costos 3x

- `[Billing]`: el proyecto se suspendió por falta de pago → los 4 servicios caídos. Tras el pago, `My Billing Account` volvió a OPEN pero **Cloud Run seguía devolviendo 429** ("no available instance") por horas. Diagnóstico: NO era billing (proyecto ACTIVE, API habilitada, cuota 100 instancias/200k CPU, revisión Ready, tráfico 100% a latest). Los logs mostraban que el contenedor **arrancaba sano** en el rollout (`Containers became healthy in 5.04s`) y luego el cold-start por request fallaba. Mitigado con `minScale=1`; **verificado el mismo día que el cold-start se recuperó solo** (`Starting new instance. Reason: AUTOSCALING` + HTTP 200 tras >15 min ocioso) → vuelto a `minScale=0`. Lección: tras restaurar billing, el scale-from-zero tarda en propagarse; no es daño permanente.
- `[OAuth v1 EN VIVO]`: 6 secretos (Google/Microsoft/Facebook) en Secret Manager + bloque activado en `cloudrun-web.yaml`. Verificado con el flujo CSRF real: los 3 redirigen a `accounts.google.com` / `www.facebook.com` / `login.microsoftonline.com`.
  - `[Trampa]`: un GET a `/api/auth/signin/{provider}` devuelve `UnknownAction` → NextAuth v5 exige **POST con csrfToken**. No confundir con un error de configuración.
  - `[Fix]` `AUTH_URL` apuntaba a `clicks-web-798903122073...` pero el tráfico se sirve por `clicks-web-2myrvivvhq-uc...`. Los redirect URIs de OAuth se registran contra esa base → con la URL vieja el login fallaba. Mismo fix en `PUBLIC_WEB_URL` (los emails del PriceAlertAgent llevaban a un link muerto).
- `[Costos — presupuesto $25/mes vs gasto real ~$75-95]`:
  - `[LB eliminado]` (~$20/mes): `clicks-http-fw` + proxy + url-map + backend + NEG + IP estática. Era **HTTP puro, sin dominio ni SSL**, duplicando lo que ya sirve Cloud Run. Recrear solo cuando haya dominio (ahí aporta SSL gestionado + CDN).
  - `[minScale 1→0]` (~$30-50/mes) tras verificar la recuperación del cold-start.
  - `[Cloud SQL 100GB SSD → 10GB HDD]` (~$16/mes): la base real pesa **9.2 MB** sobre 100 GB provisionados con `storageAutoResize=true` (solo crece). **Los discos de Cloud SQL no se achican** → export a GCS → instancia nueva `clicks-db2` → import → verificación → switch → borrado de la vieja. Migración con red: dump verificado ANTES de borrar, instancia nueva con nombre distinto (nunca hubo ventana sin base), y `deletion-protection` re-activada en la nueva. Verificado post-switch: 70 productos/9 tipos, 32 retailers, 71 precios, FK + 3 CHECKs intactos, 0 inconsistencias, OAuth y home OK.
  - `[Trampas]`: Postgres 18 asume edición `ENTERPRISE_PLUS` (rechaza `db-f1-micro`) → hay que pasar `--edition=ENTERPRISE`. El password del `DATABASE_URL` está **URL-encoded** (decodificar con `unquote`). La instancia tenía `deletion-protection` (desactivar antes de borrar).
- `[Estado]`: gasto proyectado ~$9-12/mes (vs ~$75-95) — **dentro del presupuesto**. Bloqueante de negocio: registrar redirect URIs en las 3 consolas + alta en redes de afiliados.

## 2026-07-19 · 🛡️ Los agentes toman el control — revisión pre-afiliaciones + circuito de vigilancia cerrado

- `[Contexto]`: revisión completa del sistema antes del alta en redes de afiliados, con foco en que la vigilancia de políticas/ToS quede **autónoma y con alertas que lleguen al titular** (no solo a MongoDB).
- `[Relevamiento]`: LegalComplianceAgent (fuentes HIGH/NORMAL, hash SHA-256 + LegalDiffer Rust + Gemini/Antigravity, alertas a MongoDB `legal_alerts` + ticker del frontend); MarketHunter con 3 adaptadores (MercadoLibre API oficial, Awin: 3 keys, CJ: 2 keys — **no hay adaptador Amazon PAAPI aún**); sitio público OK para las redes (disclosure en footer + nota junto a cada botón, `/es/privacidad` y `/es/terminos` en 200, `/out` con allowlist anti open-redirect); schedulers `legal-audit-daily` (03:00 UTC) y `legal-audit-6h` ENABLED.
- `[Bug 1 — ceguera legal silenciosa]`: un fetch fallido devolvía `severity NONE` — si una fuente quedaba inaccesible para siempre (anti-bot, URL muerta), el monitoreo de ese contrato quedaba ciego sin que nadie se enterara. **Fix**: contador de fallos consecutivos en Mongo (`legal_state.fetch_fail:*`); a los 3 ciclos en fuente HIGH → log CRITICAL "CEGUERA LEGAL" + alerta HIGH al frontend; el fetch exitoso resetea; `run_audit` cuenta fetch_failed como `errors` (antes inflaba `none`). Verificado con test de comportamiento (4/4) en la imagen Docker.
- `[Bug 2 — Rust diff roto en Cloud Run]`: `RUST_API_URL` en Cloud Run incluye el path `/api/v1/score/batch`, y el agente concatenaba `/api/v1/legal/diff` encima → ruta 404 → **todos** los diffs legales caían a Antigravity sin el pre-análisis barato de Rust (~98% de ahorro de tokens perdido). **Fix**: `split("/api/")[0]` para quedarse con la base en ambos formatos (docker y Cloud Run). Verificado con los 3 formatos de URL.
- `[Higiene de fuentes]` (health-check completo de URLs): PSA de CJ **dejó de ser público** (404 real, solo visible dentro de la cuenta publisher → fuente eliminada con nota; revisar manualmente al firmar); MercadoLibre migró a `developers.mercadolibre.com` (sin `.ar`); Asus movió su programa a `/us/site/affiliate-program/`; Lenovo mató su landing → hub legal; HP bloquea la landing del programa → términos generales. Awin/Amazon/HP **bloquean IPs de datacenter** desde Cloud Run (404/reset intermitentes) — es exactamente el caso que la alerta de ceguera cubre.
- `[Circuito de alertas → email]`: canal Cloud Monitoring (email al titular) + política de alerta sobre logs `- [CRITICAL]` de cualquier servicio Cloud Run (rate-limit 1/h, auto-close 24h). Cubre: cambio de ToS con riesgo de ban, ceguera legal, y cualquier CRITICAL de otros agentes. **Sin depender de Resend ni de mirar MongoDB.**
- `[Lección Cloud Run]`: `gcloud run services update --update-labels` **no re-resuelve** `:latest` (la revisión nueva hereda el digest clavado). Deploy correcto: `--image ...@sha256:DIGEST` explícito. Ojo además: Artifact Registry lista el digest del manifest-list; Cloud Run pinnea el hijo amd64 (comparar digests distintos no siempre significa código distinto).
- `[Validación]`: auditoría full disparada en prod post-deploy — el agente registra fallos de fetch como errores, fuentes reparadas responden, y el circuito completo (agente → log CRITICAL → Cloud Monitoring → email) queda armado.

## 2026-07-21 · 🔍 SEO indexable — robots.txt y sitemap.xml reales (rumbo a "aparecer en Google")

- `[Contexto]`: preparando el alta de dominio + Search Console. El titular preguntó cómo lograr operación 24/7, deploys sin caídas y qué rol cumple Cloud Run (respondido: revisiones = cero-downtime por diseño; `minScale=0` = barato con cold-start ~2-4s vs `minScale=1` siempre caliente; el dominio se conecta vía mapping/Cloudflare + auto-TLS y luego hay que mover `AUTH_URL` + los 3 redirect URIs de OAuth). Aclaración honesta: **aparecer en Google NO es requisito para aprobar afiliaciones** — alcanza con la URL pública funcionando, que ya existe.
- `[Bug SEO real detectado]`: `/robots.txt` y `/sitemap.xml` **no existían y encima el middleware i18n los redirigía** (307 → `/es/robots.txt` → 404). El matcher `/((?!api|_next/static|...).*)` no los excluía, así que el crawler de Google pedía `/robots.txt`, comía un redirect de idioma y terminaba en 404. Un sitio sin robots/sitemap accesibles se indexa mal.
- `[Fix]`:
  - `Web/src/app/robots.ts` (metadata route de Next 16): sirve `/robots.txt` real en la raíz. `Allow: /`, `Disallow` de `/api/`, `/out` y las áreas privadas (`login`/`register`/`panel` en los 3 idiomas), + directivas `Host` y `Sitemap`.
  - `Web/src/app/sitemap.ts`: sirve `/sitemap.xml` con 9 URLs (home + privacidad + términos × es/en/pt) y **alternates hreflang** correctos por página, prioridades (home 1.0, legales 0.5; -0.1 para traducciones).
  - Ambos leen la base de `NEXT_PUBLIC_SITE_URL || AUTH_URL || <URL Cloud Run>` — así, cuando migremos al dominio propio y actualicemos `AUTH_URL`, robots/sitemap apuntan solos al dominio nuevo **sin tocar código**.
  - `Web/src/middleware.ts`: agregado `robots.txt|sitemap.xml` al negative-lookahead del matcher para que el redirect de idioma **nunca** los toque.
- `[Verificación]`: `tsc` 0 · `next build` OK (ambas rutas emitidas como `○ /robots.txt` y `○ /sitemap.xml` estáticas). Deploy a Cloud Run con digest explícito (`sha256:e733503a…`) → revisión `clicks-web-00013-k6l` sirviendo 100%. En vivo: `/robots.txt` **HTTP 200 text/plain 0 redirects**, `/sitemap.xml` **HTTP 200 application/xml 0 redirects**, home `/es` 200, providers de OAuth (Google/Microsoft) intactos. Revisiones 00013/00012/00011 todas `Ready=True` → **cero-downtime confirmado en la práctica** (la vieja sirvió hasta que la nueva pasó el health check).
- `[Pendiente de dominio]`: registrar dominio → conectar (Cloudflare recomendado: DNS + CDN/caché + DDoS gratis, recupera la capa que quitamos con el LB) → auto-TLS → mover `AUTH_URL` + 3 redirect URIs OAuth al dominio → alta en Google Search Console + subir sitemap. Google tarda días/semanas en indexar (no bloquea afiliaciones).

## 2026-07-23 · 🌐 Dominio propio EN VIVO + parches finales pre-afiliación

- `[Dominio]`: `clicks-and-go.com` registrado (Cloudflare Registrar) y conectado a Cloud Run vía **domain mapping** de Google (no vía proxy de Cloudflare — se abandonó el enfoque de Origin Rule por fricción de UI en el plan Free). Requirió verificar el dominio ante Google (Search Console, autorización de un solo uso vía integración Google↔Cloudflare) antes de poder mapearlo. Certificados de Google Trust Services emitidos y verificados para apex y `www`.
- `[Bug de arranque]`: el primer intento de usar redirects **relativos** en el middleware (para no filtrar la URL interna `*.run.app` al navegador) rompió el `startupProbe` — el runtime de Next hace `new URL()` sin base y un `Location` relativo revienta con `Invalid URL`. Fix real: redirects **absolutos** contra una base pública (`NEXT_PUBLIC_SITE_URL`) bakeada en build-time (Dockerfile `ARG`/`ENV`), con fallback al origin de la request. Verificado: el bundle del edge runtime tiene el dominio inlined; probe pasa; redirect de `/` apunta a `clicks-and-go.com` y no a la URL interna.
- `[Fix menor]`: la raíz devolvía doble redirect (`/` → `/en/` con barra → 308 a `/en`). Se corrigió para ir directo a `/en` en un solo salto.
- `[AUTH_URL / PUBLIC_WEB_URL]`: actualizados de la URL de `run.app` al dominio propio en ambos manifiestos + servicios en vivo. Login Google/Microsoft verificado end-to-end en el dominio nuevo (Facebook queda pendiente — el titular no cargó su redirect URI aún, decisión propia).
- `[Email del sitio]`: renombrado `info@clicksandgo.com` → `info@clicks-and-go.com` en footer + privacidad + términos (3 idiomas) + `auth.ts`. Encontrado y corregido un resto: `AUTH_FROM_EMAIL` (remitente de magic-links/alertas de precio) seguía en `noreply@clicksandgo.com` **como env var en vivo** en `clicks-web` y `clicks-python` (dominio inexistente) — no rompía nada porque Resend aún no está conectado, pero se corrigió antes de que importara. Fallbacks de `os.getenv` en `price_alert_agent.py` alineados también.
- `[Email Routing]`: activado Cloudflare Email Routing (`info@clicks-and-go.com` → Gmail del titular). MX (3 registros `route{1,2,3}.mx.cloudflare.net`) y SPF verificados en vivo por DNS-over-HTTPS. Un email de prueba sin autenticar fue rechazado por Cloudflare (`5.7.26 Cannot forward emails that are not authenticated`) — **confirma que el routing está activo y filtrando spam correctamente**, no que esté roto; falta que el titular mande un email real desde su Gmail para confirmar la entrega end-to-end.
- `[Falsa alarma de "ban"]`: el titular recibió un email de Cloud Monitoring con `[CRITICAL]` y lo interpretó como riesgo de ban de cuenta. Diagnóstico: es el propio `LegalComplianceAgent` (bug fix del 2026-07-19) reportando que `amazon_associates_operating_agreement` lleva 9+ ciclos con `ConnectionResetError` — Amazon bloqueando la IP de datacenter de Cloud Run (mismo patrón que Awin/CJ/HP). **No es riesgo de cuenta ni de billing**; no bloquea ninguna afiliación.
  - `[Bug real encontrado]`: la condición de alerta (`fails >= 3`) no tenía techo — repetía el CRITICAL **todos los días** desde el ciclo 3 en adelante, sin aportar información nueva (Cloud Monitoring auto-cierra a 24h y reabre incidente al día siguiente). Fix: alertar en el cruce del umbral (`fails == 3`) y después cada 7 ciclos (~semanal) en vez de a diario. Mantiene la seguridad de no volver a caer en ceguera silenciosa, sin el ruido diario.
- `[Estado]`: sitio 100% operativo en `https://clicks-and-go.com` (HTTPS válido, OAuth, legales, SEO, email) — **listo para aplicar a redes de afiliados**. Pendiente del titular: registrarse en Amazon Associates / Awin / MercadoLibre Afiliados y pasar las credenciales para cablear los adaptadores ya construidos.

## 2026-07-23 (cont.) · 🛡️ Amazon España en vivo + blindaje de catálogo digital

- `[Amazon Associates — cableado real]`: completado el alta de Amazon US (`clicksandgo-20`, W-8BEN validado con 0% de retención — servicios prestados 100% fuera de EE.UU.) y Amazon España (`clicksandgo-21`). Método de cobro para ambos: cuenta bancaria de EE.UU. vía AirTM (Lead Bank, ACH, mismo titular que el W-8BEN). `middleware.ts` actualizado con los 2 tags reales, reemplazando placeholders (`clickgo08-20`, `clicksandgo-es-21`) — de paso corregido un mal etiquetado de `network` heredado (`CJ`/`AWIN` en entradas que en realidad son Amazon directo → `AMAZON`, sin impacto funcional pero sí de claridad).
- `[Pendiente del titular]`: Italia/Alemania/Reino Unido/Francia registrados vía el flujo "un clic, mismos datos" de Amazon EU, pero **no se mostraron los IDs de afiliado asignados** — no se cablean a ciegas. Instrucción dada: revisar "Enlazar IDs de tienda" en el panel o entrar directo a cada `afiliados.amazon.{it,de,co.uk,fr}` con la misma sesión.
- `[Bug real encontrado y corregido — blindaje del catálogo digital]`: ninguno de los 3 adaptadores de `market_hunter.py` (MercadoLibre, Awin, CJ) asignaba `product_type` — y `data_normalizer.py` defaulteaba a `"laptop"` cualquier cosa sin ese campo. Hoy sin riesgo real (las búsquedas están hardcodeadas a laptops), pero es una bomba de tiempo: el día que Awin traiga un feed con categorías mixtas (ropa, hogar, lo que sea del mismo merchant), se habría insertado igual, mal etiquetado como laptop.
  - **Fix**: nuevo `classify_digital_product()` centralizado en `market_hunter.py` — allowlist de las 9 categorías reales (`product_categories.code`: laptop/desktop/monitor/keyboard/mouse/headphones/webcam/printer/supplies) + denylist explícito (ropa, calzado, moda, joyería, muebles, etc.) que **gana siempre**, incluso si el término de búsqueda coincide. `data_normalizer.normalize_laptop_data()` ahora devuelve `None` (se descarta) si el `product_type` no matchea el catálogo real — ya no hay default silencioso a `"laptop"`.
  - **Bonus sin costo**: Awin descarga el feed completo del merchant igual; antes solo dejaba pasar items con `category_name` conteniendo "laptop"/"notebook" — ahora usa el clasificador completo, así que **monitores/teclados/impresoras/etc. del mismo feed ya no se descartan** sin necesidad de nuevas llamadas a la API.
  - **Bug propio detectado en la propia verificación**: la primera versión del clasificador rechazaba productos reales cuyo título no repite la palabra "laptop" (ej. "Lenovo IdeaPad 3 15.6 pulgadas" — así vienen los títulos reales, marca+modelo, no genéricos). Fix: MercadoLibre y CJ pasan el término de su propia búsqueda (`category_hint="laptop"` / `"laptop notebook"`) para que el clasificador tenga contexto — el denylist se mantiene por encima de esa pista, así que un resultado desalineado del buscador se sigue rechazando igual.
  - **Verificado**: 15/15 tests de comportamiento (ropa rechazada aunque la búsqueda fuera "laptop", productos reales de las 9 categorías clasifican correctamente, `normalize_laptop_data` sin `product_type` → `None`, con `product_type` válido → dict). Desplegado en `clicks-python` (revisión `00015-zfk`) y verificado sin regresión en `clicks-web` (revisión `00019-tkp`): tags ES/US inyectándose correctamente en `/out`, login intacto.

## 2026-07-23 (cont.) · 🇮🇹 Cuarto idioma — Italiano en vivo (dominio + legales completos)

- `[Contexto]`: al aplicar a Amazon Associates Italia (`clicksandgo08-21` confirmado), el titular pidió que el sitio soporte italiano de forma nativa — no tenía sentido monetizar tráfico IT sin poder mostrarles el sitio en su idioma.
- `[Alcance real tocado]` (no fue un simple diccionario más — el sistema tenía el idioma hardcodeado en 7 puntos distintos):
  - `dictionaries/it.json` (nuevo, 298 líneas, misma estructura que es/en/pt).
  - `middleware.ts`: `locales`, `SUPPORTED_COUNTRIES`, `GEO_CURRENCY_MAP` (IT→EUR), `COUNTRY_LOCALE_MAP` (IT→it), `AFFILIATE_TAGS` (IT: tag real + `amazon.it`), `ALLOWED_OUT_DOMAINS`.
  - **Refactor**: la traducción de dominio de Amazon (`amazon.com`→`amazon.es`) estaba **hardcodeada solo para España** (`if countryCode === 'ES'`). Generalizada para leer `config.domain` de cualquier país — un país Amazon nuevo ya no requiere tocar esta lógica, solo agregar su entrada en `AFFILIATE_TAGS`. De paso, la condición de inyección de tag pasó de `network !== 'MERCADOLIBRE'` a `network === 'AMAZON'` (más explícita, sin cambiar comportamiento).
  - `layout.tsx`, `sitemap.ts`, `robots.ts`, `LanguageSelector.tsx`: agregado el 4º idioma en cada punto de selección/generación.
  - `privacidad/page.tsx` y `terminos/page.tsx`: traducción completa de las 14 secciones de cada legal al italiano (alcance mundial, mismo criterio que es/en/pt — GDPR, no domicilio único).
- `[Verificado en vivo]`: `/it` 200 (título traducido), `/it/privacidad` y `/it/terminos` 200, tag `clicksandgo08-21` inyectándose en `/out` para `amazon.it`, sitemap con 12 entradas `hreflang="it"`, robots.txt con `/it/login|register|panel` en disallow. Sin regresión en ES/EN/login. Desplegado en `clicks-web` revisión `00020-6gr`.

## 2026-07-24 · 🤝 Awin + CJ Affiliate dados de alta, MercadoLibre AR bloqueado por régimen fiscal

- `[Awin]`: alta completa como publisher — Publisher ID **3001457**, perfil al 100% (foto, descripción, regiones ES/IT/US), tipo de sitio "Comparison Engine" (principal) + "Editorial Content". Búsqueda de Lenovo/HP en el directorio de Awin sin resultados relevantes para ES/IT — HP no tiene programa público visible ahí para esos mercados (footer de `hp.com/es-es` solo linkea "HP Amplify", que es canal B2B de revendedores, no afiliación de contenido).
- `[CJ Affiliate]`: alta completa — Publisher ID **7704909**, Site ID de "Clicks & Go" **101840044**. W-8BEN cargado (Persona/Individual, sin SSN/ITIN, CUIT como foreign TIN, Parte II omitida — Argentina no tiene tratado con EE.UU., mismo criterio que Amazon). Cobro configurado con la misma cuenta de AirTM/Lead Bank que Amazon. Aplicado a **HP US** (Advertiser ID 6870053) — estado `PENDING`, HP migró de Awin a CJ para el mercado de EE.UU. Sin cobertura para ES/IT/AR (HP US es estrictamente `hp.com/us-en`).
- `[Bug de UX de CJ, no nuestro]`: el campo "SSN o ITIN" se mostraba como obligatorio incluso para un extranjero sin ingresos de fuente EE.UU.; se resolvió dejándolo vacío y completando el foreign TIN (CUIT) — el formulario permitió avanzar igual pese al rótulo.
- `[MercadoLibre Argentina — bloqueado]`: el Programa de Afiliados y Creadores de MercadoLibre **exige monotributo**; la cuenta operativa del titular es **responsable inscripto**, y la plataforma rechaza el alta con mensaje explícito ("Tenés que ser monotributista para formar parte del Programa de afiliados"). No es un problema de formulario — es una regla de negocio dura. Cambiar de categoría fiscal para esto no es recomendable (afecta todo el negocio real, no solo el sitio). Sin registro real, nunca hubo confirmación de que MX/BR/CO/CL fueran alcanzables tampoco: además, Mercado Pago es 100% local por país (requiere documento de identidad de cada país — CPF/RFC-CURP/cédula), así que sin residencia en esos países el cobro sería inviable aunque el alta como afiliado se aprobara.
- `[Limpieza de código]`: `middleware.ts` — sacadas las 5 entradas de `AFFILIATE_TAGS` para AR/MX/BR/CO/CL (`clicksandgo-{ar,mx,br,co,cl}-20`), que eran placeholders **nunca reales**. `AFFILIATE_TAGS` ahora solo tiene ES/US/IT (Amazon, únicos con afiliación aprobada). Los dominios de MercadoLibre siguen en `ALLOWED_OUT_DOMAINS`, así que `/out` los sigue permitiendo — simplemente ya no les inyecta ningún tag (pasan limpios, sin comisión, hasta tener afiliación real). `config` queda `undefined` para esos países → el bloque entero de inyección de tag en `/out` se saltea automáticamente (sin cambios necesarios en esa lógica, ya estaba guardada tras `if (config)`).
- `[HP/Dell LATAM en CJ — hallazgo clave]`: HP resultó tener **HP LATAM** (Advertiser ID 6870054) en CJ, cubriendo Argentina/Brasil/Chile/Colombia/México/Perú con comisión en moneda local — cobrable vía la MISMA cuenta de AirTM/CJ, sin necesidad de Mercado Pago local por país. Es la vía real para monetizar tráfico LATAM que MercadoLibre bloqueaba. Aplicado (revisión manual, pendiente). También aplicado a **HP US** (6870053), **Dell Home & Home Office** (US) y **Dell Technologies Brazil** (6387261), y **ASUS ES** (5260673, solo tráfico España por regla del programa). Todas en estado pendiente de aprobación manual. Guardados: CJ Publisher ID **7704909**, Site ID **101840044**.
- `[Nota HP/Dell/ASUS por región]`: ni HP ni Dell tienen programa público de afiliados de contenido para España/Italia (HP solo ofrece "HP Amplify", canal B2B de revendedores). ASUS sí tiene ASUS ES (España). Dell tampoco aparece para ES/IT en CJ. Cobertura EU de fabricantes queda cubierta principalmente vía Amazon (ya activo) + Lenovo (ver abajo).

## 2026-07-24 (cont.) · 🔴 Impact.com + Lenovo (4 mercados) — verificación de sitio vía meta tag

- `[Impact — cuenta creada]`: alta como publisher ("a publisher / an individual / promotes through website(s) / product & service reviews + editorial content"). El **Marketplace** de Impact fue **rechazado** ("Declined — you currently do not qualify") — es la red más estricta y exige historial de tráfico. **PERO** el acceso a marcas pre-aprobadas y la aplicación **a nivel de marca individual** sí funcionan (banner "You don't need an invite to start earning"). La puerta lateral vía la landing de afiliados de Lenovo (`lenovo.com/ar/es/afiliados` → Impact) evitó el muro del Marketplace.
- `[Verificación de propiedad del sitio — bug sutil de atributo]`: Impact verifica con un meta tag que usa el atributo **`value=`** (NO el `content=` estándar). La Metadata API de Next emite `content=`, así que la verificación habría fallado. **Fix**: se renderiza el tag crudo en `[locale]/layout.tsx` — `<meta {...({ name, value } as Record<string,string>)} />` (spread con cast porque los tipos de React/TS no permiten `value` en `<meta>`; React 19 lo hoistea al `<head>` y respeta el atributo). Verificado en vivo: `<meta name="impact-site-verification" value="c697e065-...">` presente en `/`, `/es`, `/en`. Verificación de Impact **PASÓ**.
- `[Lenovo — aplicado a 4 mercados]`: **Lenovo USA** (2%), **Lenovo Spain** (3%), **Lenovo Italy** (3%), **Lenovo Brasil** (4%) — todas "Apply to Brand" enviadas (aprobación manual, acceptance histórico ~6%, pendientes). Ojo aprendido: la aplicación es **a la marca**, no al producto (se entra vía un producto pero aplica al catálogo entero). **Lenovo Argentina no existe como campaña propia** en Impact (la landing `/ar` derivaba al registro general). Evitadas las campañas **"Sandbox"** (entornos de prueba, 0 comisión real) y las B2B/SMB donde no aplica el público consumidor.
- `[Deploy]`: build vía Cloud Build (`web:impact-verify`, digest `sha256:5c7b3680…`) → `clicks-web` revisión **00021-xbx** sirviendo 100%. La misma imagen incluye la limpieza de tags ML del middleware. Verificado post-deploy sin regresión: `/out` de Amazon US sigue inyectando `clicksandgo-20`; `/out` de MercadoLibre AR ahora pasa **limpio, sin tag** (ya no inventa comisión); home 200; meta tag Impact en vivo.
- `[Estado consolidado de afiliaciones]`:
  - **Amazon** US/ES/IT — ✅ activo (tags cableados en middleware).
  - **Awin** (Publisher 3001457) — ✅ cuenta activa, sin marcas aplicadas aún (HP/Lenovo no visibles en su directorio para estos mercados).
  - **CJ** (Publisher 7704909) — 🕓 HP US, HP LATAM, Dell US, Dell Brasil, ASUS ES (pendientes de aprobación manual).
  - **Impact** — 🕓 Lenovo US/ES/IT/BR (pendientes; Marketplace declined pero brand-level OK).
- `[Pendiente]`: cuando lleguen aprobaciones (email a `info@clicks-and-go.com`), obtener los links/IDs de tracking de cada red y **cablear en `middleware.ts`** (CJ usa `anrdoezrs.net`/`dpbolvw.net` etc. ya en allowlist; Impact usa su propio dominio de tracking — agregarlo al allowlist cuando se genere el primer link). Revisar HP Argentina propio (`hp.com/ar-es/shop/programa-afiliados-hp`, red sin confirmar). Reaplicar al Marketplace de Impact cuando haya tráfico (habilitaría más marcas). Cambios de hoy en `middleware.ts` + `layout.tsx` + esta bitácora quedan **sin commitear** en git (push requiere PAT del titular).

## 2026-07-26 · 🎨 Overhaul UI/UX consumer v2 — NVIDIA/ML + capa agéntica visible + personalización

- `[Contexto]`: análisis en vivo de nvidia.com (Playwright + Edge headless: timings, hovers, carrusel medidos del DOM real) y de mercadolibre.com.ar (capturas del titular — el WAF de ML bloquea IPs de datacenter). Objetivo: aplicar lo mejor de ambos respetando el Design System v5.0 (colores/fuentes intactos) y Zero-Trust (cero cambios de contrato DTO).
- `[Bug i18n real]`: la home y el detalle NO importaban `it.json` — `/it` renderizaba en español desde el lanzamiento del 4º idioma. Corregido en `page.tsx` + `laptop/[slug]/page.tsx`.
- `[Conversión ML]`: anclaje de precio en `LaptopCard` (original tachado + precio 2xl + chip verde sólido "% OFF") usando `original_price`/`discount_pct` que Rails YA calculaba y nadie mostraba; señales `ai_score_label` ("Precio mínimo histórico" — traducido en 4 idiomas y sin uso), `price_trend` ("Precio bajó") y `in_stock=false` ("Sin stock", sin link de afiliado).
- `[Patrones NVIDIA]`: `AIDealsSection` reescrito como escaparate (escenario + tab-bar con barra de progreso `progressBar 7s linear` — medida en su DOM — autoplay con pausa on-hover y `prefers-reduced-motion`); bloom de sombra `card-bloom` (5px→15px 0.5s, medido en `.cmp-teaser`); flechas cuadradas `carousel-arrow`.
- `[Más tarjetas/animación]` (pedido del titular con capturas de ML): `CategoryShowcase` (cards de categoría con contador → filtran catálogo), `PromoBanners` por familia ("Hasta X% OFF" = máximo `discount_pct` del backend, click filtra la familia), cascada `stagger-children` que se repite al filtrar, reveal-on-scroll (`Reveal.tsx`, IntersectionObserver + failsafe 3s: el contenido NUNCA queda oculto).
- `[Prolijidad]` (4 órdenes del titular): navbar sin links de sección; hero sin CTAs redundantes (buscador único punto de entrada); `WhyTrustUs` sube / `CategoryShowcase` baja; chips del catálogo eliminados → pill removible "filtro activo ✕" solo cuando hay filtro. Footer sin "Catálogo/Mejores ofertas".
- `[Capa promocional agéntica — el frontend por fin consume al MarketIntelligenceAgent]`: auditoría reveló que Python ya calculaba con IA (Vertex/Gemini/Antigravity) el calendario exacto de eventos (Hot Sale/CyberMonday/Prime Day por país/retailer, MongoDB `promo_calendar`) y marcaba productos con `promo_event`/`fomo_message`/`market_urgency` — y la Web ignoraba TODO. Nuevo `EventBanner` (cartel tinta con estado "En curso"/"Muy pronto" según urgencia) + chip del evento sobre la imagen de la card. Solo lectura del DTO existente.
- `[Personalización conductual]`: `lib/affinity.ts` + `ForYouRail` ("Elegidos para vos") — señales locales (expand ×2, favorito ×4, compra ×5, filtro ×1) con decaimiento de 7 días en localStorage; re-ordena el catálogo ya servido. Cumplimiento explícito: sin matemática de negocio, sin IA en frontend, sin datos al servidor (más restrictivo que la política IP-en-tránsito). Fase 2 server-side documentada en el roadmap.
- `[Noticias geo]`: la tabla `hardware_news` tenía `country_code` pero Python no lo enviaba ni Rails lo persistía (todas caían globales). Fix aditivo: `feed_country` en NewsRadar (Xataka→ES) + persistencia defensiva (`has_attribute?`) en `PersistenceOrchestrator`.
- `[i18n]`: paridad verificada 264 claves × 4 idiomas (es/en/pt/it) — nuevas secciones `showcase`/`families`/`promos`/`events`/`forYou` + `card.outOfStock`/`common.clearFilter`.
- `[Blindaje anti-evento-vencido]` (observación del titular: "no hay CyberMonday y aparece el cartel" — era el mock de QA con datos inyectados, pero destapó un riesgo real): si la ingesta diaria se atrasa, un producto podía quedar marcado con un evento ya terminado. Fix en ambas puntas: `market_intelligence.py` ahora emite `promo_ends_at` (fecha de fin del evento) y la Web (`isPromoExpired()` en EventBanner + chip de card) suprime cualquier promo cuya fecha ya pasó — sin dato se confía en el backend (retrocompatible). Verificado: sin evento activo → 0 banners, 0 chips; guarda de expiración probada.
- `[Verificación]`: tsc 0 · ESLint 0 (regla `set-state-in-effect` resuelta con `useSyncExternalStore` para reduced-motion y remount por `key`) · vitest 5/5 · `next build` ✓ · `py_compile` ✓ · `ruby -c` ✓ · QA en vivo con mock del serializer (banner CyberMonday, chip en cards promo, rail aparece tras actividad y rankea por afinidad, filtros por card/banner/familia, pill removible, `/it` en italiano).

## 2026-07-27 · 🚀 Deploy a producción del overhaul v2 (`clicks-and-go.com`)

- `[Deploy]`: 3 imágenes buildeadas en Cloud Build desde el commit `db4a94d` y publicadas en Cloud Run (Rust sin cambios, no se tocó):
  - `clicks-rails` → revisión **00010-frg** (persistencia de `country_code` en noticias).
  - `clicks-python` → revisión **00016-77x** (`feed_country` en NewsRadar + `promo_ends_at` en MarketIntelligence).
  - `clicks-web` → revisión **00022-p86** (overhaul UI/UX v2 completo).
- `[Trampa de deploy detectada — anotar para la próxima]`: `gcloud run services replace` con un YAML **byte-idéntico** al desplegado es un **no-op**, aunque `:latest` apunte a una imagen nueva → Rails quedó sirviendo la imagen del 17/07 (digest `867fa088…`) mientras el registry ya tenía `32710eb3…`. Web y Python sí generaron revisión porque su config difería. **Fix aplicado**: `gcloud run services update clicks-rails --image …/rails:db4a94d` (tag por SHA fuerza el cambio). **Recomendación**: usar tag por SHA en los manifests, o verificar siempre `status.imageDigest` de la revisión contra el digest del registry post-deploy (no alcanza con ver "Done").
- `[Verificado en vivo en el dominio real]`: los 4 idiomas 200 con título traducido (`/it` **ahora sí en italiano** — el bug de i18n corregido está en producción); CategoryShowcase, PromoBanners, escaparate de ofertas y chips `% OFF` presentes; `EventBanner` y `ForYouRail` correctamente **ocultos** (sin evento activo / visitante sin historial); sin regresión en `/out` (Amazon US inyecta `tag=clicksandgo-20`), meta tag de Impact, sitemap, robots y login.
- `[Hallazgo preexistente — calidad de datos, NO regresión del deploy]`: **28 de 30 productos muestran la foto genérica de fallback** en vez de la imagen real. Los CDN de los retailers fallan al hotlinking: Lenovo `p3-ofp.static.pub` **404**, Dell `i.dell.com` **403**, HP `ssl-product-images.www8-hp.com` **504**, más ASUS/MSI/Acer/Apple. El `onError → FALLBACK_IMAGE` de `LaptopCard` funciona (degradación elegante: 30/30 renderizan, 0 en blanco), pero el catálogo se ve genérico. **Pendiente para el pipeline de ingesta**: re-hospedar las imágenes (GCS + CDN) o priorizar URLs de las APIs de afiliados (Amazon `m.media-amazon.com` sí responde) en vez de scrapear la CDN del fabricante.

## 2026-07-27 (cont.) · ⚖️ Retirado el claim de descuento ("% OFF") por riesgo legal

- `[Origen]`: el titular preguntó si mostrar la etiqueta "% OFF" podía traer problemas con los ToS de los retailers, dado que la ingesta corre 1×/día y un cambio de precio podría no reflejarse. **La respuesta es sí, y la auditoría encontró un problema mayor que el planteado.**
- `[Hallazgos de la auditoría del pipeline]`:
  1. **`original_price` es el MSRP del retailer**, no el mínimo de 30 días: MercadoLibre usa `original_price or price`, Awin `store_price or search_price`, CJ `retail-price`. La **Directiva Omnibus UE (2019/2161, art. 6a, vigente desde may-2022)** exige que todo anuncio de reducción se compare contra el **precio más bajo aplicado en los 30 días previos** — aplica a ES e IT, dos de nuestros mercados. Multas de hasta 4% de facturación.
  2. **No hay timestamp de precio en el DTO** (`financials` no expone fecha) → era imposible mostrar el disclaimer *"as of [fecha/hora]"* que **exige el Amazon Associates Operating Agreement**.
  3. **No existe adaptador de Amazon PAAPI**: los productos de Amazon salen de `seeds_products_multi.sql` con precios estáticos. Amazon exige que el precio mostrado provenga de la Product Advertising API y tenga <24h. Amazon es hoy nuestra **única red aprobada y con tags en vivo** — una infracción implica terminación de cuenta.
  4. Sumado: FTC 16 CFR Part 233 (precio anterior debe ser real y sostenido) y Ley 24.240 / Res. 7/2002 en Argentina.
- `[Decisión del titular]`: quitar el claim ahora (riesgo→cero, reversible) y reponerlo cuando el backend soporte el cálculo correcto.
- `[Aplicado]`: removidos `% OFF`, precio tachado y "Ahorras $X" de `LaptopCard`, `AIDealsSection` (escenario + pestañas), `PromoBanners` ("Hasta X% OFF") y `ForYouRail`. Cada punto quedó con comentario explicando la norma que lo motiva, para que nadie lo reponga sin el backend listo. Las pestañas del escaparate ahora muestran el precio en vez del ahorro.
- `[Agregado]`: `card.priceDisclaimer` en los 4 idiomas — línea contigua al precio en cada card y en el escaparate ("Precio referencial · el vigente es el de la tienda al momento de comprar"). Antes el aviso vivía solo en el footer; Amazon lo pide junto al dato.
- `[Nota]`: `common.save` y `deals.youSave` quedan en los diccionarios pero **sin uso** (inertes) — se reutilizan cuando vuelva el claim compliant. Paridad i18n 265 claves ×4.
- `[Verificado]`: tsc 0 · ESLint 0 · vitest 5/5 · build ✓ · barrido del HTML renderizado: **0 ocurrencias** de "% OFF" y **0** elementos con `line-through`; disclaimer presente en las 9 cards. Las 2 apariciones de "Ahorras" en el HTML son solo el diccionario serializado en el payload RSC, ningún componente las renderiza.
- `[Pendiente]` (ver `redesign_plan.md`): los 4 requisitos para reponer el "% OFF" — `lowest_price_30d` desde `price_histories`, `price_recorded_at` en el DTO, adaptador de Amazon PAAPI, y supresión automática si el dato está vencido.

## 2026-07-27 (cont.) · 👨‍⚖️ Auditoría legal integral — "abogado digital" sobre retailers, consumidor y privacidad

- `[Mandato del titular]`: análisis exhaustivo como abogado digital, resolver TODO problema potencial con retailers. La auditoría cubrió: ToS de redes (Amazon/Impact/CJ/Awin), derecho del consumidor (FTC, Omnibus UE, Ley 24.240), veracidad del copy, emails y privacidad (RGPD/ePrivacy).
- `[1. Email de PriceAlertAgent — 3 infracciones corregidas]`:
  - Mostraba el **precio actual en asunto y cuerpo** — Amazon prohíbe exhibir precios de sus productos fuera del sitio aprobado. Ahora el email solo menciona el **objetivo que fijó el propio usuario** (dato suyo) e invita a ver el precio vigente en el sitio.
  - La nota "Enlace de afiliado" era **incorrecta** (el link va a nuestra página de producto, no a un afiliado) → reescrita con honestidad: "en el sitio encontrarás enlaces de afiliado…".
  - **Sin gestión de bajas** → agregado link al panel para gestionar/eliminar alertas (buena práctica CAN-SPAM/RGPD).
- `[2. "Precio bajó" retirado]`: `price_trend: "down"` del serializer significa `current < original_price` (MSRP), NO una bajada real en el tiempo — el mismo vicio Omnibus que el % OFF disfrazado de flecha. Removido de la card con comentario; reponer cuando el trend se calcule contra `price_histories`.
- `[3. Copy engañoso → veraz (16 claves × 4 idiomas)]`:
  - "Precios actualizados **al instante**" → "Precios revisados **a diario**" (la ingesta corre 1×/día — el claim viejo era falso y coherente ahora con stats "Actualización: Diario").
  - `ai_labels.OPTIMAL` "**Precio mínimo histórico**" → "Precio excepcional": era un claim FÁCTICO derivado de un bucket de deal_score, no de comparar el histórico real. Ahora es opinión editorial defendible.
  - "Precio Verificado" → "**Precio de referencia**" (card, escaparate, detalle): coherente con el disclaimer y sin promesa de verificación en tiempo real.
  - "**Mejor precio del mercado** / la oferta más baja disponible" → "Buscamos el mejor precio / las mejores ofertas que encontramos" (esfuerzo, no garantía — las garantías de mejor precio exigen sustanciación).
  - Hero: "Comparamos **miles** de ofertas" → "Comparamos ofertas…" (el catálogo público no sustenta "miles").
- `[4. Disclosure oficial de Amazon]`: el footer tenía divulgación genérica; el Operating Agreement (§5) exige el wording específico. Agregado en los 4 idiomas: "En calidad de Afiliado de Amazon, Clicks & Go obtiene ingresos por las compras adscritas…" / "As an Amazon Associate…".
- `[5. Consentimiento ePrivacy (art. 5.3) — AEPD/Garante]`: la personalización "Elegidos para vos" usa localStorage NO esencial → requiere consentimiento previo en la UE (ES/IT son mercados core). Implementado:
  - `ConsentBanner` (nuevo): diálogo discreto en tinta, "Aceptar" / "Solo lo esencial" con igual prominencia (exigencia AEPD), i18n ×4.
  - `affinity.ts`: `getConsent()/setConsent()` — sin consentimiento **no se escribe ni se lee** historial (recordSignal y rankByAffinity quedan mudos); retirar el consentimiento **borra lo acumulado** (RGPD art. 7.3); guardar la elección en sí está exento (necesario para recordar el rechazo).
  - `ForYouRail` escucha `consent:changed` → desaparece al instante si se retira.
- `[Notas sin cambio de código]`: (a) imágenes de Amazon hotlinkeadas desde seeds — el adaptador PAAPI pendiente es la vía legítima (ya en roadmap); (b) `/out` con `rel="sponsored"` y allowlist OK; (c) links de Impact/CJ pasan intactos OK; (d) `deals.limitedTime`/`youSave`/`common.save` quedan en diccionarios sin uso (inertes).
- `[Verificado]`: py_compile ✓ · tsc 0 · ESLint 0 · vitest 5/5 · build ✓ · QA en vivo: banner aparece 1 sola vez; **rechazar → cero storage y sin rail** (verificado `localStorage null`); aceptar → rail funciona; barrido HTML: 0 "al instante", 0 "mínimo histórico", 0 "Mejor precio del mercado", 0 "Precio Verificado", "Precio bajó" solo en payload de diccionario (no renderizado); disclosure Amazon presente ×3 (footer por idioma renderizado).

## 2026-07-27 (cont.) · 🖼️ Imágenes de producto — causa raíz y degradación honesta

- `[Pregunta del titular]`: "los productos de Amazon no muestran la imagen real y sale cualquier otra imagen". **Causa raíz confirmada**: nunca fueron imágenes reales.
- `[Diagnóstico del catálogo de producción (30 productos US)]`:
  - **20 productos** traen **fotos de stock de Unsplash sembradas a mano** en `seeds_products_multi.sql` (22 URLs hardcodeadas) — decorativas, no del producto. Ejemplos reales servidos hoy: una **tabla de madera que dice "je t'aime"** como Epson EcoTank; **dos celulares** como webcam Logitech Brio; un **MacBook sobre un escritorio** como cartucho HP 667; un **ícono de Spotify** como Razer Kiyo. Varias incluso devuelven **404**.
  - **7 productos** tienen URL real de la CDN del fabricante pero **falla por hotlink protection**: Dell `i.dell.com` 403, Acer 403, Lenovo `p3-ofp.static.pub` 404, Razer 404, HP `ssl-product-images.www8-hp.com` 504/timeout.
  - **3 productos** con CDN que sí responde 200: ASUS, MSI, Apple.
  - Los productos con retailer `amazon_us` son **todos del grupo sembrado con Unsplash** — de ahí que "Amazon" nunca muestre la foto real.
- `[Decisión]`: NO buscar otra foto de stock genérica. Mostrar la foto de OTRO producto como si fuera el listado es una **representación engañosa** (FTC §5, Directiva 2005/29/CE de prácticas desleales, Ley 24.240 art. 4) — el mismo vicio recién corregido en el copy. Se eligió **degradación honesta**.
- `[Aplicado]`: nuevo `ProductImage.tsx` — usa la foto real si existe y carga; si la URL es de un host de stock (`images.unsplash.com`, `placehold.co`…), está vacía, o la CDN falla (`onError`), renderiza un **placeholder neutro con el ícono de la categoría** (los 9 tipos), que no simula ser el producto. Reemplaza el `FALLBACK_IMAGE` de Unsplash en las 4 superficies: card, escaparate de ofertas, rail personalizado y página de detalle. El OG image de metadatos sociales mantiene su respaldo (no es la card del producto).
- `[Bug de i18n encontrado de paso]`: la página de detalle titulaba el dictamen de IA con `dict.deals.verified`, que tras el renombre legal pasó a valer "Precio de referencia" — el bloque de análisis se titulaba con un texto de precio. Corregido con clave propia `card.aiVerdict` ("Nuestro análisis") ×4 idiomas.
- `[Solución definitiva — pendiente de pipeline]` (ya en `redesign_plan.md`): adaptador **Amazon PAAPI** (única vía legítima para imágenes y precios de Amazon) + re-hospedar en GCS/CDN las imágenes que llegan por los feeds de Awin/CJ/Impact, en vez de hotlinkear la CDN del fabricante.
- `[Verificado]`: tsc 0 · ESLint 0 · vitest 5/5 · build ✓ · QA en vivo: 9/9 cards con placeholder de ícono, **0 imágenes rotas** (antes 28/30 mostraban una foto ajena al producto). Paridad i18n 271 claves ×4.

## 2026-07-27 (cont.) · 🚫 Fin del mock data: solo imágenes reales, garantizado en 4 capas

- `[Orden del titular]`: "solo deben mostrarse imágenes reales, no trabajaremos más con mock data".
- `[Auditoría HTTP de las 63 URLs distintas del catálogo vivo]` (GET real con UA de browser, exigiendo `200` + `Content-Type: image/*`). El resultado corrige y endurece el diagnóstico anterior — **no eran 3 CDNs sanas, eran 4 URLs sanas de 63**:
  - `images.unsplash.com` **22** → stock decorativo.
  - `ssl-product-images.www8-hp.com` **7** → 404 · `p2/p3-ofp.static.pub` **12** → 404 · `hybrismediaprod…` **1** → 404.
  - `i.dell.com` **8** → 403 (Scene7 responde 403, no 404, ante un asset ausente) · `static.acer.com` **2** → 403.
  - `dlcdnwebimgs.asus.com` **4** → **302 a HTML** (parecía 200 con `curl -o /dev/null`; el `Content-Type` lo delató).
  - `ar-media.hptstore.com` **1** → el dominio no resuelve.
  - Reales: `asset.msi.com` **2** + `store.storeimages.cdn-apple.com` **2** (de 4; las otras 2, 404).
  - **Conclusión**: las URLs de "CDN de fabricante" del seed también eran mock — rutas inventadas sobre hosts legítimos. El catálogo sembrado nunca tuvo fotos reales salvo 4 aciertos.
- `[Guarda en 4 capas]` — la misma lista de hosts replicada donde el dato nace, se guarda, se sirve y se pinta:
  1. **Ingesta (Python)** — `clean_image_url` en `data_normalizer.py`: fuerza https, descarta bancos de stock y **verifica por HTTP** que la URL devuelva una imagen (GET con `stream=True`, no HEAD: varias CDN responden 403/405 a HEAD pero sirven con GET). Caché por proceso; apagable con `IMAGE_VERIFY_ENABLED=false` para tests offline.
  2. **Postgres** — CHECK `chk_laptops_no_stock_image` (`migration_real_images_v6.sql`): `image_url` es NULL o https y de host no-stock. Verificado en prod que **rechaza** unsplash y `http://`, y **acepta** una CDN real.
  3. **Rails** — `Laptop#real_image_url`: el DTO nunca emite un host de stock. Usado por `notebooks_controller` y `favorites_controller`. `persistence_orchestrator` guarda `NULL` (no `''`) cuando no hay foto.
  4. **Web** — `src/lib/productImage.ts` (extraído de `ProductImage.tsx` para poder testearlo) + allowlist de `next.config.ts` **sin** unsplash: el optimizador rechaza con 400 cualquier foto decorativa que se colara.
- `[Purga en producción]`: `migration_real_images_v6.sql` aplicada a `clicks-db2` → **66 URLs mock a NULL, 4 reales conservadas**. Idempotente (2ª corrida: `UPDATE 0`). Snapshot de rollback de las 70 filas tomado antes de tocar nada. IP del codespace autorizada solo durante la operación y **revocada al terminar** (`--clear-authorized-networks`, verificado).
- `[Mock fuera del catálogo, también eliminado]`:
  - `HeroSection`: foto de stock de fondo (~200 KB en el LCP) → fondo 100% CSS. `hero-gradient` ahora lleva un halo del azul de acento (#2563eb) donde antes se veía la foto: mismos tokens, mismo look, cero descargas.
  - `HardwareNewsSlider.tsx`: **borrado** — código muerto (0 referencias) con 6 imágenes de stock.
  - Detalle de producto: `OG_FALLBACK` de Unsplash eliminado; sin foto real no se emite `openGraph.images` (una preview en redes con la foto de otro artículo es tan engañosa como en la card).
  - Seeds: **62 URLs fabricadas → NULL** en `seeds_products_multi.sql`, `seeds_catalog.sql` y `cloud_fix.sql`. Verificado por diff que **no se tocó ninguna `url_afiliado`**.
- `[Contrato DTO]`: `urls.image` pasa a `string | null` en `laptop.ts`. El tipo destapó las 4 superficies consumidoras (card, detalle, ofertas, rail) — todas ya pasaban por `ProductImage`.
- `[Bug encontrado de paso]`: `next.config.ts` no declaraba los hosts de avatar de OAuth → `next/image` abortaba y la **foto de perfil del panel nunca cargaba**. Agregados `lh3.googleusercontent.com`, `graph.microsoft.com`, `**.fbcdn.net`, `platform-lookaside.fbsbx.com`.
- `[Consecuencia visible y esperada]`: 66 de 70 productos muestran el ícono neutro de su categoría. **Es el estado honesto**: no hay foto real que mostrar hasta que el pipeline traiga una. Las fotos vuelven cuando haya credenciales de feed — `AWIN_API_KEY`, `CJ_API_KEY`, Impact y Amazon PA-API están **todas sin configurar en prod** (verificado en las env vars de `clicks-python`), y la API pública de MercadoLibre hoy responde **403 en todos sus endpoints** (ya no sirve búsqueda sin OAuth). Ese es el bloqueante real de imágenes, no el frontend.
- `[Verificado]`: tsc 0 · ESLint 0 · `next build` ✓ · vitest **11/11** (6 tests nuevos que fijan la política) · py_compile ✓ · `ruby -c` ×4 ✓ · migración aplicada, idempotente y con CHECK probado contra datos reales.
