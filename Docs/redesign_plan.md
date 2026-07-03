# 🚀 Clicks & Go - Plan de Arquitectura y Escalabilidad (v4.3 Enterprise)

**Visión Actualizada:** Ecosistema maduro de 4 Microservicios con especialización estricta. Arquitectura Zero-Trust, Server-Side Rendering puro, recolección API-First, contingencia de latencia cero (Antigravity), orquestación de concurrencia en Rust y persistencia políglota.

## 🟢 FASE 1: Amputación y Limpieza (100% Completado)
Objetivo: Eliminar el monolito híbrido y el solapamiento de tareas.
- [x] Extraer agentes cognitivos (UI, UX, SEO) y DB de Next.js.
- [x] Extraer web scraping y llamadas a Vertex AI de Rust.
- [x] Adoptar Docker Compose con dependencias de salud (`service_healthy`).

## 🟢 FASE 2: Especialización de Microservicios (100% Completado)
Objetivo: Asignar a cada lenguaje su tarea ideal bajo principios SOLID.
- [x] **Python (El Cerebro):** Instanciación del `MasterOrchestrator`. Transición a `MarketHunter` (API-First). Motor Semántico optimizado con Gemini 2.5 Flash.
- [x] **Rust (El Motor):** API matemática con `axum` y `ConcurrencyRouter` para procesamiento paralelo masivo. `DevopsAgent` inyectando logs a MongoDB.
- [x] **Rails (El Guardián):** Único dueño de PostgreSQL. Implementación de transacciones ACID, serialización de DTOs y Upserts automáticos.
- [x] **Next.js (La Fachada):** Purificación extrema. Eliminación de la carpeta `/api/`. Transición a **Server Components (SSR)** puros conectándose directamente a Rails internamente para latencia cero.

## 🟢 FASE 3: Interconexión, Contingencia y Red (100% Completado)
Objetivo: Lograr un ecosistema resiliente, a prueba de fallos y de consumo controlado.
- [x] **Proxy Edge Perimetral:** Activación de `middleware.ts` para enrutamiento geográfico dinámico (`x-vercel-ip-country`) y ofuscación de URLs de afiliados (`/out`).
- [x] **Protocolo Antigravity:** Heurísticas de fallback activadas en Python ante caídas de Gemini o límites de cuota persistidos en disco.
- [x] **Sincronización DTO:** Alineación perfecta del contrato JSON (`laptop.ts` de TS, `laptop.json` de Schema, y el serializador de Rails). Corrección del Bug de Hiperinflación Monetaria.

## 🟢 FASE 3.5: Hardening de Consistencia y Cloud (2026-06-05 — Completado)
Objetivo: Eliminar las inconsistencias que rompían visualización, divisas e i18n, y cablear la IA real.
- [x] **Datos/Esquema Cloud SQL:** `deal_score` re-escalado a 1.0–10.0; país alineado con moneda; enum `currency_type` completado (7 monedas); `hardware_news.country_code` para geolocalización; catálogo y noticias multi-región sembradas. Tabla `price_histories` (plural).
- [x] **Contrato DTO:** serializer de Rails alineado 1:1 con `laptop.ts` (currency, `applied_exchange_rate`, `discount_pct`, `ai_score_label`, `price_trend`, `category`, `seo`). Tipo de cambio persistido en `tipo_cambio_aplicado`.
- [x] **Rust:** corregido el `ScoreResult` que impedía compilar; campos financieros con `serde(default)`; nueva ruta `POST /api/v1/benchmarks/run`.
- [x] **Proveedores IA:** capa `src/providers/` (Vertex AI primario + Antigravity fallback) con `ProviderRouter` y failover. Estado expuesto en `GET /health`.
- [x] **MarketHunter:** mapeo correcto de `site_id` de MercadoLibre (solo LATAM), detección real de marca, imágenes forzadas a https.
- [x] **Frontend i18n:** textos hardcodeados movidos a diccionarios (es/en/pt). Divisas y referencia USD provienen del backend. Imágenes de alta calidad (AVIF/WebP, quality 90–95) y slider de noticias rediseñado con imágenes editoriales.
- [x] **Afiliación/Geo:** tags de afiliado para BR/CO/CL; redirección de idioma según ubicación; noticias filtradas por país.
- [x] **Infra:** `docker-compose` híbrido (cloud/local), `MONGO_URI`/`MONGODB_URI` unificado, credenciales Vertex montadas en el contenedor.

> ⚠️ **Pendiente operativo:** Vertex AI responde HTTP 403 (`dunning`) por un problema de **facturación** del proyecto GCP `clicks-and-go`. Hasta regularizarlo, el sistema opera con Antigravity. Resolver en GCP → Facturación.

