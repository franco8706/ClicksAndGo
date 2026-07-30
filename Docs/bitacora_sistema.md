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

### 2026-07-27 · addendum — un `200 image/*` no basta: el caso MSI

- `[Hallazgo en la QA visual post-deploy]`: la card del **MSI Raider GE78 mostraba el logo del dragón de MSI**, no la laptop. La URL pasaba los tres controles (https, host no-stock, `200` + `Content-Type: image/png`) y aun así no era el producto.
- `[Comprobación]`: las 2 URLs de `asset.msi.com` del catálogo **y un id inventado** devuelven el **mismo archivo byte a byte** (md5 `b40b0e9f492cd26f41701c923b11ca98`, 13.854 bytes). La CDN de MSI sirve su placeholder de marca ante cualquier asset ausente, en vez de un 404. Es decir: también eran mock, disfrazadas de respuesta válida.
- `[Contraste — Apple es honesta]`: un id inventado sobre `store.storeimages.cdn-apple.com` da **404**, y las 2 URLs válidas devuelven imágenes **distintas entre sí** (15 KB y 34 KB, hashes distintos). Esas 2 son las únicas fotos reales de producto que quedan en el catálogo.
- `[Corregido]`:
  - `clean_image_url` suma un **blocklist por hash de contenido** (`_KNOWN_PLACEHOLDER_MD5`): hashea el cuerpo cuando pesa ≤256 KB (un placeholder de marca es chico; una foto real suele pasarse del techo y se acepta sin pagar el ancho de banda). Extensible: descargar la sospechosa, `md5sum`, agregar la entrada.
  - `migration_real_images_v6.sql` paso **3b**: purga `asset.msi.com`. Re-aplicada en prod → **68 sin foto, 2 reales**. Los seeds pierden también esas 2 URLs.
- `[Verificado contra las CDNs en vivo]` (6/6): MSI placeholder → descarta · Apple real → acepta · Unsplash → descarta · Dell 403 → descarta · ASUS 302-a-HTML → descarta · vacío → descarta.
- `[Lección]`: la verificación por status + content-type es necesaria pero **no suficiente**. El control que lo destapó fue mirar la página renderizada, no el HTTP.

## 2026-07-28 · 🔎 Investigación: por qué "la API de Amazon no funciona"

- `[Pregunta del titular]`: "necesito investigar por qué la API de Amazon no funciona".
- `[Respuesta corta]`: **no está fallando — no existe.** No hay una sola línea de código que llame a ninguna API de Amazon. Y aunque se escribiera hoy, no se podría usar: la API que el roadmap daba por destino **quedó deprecada**, y su reemplazo exige ventas previas que el sitio todavía no tiene.
- `[Capa 1 — no hay adaptador]`: `market_hunter.py` tiene exactamente tres: `MercadoLibreAPI`, `AwinNetworkAPI`, `CJAffiliateAPI`. Cero Amazon. Las únicas menciones a "PAAPI" en el repo son **comentarios** (`legal_agent`, `price_alert_agent`, `LaptopCard`, `AIDealsSection`) que documentan la obligación legal, no código que la ejecute. `requirements.txt` no tiene ninguna librería de Amazon. Lo único real de Amazon en producción es la **inyección de tag en `/out`** (middleware), que no usa API.
- `[Capa 2 — no hay credenciales]`: ningún secreto de Amazon en Secret Manager (`gcloud secrets list` → nada), ninguna env var de Amazon/Awin/CJ en `clicks-python`. Solo existen placeholders vacíos en `.env.example`.
- `[Capa 3 — LA CAUSA REAL: Amazon cambió de API]`. Verificado el 2026-07-28:
  - `https://webservices.amazon.com/paapi5/documentation/` → **302** a `.../creatorsapi/docs/en-us/paapiv5-deprecation`. Los endpoints `.es`/`.it` dan **403**. La doc de PA-API 5.0 **ya no existe**: redirige a su propio aviso de muerte.
  - Texto oficial: *"The Amazon Product Advertising API 5.0 (PA-API 5) has been deprecated and is being replaced by the Creators API."* PA-API además **dejó de aceptar clientes nuevos**.
  - **Creators API** (sucesora): REST, **OAuth2 Bearer** en vez de AWS SigV4 — el esquema de firma cambia por completo. Credenciales = `Credential ID` + `Secret` + `Version`, generadas en Associates Central → Tools → Creators API. **Una por marketplace**: US, ES e IT necesitan tres juegos. Máx. 2 apps por store, 2 credenciales por app. El secreto se muestra **una sola vez**.
  - **Elegibilidad**: solo para cuentas de Associates aprobadas **con ventas calificadas referidas**. Umbral reportado: **10 ventas calificadas en los últimos 30 días**; sin ventas durante 30 días consecutivos, Amazon **revoca** el acceso.
- `[Consecuencia estratégica]`: es un **huevo-y-gallina** — hace falta vender por Amazon para que te den la API, y la API es lo que ayudaría a vender. Por eso el adaptador de Amazon pasa a ser **lo último** en desbloquearse, no lo primero. El camino práctico: monetizar Amazon con los links `/out` (que ya inyectan el tag y **no** requieren API) mientras el catálogo se llena por **Awin/CJ/Impact**, que no exigen ventas previas.
- `[Aplicado]`:
  - `redesign_plan.md`: corregido el ítem obsoleto "adaptador Amazon PAAPI" en sus 3 apariciones — ahora dice Creators API, con el bloqueante de elegibilidad explícito y el orden de prioridad corregido.
  - `.env.example`: `AMAZON_PAAPI_KEY/SECRET` → `AMAZON_CREATORS_CREDENTIAL_ID/SECRET/VERSION`, con la nota de elegibilidad y del requisito por-marketplace.
  - `legal_agent.py`: la etiqueta `AMAZON_PAAPI` pasa a `AMAZON`, y se suman a la vigilancia la **IP License de Creators API** (HIGH) y la **página de deprecación** (MEDIUM) — así el agente avisa si Amazon mueve fechas de corte o cambia obligaciones de uso de datos e imágenes. Las 4 URLs verificadas 200.
- `[Nota]`: no se pudo validar el tag `clicksandgo-20` contra amazon.com — la IP del codespace recibe **captcha** (anti-bot), no un error del tag. Se valida entrando a Associates Central.

## 2026-07-28 (cont.) · ⚖️ ¿Usar una foto del fabricante rompe el contrato de Amazon o afecta la comisión?

