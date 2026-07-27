import os
import re
import time
import logging
import threading

import requests

logger = logging.getLogger(__name__)

# ── Matriz cambiaria FX (unidades por 1 USD) ──────────────────────────────────
# Respaldo determinista usado si la API en vivo falla o está deshabilitada.
# Mantiene la ingesta funcionando sin red (referencia ~2026).
_FX_FALLBACK = {
    "ARS": 1450.0,
    "EUR": 0.92,
    "MXN": 17.5,
    "BRL": 5.2,
    "COP": 3900.0,
    "CLP": 920.0,
    "USD": 1.0,
}

# Configuración por entorno (todas opcionales, con defaults sensatos).
_FX_LIVE_ENABLED = os.getenv("FX_LIVE_ENABLED", "true").strip().lower() != "false"
# open.er-api.com no requiere API key. Alternativa: https://api.exchangerate.host/latest?base=USD
_FX_API_URL = os.getenv("FX_API_URL", "https://open.er-api.com/v6/latest/USD")
_FX_TTL_SECONDS = int(os.getenv("FX_CACHE_TTL_SECONDS", "21600"))  # 6 h
_FX_RETRY_SECONDS = int(os.getenv("FX_RETRY_SECONDS", "300"))       # backoff tras un fallo
_FX_TIMEOUT = float(os.getenv("FX_TIMEOUT_SECONDS", "8"))

_fx_lock = threading.Lock()
_fx_state = {"rates": dict(_FX_FALLBACK), "fetched_at": 0.0}


def _get_exchange_rates() -> dict:
    """Devuelve tasas FX (unidades por 1 USD) con caché TTL y fallback.

    Fuente en vivo: ``FX_API_URL`` (open.er-api.com, sin API key). Cachea el
    resultado ``FX_CACHE_TTL_SECONDS`` (6 h por defecto). Si la llamada falla o
    ``FX_LIVE_ENABLED=false``, usa la matriz de respaldo determinista, de modo
    que la ingesta nunca se rompe por un problema de red. Thread-safe.
    """
    if not _FX_LIVE_ENABLED:
        return _fx_state["rates"]

    if time.time() - _fx_state["fetched_at"] < _FX_TTL_SECONDS:
        return _fx_state["rates"]

    with _fx_lock:
        # Re-check dentro del lock: otro hilo pudo haber refrescado ya.
        if time.time() - _fx_state["fetched_at"] < _FX_TTL_SECONDS:
            return _fx_state["rates"]
        try:
            resp = requests.get(_FX_API_URL, timeout=_FX_TIMEOUT)
            resp.raise_for_status()
            payload = resp.json()
            # open.er-api.com → "rates"; exchangerate-api v6 → "conversion_rates".
            live = payload.get("rates") or payload.get("conversion_rates") or {}
            merged = dict(_FX_FALLBACK)
            for cur in _FX_FALLBACK:
                val = live.get(cur)
                if isinstance(val, (int, float)) and val > 0:
                    merged[cur] = float(val)
            merged["USD"] = 1.0  # ancla: base siempre 1.0
            _fx_state["rates"] = merged
            _fx_state["fetched_at"] = time.time()
            logger.info("FX actualizado desde %s", _FX_API_URL)
        except Exception as exc:
            # Backoff: reintenta en _FX_RETRY_SECONDS en vez de en cada request.
            _fx_state["fetched_at"] = time.time() - _FX_TTL_SECONDS + _FX_RETRY_SECONDS
            logger.warning("FX en vivo falló (%s); usando respaldo. err=%s", _FX_API_URL, exc)
        return _fx_state["rates"]


# ── 🖼️ Guarda de imágenes REALES ──────────────────────────────────────────────
# El catálogo solo muestra la foto real del producto. Si el feed no la trae —o
# trae una foto decorativa de stock, o una URL que no carga— se persiste vacío
# y el frontend dibuja el ícono neutro de la categoría (ProductImage.tsx).
#
# Motivo legal: mostrar la imagen de OTRO artículo como si fuera el listado es
# una representación engañosa (FTC §5, Directiva 2005/29/CE de prácticas
# comerciales desleales, Ley 24.240 art. 4 — información veraz). Una foto vacía
# es honesta; una foto ajena, no.
#
# Es la primera de tres capas: acá (ingesta), `Laptop#real_image_url` (Rails,
# serialización) y el CHECK `chk_laptops_no_stock_image` (Postgres).
_STOCK_IMAGE_HOSTS = (
    "images.unsplash.com", "unsplash.com", "placehold.co", "via.placeholder.com",
    "placekitten.com", "dummyimage.com", "loremflickr.com", "picsum.photos",
)

# La verificación HTTP se puede apagar (tests offline, entornos sin salida).
_IMG_VERIFY_ENABLED = os.getenv("IMAGE_VERIFY_ENABLED", "true").strip().lower() != "false"
_IMG_VERIFY_TIMEOUT = float(os.getenv("IMAGE_VERIFY_TIMEOUT_SECONDS", "6"))
_IMG_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

