"""
🦀 Cliente autenticado Python → Rust.

# Por qué existe

`clicks-rust` se publicó con `allUsers`: cualquiera en internet podía invocar
sus 8 endpoints (scoring, canonicalización, anomalías de precio, diff legal,
validación de links). No hay datos personales ahí, así que no era una fuga de
información — era CPU gratis a costa nuestra, y un validador de links capaz de
hacer peticiones salientes desde nuestra IP.

Al cerrarlo con IAM, solo la service account de Python puede invocarlo, y para
eso hay que adjuntar un token de identidad de Google en cada llamada.

# Cómo se obtiene el token

Del servidor de metadatos de la instancia, que es el mecanismo nativo de Cloud
Run. NO se usa `google.auth`: llegaría solo por dependencia transitiva de
`google-cloud-aiplatform`, y depender de eso para la autenticación del pipeline
es frágil. Con `requests` puro no hace falta agregar nada.

El `audience` DEBE ser la URL base del servicio destino (sin path): Cloud Run
valida que el token fue emitido para él y rechaza uno con otra audiencia.

# Fuera de Cloud Run

En local (docker-compose) no hay servidor de metadatos y el Rust local no pide
autenticación. `_id_token` devuelve None y la llamada sale sin cabecera, que es
exactamente lo que ese entorno necesita. No se hace fallar el pipeline por no
poder autenticar donde no hace falta.
"""

import os
import threading
import time
import logging
from urllib.parse import urlsplit

import requests

logger = logging.getLogger(__name__)

# Servidor de metadatos de GCP. Solo responde dentro de Cloud Run / GCE.
_METADATA_URL = (
    "http://metadata.google.internal/computeMetadata/v1/"
    "instance/service-accounts/default/identity"
)
_METADATA_HEADERS = {"Metadata-Flavor": "Google"}

# Timeout corto: si no estamos en GCP el host no resuelve y hay que salir ya,
# no colgar el pipeline esperando a un servidor que no existe.
_METADATA_TIMEOUT_S = 3

# Los tokens de identidad duran 1 hora. Se renuevan con 5 minutos de margen
# para no usar uno que expire en pleno vuelo de un batch largo.
_TOKEN_TTL_S = 3300

_cache: dict[str, tuple[str, float]] = {}
_cache_lock = threading.Lock()

# El backfill y el orquestador llaman desde varios hilos; sin el lock, ocho
# hilos pedirían ocho tokens al arrancar. Mismo patrón de carrera que ya
# apareció en la cuota de IA.


def rust_base_url() -> str:
    """URL base del servicio Rust — es también el `audience` del token."""
    crudo = os.getenv("RUST_API_URL", "http://rust_engine:8080")
    partes = urlsplit(crudo)
    if partes.scheme and partes.netloc:
        return f"{partes.scheme}://{partes.netloc}"
    return crudo.split("/api/")[0].rstrip("/")


def _id_token(audience: str) -> str | None:
    """Token de identidad para `audience`, o None fuera de Cloud Run.

    ⚠️ La búsqueda va DENTRO del lock, no solo la lectura del caché.

    La primera versión liberaba el lock antes del `requests.get`, así que los
    8 hilos del backfill fallaban el caché a la vez y pedían 8 tokens. Es la
    misma carrera de leer-y-después-escribir que ya había aparecido en la
    cuota de IA — la detectó el test de concurrencia de este módulo.

    Sostener el lock durante una llamada de red no es gratis, pero acá está
    acotado: el timeout es de 3 s y el token dura una hora. Los hilos 2 a 8
    esperan a que el primero termine y encuentran el caché ya poblado, que es
    exactamente lo que se busca.
    """
    with _cache_lock:
        ahora = time.time()
        entrada = _cache.get(audience)
        if entrada and entrada[1] > ahora:
            return entrada[0]

        try:
            resp = requests.get(
                _METADATA_URL,
                params={"audience": audience, "format": "full"},
                headers=_METADATA_HEADERS,
                timeout=_METADATA_TIMEOUT_S,
            )
        except requests.RequestException:
            # Sin servidor de metadatos → entorno local. Silencioso a
            # propósito: en docker-compose pasaría en cada llamada.
            return None

        if resp.status_code != 200 or not resp.text.strip():
            logger.warning(
                "No se pudo obtener token de identidad para %s (HTTP %s). "
                "La llamada saldrá sin autenticar.",
                audience,
                resp.status_code,
            )
            return None

        token = resp.text.strip()
        _cache[audience] = (token, ahora + _TOKEN_TTL_S)
        return token


def auth_headers(audience: str | None = None) -> dict[str, str]:
    """Cabeceras para invocar Rust. Vacío si no hay token (entorno local)."""
    token = _id_token(audience or rust_base_url())
    return {"Authorization": f"Bearer {token}"} if token else {}


def post_rust(url: str, payload: dict | None = None, timeout: int = 30):
    """POST autenticado a Rust. Devuelve el `Response` de requests.

    No atrapa excepciones: cada agente ya tiene su propio manejo de fallos y
    su propio log, y tragarlas acá volvería invisible un Rust caído — el modo
    de fallo que este proyecto viene corrigiendo una y otra vez.
    """
    cabeceras = auth_headers()
    if payload is None:
        return requests.post(url, headers=cabeceras, timeout=timeout)
    return requests.post(url, json=payload, headers=cabeceras, timeout=timeout)