- `[Pregunta del titular]`: si cargamos manualmente fotos del fabricante para los productos de Amazon, "¿el contrato se cumple lo mismo y paga la comisión, o si no es legal?".
- `[Metodología]`: lectura directa del *Associates Operating Agreement* y sus *Program Policies* (las mismas 2 URLs que ya vigila `legal_agent.py`), no memoria. Primer fetch etiquetó mal una cláusula (la marcó "prohibido" leyendo la dirección inversa) — se releyó la §6(z) aislada y se confirmó el error antes de concluir nada.
- `[Hallazgo 1 — definición de "Program Content"]` (§1): *"Program Content specifically excludes any data, images, text, or other information or content relating to product offerings on any site other than the Amazon Site."* Es decir: **Program Content = solo lo que Amazon te da a vos** (vía API/herramientas). Una foto que nunca vino de Amazon —la bajaste del press kit de HP— **no es Program Content** y las reglas que regulan Program Content no la alcanzan.
- `[Hallazgo 2 — §6(z), la cláusula que parecía relevante]`: *"You will not display on your Site, or otherwise use, any Program Content to advertise or promote any products that are offered on any site that is not an Amazon Site."* Restringe el sentido **contrario** al que preguntábamos: prohíbe usar el contenido *de Amazon* para promocionar productos en *otro* sitio. No dice nada sobre usar contenido *ajeno* para promocionar un producto *de Amazon*. **No aplica** a nuestro caso.
- `[Hallazgo 3 — la cláusula que sí aplica]` (§2(b)): *"You must not make inaccurate, overbroad, deceptive or otherwise misleading claims about any Product..."* — el requisito real es **exactitud**, no **origen**: la foto tiene que ser del producto correcto (marca/modelo/variante reales), no que tenga que salir de Amazon. Coincide exactamente con la política que ya rige todo el proyecto desde la purga de mock data (`chk_laptops_no_stock_image` + `clean_image_url`): foto real del producto real, o nada.
- `[Hallazgo 4 — precios, no imágenes]` (§2(b)/(c) de la IP License): *"your Site may only show prices and availability if: (a) we serve the link in which that price and availability data are displayed, or (b) you obtain Product pricing and availability data via Creators API or PA API"* + *"You will include a date/time stamp adjacent to your display of pricing or availability information."* Esto es sobre **precio**, no sobre imagen — y ya está resuelto: la auditoría legal del 2026-07-27 sacó el "% OFF"/tachado y dejó "Precio de referencia" con disclaimer, exactamente para no violar esta regla. **No cambia nada nuevo.**
- `[Hallazgo 5 — no existe cláusula que ate la comisión a la representación visual]`: ninguna sección condiciona el pago de comisión a qué foto se muestra en tu página. La comisión se paga por el click al link con tu tag de afiliado (`clicksandgo-20`/`clicksandgo-21`/`clicksandgo08-21`) y la compra calificada que sigue — mecánica de tracking de Amazon, completamente independiente de qué imagen renderiza `/laptop/[slug]`. El link en sí (`/out`) no se toca en este plan.
- `[Conclusión]`: **cargar una foto real del fabricante, sourced de forma independiente (no de Amazon), no viola el Operating Agreement ni afecta el pago de comisión**, siempre que: (a) sea genuinamente la foto del producto correcto — mismo criterio que ya aplican las 4 capas de la guarda de imágenes; (b) el link de afiliado siga siendo el `/out` con tag intacto; (c) no se muestre precio/disponibilidad como si viniera de Amazon en tiempo real (ya resuelto). El riesgo legal real sigue siendo el del fabricante (sus términos de uso de imagen de prensa — ya señalado el 2026-07-28 antes), no el de Amazon.
- `[Nota metodológica]`: `WebFetch` usa un modelo chico para resumir y en el primer intento invirtió el sentido de una cláusula — quedó documentado como recordatorio de re-verificar cláusulas legales críticas releyendo el fragmento aislado antes de darlas por buenas.

## 2026-07-28 (cont.) · ⚖️ Auditoría contrato por contrato: ¿se puede cargar foto del fabricante en TODOS los retailers?

- `[Pregunta del titular]`: "lee los contratos de todos los retailers que tenemos en el sistema para corroborar si podemos llevar a cabo el proceso de carga de imágenes" — extender la verificación legal de Amazon (turno anterior) a cada retailer/red real del catálogo.
- `[Metodología]`: mismo criterio que con Amazon — leer el texto primario, no confiar en un resumen sin re-chequear la cita aislada. Se verificaron 10 retailers/redes: Amazon (ya cerrado), Awin, CJ, Impact, MercadoLibre, HP, Dell, Lenovo, Asus, Acer, Apple, Razer.

### Resultado — tabla de veredictos

| Retailer/red | ¿Restringe imagen no-oficial? | Evidencia |
|---|---|---|
| **Amazon** | No | Ya verificado turno anterior — solo exige exactitud (§2b), no origen. |
| **Apple** | No | `performance-partners.apple.com/program-overview`: solo prohíbe *copiar* contenido de Apple ("Appropriates text or images from Apple's websites or stores" = motivo de rechazo). No exige que la imagen sea de Apple. |
| **CJ** | Sin verificar — ToU pública no lo menciona | El PSA real (el contrato vinculante) está gateado tras el login de publisher, ya documentado desde el 2026-07-19. No se puede confirmar desde afuera. |
| **Awin** | Sin verificar — hub público no da el texto | Los 4 Publisher Terms (AG/LTD/Brasil/México) son PDFs linkeados, no accesibles por fetch. La URL vieja del Code of Conduct daba 404 (corregida en `legal_agent.py`). |
| **Impact (MSI)** | Sin verificar | Mismo patrón que CJ: cada marca define "Template Terms" propios dentro de la plataforma, no públicos fuera de la cuenta. |
| **MercadoLibre** | Sin verificar del todo | El T&C real del Programa de Afiliados (`/ayuda/30228`, distinto del de la API que ya vigilábamos) bloqueó el fetch (403 anti-bot). Los fragmentos indexados que sí se leyeron no mencionan imágenes, pero no es una lectura completa. |
| **HP / Dell / Lenovo / Asus** | N/A — no hay contrato directo que leer | Confirmado que las URLs "de programa de afiliados" de estas marcas son landing pages de marketing o Términos de Uso generales, **no** el acuerdo de afiliación real — ya lo sabíamos desde el 2026-07-19 (comentario existente en el código): el vínculo real corre DENTRO de Awin (EU) / CJ (US), así que el veredicto de esos dos aplica acá también. |
| **Acer** | Sin programa unificado encontrado | No hay un Acer Affiliate Program global con términos públicos — lo que aparece son programas regionales ad-hoc (Malasia vía bancos, Irlanda/Alemania/India vía FlexOffers). Acer **tampoco** figura en la cobertura de Awin ni CJ según los comentarios de `market_hunter.py`. Hallazgo colateral: `acer_us`/`acer_ar`/`acer_br` no tienen hoy una vía de afiliación confirmada más allá de lo sembrado — más allá de la pregunta de la imagen, esto es un gap de monetización a resolver. |
| **🔴 Razer** | **SÍ — restricción real y confirmada** | `razer.com/affiliate`, verificado dos veces con fetches independientes: *"Affiliates may only use the approved marketing materials produced by Razer that includes logos, marketing copies, technical specifications, banners, and product images."* Con sanción explícita: *"Any earnings reported from sales while violating these terms will not be paid."* |

