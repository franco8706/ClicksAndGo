# =====================================================================
# 🔗 CLIENTE DE RAILS — única fuente de verdad para hablarle a Rails
#
# Existe por un bug real que estuvo 51 días en producción sin que nadie lo
# viera (detectado en la auditoría del 2026-07-30):
#
#   `RAILS_API_URL` en Cloud Run vale `https://.../api/v1/notebooks`
#   (con path incluido, porque el MasterOrchestrator lo usa así para POSTear
#   productos). Tres agentes le concatenaban encima su propio path:
#
#       os.getenv("RAILS_API_URL") + "/api/v1/notebooks/hardware_news"
#       →  https://.../api/v1/notebooks/api/v1/notebooks/hardware_news   ❌ 404
#
#   Consecuencia: el NewsRadar, el MarketIntelligence y —lo más grave— el
#   LegalAgent venían POSTeando a un 404 desde el 2026-06-09. Las noticias
#   del sitio quedaron congeladas 51 días y las alertas legales nunca
#   llegaron, mientras los logs decían "SUCCESS" porque el código imprimía
#   el status code sin comprobarlo.
#
# Dos reglas para que no vuelva a pasar:
#   1. Nadie concatena paths a mano: se derivan siempre de `rails_base()`.
#   2. Un status fuera de 2xx es un ERROR y se loguea como tal — nunca un
#      "SUCCESS" que informa el número del error.
# =====================================================================

import os
import time
import logging

import requests

logger = logging.getLogger(__name__)

DEFAULT_RAILS_URL = "http://rails_backend:3000"

# Endpoints de Rails. Declarados acá para que ningún agente los escriba a mano.
NEWS_PATH = "/api/v1/notebooks/hardware_news"
PRODUCTS_PATH = "/api/v1/notebooks"
PRODUCTS_BATCH_PATH = "/api/v1/products/batch"

# Espejo de `BATCH_MAX_ITEMS` en notebooks_controller.rb. Rails rechaza el
# lote entero si se pasa, así que este número no puede subirse de un solo lado.
#
# 50 y no 500. Medido contra producción: un lote de 500 devolvió
# `504 upstream request timeout` porque Rails corre con `timeoutSeconds: 30`
# (cloudrun-rails.yaml) y cada producto abre su propia transacción con
# `lock!` — a ~0,35 s por producto, 500 necesitan ~175 s.
#
# ⚠️ El 504 es SOLO la vista del cliente: Rails siguió procesando y persistió
# igual. El cliente contó 500 fallidos cuando en realidad se guardaron. Ese
# desacuerdo es peor que el error en sí, porque invita a reintentar algo que
# ya está hecho. Es inofensivo acá —el upsert va por (retailer_id,
# sku_original), así que reintentar actualiza en vez de duplicar— pero el
# reporte mentiría igual.
#
# 50 × 0,35 s ≈ 18 s deja margen dentro de los 30 s incluso con la latencia
# de red y un arranque en frío parcial.
BATCH_MAX_ITEMS = 50


def rails_base() -> str:
    """Base de Rails (esquema + host), sin ningún path de API.

    Tolera las dos formas en que `RAILS_API_URL` aparece en los distintos
    entornos: la base pelada (docker-compose) y la base con endpoint incluido
    (Cloud Run). Recortar en `/api/` cubre ambas — es el mismo criterio que
    ya usaba `legal_agent` para el motor Rust, pero que nunca se aplicó a Rails.
    """
    raw = os.getenv("RAILS_API_URL", DEFAULT_RAILS_URL).strip()
    return (raw.split("/api/")[0] or DEFAULT_RAILS_URL).rstrip("/")


def rails_url(path: str) -> str:
    """URL absoluta de un endpoint de Rails. `path` va con barra inicial."""
    return f"{rails_base()}{path if path.startswith('/') else '/' + path}"


