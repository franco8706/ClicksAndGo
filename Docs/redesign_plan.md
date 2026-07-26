# 🚀 Clicks & Go - Plan de Arquitectura y Escalabilidad

**Visión:** Ecosistema maduro de 4 microservicios con especialización estricta. Arquitectura Zero-Trust, SSR puro, recolección API-First, contingencia de latencia cero (Antigravity), concurrencia en Rust y persistencia políglota. Arranca con afiliación de notebooks; escala a otras verticales de producto.

> Este documento es el **roadmap** (qué falta y en qué orden). El detalle técnico de cómo se implementó cada fase vive en `bitacora_sistema.md`. Las reglas permanentes de arquitectura viven en `contexto_maestro.md`.

---

# 🎯 Próximos pasos (backlog priorizado)

**El estado actual:** todo el producto está construido y verificado en desarrollo (build/tsc/lint/tests verdes). Lo que falta es, en su mayoría, **operativo de lanzamiento** (deploy real + configuración de cuentas externas), no código nuevo. Esta es la ruta para avanzar, de más a menos urgente:

### 🔴 Bloqueante para lanzar (deploy + aprobación de afiliados)
1. ✅ **Deploy a Cloud Run con URL pública** — HECHO 2026-07-14. Multiproducto EN VIVO: `https://clicks-web-2myrvivvhq-uc.a.run.app/es`. Ver bitácora de esa fecha.
2. ✅ **Migraciones en Cloud SQL** — HECHO 2026-07-14 (backup previo → `user_v2`→`products_v3`→`alerts_v4`→`integrity_v5` + `seeds_products_multi`). 70 productos, 9 tipos, 0 violaciones.
3. ✅ **Boot real de Rails validado** — build Docker real + smoke-test production contra Postgres + deploy vivo sirviendo `/api/v1/products?type=`.
4. ✅ **Build real de Rust validado** — `cargo build --release` en Docker + fix crítico de boot (timeout Mongo 30s→2s) + `/health` y scoring vivos en Cloud Run.
5. **Resolver Vertex AI 403 billing** (proyecto GCP `clicks-and-go`) — opera con Antigravity mientras tanto.
6. **Configurar cuentas externas**: OAuth reales (Google/Azure/Facebook), Resend (verificar dominio + API key → descomentar `AUTH_RESEND_KEY` en `cloudrun-web.yaml`/`cloudrun-python.yaml` y crear el secreto), `AUTH_URL` → dominio final.
7. **Registrarse en las redes de afiliados** (Awin, CJ, Amazon Associates) — manual. **← EL bloqueante de negocio actual.** Revisión pre-afiliación completada 2026-07-19: sitio cumple requisitos (disclosure visible, privacidad/términos públicos, `/out` con allowlist), vigilancia legal autónoma con alertas por email armada. Al firmar CJ: revisar el PSA manualmente (dejó de ser público). Pendiente técnico: **adaptador Amazon PAAPI** en MarketHunter (hoy solo hay MercadoLibre/Awin/CJ) — construirlo al obtener las keys de Associates.
8. **Registro AAIP** (Ley 25.326, Argentina) — responsabilidad del titular.

### 🟠 Corazón agéntico / re-engagement (post-lanzamiento cercano)
- ✅ **PriceAlertAgent (Python)** — construido en FASE 8 (ver abajo). Pendiente operativo: correr `migration_alerts_v4.sql` en Cloud SQL y configurar `AUTH_RESEND_KEY` (sin la key detecta pero no envía).
- ✅ **Sembrar catálogo multi-producto**: `seeds_products_multi.sql` — 22 productos (monitores, teclados, mouse, auriculares, webcams, impresoras, desktops, insumos) en US/ES/MX con `product_type` + `specs`. Validado contra Postgres real (esquema + migraciones + seeds, 62 productos totales). La fuente definitiva sigue siendo la ingesta agéntica.
- ✅ **Scoring por tipo** (FASE 9): `type_spec_bonus` en Rust suma calidad por señales de cada tipo (Hz/4K/panel, mecánico/wireless, ANC, dpi, wifi/ppm…). Pendiente operativo: `cargo check` + ratings/reseñas reales de ingesta.

### 🟡 Hardening / escala (cuando haya tráfico)
- **Endurecer `ingress`** de Rails/Rust/Python con IAM (`roles/run.invoker`) en vez de `all` + `INTERNAL_API_KEY` (defensa en profundidad).
- **Extender `INTERNAL_API_KEY`** a los endpoints de escritura consumidos por Python (`POST /products`, `/hardware_news`) — hoy solo dependen de rate limiting.
- **Cloud CDN** (requiere Load Balancer externo).
- **A/B testing algorítmico** (Vertex vs Antigravity vía telemetría MongoDB).
- **Colas asíncronas** (Celery + Redis) para picos de ingesta masiva.