### Conclusión operativa

- **Amazon y Apple**: el plan de cargar fotos curadas del fabricante es seguro tal cual se pensó.
- **Razer**: **prohibido**. Para los productos `razer_us`, la única foto permitida es la que Razer entrega como afiliado (su feed/portal), nunca una sourceada independientemente aunque sea 100% real y precisa — acá "real" no alcanza, tiene que ser "la que Razer aprobó". Los productos Razer quedan en degradación honesta (ícono) hasta tener acceso al feed oficial de Razer.
- **Awin / CJ / Impact / MercadoLibre**: el contrato vinculante real no es públicamente legible desde afuera de la cuenta — mismo techo que ya se documentó para CJ el 2026-07-19. No se puede dar un veredicto binario; hay que confirmarlo la primera vez que se entra a cada cuenta, ANTES de cargar imágenes de esos retailers. Como los feeds de estas redes YA traen `merchant_image_url`/`image-url` verificado (ver `market_hunter.py`), en la práctica esto solo importa si se quisiera cargar una foto manual en vez de esperar el feed — recomendación: para HP/Dell/Lenovo/Asus/MX-MercadoLibre, esperar el feed de la red en vez de curar a mano, dado que el feed sí es indiscutiblemente el "material aprobado".
- **Acer**: pausar cualquier plan de imagen — antes hay que resolver si existe siquiera un programa de afiliación viable.
- `[Aplicado a legal_agent.py]`: URL muerta de Awin Code of Conduct corregida; sumado `razer_affiliate_program` como fuente HIGH (es la única con restricción confirmada, amerita vigilancia activa de cambios); sumado `mercadolibre_affiliate_program_terms` (documento distinto del de API, antes no vigilado); notas de "gateado tras login" alineadas entre Awin/CJ/Impact.
- `[Pendiente de diseño, no implementado esta sesión]`: cuando se construya el proceso real de carga (manual o el agente con grounding propuesto), la exclusión de Razer debe quedar como regla de código, no solo de bitácora — ej. un `MANUAL_IMAGE_SOURCING_BLOCKED = {"razer"}` que el loader consulte antes de aceptar una URL curada a mano para ese `retailer_slug`. No se escribió porque hoy no existe todavía ningún loader al que engancharlo — se deja documentado para no perderlo cuando se construya.

## 2026-07-28 (cont.) · 🔍 Search Console: el hreflang llevaba meses sin renderizarse

- `[Origen]`: el titular compartió 3 avisos de Google Search Console. Dos informativos (Google empezó a recolectar impresiones el 24/07 — el sitio ya aparece en resultados) y uno accionable: *"Nuevos motivos que impiden la indexación"* → `Página con redirección` + `Duplicada: el usuario no ha indicado ninguna versión canónica`.
- `[Diagnóstico en vivo, antes de tocar código]` (curl contra producción):
  - **0** `<link rel="canonical">` en el HTML servido. Google no tenía forma de saber que `/es`, `/en`, `/pt` e `/it` son el mismo contenido en 4 idiomas y no duplicados.
  - **0** `<link hreflang>` servidos — **pese a que `layout.tsx` ya declaraba `alternates.languages`** desde una sesión anterior, con el comentario "🚀 FIX SEO MUNDIAL". El bloque estaba escrito pero **nunca produjo efecto**.
- `[Causa raíz]`: sin **`metadataBase`**, Next no puede resolver las URLs *relativas* de `alternates` (`'/es'`, `'/en'`…) y las **descarta en silencio** en vez de emitirlas. Un "fix" que llevaba meses en el repo sin funcionar y sin que nada lo delatara — no hay error, no hay warning, simplemente no se renderiza. Lección: un fix de SEO no está verificado hasta ver el tag en el HTML servido, no en el código fuente.
- `[Aplicado]`:
  - `layout.tsx`: `metadataBase` (misma resolución de dominio que `sitemap.ts` — una sola fuente de verdad) + `alternates.languages` con URLs absolutas + **`canonical` auto-referenciado por locale** (cada idioma canoniza a sí mismo, patrón correcto cuando hay hreflang; canonizar todos a uno mataría la indexación de los otros 3) + **`x-default` → `/en`** (mismo fallback que ya usa el middleware para países sin locale mapeado).
  - `laptop/[slug]/page.tsx`: canonical auto-referenciado, **sin** hreflang — el slug lleva el país embebido (`...-us`) y no hay garantía de que el mismo producto exista en los otros 3 idiomas; declarar una equivalencia que no se sostiene sería peor que no declararla.
- `[Sobre "Página con redirección"]`: el `307` de `/` → `/{locale}` es **comportamiento esperado** y estándar en sitios i18n geo-first; no se tocó. El problema real era que el destino del redirect no tenía canonical, no el redirect en sí.
- `[Verificado en vivo tras el deploy]` (`clicks-web-00025-ld8`, digest confirmado contra el registry): canonical correcto en los 4 idiomas; los 5 `<link rel="alternate">` (es/en/pt/it/x-default) presentes con URLs absolutas; canonical propio en página de producto (`/es/laptop/msi-raider-ge78-hx-us`).
- `[🔴 Gap detectado, NO resuelto]`: **`sitemap.ts` solo declara 3 rutas** (home, privacidad, términos) × 4 idiomas. Las **70 páginas de producto quedan fuera del sitemap** — Google no tiene cómo descubrirlas salvo por enlaces internos. Es el mayor cuello de botella de indexación que queda, y es directamente el activo que necesita tráfico para desbloquear las afiliaciones. Requiere decisión de diseño antes de implementar: el sitemap tendría que consultar Rails (hoy es 100% estático) y hay que definir el modo de fallo si Rails no responde. Pendiente de confirmar con el titular.

### 📋 Estado de afiliaciones (contexto de negocio, 2026-07-28)

