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
import logging

import requests

logger = logging.getLogger(__name__)

DEFAULT_RAILS_URL = "http://rails_backend:3000"

# Endpoints de Rails. Declarados acá para que ningún agente los escriba a mano.
NEWS_PATH = "/api/v1/notebooks/hardware_news"
PRODUCTS_PATH = "/api/v1/notebooks"


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


def post_json(path: str, payload: dict, timeout: int = 15) -> tuple[bool, int]:
    """POST autenticado a Rails. Devuelve `(ok, status_code)`.

    `ok` es True solo con 2xx. `status_code` es 0 si la petición ni salió
    (red caída, timeout). Loguea el detalle de cada modo de fallo para que un
    404 o un 401 sean visibles en Cloud Logging en vez de pasar por buenos.
    """
    url = rails_url(path)
    try:
        resp = requests.post(url, json=payload, headers=internal_headers(), timeout=timeout)
    except Exception as exc:
        logger.error("POST %s falló sin respuesta: %s", url, exc)
        return False, 0

    status = resp.status_code
    if 200 <= status < 300:
        return True, status

    if status == 401:
        logger.error("POST %s → 401: INTERNAL_API_KEY ausente o incorrecta.", url)
    elif status == 404:
        logger.error("POST %s → 404: la ruta no existe (¿path duplicado en RAILS_API_URL?).", url)
    else:
        logger.error("POST %s → %s: %s", url, status, resp.text[:200])
    return False, status