### 🟢 Mejoras de producto / deuda menor
- ✅ **Buscador predictivo del hero** (FASE 9): generalizado a tipos de producto (sugiere las 9 categorías con ícono + tagline, y navega todas al enfocar). Antes sugería categorías de laptop que ya no filtraban nada.
- ✅ **Overhaul UI/UX consumer v2** (2026-07-26): anclaje de precio ML (tachado + chip % OFF), escaparate NVIDIA de ofertas (tabs progreso 7s), CategoryShowcase, PromoBanners por familia, EventBanner + chip promo (consume `MarketIntelligenceAgent`), ForYouRail (afinidad localStorage), noticias geo por feed. Ver bitácora.
- **PersonalizationAgent (fase 2 — usuarios logueados):** análisis agéntico real de actividad con Vertex/Gemini. Diseño Zero-Trust: (1) Rails suma tabla `user_activity_events` + endpoints `/api/v1/users/:user_id/activity` (InternalApiAuth); (2) Next.js postea eventos SOLO de usuarios logueados (consentimiento en `/panel`); (3) Python agrega un paso al `MasterOrchestrator` que analiza patrones (Vertex primario / Antigravity fallback) y persiste recomendaciones vía Rails; (4) la Web las lee del DTO. La capa anónima actual (localStorage) queda como fallback sin servidor.
- **`HardwareNewsSlider.tsx`**: código muerto tras el ticker inline — eliminar o reintegrar (decisión de producto).

---

# 📚 Historial de fases (todas completadas)

> Registro de lo construido en cada fase. Los ítems `[ ]` que veas abajo son pendientes que ya están **consolidados y priorizados en el backlog de arriba** — se dejan en su fase de origen solo como contexto. El detalle técnico de cada una vive en `bitacora_sistema.md`.

## 🟢 FASE 1: Amputación y Limpieza (Completado)
Eliminar el monolito híbrido y el solapamiento de tareas entre servicios.
- [x] Extraer agentes cognitivos (UI, UX, SEO) y DB de Next.js.
- [x] Extraer web scraping y llamadas a Vertex AI de Rust.
- [x] Docker Compose con dependencias de salud (`service_healthy`).

## 🟢 FASE 2: Especialización de Microservicios (Completado)
Asignar a cada lenguaje su tarea ideal bajo principios SOLID.
- [x] Python: `MasterOrchestrator` + `MarketHunter` (API-First) + Motor Semántico.
- [x] Rust: API matemática (`axum` + `ConcurrencyRouter`) + `DevopsAgent` → MongoDB.
- [x] Rails: único dueño de PostgreSQL, transacciones ACID, Upserts automáticos.
- [x] Next.js: Server Components puros, sin `/api/` propia, fetch directo a Rails.

## 🟢 FASE 3: Interconexión, Contingencia y Red (Completado)
Ecosistema resiliente, a prueba de fallos y de consumo controlado.
- [x] Proxy Edge Perimetral (`middleware.ts`): geo dinámico + ofuscación `/out`.
- [x] Protocolo Antigravity: fallback determinista ante caída/cuota de Gemini.
- [x] Sincronización DTO estricta (`laptop.ts` ↔ serializer de Rails).

## 🟢 FASE 3.5–3.6: Hardening + UI/UX Consumer (Completado)
Cloud SQL/DTO/Rust/Python consistentes; frontend 100% consumer-facing (sin jerga técnica); estabilización Docker.
- [x] Esquema Cloud SQL, contrato DTO, `ProviderRouter` con failover, i18n completo.
- [x] Overhaul visual (imágenes, slider de noticias, copy consumer, Docker healthcheck).
- [ ] Resolver Vertex AI 403 billing (proyecto GCP `clicks-and-go`) — opera con Antigravity mientras tanto.

## 🟢 FASE 4: Alta Disponibilidad — Cloud Run (Completado)
Infraestructura para tráfico concurrente en Google Cloud.
- [x] Cache (Redis opcional / memory_store), Rack::Attack, Puma multi-worker.
- [x] 4 manifests Cloud Run con autoscaling declarativo + `deploy.sh`.
- [ ] Cloud CDN (requiere Load Balancer externo).
- [ ] A/B testing algorítmico (Vertex vs Antigravity vía telemetría MongoDB).
- [ ] Colas asíncronas (Celery + Redis) para picos de ingesta masiva.