- **Amazon Associates**: ✅ **aprobado** (confirmado por el titular). El tag `clicksandgo-20` en `/out` es legítimo. Falta solo la **Creators API**, gateada por 10 ventas calificadas/30 días.
- **Impact.com (MSI)**: ❌ **rechazado** — *"No specific reason given"*. Patrón habitual de Impact con sitios nuevos sin historial. El allowlist de redirectores de Impact en `middleware.ts` queda inerte hasta que alguna marca de esa red apruebe.
- **Awin / CJ / MercadoLibre**: sin aplicar. **Awin es el próximo movimiento recomendado**: no exige tráfico mínimo, revisión en 1–5 días hábiles, y da acceso a HP/Lenovo/Dell/Asus EU con feed de imagen+precio ya verificado por el pipeline — resolvería el problema de imágenes sin curado manual.

## 2026-07-28 (cont.) · 🗺️ Sitemap con el catálogo completo — de 12 a 292 URLs

- `[Contexto]`: `sitemap.ts` solo declaraba 3 rutas × 4 idiomas = **12 URLs**. Las **70 páginas de producto no existían para Google**: el 95% del contenido indexable era invisible. Es el cuello de botella directo de la cadena tráfico → ventas → aprobaciones de afiliados. Orden del titular: *"implementalo de la mejor manera, el sitio operará a nivel mundial, por lo tanto el margen de error es 0"*.
- `[Rails — nuevo `GET /api/v1/notebooks/sitemap`]`: devuelve solo `{slug, updated_at}` de TODO el catálogo.
  - **Por qué no reusar `index`**: filtra por `country_code` (el sitemap necesita el catálogo global, un producto solo-AR debe indexarse igual) y **clampea `limit` a 100** — con >100 productos por país el sitemap perdería filas **en silencio**, exactamente el modo de fallo inaceptable para SEO. También expone `updated_at`, que no está en el DTO público.
  - `pluck` → SQL directo, sin instanciar ActiveRecord ni serializar. Cache 1 h. Ante excepción devuelve `[]` con **200, nunca 500** (mismo criterio que `hardware_news`): un sitemap corto es recuperable, uno roto no.
  - Tope `SITEMAP_MAX_PRODUCTS = 10_000` documentado: si se alcanza, la salida no es subir el número sino partir en sitemap index con `generateSitemaps()`.
- `[Next — `sitemap.ts` reescrito bajo contrato "no puede lanzar nunca"]`: si tira 500, Google deja de descubrir páginas y ante errores repetidos degrada el rate de rastreo del dominio.
  - Timeout de 8 s (`AbortSignal.timeout`), validación **fila por fila** (un slug corrupto no puede tumbar el sitemap entero), regex `SAFE_SLUG` que descarta path traversal/espacios/mayúsculas, deduplicación, tope de 50.000 URLs del protocolo con log al truncar.
  - `lastModified` **real** desde `updated_at` (la tabla ya tenía trigger `trg_update_laptops_timestamp`): un `<lastmod>` inventado —todos "hoy"— degrada el rate de rastreo. Verificado en vivo: 3 fechas distintas, no una sola.
  - hreflang + `x-default` por producto en los 4 idiomas.
- `[🐛 Bug atrapado en el build, no en producción]`: la primera versión salió como `○ /sitemap.xml Revalidate 1h` — Next la **prerenderizaba en build**, donde Rails no es alcanzable (build Docker aislado) → el fetch fallaba, caía al catch, y quedaba **cacheado un sitemap sin productos durante 1 h después de cada deploy**. Corregido con `export const dynamic = "force-dynamic"`; el costo es nulo porque Rails ya cachea la consulta 1 h por su cuenta. Lección: leer la columna de render del output de `next build` — `○` vs `ƒ` cambia el momento en que corre el fetch.
- `[🔁 Corrección de la sesión anterior]`: en el commit del canonical se **omitió el hreflang de la página de producto** asumiendo que el país embebido en el slug (`...-us`) impedía que el producto existiera en los otros idiomas. **Era falso**: la página resuelve por slug y traduce con el diccionario del locale — verificado en producción que los 4 idiomas devuelven 200. El slug marca el **mercado/retailer**, no el idioma. Sin corregirlo, el sitemap (que sí declara hreflang) y la página se contradecían ante Google.
- `[Verificado en vivo]` (`clicks-rails-00012-2m2` + `clicks-web-00026-vkk`, ambos digests confirmados contra el registry):
  - Endpoint Rails: **70 productos, 70 slugs únicos, 0 sin `updated_at`**.
  - `sitemap.xml`: **200**, `application/xml`, XML válido, **292 `<url>`** = 280 de producto (70×4) + 12 estáticas. **0 duplicadas**. Bajo el tope de 50k. hreflang completo con `x-default`.
  - `robots.txt` ya apuntaba al sitemap ✅. 3 URLs de producto tomadas al azar del sitemap → **200** las tres.
  - Página de producto: canonical auto-referenciado + los 5 `<link rel="alternate">`.
- `[Verificación automatizada]`: **12 tests nuevos** (`src/app/__tests__/sitemap.test.ts`) que fijan el contrato de fallo contra cada modo real: red caída, HTTP 500, JSON inválido, payload no-array, timeout, filas corruptas (incluido `../../etc/passwd`), dedupe, `updated_at` ausente/basura y el tope de 50k. Suite total **23/23**.

## 2026-07-30 · 🔬 AUDITORÍA PROFUNDA — 2 fallos críticos en producción, encontrados y cerrados

- `[Orden del titular]`: *"haz un análisis completo y profundo para inspeccionar y buscar posibles errores que deriven en problemas y posibles caminos para lograr una web más robusta"*.
- `[Método]`: inspección real con herramientas (no revisión de memoria) — sondas HTTP contra producción, consultas de integridad a Cloud SQL, lectura de configuración de Cloud Run/Scheduler/Monitoring, y **disparo de los pipelines reales** para observar su comportamiento en vivo. Los dos hallazgos críticos aparecieron justamente al *ejecutar*, no al leer.

### 🔴 CRÍTICO 1 — Inyección remota no autenticada (cerrado)

- `NotebooksController` **no incluía `InternalApiAuth`** y Rails corre con `ingress: all`. Verificado explotable contra producción:
  - `POST /api/v1/notebooks` → **422** (pasó auth, solo falló la validación). Con payload válido, cualquiera en internet podía **inyectar productos con SUS propios links de afiliado** (desviando comisiones) o links de phishing con la marca del sitio.
  - `POST /api/v1/notebooks/hardware_news` → **201 SUCCESS**. Inyección directa al ticker del home, con `source_url` como enlace clickeable para todos los visitantes.
  - Control: `/users/:id/favorites` → 401 (esa sí estaba protegida — el concern existía, este controller simplemente no lo usaba).