def internal_headers() -> dict:
    """Cabeceras para ESCRIBIR en Rails.

    Rails corre con `ingress: all` en Cloud Run: sin `X-Internal-Key` los
    endpoints de escritura quedarían abiertos a internet (ver InternalApiAuth).
    """
    return {
        "X-Internal-Key": os.getenv("INTERNAL_API_KEY", ""),
        "Content-Type": "application/json",
    }


# ⏱️ Timeout de una escritura a Rails.
#
# 45 s y no 15. Rails corre con `minScale: 0` (escala a cero por costo), así
# que la PRIMERA petición después de un rato de inactividad paga el arranque
# en frío: contenedor + boot de Rails + pool de Postgres.
#
# Con 15 s eso se cortaba antes de tiempo y `post_json` devolvía HTTP 0 —
# "la petición ni salió"— perdiendo los datos en silencio. Medido en los logs
# de producción: pasó el 2026-08-02, el 08-05 y el 08-07, siempre entre las
# 00:35 y las 04:01, que es cuando corren las tareas programadas y no hay
# visitas manteniendo Rails caliente. El del 08-07 se llevó 54 artículos.
POST_TIMEOUT_S = 45

# Reintentos ante fallo de CONEXIÓN (no ante 4xx: un 401 no mejora repitiendo).
# El primer intento despierta a Rails aunque expire; el segundo lo encuentra
# caliente. Por eso alcanzan 3 intentos con una espera corta.
POST_MAX_INTENTOS = 3
POST_ESPERA_S = 5


def post_json(path: str, payload: dict, timeout: int = POST_TIMEOUT_S) -> tuple[bool, int]:
    """POST autenticado a Rails. Devuelve `(ok, status_code)`.

    `ok` es True solo con 2xx. `status_code` es 0 si la petición ni salió
    (red caída, timeout). Loguea el detalle de cada modo de fallo para que un
    404 o un 401 sean visibles en Cloud Logging en vez de pasar por buenos.

    Reintenta SOLO los fallos de conexión. Un 4xx es determinista —
    repetirlo da el mismo resultado y solo agrega ruido— y un 5xx podría
    haber persistido a medias, así que reintentarlo arriesga duplicar.
    """
    ok, status, _ = post_json_detail(path, payload, timeout=timeout)
    return ok, status


def post_json_detail(
    path: str, payload: dict, timeout: int = POST_TIMEOUT_S
) -> tuple[bool, int, dict]:
    """Igual que `post_json`, pero además devuelve el cuerpo JSON de Rails.

    Por qué hace falta: un 2xx dice que Rails ACEPTÓ el request, no que haya
    guardado todo lo que le mandamos. El endpoint de noticias persiste cada
    artículo en su propia transacción y responde `{saved, discarded}`; sin
    leer el cuerpo, quien llama solo puede repetir el número que envió — que
    es exactamente cómo un 404 se leyó como éxito y las noticias quedaron 51
    días congeladas.

    El tercer elemento es `{}` si la respuesta no traía JSON válido.
    """
    url = rails_url(path)
    ultimo_error = None

    for intento in range(1, POST_MAX_INTENTOS + 1):
        try:
            resp = requests.post(url, json=payload, headers=internal_headers(), timeout=timeout)
            break
        except Exception as exc:
            ultimo_error = exc
            if intento < POST_MAX_INTENTOS:
                logger.warning(
                    "POST %s sin respuesta (intento %s/%s): %s. "
                    "Probablemente arranque en frío de Rails; reintentando en %ss.",
                    url, intento, POST_MAX_INTENTOS, exc, POST_ESPERA_S,
                )
                time.sleep(POST_ESPERA_S)
    else:
        logger.error("POST %s falló sin respuesta tras %s intentos: %s",
                     url, POST_MAX_INTENTOS, ultimo_error)
        return False, 0, {}

    status = resp.status_code
    try:
        cuerpo = resp.json()
        if not isinstance(cuerpo, dict):
            cuerpo = {}
    except Exception:
        cuerpo = {}

    if 200 <= status < 300:
        return True, status, cuerpo

    if status == 401:
        logger.error("POST %s → 401: INTERNAL_API_KEY ausente o incorrecta.", url)
    elif status == 404:
        logger.error("POST %s → 404: la ruta no existe (¿path duplicado en RAILS_API_URL?).", url)
    else:
        logger.error("POST %s → %s: %s", url, status, resp.text[:200])
    return False, status, cuerpo