## 🟢 FASE 4.1–4.4: Coprocesador Gemini + Legal + Catálogo + NewsRadar (Completado)
Rust como pre-procesador de bajo costo para Gemini; monitoreo legal de afiliados; catálogo real sembrado; noticias reales automatizadas.
- [x] Rust: `HardwareCanonicalizer`, `PriceSentinel`, `LegalDiffer`, `LinkValidator`.
- [x] `LegalComplianceAgent` (12 URLs ToS/privacidad, arquitectura 3 capas, Cloud Scheduler).
- [x] `seeds_catalog.sql` (25 retailers, 40 laptops), páginas legales, stats honestos.
- [x] NewsRadar (11 feeds RSS, auto-loop 6h), disclosure de afiliados en cards/footer.
- [ ] Registrar en redes de afiliados (Awin, CJ, Amazon Associates) — manual.
- [x] Deploy a Cloud Run con URL pública (bloqueante para aprobación de afiliados) — EN VIVO desde 2026-07-14.
- [x] **SEO indexable** (2026-07-21): `app/robots.ts` + `app/sitemap.ts` sirven `/robots.txt` y `/sitemap.xml` reales en la raíz (base leída de `AUTH_URL` → migra sola al dominio); fix del middleware i18n que los redirigía a 404.
- [x] **Dominio propio EN VIVO** (2026-07-23): `clicks-and-go.com` registrado + verificado en Google Search Console + Cloud Run domain mapping (apex y `www`, ambos con cert de Google Trust Services). `AUTH_URL`/`PUBLIC_WEB_URL`/`AUTH_FROM_EMAIL` movidos al dominio propio; login Google/Microsoft verificado end-to-end (Facebook pendiente — falta cargar su redirect URI, decisión del titular). Email routing (`info@clicks-and-go.com` → Gmail) activo vía Cloudflare.
- [ ] Registrarse en Amazon Associates / Awin / MercadoLibre Afiliados y pasar credenciales → cablear en los adaptadores ya construidos (`market_hunter.py`).

## 🟢 FASE 5: Autenticación — OAuth + Magic Links (Completado)
Registro/login sin contraseñas: OAuth (Google/Microsoft/Facebook) + magic link (Resend).
- [x] Migración SQL (`migration_auth_v1.sql`), adapter custom snake_case, providers condicionales.
- [x] `/login`, `/register`, `/panel` protegido, páginas legales, feedback de error/verify.
- [ ] Configurar credentials OAuth reales (Google Console, Azure, Facebook) — manual.
- [ ] Resend: verificar dominio, obtener API key.
- [ ] AAIP: registro Ley 25.326 (Argentina) — responsabilidad del usuario.
- [ ] `AUTH_URL` → dominio final al deployar.

## 🟢 FASE 6: Dashboard de Usuario + Geo Global (Completado)
Panel post-login con favoritos y alertas de precio; catálogo y noticias personalizados por ubicación/preferencia — base del funnel de re-engagement para afiliación.
- [x] `migration_user_v2.sql`: país preferido/detectado, locale, última visita.
- [x] Dashboard `/panel`: stats, favoritos con último precio, alertas con estado, perfil + país del catálogo.
- [x] Corazón de favoritos en el catálogo (session-aware, redirige a login si hace falta).
- [x] **Fase 6.1 — Cumplimiento Zero-Trust:** favoritos/alertas/perfil migrados de acceso directo a Postgres desde Next.js hacia endpoints REST de Rails (`/api/v1/users/:user_id/*`), protegidos por `INTERNAL_API_KEY` para no exponer un IDOR mientras Rails tenga `ingress: all`. Ver `contexto_maestro.md` §1–2.
- [ ] Ejecutar `migration_user_v2.sql` en Cloud SQL (junto al deploy).
- [ ] Validar boot real de Rails (`bundle install` + `rails routes` + request de humo a los endpoints nuevos) — no se pudo ejecutar en el sandbox de desarrollo por falta de red/gems.
- [ ] **PriceAlertAgent (Python):** tras cada ciclo de precios, consultar `price_alerts` activas y notificar por email (Resend) cuando `precio_actual <= target_price`. El corazón agéntico del re-engagement.
- [ ] Endurecer `ingress` de Rails/Rust/Python con IAM (`roles/run.invoker`) en vez de `all` + `INTERNAL_API_KEY` (defensa en profundidad, ya anotado en los manifests).
- [x] Escalado multi-producto: generalizar `laptops` → catálogo por `product_type`. **Hecho en FASE 7** (ver abajo).

## 🟢 FASE 6.5: Rediseño a tema claro (ADN NVIDIA) (Completado)
Fondo blanco para maximizar conversión de afiliados; patrones tipográficos/de
animación de NVIDIA (sin su verde — acento azul).
- [x] `globals.css` "Light Design System v5.0", `ThemeProvider` dark→light, toda la web convertida.
- [x] Barlow (≈NVIDIA-NALA) bold sentence-case, radios nítidos, transiciones 0.2s ease-out.