- `[Forense]`: auditados los 230 registros de `hardware_news` — los 10 dominios de origen son todos feeds legítimos. **Sin evidencia de explotación.**
- `[Fix en dos lados]` (ninguno de los 2 escritores de Python mandaba la cabecera; protegiendo solo Rails se rompía el pipeline): `X-Internal-Key` en `master_orchestrator` y `news_radar`; en Rails `include InternalApiAuth` + `skip` solo en las lecturas (`index`, `hardware_news`, `sitemap`) que consume el SSR. Se hace por `skip` y no por `only:` para que **una acción nueva nazca protegida** (fail-safe).
- `[Deploy ordenado]` Python → Rails, para no dejar ventana con el pipeline caído.
- `[Verificado]`: escrituras sin clave → **401** ambas · lecturas públicas → **200** las cuatro · sitio 200 en los 4 idiomas · catálogo renderiza 30 productos.

### 🔴 CRÍTICO 2 — 3 agentes POSTeaban a un 404: noticias 51 días congeladas (cerrado)

- `[Cómo apareció]`: al **probar** el fix anterior disparé el `news-radar` y Rails respondió **404**, no 201. El log lo reportaba como `[SUCCESS]`.
- `[Causa raíz]`: `RAILS_API_URL` en Cloud Run vale `.../api/v1/notebooks` (con path, porque el `MasterOrchestrator` lo usa así para POSTear productos). Tres agentes le concatenaban encima su propio path → `.../api/v1/notebooks/api/v1/notebooks/hardware_news` = **404**.
- `[Impacto medido]`:
  - **Noticias del sitio congeladas desde el 2026-06-09 → 51 días de atraso**, con el radar corriendo cada 6 h y logueando éxito.
  - **`LegalAgent`: TODAS las alertas de cambio en ToS murieron en ese 404.** El producto final del agente legal —lo que justifica todo el vigilante— nunca llegó al sitio.
  - `MarketIntelligence`: su GET de noticias devolvía `[]` siempre → el calendario promocional se generaba **sin contexto de noticias**.
  - `MasterOrchestrator` y `PriceAlertAgent` **no** estaban afectados (URL directa y `split` correcto).
- `[Fix estructural]` — nuevo `Python/src/rails_client.py` como única vía a Rails: `rails_base()` recorta en `/api/` y tolera las dos formas de la env var (es el mismo criterio que `legal_agent` ya aplicaba a Rust pero que nunca se aplicó a Rails); `NEWS_PATH`/`PRODUCTS_PATH` declarados una sola vez; `post_json()` autentica, **verifica el status** y loguea el modo de fallo distinguiendo 401 / 404 / otro.
- `[Verificado en vivo]`: disparado el radar tras el deploy → **"54 artículos guardados en Rails"**. Antigüedad de las noticias: **51 días → 0 días**. Titulares de hoy servidos por la API.
- `[Lección, más importante que el bug]`: **un status code impreso no es un status code verificado.** El código hacía `f"Rails respondió {resp.status_code}"` dentro de un mensaje `[SUCCESS]`. Durante 51 días los logs dijeron éxito.

### 🟠 Robustez de la capa web (cerrado)

- `[Bug de disponibilidad]`: el fallback al catálogo US era un `await fetch` **desnudo, sin try/catch** — los dos fetch principales del home usan `Promise.allSettled`, pero ese no. Con Rails caído el home hacía **500 para todo visitante no-US** (es la rama que solo corren ellos). Ahora en try/catch: catálogo vacío es degradación, un 500 no.
- `[Timeouts]`: **ningún** fetch de Web→Rails tenía timeout (solo el sitemap, agregado el 2026-07-28). Un Rails colgado bloqueaba el render hasta el límite de request de Cloud Run — minutos de pestaña en blanco. Agregado `AbortSignal.timeout(8s)` en home, detalle y el helper `railsApi` (cubre perfil, favoritos y alertas).
- `[Error boundaries]`: **no existía ningún `error.tsx` ni `not-found.tsx`.** Una excepción no atrapada mostraba la pantalla por defecto de Next —en inglés, sin marca y sin salida— a un visitante que puede estar en cualquiera de los 4 idiomas. Creados ambos: `error.tsx` con copy ×4 resuelto por el locale de la URL (sin importar diccionarios a propósito: si el fallo viene de leer un diccionario, importarlo ahí tumbaría también al boundary) y `not-found.tsx` que devuelve al catálogo — con 292 URLs en el sitemap los 404 por producto retirado son inevitables. Verificado en vivo: `/es/laptop/producto-que-no-existe` → 404 con la página propia.
- `[Menor]` `encodeURIComponent` en el slug de la página de detalle (iba crudo a la query string).

### 🔴 CRÍTICO 3 — Cloud SQL sin backups (cerrado)

- `settings.backupConfiguration.enabled = **False**` y `gcloud sql backups list` devolvía **vacío**: **cero backups existían**. Presumiblemente se perdió en la migración de costos del 2026-07-17 (`clicks-db`→`clicks-db2` se creó por import y la config de backup no se rehabilitó). La migración de imágenes que corrí el 2026-07-27 fue sobre una base **sin red de recuperación**.
- `[Corregido]`: backups automáticos activados (06:00 UTC, retención 7) + **backup on-demand tomado ya** (`1785389908167`, SUCCESSFUL) para no depender de esperar la ventana. Costo despreciable: la base pesa 9.2 MB. `deletion-protection` ya estaba ON ✅.

### 🟠 Observabilidad: la alerta existía pero no podía disparar

- Había 1 política de alerta con canal de email al titular, filtro `textPayload:"- [CRITICAL]"`. **Los fallos reales nunca alcanzan esa severidad**: el de las noticias logueaba `[SUCCESS]`, y aun con el fix de hoy loguea `[ERROR]`. La alerta estaba afinada a un nivel que los modos de fallo reales no tocan — ésa es la razón de fondo de los 51 días.
- `[Corregido]`: nueva política **"Pipeline desconectado — Rails rechaza escrituras de los agentes"**, con filtro dirigido a las firmas específicas (`RECHAZÓ el lote`, `NO PUBLICADA`, `INTERNAL_API_KEY ausente`, `path duplicado`) en vez de a todo `ERROR` — así no se ahoga en el ruido rutinario de feeds RSS que fallan (SSL de CNET, timeout de Wired son normales). Rate limit 1 h. Mismo canal de email.

### ✅ Lo que se auditó y está bien