## 🟢 FASE 3.6: Overhaul UI/UX Consumer + Estabilización Docker (2026-06-05 — Completado)
Objetivo: Hacer el frontend 100% consumer-facing (sin jerga técnica), reparar bugs críticos de imágenes/i18n/Docker y elevar la calidad visual al nivel de referencia (NVIDIA-style).

- [x] **Imágenes de noticias:** Reemplazado `<Image>` Next.js (que proxea server-side) por `<img>` HTML nativo en `HardwareNewsSlider`. El browser fetcha directamente desde Unsplash sin pasar por el servidor GCP.
- [x] **HardwareNewsSlider:** Reescrito completo — flechas circulares modernas, skeleton shimmer, mapeo `CAT_IMAGES` por categoría, `onError` fallback, micro-animación en hover.
- [x] **i18n completo:** "Noticias" hardcodeado en `Navbar.tsx` (×2) y todo el footer en `layout.tsx` (Privacidad/Términos/Cookies/copyright) movidos a claves de diccionario. Diccionarios es/en/pt humanizados.
- [x] **Copy consumer:** Eliminado todo lenguaje técnico/agéntico del UI. Principio fijo: el usuario ve una plataforma de comparación de precios, no un sistema de agentes IA.
- [x] **Layout page.tsx:** Catálogo antes que noticias. Nuevas secciones: `StatsBanner`, `WhyTrustUs` (4 pilares), `HowItWorks` (3 pasos), `CTA Banner`.
- [x] **CSS scroll offset:** `scroll-padding-top: 6rem` en `html` — evita que la navbar fija tape el destino de anclas.
- [x] **Bug next.config.ts:** Faltaba `export default nextConfig` → `output: 'standalone'` ignorado → Docker build fallaba en `COPY .next/standalone`.
- [x] **Bug LanguageSelector:** Removido `useSearchParams()` que requería Suspense boundary en Next.js 14+.
- [x] **Docker healthcheck:** `localhost` resolvía a IPv6 `::1`; Next.js solo escucha en IPv4 → contenedor `(unhealthy)` en loop. Fix: `127.0.0.1:3000`. Sitio live en `http://34.44.182.166/es`.

## 🟢 FASE 4: Alta Disponibilidad — Cloud Run + Redis (2026-06-05 — Completado)
Objetivo: Preparar la infraestructura para soportar 50k–80k usuarios concurrentes en Google Cloud.
- [x] **Caché Redis en Rails:** `Rails.cache.fetch` en `GET /api/v1/notebooks` (TTL 60s por país) y `hardware_news` (TTL 5min). Fallback a `memory_store` sin REDIS_URL. Gems: `redis ~> 5.0`.
- [x] **Rate Limiting (Rack::Attack):** 120 req/min catálogo, 60 req/min noticias, 30 req/min escrituras. Bloqueo automático de SQLmap/Nikto/Nuclei. Respuesta 429 en JSON.
- [x] **Puma Multi-Worker:** `WEB_CONCURRENCY=2` workers + `RAILS_MAX_THREADS=5` hilos por worker = 10 requests paralelos por instancia Rails con `preload_app!` (CoW memory).
- [x] **Cache-Control para CDN (Next.js):** Headers `s-maxage=60, stale-while-revalidate=300` en catálogo; `s-maxage=300, stale-while-revalidate=3600` en detalle; `immutable` en assets estáticos.
- [x] **Manifests Cloud Run (Infra/cloud/):** 4 YAMLs (`cloudrun-{rails,python,rust,web}.yaml`) con autoscaling declarativo: Rails 1–20, Web 2–50, Python 0–5, Rust 0–10. Secretos vía Secret Manager.
- [x] **Script de Deploy (`Infra/cloud/deploy.sh`):** Build → Artifact Registry → `gcloud run services replace` para los 4 servicios en orden correcto. Soporte `--only <servicio>`.
- [ ] **Configurar Cloud CDN:** `gcloud compute backend-services update clicks-web-backend --enable-cdn` (requiere Load Balancer externo).
- [ ] **Crear Memorystore Redis:** `gcloud redis instances create clicks-redis --size=1 --region=us-central1` y agregar `REDIS_URL` a Secret Manager.
- [ ] **A/B Testing Algorítmico:** Medir CTR de etiquetas Vertex vs Antigravity vía telemetría MongoDB.
- [ ] **Colas Asíncronas (Phase 5):** Celery + Redis en Python para encolar 100k ofertas sin saturar RAM.

## 🟢 FASE 4.1: Rust Coprocesador Gemini + Optimización Total (2026-06-07 — Completado)
Objetivo: Convertir Rust en el pre-procesador de bajo costo para todas las tareas agénticas de Gemini, reduciendo tokens y latencia.