_img_cache_lock = threading.Lock()
_img_cache: dict = {}  # url → bool (dentro del proceso; el ciclo es diario)


def _image_responds_ok(url: str) -> bool:
    """¿La URL devuelve realmente una imagen? (200 + Content-Type image/*).

    Se usa GET con ``stream=True`` en vez de HEAD: varias CDN de fabricante
    responden 403/405 a HEAD pero sirven la imagen con GET. El cuerpo no se
    descarga — se cierra la conexión apenas llegan las cabeceras.

    Descarta los tres modos de fallo reales del catálogo sembrado: rutas
    inexistentes (404), assets ausentes en Scene7 (403) y CDNs que redirigen
    a una landing HTML cuando el id no existe (302 → text/html).
    """
    with _img_cache_lock:
        cached = _img_cache.get(url)
    if cached is not None:
        return cached

    ok = False
    try:
        resp = requests.get(
            url,
            stream=True,
            timeout=_IMG_VERIFY_TIMEOUT,
            allow_redirects=True,
            headers={"User-Agent": _IMG_BROWSER_UA, "Accept": "image/avif,image/webp,image/*,*/*;q=0.8"},
        )
        try:
            ok = resp.status_code == 200 and resp.headers.get("Content-Type", "").lower().startswith("image/")
        finally:
            resp.close()
    except Exception as exc:
        logger.debug("Imagen no verificable (%s): %s", url, exc)

    with _img_cache_lock:
        _img_cache[url] = ok
    return ok


def clean_image_url(raw_url) -> str:
    """Devuelve la URL de la foto real del producto, o "" si no la hay."""
    url = str(raw_url or "").strip()
    if not url:
        return ""

    # http:// → https://: la web se sirve por TLS y el navegador bloquea el
    # contenido mixto. La API de MercadoLibre todavía devuelve thumbnails http.
    if url.startswith("http://"):
        url = "https://" + url[len("http://"):]
    if not url.startswith("https://"):
        return ""

    try:
        host = requests.utils.urlparse(url).hostname or ""
    except Exception:
        return ""
    host = host.lower()
    if not host:
        return ""
    if any(host == s or host.endswith("." + s) for s in _STOCK_IMAGE_HOSTS):
        logger.info("Imagen de stock descartada (%s)", host)
        return ""

    if _IMG_VERIFY_ENABLED and not _image_responds_ok(url):
        logger.info("Imagen descartada: no devuelve una imagen real (%s)", url)
        return ""

    return url


