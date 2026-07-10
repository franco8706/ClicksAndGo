# 📁 Documentación de Clicks & Go — Empezá acá

Esta carpeta es la **fuente de verdad y la ruta** del proyecto. Son tres documentos con roles que no se pisan. Leelos en este orden según lo que necesites:

| # | Documento | Qué contiene | Cuándo leerlo |
|---|---|---|---|
| 1 | **[`contexto_maestro.md`](contexto_maestro.md)** | La **Constitución**: arquitectura, reglas Zero-Trust, contratos de datos, estado actual. | Antes de tocar código. Es la ley. |
| 2 | **[`redesign_plan.md`](redesign_plan.md)** | El **roadmap**: backlog priorizado (qué sigue) + historial de fases completadas. | Para decidir en qué avanzar. |
| 3 | **[`bitacora_sistema.md`](bitacora_sistema.md)** | La **bitácora**: registro cronológico de decisiones, bugs y sesiones (el *por qué*). | Para entender cómo se llegó hasta acá. |

**Regla de escritura de los docs:**
`contexto_maestro` = estado (presente) · `redesign_plan` = futuro (pendiente) · `bitacora` = pasado (historial).
Si un cambio toca la arquitectura, se refleja en los tres.

---

## 📸 Estado del proyecto (2026-07-07)

**Qué es:** plataforma global de comparación de precios y afiliación, con un sistema agéntico de IA en el centro. Empezó con notebooks; hoy es un **catálogo multi-producto** (computación · periféricos · impresión).

**Arquitectura:** 4 microservicios Zero-Trust — **Next.js** (fachada SSR), **Rails** (único dueño de PostgreSQL), **Python/FastAPI** (agentes IA), **Rust/Axum** (motor matemático). Persistencia políglota: PostgreSQL (Cloud SQL) + MongoDB (Atlas).

**Construido y verificado en desarrollo** (build/tsc/lint/tests verdes):
- ✅ Pipeline de ingesta agéntica (recolección API-first → Rust → Rails) con contingencia Antigravity de costo cero.
- ✅ Catálogo, ofertas y noticias por país (geo por IP o preferencia del usuario).
- ✅ Autenticación sin contraseñas (OAuth + magic links) y dashboard de usuario (favoritos + alertas de precio).
- ✅ Monitoreo legal de ToS de afiliados (3 capas: Rust → Antigravity → Gemini).
- ✅ Tema claro (ADN NVIDIA, acento azul) y escalado multi-producto.
- ✅ Seguridad auditada (open-redirect, SSRF, XSS, IDOR, headers, SSL) y costos GCP optimizados.

**Lo que falta para lanzar** (ver backlog completo en `redesign_plan.md`):
1. 🔴 **Deploy a Cloud Run** con URL pública (bloquea la aprobación de afiliados).
2. 🔴 Correr migraciones en Cloud SQL + validar boot real de Rails + `cargo check` de Rust.
3. 🔴 Configurar cuentas externas (OAuth, Resend, redes de afiliados, AAIP) y resolver el billing de Vertex AI.
4. 🟠 **PriceAlertAgent** (Python) — el motor de re-engagement — y sembrar catálogo real multi-producto.

---

## 🗺️ Referencias rápidas de código

| Tema | Dónde |
|---|---|
| Taxonomía de productos (fuente única) | `Web/src/types/product.ts` |
| Contrato de datos (DTO) | `Web/src/types/laptop.ts` ↔ serializer de Rails |
| Migraciones SQL | `Infra/db/migration_{auth_v1,user_v2,products_v3}.sql` |
| Guía de deploy | `Infra/cloud/RUNBOOK_DEPLOY.md` |
| Control de costos GCP | `Infra/cloud/COSTOS.md` |