- [x] **HardwareCanonicalizer** (`POST /api/v1/hardware/canonicalize`): Normalización cross-retailer de CPU/GPU, `HardwareTier` enum, `build_gemini_context()`.
- [x] **PriceSentinel** (`POST /api/v1/price/anomalies`): Moving average + z-score, flash sale heuristic, `gemini_trigger: bool`.
- [x] **LegalDiffer** (`POST /api/v1/legal/diff`): FNV-1a 64-bit hash (zero deps), risk scoring 0–100, `gemini_priority: "SKIP"|"NORMAL"|"URGENT"`. Ahorro ~98% tokens en Legal Agent.
- [x] **LinkValidator** (`POST /api/v1/links/validate`): HEAD concurrente, `Arc<Semaphore>` MAX=20, 5-hop redirect chain, timeout 12s.
- [x] **hardware_scorer.rs v4.3:** Intel Core Ultra 5/7/9, Apple M4 Pro/Max/Ultra, RTX 4050 (bug fix), Snapdragon X Elite/Plus, RTX 2060–2080 legacy. Funciones `cpu_score()` / `gpu_score()` públicas e `#[inline]`.
- [x] **concurrency_router.rs:** Sin clone innecesario (ownership directo), `score_one()` como free function `#[inline]`, error logging para panics.
- [x] **main.rs v4.3:** `HealthCache` TTL 5s, HTTP client pool tuneado, `CompressionLayer` gzip, body limit 4 MB.
- [x] **Cargo.toml:** `reqwest 0.12` (elimina `hyper 0.14` + `rustls 0.21` duplicados), `compression-gzip`, perfil `dev` incremental.
- [x] **Bug E0277:** `std::sync::MutexGuard` no cruzar `.await` en handler `/health`. Fix: 2 bloques separados. `cargo check` ✅ limpio.

## 🟢 FASE 4.2: Agente Legal "Abogado Digital" (2026-06-07 — Completado)
Objetivo: Monitoreo exhaustivo de ToS y políticas de privacidad de redes de afiliados para prevenir baneos.

- [x] **LegalComplianceAgent** (`Python/src/agents/legal_agent.py`): 12 URLs monitoreadas (Awin, CJ, Amazon, MercadoLibre, HP, Dell, Lenovo, Asus). SHA-256 snapshots en MongoDB.
- [x] **Arquitectura 3 capas:** Rust diff (gratuito) → Antigravity heurística (gratuito) → Gemini solo si `gemini_priority != "SKIP"` y solo con `gemini_brief`.
- [x] **Integración MasterOrchestrator:** Legal Agent como step 0 antes de NewsRadar.
- [x] **Endpoints Python:** `POST /api/v1/legal/audit` (mode=full|check) y `GET /api/v1/legal/status`.
- [x] **AntigravityProvider:** Soporte completo de `TASK_LEGAL_AUDIT` con señales CRITICAL/HIGH/MEDIUM y `significant_shrink`.
- [x] **Cloud Scheduler:** `legal-audit-daily` (03:00 UTC, full) + `legal-audit-6h` (cada 6h, check).

## 🟢 FASE 4.3: Catálogo SQL + Preparación Afiliados (2026-06-07 — Completado)
Objetivo: Tener contenido real en la BD para cumplir los requisitos de aprobación de redes de afiliados.

- [x] **seeds_catalog.sql:** 25 retailers (AR/US/ES/MX/BR), 40 laptops con metadata SEO completa, 40 price_histories. Scripts idempotentes.
- [x] **cloudrun-rust.yaml:** Eliminado emoji que causaba warning YAML non-ASCII.
- [x] **Stats honestos:** `StatsBanner` actualizado — 40K+/100+/12 reemplazados por 5 países / 100% gratis / Actualización diaria / 24/7 disponible (es/en/pt). Evita riesgo de baneo por afirmaciones falsas.
- [x] **Páginas legales:** `/{locale}/privacidad` y `/{locale}/terminos` creadas — 10 secciones c/u en es/en/pt. Links del footer actualizados a rutas reales.
- [ ] **Affiliate disclosure:** En product cards y footer (requerido FTC/RGPD).
- [ ] **Deploy a Cloud Run:** Sin URL pública no hay aprobación de afiliados (bloqueante crítico).
- [ ] **Resolver Vertex AI 403 billing** en GCP console (proyecto `clicks-and-go` / 798903122073).
- [ ] **Registrar en redes de afiliados:** Awin, CJ Affiliate, Amazon Associates (manual).
- [ ] **Configurar API keys** en `.env` y Secret Manager tras aprobación.

## 🟢 FASE 4.4: UI Restructure v2 + NewsRadar v2 (2026-06-07 — Completado)
Objetivo: Simplificar la página eliminando secciones redundantes, restaurar navegación desde navbar, y hacer que las noticias sean reales y se actualicen automáticamente.