- **Headers de seguridad**: CSP completa, HSTS con `preload`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. (Única observación: el CSP necesita `unsafe-inline`/`unsafe-eval` en `script-src`, limitación habitual de Next.)
- **Integridad de datos en producción**: 0 productos sin precio, 0 sin retailer, 0 `url_afiliado` vacía, 0 `deal_score` fuera de rango, 0 slugs duplicados.
- **`InternalApiAuth`** usa `secure_compare` y rechaza clave vacía — implementación correcta.
- **SQL**: un solo `execute` crudo (`hardware_news`), con `connection.quote` sobre un valor ya saneado a 2 caracteres. Sin riesgo de inyección.
- **`geo_controller`**: solo lectura, con guardas SSRF explícitas sobre `X-Forwarded-For` y validación `IPAddr`.
- **Timeouts en Python**: los 6 puntos de red tienen timeout.
- **Sin secretos hardcodeados** en ningún servicio.
- **`deletion-protection`** activa en Cloud SQL.

### 🔴 Deuda que queda (no resuelta — requiere decisión)

1. **Rails, Python y Rust tienen CERO tests** (~7.000 líneas). Solo Web tiene 23. Los dos fallos críticos de hoy los habría atrapado un test de integración trivial. **Es la deuda #1**: sin framework de test en esos 3 servicios, cada deploy es fe. Propuesta: `pytest` para Python (empezando por `rails_client`, que es exactamente la clase de bug que apareció) y `minitest`/`rspec` para Rails (empezando por un test de que las escrituras exigen la clave).
2. **CSP con `unsafe-inline`/`unsafe-eval`** — mitigable con nonces, requiere trabajo en el layout.
3. **PITR (point-in-time recovery)** sigue apagado — los backups diarios cubren el caso grave, PITR cubriría "deshacer las últimas 2 horas". Cuesta algo más de storage por los binlogs.
4. **`clicks-rust` se despliega con tag `latest`** (los otros 3 usan el SHA del commit). Con `latest` no hay forma de saber qué código corre ni de hacer rollback preciso.
5. **Sin healthcheck externo del dominio**: si `clicks-and-go.com` cae, nadie se enteraría hasta que un humano lo abra. Un uptime check de GCP cuesta centavos.

## 2026-07-30 (cont.) · 🧪 DESPLIEGUE AGRESIVO DE TESTS — 231 tests y 2 bugs más

- `[Orden del titular]`: *"implementá y hacé un despliegue agresivo de tests para lograr la mayor robustez posible, el margen de error debe ser 0"*, más la lista de recomendaciones de un análisis externo (Gemini 3.5).
- `[Primero: verificar el análisis externo]`. Los archivos que citaba existen todos. Una afirmación era **inexacta**: `migration_integrity_v5.sql` no tiene "CHECK constraints para URLs de imágenes" — sus CHECKs son de `deal_score`, precios y `target_price`; el de imágenes está en la **v6**, escrita en esta misma sesión. El resto de los diagnósticos técnicos se verificaron leyendo el código antes de actuar.

### Infraestructura de test creada desde cero

| Servicio | Antes | Ahora | Corre contra |
|---|---|---|---|
| Python | 0 | **117** (pytest) | mocks + red simulada |
| Rails | 0 | **68** (minitest) | **Postgres 15 real** |
| Web | 23 | **46** (vitest) | mocks |

- `[Python]` `requirements-dev.txt` separado (pytest **no** entra a la imagen de producción), `pytest.ini` con `pythonpath=.`, `conftest.py` que apaga la verificación HTTP de imágenes y el FX en vivo → la suite corre **offline** salvo que el test mockee la red.
- `[Rails]` No existía **ningún** `config/environments/`: el proyecto solo corría en production. Creado `test.rb` con `null_store` (un `Rails.cache.fetch` con TTL haría que un test vea el resultado del anterior). **Doble guarda contra tocar producción**: `bin/test` hace `unset DATABASE_URL` —en este repo apunta a Cloud SQL y Rails la prioriza sobre host/username— y `test_helper.rb` aborta si el nombre de la base no termina en `_test`. Fábricas sin FactoryBot: `normalized_offer` replica el payload exacto de `data_normalizer.py`, así el test **documenta el contrato Python→Rails**.

### 🔴 BUG 4 — Drift de esquema: el repo no era reproducible (cerrado)

- Apareció al correr el primer test de noticias: devolvía `[]`. La causa no era el test — **`hardware_news.source_url` existe en producción pero NO en los `.sql` del repositorio**. Se agregó a mano en algún momento, sin archivo de migración.
- El síntoma era invisible por diseño: `notebooks#hardware_news` la incluye en su `SELECT`, así que sobre una base reconstruida desde el repo la query lanza `PG::UndefinedColumn`, y el `rescue StandardError` del controller lo convierte en `render json: [], status: :ok`. **El sitio se quedaría sin noticias devolviendo 200**, sin error visible en ninguna parte.
- Comparación completa prod↔repo (94 vs 98 columnas): **era el único drift real**; las otras 5 filas son bookkeeping de Rails (`schema_migrations`, `ar_internal_metadata`).
- `[Corregido]` `migration_news_source_url_v7.sql`, idempotente, aplicada en producción y en la base de test. **Los backups guardan los datos; esto guarda la estructura** — un restore desde cero ya no produce una base distinta.

### 🔴 BUG 5 — Race condition en el historial de precios (cerrado)

- Recomendación externa **confirmada leyendo el código**: `latest_price` se leía fuera de todo bloqueo y el `MasterOrchestrator` postea con `ThreadPoolExecutor(max_workers=5)`. Dos requests del mismo SKU veían el mismo precio previo y **ambas insertaban** → historial duplicado.
- No es solo ruido: envenena el futuro cálculo del **mínimo de 30 días** que exige la Directiva Omnibus para poder volver a mostrar descuentos (ver `redesign_plan.md`).
- `[Corregido]` `laptop.lock!` (`SELECT … FOR UPDATE`) **+ consulta explícita** a `PriceHistory` en vez de la asociación `has_one`, que quedaba cacheada por el `find_or_initialize_by` y **anulaba el propósito del lock**. Ese segundo detalle es la parte que el análisis externo no mencionaba y sin la cual el fix no funcionaba.

### Recomendaciones externas: aplicadas, y una redimensionada