class DataNormalizerAgent:
    """
    Escudo Zero-Trust de Normalización v4.0.
    Garantiza que ningún dato tóxico o mal tipado llegue a la IA o a la Base de Datos.
    """

    # Espejo de `product_categories.code` (migration_integrity_v5.sql). Único
    # vocabulario de producto que este sitio vende: nada fuera de tecnología.
    DIGITAL_CATEGORIES = {
        "laptop", "desktop", "monitor", "keyboard",
        "mouse", "headphones", "webcam", "printer", "supplies",
    }

    @staticmethod
    def sanitize_string(text: str) -> str:
        if not text: return ""
        clean = re.sub(r'<[^>]+>', '', str(text))
        clean = re.sub(r'[\n\r\t]+', ' ', clean)
        return clean.strip()

    @staticmethod
    def extract_number(value, default=0.0):
        """Extrae un float de strings de precio en formato US o LATAM/EU.

        Maneja separadores de miles y decimales: "1.234.567,89" (LATAM/EU),
        "1,234,567.89" (US), "1.000.000" (miles), "5000.50" (decimal).
        El código anterior convertía "1.000.000" → ValueError → 0.0 (precio perdido).
        """
        if isinstance(value, (int, float)): return float(value)
        if not value: return default
        s = re.sub(r'[^\d.,]', '', str(value))
        if not s: return default

        last_dot, last_comma = s.rfind('.'), s.rfind(',')
        if last_dot != -1 and last_comma != -1:
            # Ambos presentes: el que aparece ÚLTIMO es el separador decimal
            if last_comma > last_dot:
                s = s.replace('.', '').replace(',', '.')   # 1.234.567,89
            else:
                s = s.replace(',', '')                     # 1,234,567.89
        elif last_comma != -1:
            frac = s[last_comma + 1:]
            if s.count(',') == 1 and len(frac) in (1, 2):
                s = s.replace(',', '.')                    # 5000,50 → decimal
            else:
                s = s.replace(',', '')                     # 1,299 / 1,000,000 → miles
        elif last_dot != -1:
            frac = s[last_dot + 1:]
            if s.count('.') > 1 or len(frac) == 3:
                s = s.replace('.', '')                     # 1.000.000 / 1.299 → miles
            # sino: 5000.50 / 1.5 → decimal normal, se deja igual

        try:
            return float(s) if s else default
        except ValueError:
            return default

    def normalize_laptop_data(self, raw_data: dict):
        """Convierte datos crudos de APIs al contrato estricto de Clicks & Go v4.0.

        Devuelve None si el producto no clasifica en el catálogo digital
        (`DIGITAL_CATEGORIES`) — antes, cualquier `product_type` ausente o
        desconocido caía por defecto a "laptop", así que un adaptador que
        alguna vez traiga algo fuera de tema (ropa, un feed mixto de Awin,
        etc.) se insertaba igual, mal etiquetado. Ahora se descarta: nada
        entra a la base salvo que matchee explícitamente el catálogo real.
        """

        title = self.sanitize_string(raw_data.get("name", ""))

        product_type = self.sanitize_string(raw_data.get("product_type", "")).lower()
        if product_type not in self.DIGITAL_CATEGORIES:
            return None

        # RAM: primero ancla a la palabra RAM/Memoria (en cualquier orden);
        # si no hay ancla, cae al primer "N GB" que NO sea almacenamiento.
        # (Antes: "512GB SSD" sin mención de RAM se interpretaba como 512 GB de RAM.)
        ram_match = (
            re.search(r'(\d+)\s*GB\s*(?:de\s+)?(?:RAM|Memoria)', title, re.IGNORECASE)
            or re.search(r'(?:RAM|Memoria)\s*(?:de\s+)?(\d+)\s*GB', title, re.IGNORECASE)
            or re.search(r'(\d+)\s*GB\b(?!\s*(?:SSD|HDD|NVMe|eMMC))', title, re.IGNORECASE)
        )
        ram_gb = int(ram_match.group(1)) if ram_match else 8

        # Storage: exige unidad TB o keyword SSD/HDD/NVMe/eMMC.
        # (Antes el sufijo SSD era opcional y tomaba el primer "N GB" del título,
        #  que suele ser la RAM: "16 GB 512 GB SSD" → storage 16. Bug confirmado.)
        storage_match = (
            re.search(r'(\d+)\s*(GB|TB)\s*(?:de\s+)?(?:SSD|HDD|NVMe|eMMC|almacenamiento|storage)', title, re.IGNORECASE)
            or re.search(r'(?:SSD|HDD|NVMe|eMMC)\s*(?:de\s+)?(\d+)\s*(GB|TB)', title, re.IGNORECASE)
            or re.search(r'(\d+)\s*(TB)\b', title, re.IGNORECASE)
        )
        if storage_match:
            storage_gb = int(storage_match.group(1))
            if storage_match.group(2).upper() == 'TB':
                storage_gb *= 1024
        else:
            storage_gb = 256

        country = self.sanitize_string(raw_data.get("country_code", "US"))[:2].upper()
        
        # Mapeo determinista de moneda según el país (Reparación de la Fuga Financiera)
        currency_map = {"AR": "ARS", "US": "USD", "ES": "EUR", "MX": "MXN", "BR": "BRL", "CO": "COP", "CL": "CLP"}
        currency = raw_data.get("currency") or currency_map.get(country, "USD")

        # Matriz Cambiaria (Solo Ingesta) — tasas en vivo con caché TTL + fallback.
        # Unidades por 1 USD. Ver _get_exchange_rates() arriba.
        exchange_rates = _get_exchange_rates()
        applied_rate = exchange_rates.get(currency, 1.0)

        original_price = self.extract_number(raw_data.get("financials", {}).get("original_price"))
        current_price = self.extract_number(raw_data.get("financials", {}).get("current_price"))

        # Cálculo del descuento en Backend
        discount_pct = 0
        if original_price > current_price and original_price > 0:
            discount_pct = int(((original_price - current_price) / original_price) * 100)

        # 📦 Multi-producto: specs genéricas (impresoras, teclados, mouse…).
        # `product_type` ya quedó validado y asignado arriba (guard de catálogo).
        raw_specs = raw_data.get("specs")

        return {
            "sku_original": self.sanitize_string(raw_data.get("sku_original", "")),
            "retailer_slug": self.sanitize_string(raw_data.get("retailer_slug", "generic")),
            "country_code": country,
            "currency": currency,
            "brand": self.sanitize_string(raw_data.get("brand", "Genérica")),
            "name": title[:150],
            "condition": "new",
            "product_type": product_type,
            "specs": raw_specs if isinstance(raw_specs, dict) else {},
            "hardware": {
                "cpu": self.sanitize_string(raw_data.get("cpu", "Procesador Estándar")),
                "gpu": self.sanitize_string(raw_data.get("gpu", "Gráficos Integrados")),
                "ram_gb": ram_gb,
                "storage_gb": storage_gb,
                "display_inches": 15.6
            },
            "financials": {
                "original_price": original_price,
                "current_price": current_price,
                "discount_pct": discount_pct,
                "applied_exchange_rate": applied_rate,
                "in_stock": True
            },
            "urls": {
                # 🖼️ Solo la foto real del producto (ver clean_image_url arriba).
                "image": clean_image_url(raw_data.get("urls", {}).get("image", "")),
                "affiliate_raw": raw_data.get("urls", {}).get("affiliate_raw", "")
            }
        }