- [x] **Limpieza de secciones:** CTA Banner y `HowItWorks` eliminados de `page.tsx` (redundantes con el resto del contenido).
- [x] **Reordenamiento:** `WhyTrustUs` movido arriba del catálogo (entre `StatsBanner` y `#productos`) — visible sin scroll.
- [x] **AIDealsSection restaurada:** Sección "Mejores Ofertas" devuelta a `page.tsx` con `id="ofertas"`. Navbar link `/#ofertas` funcional. Muestra top-3 laptops por `deal_score` descendente.
- [x] **Orden final de página:** Hero → Stats → WhyTrustUs → Catálogo → Mejores Ofertas → Noticias.
- [x] **NewsRadar v2:** 11 feeds RSS especializados (Tom's Hardware, The Verge, Ars Technica, Engadget, TechRadar, CNET, Wired, Xataka ES, NotebookCheck, Digital Trends, Laptop Mag). Filtra artículos off-topic por keywords. 6 ítems/feed.
- [x] **lxml instalado:** `requirements.txt` + `lxml>=5.0.0`. Parser XML: `lxml-xml` con fallback `html.parser`.
- [x] **Auto-loop 6h:** `_news_radar_loop()` en lifespan de `main.py` — corre al arrancar y cada 6 horas. Sin cron externo necesario.
- [x] **Rails LIMIT 20:** `hardware_news` devuelve 20 artículos (antes 10).
- [x] **Resultado:** DB 3 → 96 noticias reales de hardware. Slider muestra contenido fresh de fuentes reconocidas.

## 🟢 FASE 5: Autenticación v1.0 — OAuth + Magic Links (2026-06-09 — Completado)
Objetivo: Sistema de registro e inicio de sesión completo con OAuth (Google/Microsoft/Facebook) y magic links por email (Resend), sin contraseñas.

- [x] **Migración SQL:** `Infra/db/migration_auth_v1.sql` — columnas `last_name`, `phone`, `city` en tabla `users`; tablas `sessions` y `verification_tokens`. Ejecutada exitosamente en Cloud SQL.
- [x] **`Web/src/lib/db.ts`:** Singleton Pool de PostgreSQL (`pg@8.13`) con SSL en producción y connection pooling (max 10, idle 30s, connect 3s).
- [x] **`Web/src/auth.ts`:** NextAuth.js v5 (`5.0.0-beta.31`) con adapter custom `ClicksAdapter()` — necesario porque `@auth/pg-adapter` oficial usa camelCase con comillas SQL (`"emailVerified"`) mientras nuestro esquema usa snake_case (`email_verified`). Providers condicionales: solo activa Google/Microsoft/Facebook/Resend si las env vars correspondientes están seteadas (no crashea si falta alguna).
- [x] **`Web/src/app/api/auth/[...nextauth]/route.ts`:** Route Handler con `runtime = "nodejs"` (pg no es Edge-compatible).
- [x] **`/login` y `/register`:** Server Components con Server Actions para OAuth sign-in y magic link. Inline `"use server"` functions capturan `locale` del scope del componente. Client Component `MagicLinkForm.tsx` usa `useActionState` (React 19).
- [x] **`/panel`:** Dashboard protegido — `auth()` → redirect a `/login` si no hay sesión. Query directa a DB para datos de perfil. `ProfileForm.tsx` (Client Component) con `useActionState` para actualizar nombre/apellido/teléfono/ciudad.
- [x] **Navbar:** Botón "Mi Panel" con ícono `LayoutDashboard` cuando hay sesión activa; "Iniciar sesión" + "Registrarse" para visitantes. Session pasada como prop desde `layout.tsx` (Server Component) sin SessionProvider.
- [x] **Diccionarios i18n:** Sección `auth` completa en es/en/pt (30+ claves: loginTitle, registerTitle, emailLabel, linkSentTitle, panelTitle, profileSection, firstName, lastName, phone, city, etc.).
- [x] **Páginas legales:** `/{locale}/privacidad` y `/{locale}/terminos` — 10 secciones c/u en es/en/pt cubriendo GDPR/LGPD/Ley 25.326. ShieldCheck/FileText icons, dark theme glassmorphism.
- [x] **Footer links:** `/{locale}/privacidad` y `/{locale}/terminos` apuntando a rutas reales (antes `href="#"`).
- [x] **`.env`:** `AUTH_SECRET` generado (`openssl rand -base64 32`), `AUTH_URL=http://localhost`, placeholders para todos los providers OAuth.
- [ ] **Configurar credentials OAuth** (manual): Google Console, Azure App Registration (multi-tenant), Facebook Developers.
- [ ] **Resend:** Verificar dominio `clicksandgo.com`, obtener API key, setear `AUTH_RESEND_KEY`.
- [ ] **AAIP:** Registro en Agencia de Acceso a la Información Pública (Ley 25.326, Argentina) — responsabilidad del usuario.
- [ ] **`AUTH_URL`:** Cambiar a `https://clicksandgo.com` al deployar a Cloud Run.