1. **Retries en `railsApi`** ✅ — implementado con backoff (3 intentos, 200/400 ms) ante 429/502/503/504 y fallo de red. **Lo importante es qué NO se reintenta**: `toggleFavorite` es un POST no idempotente y repetirlo dejaría el corazón en el estado contrario al que pidió el usuario. Se reintentan GET/HEAD y los PATCH explícitamente marcados como idempotentes (`profile`, `geo`). Hay 23 tests que fijan exactamente eso.
2. **Pessimistic lock** ✅ — ver BUG 5.
3. **Cola de mensajes para emails** ⚠️ **redimensionada**. Se propuso "desacoplar en una cola con persistencia para evitar pérdida de emails". Verificado en el código: **los emails no se pierden hoy** — `check_and_notify` solo marca como notificadas las alertas cuyo envío devolvió `True`, así que *una fila no marcada ES la cola* y Postgres ya es su capa de persistencia. El problema real es distinto: el ciclo es **diario**, así que un 503 puntual de Resend retrasa el aviso ~24 h. Fix proporcionado: **reintento con backoff dentro del envío individual** (3 intentos; un 4xx que no sea 429 no se reintenta porque es determinista). Una cola aparte habría sumado infraestructura sin resolver nada que esto no cubra.
4. **Monitoreo sintético** ✅ — había **0 uptime checks**. Creado uno cada 5 min contra `https://clicks-and-go.com/es` desde **USA, Europa y Sudamérica**, con alerta al email del titular cuando falla en **más de 2 regiones** (una sola región fallando es ruido de red, no el sitio caído).

### Qué cubren los 231 tests

- **Seguridad** (15): escrituras sin clave → 401 y **no persisten**; clave incorrecta/incompleta/vacía rechazadas; las 4 lecturas siguen públicas; rutas por usuario protegidas contra IDOR; **fail-closed** si `INTERNAL_API_KEY` no está seteada.
- **El bug de los 51 días** (26): la URL no duplica `/api/v1/` en los 5 formatos reales de la env var; `post_json` considera éxito **solo** 2xx — literalmente el test que faltaba.
- **Política de imágenes reales** (37 + 19): los 8 hosts de stock y sus subdominios; 404, 403 de Scene7, 302-a-HTML de ASUS y el placeholder de marca de MSI por hash; el CHECK de Postgres rechaza stock y `http://` **incluso vía `update_column`**, que saltea las validaciones de Rails.
- **Contrato DTO** (18): si una clave se renombra, `laptop.ts` rompería en silencio; ahora falla la suite.
- **Persistencia** (16): upsert idempotente, slug preservado (permalinks), sin historial duplicado, link de afiliado intacto.
- **Reintentos** (23 + 18): incluido qué **no** se reintenta.

### Detalles operativos

- `Gemfile.lock` **no se commitea**: el Docker usa **Ruby 3.2** y este entorno **3.4.7**; un lock resuelto acá puede romper el build de producción. Alinear versiones queda como mejora aparte.
- `[Verificado en vivo]` tras desplegar los 4 servicios con digests confirmados (`clicks-rails-00014-29q`, `clicks-web-00028-bdd`, `clicks-python-00023-t7t`): sitio 200 ×4 idiomas · escrituras 401 ×2 · sitemap 292 URLs · 20 noticias con `sourceUrl` · catálogo US 30 productos.

## 2026-07-30 (cont.) · 🎨 Escalada visual — sistema de motion y rediseño del placeholder