## 🟢 FASE 7: Escalado multi-producto (Completado v1)
De "solo notebooks" a todo el catálogo digital de los retailers, con categorías
claras y bien definidas.
- [x] **Taxonomía (2 niveles)**: Familia → `product_type`. Computación (laptop·desktop·monitor), Periféricos (keyboard·mouse·headphones·webcam), Impresión (printer·supplies). Fuente única: `Web/src/types/product.ts`.
- [x] **DB** `migration_products_v3.sql` — aditiva: `product_type` + `specs` JSONB + índices. Retrocompatible (la tabla sigue siendo `laptops`, FKs intactas).
- [x] **Rails** — serializer con `product_type`/`specs`; endpoint `/api/v1/products` (+ `?type=`); modelo/persistencia con soporte de tipo; degrada con gracia pre-migración.
- [x] **Rust** — `calculate_generic_score` para no-laptops; router despacha por `product_type`. La matemática sigue en Rust.
- [x] **Python** — `product_type`/`specs` fluyen por el normalizador y el payload a Rust.
- [x] **Web** — filtros por tipo (chips dinámicos), card y página de detalle `[slug]` con specs por tipo + badge, i18n es/en/pt.
- [ ] Correr `migration_products_v3.sql` en Cloud SQL (junto al deploy).
- [ ] `cargo check` real de Rust (no hay red a crates.io en el sandbox).
- [ ] Sembrar catálogo real multi-producto (`seeds_catalog.sql` hoy es solo laptops).
- [ ] Afinar specs y scoring por tipo con datos reales de ingesta (ratings/reseñas para el scorer genérico).
- [ ] Buscador predictivo del hero: hoy sugiere categorías de laptop; generalizar a tipos de producto.

## 🟢 FASE 8: PriceAlertAgent — motor de re-engagement (Completado v1)
El corazón agéntico del re-engagement: avisar por email cuando un producto
alcanza el precio objetivo que el usuario guardó.
- [x] **DB** `migration_alerts_v4.sql` — `price_alerts.notified_at` + índice parcial de pendientes (aditiva).
- [x] **Rails** — endpoints internos `GET /price_alerts/pending` y `POST /price_alerts/mark_notified` (InternalApiAuth); Rails resuelve la comparación precio≤objetivo (dueño de la DB).
- [x] **Python** `PriceAlertAgent` — paso 9 del `MasterOrchestrator` (post-persistencia): consulta pendientes, envía email "bajó de precio" vía Resend, marca notificadas. Guard: sin `AUTH_RESEND_KEY` detecta pero no envía. Zero-Trust (no toca Postgres). Verificado con test de comportamiento (guard + envío + marcado).
- [ ] Correr `migration_alerts_v4.sql` en Cloud SQL.
- [ ] Configurar `AUTH_RESEND_KEY` + verificar dominio en Resend (mismo que magic links).
- [ ] Re-armado: reactivar la alerta si el precio vuelve a subir por encima del objetivo (hoy notifica una sola vez).

## 🟢 FASE 9: Integridad de datos + scoring por tipo + buscador generalizado (Completado)
Auditoría y blindaje de la base + refinamiento del scoring + arreglo del buscador.
- [x] **Integridad DB** `migration_integrity_v5.sql` — auditada contra Postgres real (Docker): datos limpios, pero faltaban guardas. Agregado: índices en FKs (`accounts.user_id`, `user_favorites.laptop_id`), `price_alerts` FKs NOT NULL, CHECKs (deal_score/precios/target), índice único de alerta activa, y **normalización de la taxonomía** vía tabla lookup `product_categories` + FK. Idempotente; verificado que rechaza datos inválidos.
- [x] **Scoring por tipo** — `type_spec_bonus` en Rust (7 tipos) sobre el scorer genérico; Python envía `specs` a Rust.
- [x] **Buscador predictivo** — generalizado a los 9 tipos de producto (ícono + tagline, navegación al enfocar); placeholder i18n product-genérico.
- [ ] `cargo check` de Rust (scorer por tipo) + correr `migration_integrity_v5.sql` en Cloud SQL.

## 🟡 Deuda técnica conocida (no bloqueante)
- `HardwareNewsSlider.tsx` quedó sin usar tras integrar el ticker de noticias dentro de `HeroSection` — candidato a eliminar o reintegrar (decisión pendiente de producto, no técnica).
- Endpoints de escritura consumidos por Python (`POST /api/v1/notebooks`, `.../hardware_news`) no tienen aún el mismo `INTERNAL_API_KEY` que los endpoints de usuario — dependen solo de rate limiting. Extender la protección cuando se aborde el endurecimiento de `ingress` de arriba.
