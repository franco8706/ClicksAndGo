# 💰 Control de Costos — Google Cloud (Clicks & Go)

Objetivo: que el presupuesto **no se dispare**, sobre todo en pre-lanzamiento
(poco o nulo tráfico real). Resumen de lo aplicado y lo que tenés que activar.

## 🚨 Paso 0 — Presupuesto con alertas (hacelo YA, es lo que evita sustos)

Un presupuesto NO frena el gasto solo, pero te avisa por email antes de que
crezca. Creá uno de USD 20/mes con alertas al 50/90/100 %:

```bash
# Requiere el billing account ID: gcloud billing accounts list
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="ClicksAndGo presupuesto mensual" \
  --budget-amount=20USD \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0
```

Para un **corte duro** real (que apague servicios al pasar el tope), hay que
conectar el presupuesto a un Pub/Sub + Cloud Function que baje `maxScale` a 0.
Documentado en la guía de "programmatic budget notifications" de GCP.

## ✅ Ya optimizado en los manifests (`Infra/cloud/`)

| Servicio | minScale | cpu-throttling | Nota |
|---|---|---|---|
| **web** (Next) | 2 → **1** | ✅ | 1 instancia caliente alcanza en pre-lanzamiento |
| **rails** | 1 | ✅ | crítico; podés bajar a 0 y tolerar cold-start |
| **python** | 0 | ✅ | escala a cero — loop movido a Cloud Scheduler |
| **rust** | 0 | ✅ | arranca en <100ms, cero costo en reposo |

- **cpu-throttling: true** → pagás CPU **solo durante requests**, no 24/7.
  Es lo que más ahorra en horas valle.
- **NewsRadar por Cloud Scheduler** (`scheduler-news.yaml`) en vez del loop
  interno → Python puede estar en `minScale: 0`. Antes, el `while True` obligaba
  a una instancia siempre encendida (~USD 15-30/mes tirados).

## 🧠 Vertex AI / Gemini — el costo variable a vigilar

La IA se factura por token y es lo que más puede escalar sin control. Defensas:

1. **Presupuesto diario de IA en código**: el `ProviderRouter` respeta
   `orchestrator.can_use_ai()`. Confirmá que tenga un tope diario de llamadas
   y que al superarlo caiga a **Antigravity** (heurística, costo cero).
2. **Rust pre-filtra** (LegalDiffer/PriceSentinel) → Gemini solo se llama cuando
   `gemini_priority != SKIP`. Mantener ese gate ahorra ~98 % de tokens.
3. **Modelo Flash, no Pro** por defecto (`gemini-2.5-flash`) — mucho más barato.
4. Si el billing de Vertex vuelve a caer, la cadena usa Gemini API (free tier)
   o Antigravity, sin romperse.

## 🗄️ Otros focos de gasto

- **Cloud SQL**: la instancia corre 24/7 (no escala a cero). Usá el tier más
  chico (`db-f1-micro`/`db-g1-small`) en pre-lanzamiento. Es probablemente el
  mayor costo fijo — revisar el tamaño elegido.
- **VM de Compute Engine**: si no la usás para el deploy (vamos con Cloud Run),
  **apagala** (`gcloud compute instances stop ...`) o eliminala para no pagar
  el disco/cómputo. Una VM encendida cobra por hora.
- **MongoDB Atlas**: verificá que esté en el tier gratuito M0 mientras el
  volumen sea bajo.
- **Artifact Registry**: borrá imágenes viejas (`gcloud artifacts docker images
  list` → delete) para no acumular almacenamiento.

## 📉 Modo "casi cero" (mientras no haya tráfico real)

Si querés minimizar al máximo antes del lanzamiento público:
- `web` y `rails` a `minScale: 0` (aceptás ~2-4s de cold-start en la 1ª visita).
- Cloud SQL en el tier más chico, o apagada si no estás probando auth/datos.
- VM de Compute Engine apagada.
- Con eso, sin visitas, el costo tiende a centavos/día (solo almacenamiento).