def post_products_batch(productos: list, timeout: int = 120) -> tuple[int, int]:
    """Persiste productos en Rails por LOTES. Devuelve `(guardados, fallidos)`.

    Por qué existe: `post_json(PRODUCTS_PATH, ...)` manda un producto por
    request. Con 70 productos daba igual; con el catálogo completo de un
    retailer no cierra — 50.000 productos son 50.000 requests HTTP, cada uno
    con su handshake, su pasada por el stack de Rails y su transacción.

    Trocea en lotes de `BATCH_MAX_ITEMS` porque Rails rechaza los más grandes,
    y porque un lote gigante multiplica el costo de un reintento: si falla la
    red en el item 9.000, se reintenta el lote entero.

    El timeout por defecto es alto (120 s) a propósito: un lote de 500
    productos abre 500 transacciones del lado de Rails. Con los 15 s del
    `post_json` normal, un lote sano moría por timeout y se reintentaba
    duplicando trabajo ya hecho.
    """
    if not productos:
        return 0, 0

    guardados = fallidos = indeterminados = 0
    for i in range(0, len(productos), BATCH_MAX_ITEMS):
        lote = productos[i:i + BATCH_MAX_ITEMS]
        url = rails_url(PRODUCTS_BATCH_PATH)
        try:
            resp = requests.post(url, json={"items": lote},
                                 headers=internal_headers(), timeout=timeout)
        except Exception as exc:
            logger.error("Lote %s-%s falló sin respuesta: %s", i, i + len(lote), exc)
            fallidos += len(lote)
            continue

        if 200 <= resp.status_code < 300:
            try:
                datos = resp.json()
            except ValueError:
                # 2xx con cuerpo ilegible: se contabiliza como guardado porque
                # Rails ya persistió, pero queda el rastro para investigar.
                logger.warning("Lote %s: 2xx con cuerpo no-JSON", i)
                guardados += len(lote)
                continue
            guardados += int(datos.get("persisted", 0))
            fallidos += int(datos.get("failed", 0))
            for err in (datos.get("errors") or [])[:5]:
                logger.warning("Item rechazado (sku=%s): %s", err.get("sku"), err.get("error"))
        elif resp.status_code in (504, 502, 408):
            # ⚠️ Timeout del gateway, NO de Rails. Medido en producción: un
            # lote de 500 devolvió 504 a los 30 s y Rails siguió procesando y
            # persistiendo por detrás. Contarlos como fallidos era mentir en
            # el reporte, e invitaba a reintentar trabajo ya hecho.
            #
            # No se suman a `guardados` (no hay confirmación) ni a `fallidos`
            # (no hay evidencia de fallo): quedan como INDETERMINADOS, que es
            # lo único honesto que se puede decir desde acá. Reintentar es
            # seguro igual —el upsert va por (retailer_id, sku_original)— pero
            # el operador merece saber que el número no es confiable.
            indeterminados += len(lote)
            logger.warning(
                "Lote %s → %s tras %ss: el gateway cortó, pero Rails puede "
                "haber persistido igual. %s items quedan INDETERMINADOS — "
                "verificar en la base antes de reintentar.",
                i, resp.status_code, timeout, len(lote),
            )
        else:
            logger.error("Lote %s → %s: %s", i, resp.status_code, resp.text[:200])
            fallidos += len(lote)

    if indeterminados:
        logger.warning(
            "Ingesta por lotes: %s guardados, %s fallidos, %s INDETERMINADOS "
            "(el gateway cortó; verificar en la base).",
            guardados, fallidos, indeterminados,
        )
    else:
        logger.info("Ingesta por lotes: %s guardados, %s fallidos", guardados, fallidos)
    return guardados, fallidos
