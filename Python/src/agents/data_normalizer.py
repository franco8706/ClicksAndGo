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


class DataNormalizerAgent:
    """
    Escudo Zero-Trust de Normalización v4.0.
    Garantiza que ningún dato tóxico o mal tipado llegue a la IA o a la Base de Datos.
    """
    
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

    def normalize_laptop_data(self, raw_data: dict) -> dict:
        """Convierte datos crudos de APIs al contrato estricto de Clicks & Go v4.0."""
        
        title = self.sanitize_string(raw_data.get("name", ""))

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

        # 📦 Multi-producto: tipo + specs genéricas (impresoras, teclados, mouse…).
        # Passthrough retrocompatible — sin `product_type` se asume 'laptop'.
        raw_specs = raw_data.get("specs")
        product_type = (self.sanitize_string(raw_data.get("product_type", "laptop")) or "laptop").lower()

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
                "image": raw_data.get("urls", {}).get("image", ""),
                "affiliate_raw": raw_data.get("urls", {}).get("affiliate_raw", "")
            }
        }