- `[Orden del titular]`: *"que el sitio escale a nivel visual con más animaciones e interacciones, más reactivo, y lograr una robustez visual que impacte"*.
- `[Restricción sostenida]`: colores (#2563eb) y tipografía (Barlow) **no se tocan** — es la misma condición del primer rediseño. Todo el trabajo se construye SOBRE el design system, no encima de él.

### 🐛 2 bugs visuales encontrados al auditar

1. **Navbar translúcido con contenido detrás**. El `useEffect` solo registraba el *listener* de scroll y nunca leía la posición **inicial**. Al entrar por un ancla (`/es#productos`) o al recargar con scroll restaurado, el navbar quedaba en su estado de reposo con el catálogo pasando por detrás y el logo ilegible. Fix: llamar `handleScroll()` una vez al montar.
2. **`backdrop-filter` no se aplicaba**. Verificado en producción tras el primer deploy: `getComputedStyle(nav).backdropFilter` devolvía **`"none"`**, así que el fondo quedaba al 72% **sin frost** y el catálogo se leía nítido detrás del logo — exactamente el ruido que el rediseño buscaba eliminar. `backdrop-filter` además falla en navegadores viejos y en algunas GPU: **apoyar la legibilidad en él es frágil para un sitio global**. Fix: fondo opaco por sí solo (0.94; 0.90 sin scroll) y el desenfoque como mejora progresiva. Test que falla si alguien baja la opacidad de `glass-effect` por debajo de 0.9.

### 🔴 Hallazgo de accesibilidad: 10 utilidades sin guard

El test nuevo destapó que `nvidia-ticker-track`, `search-nvidia`, `nav-link`, `btn-nvidia`, `scroll-indicator`, `card-hover`, `card-bloom`, `carousel-arrow`, `reveal-in` y `skeleton-shimmer` animaban **sin excepción para `prefers-reduced-motion`** (WCAG 2.1 — 2.3.3). Para parte de las personas el movimiento en pantalla provoca mareo o migraña.

En vez de parchear diez utilidades una por una, se agregó una **red de seguridad global** en `@layer base` que neutraliza todo el movimiento — incluido el CSS de terceros y cualquier animación futura. Detalle que importa: se usa `animation-duration: 0.01ms` y **no `animation: none`**; esto último congelaría en su frame 0 a cualquier animación `forwards` que arranque en `opacity: 0`, dejando elementos invisibles para siempre.

### El cambio de mayor impacto: el placeholder de producto

Era una caja gris con un ícono de 44px. Es el estado del **97% del catálogo** (68 de 70 productos sin foto real verificada), o sea *la* superficie visual del sitio. Rediseñado en tres capas: malla de gradientes en el azul del sistema (`product-canvas`), aros concéntricos que dan escala y profundidad, e ícono 1.55× flotando que vira a azul y escala con el hover de la card. **Nada de esto insinúa ser el producto** — la línea legal de la política de imágenes reales sigue intacta.

### Sistema de motion (`globals.css`)

Easings `--ease-spring` y `--ease-in-out-soft`; keyframes `floatSoft`, `orbDrift`, `popIn`, `sheenSweep`. Utilidades, **cada una con su propio guard** además de la red global: `lift-card` (elevación 6px + sombra + borde azul, reemplaza a `card-bloom`), `sheen` (barrido de luz diagonal), `pressable`, `float-soft`, `orb-drift`, `pop-in`, `underline-grow`, `product-canvas`. `btn-primary` ahora barre luz y se hunde al click.

### Componentes reactivos nuevos

- **`ScrollProgress`** — barra de progreso de lectura. El home es largo (hero → confianza → categorías → 30 cards → banners → ofertas) y sin señal de avance el visitante no sabe cuánto falta. Usa `transform: scaleX` (corre en el compositor) y `requestAnimationFrame`, **no `width`**, que recalcularía layout en cada frame de scroll.
- **`CountUp`** — contador que sube al entrar en pantalla con `easeOutExpo`. Reserva el ancho del valor final desde el primer render → **CLS 0**. El número ya viene calculado del servidor: esto es solo presentación (la Constitución prohíbe matemática de negocio en el frontend).

### Verificado en vivo (`clicks-web-00030-d4w`, digest confirmado)

| Métrica | Resultado |
|---|---|
| `navbar_bg` | `rgba(255,255,255,0.94)` ✅ |
| Placeholders nuevos | **30** |
| Cards con `lift-card` | **41** |
| Superficies con `sheen` | **32** |
| Barra de progreso | presente |
| **CLS** | **0.0000** |
| Imágenes rotas | **0** |
| Bloques `prefers-reduced-motion` en el CSS servido | **10** + `scroll-behavior:auto` |

- `[Nota de método]`: la verificación por `document.styleSheets` dio un falso negativo en la red de reduced-motion — el bucle no atraviesa `@layer`. Se confirmó descargando el CSS servido y buscando la regla en el texto. Vale como recordatorio: cuando un chequeo en el navegador dice "no está", verificar el artefacto real antes de concluir.
- `[Verificación local]`: `next start` **no funciona con `output: standalone`** (el proyecto lo usa para Docker). Para previsualizar hay que correr `node .next/standalone/server.js`. Se dejó anotado porque costó varios intentos.
- `[Verificado]`: tsc 0 · ESLint 0 · vitest **54/54** · build ✓.

## 2026-07-30 (cont.) · 🔬 Verificación por COMPORTAMIENTO — 3 fallos que los tests no veían

- `[Origen]`: el titular señaló la nota de método del turno anterior (una verificación por `document.styleSheets` había dado un falso negativo) y pidió **revisar hasta que todo funcione perfectamente**.
- `[Método]`: en vez de leer CSS o código, se **midió comportamiento** en un navegador real con la media feature emulada (`page.emulateMedia({ reducedMotion })`), comparando `getComputedStyle` entre estado normal y estado hover/reducido. **Los 3 fallos que siguen daban verde en `tsc`, ESLint, los 55 tests y el build.**

### 🔴 FALLO 1 — El scroll suave ignoraba `prefers-reduced-motion`

- La verificación por texto decía OK: la regla `html { scroll-behavior: auto }` estaba en el CSS, dentro del media query y en el orden correcto. En el navegador computaba **`smooth`**.
- **Causa**: `<html>` llevaba la clase `scroll-smooth` de Tailwind. Una clase (especificidad 0,1,0) le gana a un selector de elemento (0,0,1) **incluso dentro de `@media`**. Para alguien con trastorno vestibular, el scroll suave es exactamente lo que la preferencia busca evitar.
- **Fix doble**: se quita la clase (era redundante, `html { scroll-behavior: smooth }` ya está en `@layer base`) y se blinda la regla con `!important`, para que ninguna utilidad futura pueda volver a pisar la preferencia.
- **Lección**: un test que analiza texto **no puede detectar problemas de especificidad**. Quedó escrito en el encabezado de `motion-a11y.test.ts`.

### 🔴 FALLO 2 — La card no se elevaba al hover (la interacción firma del rediseño)

- Medido: `transform` **idéntico** en reposo y en hover (`matrix(1,0,0,1,0,0)`), mientras `borderColor` y `boxShadow` **sí** cambiaban. O sea: el `:hover` disparaba, pero el movimiento estaba bloqueado.
- **Causa**: `stagger-children` aplica `animation: fadeInUp … forwards`, y **el fill de una animación gana sobre las declaraciones normales en la cascada**. Mientras `fadeInUp` animara `transform`, el `transform` del hover de `lift-card` quedaba pisado.
- **Primer intento equivocado**: envolver la card en un `div` en `CatalogSection`. Al re-medir apareció que el elemento que seguía fallando era una card de **CategoryShowcase** — son **6** los componentes que usan `stagger-children`, así que envolver cada uno era el fix equivocado.
- **Fix correcto, en el CSS y una sola vez**: `fadeInUp` anima la propiedad **independiente `translate`** en vez de `transform`. Son propiedades distintas y el navegador las **compone**, así que la entrada y el hover conviven. Se revirtió el wrapper.
- **Confirmado en vivo**: reposo `none` → hover `matrix(1, 0, 0, 1, 0, -6)`, en cards de categoría **y** de producto.
- Degradación: en navegadores sin soporte de `translate` (pre-2022) la card entra sin desplazamiento, pero el fade y el hover siguen funcionando.

### 🔴 FALLO 3 — `CountUp` duplicaba el número en el DOM

- Para reservar el ancho renderizaba un `<span>` oculto con el valor final. Visualmente correcto, pero `textContent` devolvía **`"3030 productos"`** en vez de `"30 productos"` — invisible a la vista y capaz de romper scraping, tests y cualquier herramienta que lea texto.
- **Fix**: reservar el espacio con `ch` por dígito + `tabular-nums`. Mismo CLS 0, sin texto fantasma.

### Verificación final por comportamiento

| Chequeo | Normal | Reduced-motion |
|---|---|---|
| `scroll-behavior` | `smooth` | **`auto`** ✅ |
| Halos del hero | `18s` | **`0.00001s`** ✅ |
| Ícono flotante | `5s` | **`0.00001s`** ✅ |
| Cards invisibles | **0** de 41 | **0** de 41 ✅ |

| Salud | Resultado |
|---|---|
| Hover eleva la card | `matrix(1,0,0,1,0,-6)` ✅ |
| **CLS** | **0.0000** |
| Imágenes rotas | **0** |
| Contador | `"30 productos"` (sin duplicado) |
| `navbar_bg` | `rgba(255,255,255,0.94)` |
| Placeholders nuevos | 30 · barra de progreso presente |
| Idiomas | es/en/pt/it → **200** |

- `[Conclusión de método]`: para CSS, **verificar el artefacto no alcanza — hay que verificar el comportamiento**. La cascada, la especificidad y la precedencia de las animaciones no son visibles ni en el código fuente ni en el CSS compilado. Las tres fallas de esta sesión eran de ese tipo y ninguna suite basada en texto podía atraparlas.
