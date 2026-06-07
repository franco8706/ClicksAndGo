import os
import time
import random
import requests
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, as_completed
from src.agents.data_normalizer import DataNormalizerAgent

# Pool de User-Agents de browsers reales — rota en cada sesión para evitar fingerprinting
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
]

def _human_delay(min_s: float = 2.0, max_s: float = 6.0):
    """Pausa aleatoria no-fija — imita comportamiento humano y evita detección WAF."""
    time.sleep(random.uniform(min_s, max_s))

def _retry_get(session: requests.Session, url: str, max_retries: int = 3, **kwargs):
    """GET con backoff exponencial ante 429/503. Devuelve None si agota reintentos."""
    for attempt in range(max_retries):
        try:
            resp = session.get(url, **kwargs)
            if resp.status_code == 429:
                wait = (2 ** attempt) * random.uniform(8.0, 15.0)
                print(f"⚠️  [RateLimit] 429 recibido. Esperando {wait:.1f}s...")
                time.sleep(wait)
                continue
            if resp.status_code in (503, 502):
                time.sleep((2 ** attempt) * random.uniform(2.0, 5.0))
                continue
            return resp
        except requests.exceptions.ConnectionError:
            time.sleep((2 ** attempt) * random.uniform(1.0, 3.0))
    return None


class RetailerAPI(ABC):
    def __init__(self):
        self.timeout = 20
        self.normalizer = DataNormalizerAgent()
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "application/json, text/html;q=0.9, */*;q=0.8",
            "Accept-Language": "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        })

    @abstractmethod
    def fetch_deals(self, country_code: str) -> list:
        pass

    @abstractmethod
    def _normalize(self, raw_data: list, country_code: str) -> list:
        pass


# ==============================================================================
# 1. MERCADOLIBRE — API Oficial (LATAM)
# Documentación: https://developers.mercadolibre.com.ar/es_ar/productos-y-busqueda
# Sin API key requerida para búsqueda pública. 100% legal.
# ==============================================================================
class MercadoLibreAPI(RetailerAPI):
    SITE_IDS = {"AR": "MLA", "MX": "MLM", "BR": "MLB", "CO": "MCO", "CL": "MLC"}
    KNOWN_BRANDS = [
        "Lenovo", "HP", "Dell", "Asus", "Acer", "Apple", "MSI",
        "Samsung", "Huawei", "LG", "Gigabyte", "Razer", "Toshiba",
    ]

    def fetch_deals(self, country_code: str) -> list:
        site_id = self.SITE_IDS.get(country_code)
        if not site_id:
            return []
        url = (
            f"https://api.mercadolibre.com/sites/{site_id}/search"
            f"?q=laptop&sort=price_asc&limit=50"
        )
        try:
            resp = _retry_get(self.session, url, timeout=self.timeout)
            if resp and resp.status_code == 200:
                return self._normalize(resp.json().get("results", []), country_code)
        except Exception as e:
            print(f"❌ [ML] {country_code}: {e}")
        return []

    def _detect_brand(self, title: str) -> str:
        low = title.lower()
        for brand in self.KNOWN_BRANDS:
            if brand.lower() in low:
                return brand
        tokens = [t for t in title.split() if t.isalpha()]
        return tokens[0].capitalize() if tokens else "Genérica"

    def _normalize(self, raw_data: list, country_code: str) -> list:
        normalized = []
        for item in raw_data[:50]:
            title = str(item.get("title", "Laptop Genérica"))
            image = str(item.get("thumbnail", "")).replace("http://", "https://").replace("-I.jpg", "-O.jpg")
            raw_deal = {
                "sku_original":  str(item.get("id", "")),
                "retailer_slug": "mercadolibre",
                "country_code":  country_code,
                "brand":         self._detect_brand(title),
                "name":          title,
                "financials": {
                    "original_price": float(item.get("original_price") or item.get("price", 0)),
                    "current_price":  float(item.get("price", 0)),
                },
                "urls": {
                    "image":         image,
                    "affiliate_raw": str(item.get("permalink", "")),
                },
            }
            normalized.append(self.normalizer.normalize_laptop_data(raw_deal))
        return normalized


# ==============================================================================
# 2. AWIN NETWORK — API de Product Feeds (EU / ES / UK / US)
# Cubre: HP, Lenovo, Dell, Asus, Acer, Corsair y cientos de retailers europeos.
# Cómo obtener acceso:
#   1. Registrarse en https://www.awin.com/es como "Publisher"
#   2. Aplicar a los programas de HP (ID 6220), Lenovo (ID 8765), Dell (ID 5)
#   3. Una vez aprobado, obtener API_KEY desde Publisher > API
#   4. Copiar el FEED_ID del product feed de cada anunciante desde la UI
# Variables requeridas: AWIN_API_KEY, AWIN_PUBLISHER_ID, AWIN_FEED_ID
# ==============================================================================
class AwinNetworkAPI(RetailerAPI):
    COUNTRY_LANGUAGE = {
        "ES": "es", "UK": "en", "US": "en",
        "DE": "de", "FR": "fr", "IT": "it",
    }
    COLUMNS = (
        "aw_product_id,product_name,search_price,store_price,"
        "display_url,merchant_product_id,merchant_image_url,"
        "brand_name,merchant_name,in_stock,category_name"
    )

    def __init__(self):
        super().__init__()
        self.api_key      = os.getenv("AWIN_API_KEY", "")
        self.publisher_id = os.getenv("AWIN_PUBLISHER_ID", "")
        self.feed_id      = os.getenv("AWIN_FEED_ID", "")
        if self.api_key:
            self.session.headers.update({"Authorization": f"Bearer {self.api_key}"})

    def _is_configured(self) -> bool:
        return bool(self.api_key and self.publisher_id and self.feed_id)

    def fetch_deals(self, country_code: str) -> list:
        if not self._is_configured():
            return []
        lang = self.COUNTRY_LANGUAGE.get(country_code)
        if not lang:
            return []

        url = (
            f"https://productdata.awin.com/datafeed/download"
            f"/apikey/{self.api_key}"
            f"/version/9/language/{lang}"
            f"/fid/{self.feed_id}"
            f"/columns/{self.COLUMNS}"
            f"/format/json/"
        )
        try:
            _human_delay(1.5, 4.0)
            resp = _retry_get(self.session, url, timeout=30)
            if resp and resp.status_code == 200:
                data = resp.json()
                items = data if isinstance(data, list) else data.get("data", [])
                # Filtrar solo laptops/notebooks del feed completo
                laptops = [
                    i for i in items
                    if "laptop" in str(i.get("category_name", "")).lower()
                    or "notebook" in str(i.get("category_name", "")).lower()
                ]
                return self._normalize(laptops[:100], country_code)
        except Exception as e:
            print(f"❌ [Awin] {country_code}: {e}")
        return []

    def _normalize(self, raw_data: list, country_code: str) -> list:
        normalized = []
        for item in raw_data:
            raw_deal = {
                "sku_original":  str(item.get("aw_product_id") or item.get("merchant_product_id", "")),
                "retailer_slug": str(item.get("merchant_name", "awin")).lower().replace(" ", "_"),
                "country_code":  country_code,
                "brand":         str(item.get("brand_name", "Genérica")),
                "name":          str(item.get("product_name", "")),
                "financials": {
                    "original_price": float(item.get("store_price") or item.get("search_price") or 0),
                    "current_price":  float(item.get("search_price") or 0),
                },
                "urls": {
                    "image":         str(item.get("merchant_image_url", "")),
                    "affiliate_raw": str(item.get("display_url", "")),
                },
            }
            normalized.append(self.normalizer.normalize_laptop_data(raw_deal))
        return normalized


# ==============================================================================
# 3. CJ AFFILIATE (Commission Junction) — Product Catalog API (US / CA)
# Cubre: Best Buy, Newegg, HP, Dell, Lenovo, B&H Photo en mercado norteamericano.
# Cómo obtener acceso:
#   1. Registrarse en https://www.cj.com como "Publisher"
#   2. Aplicar a los programas de Best Buy, HP, Dell, Newegg
#   3. Una vez aprobado: Account > API Keys > Generate
#   4. Obtener WEBSITE_ID desde Account > Websites
# Variables requeridas: CJ_API_KEY, CJ_WEBSITE_ID
# ==============================================================================
class CJAffiliateAPI(RetailerAPI):
    COUNTRY_AREA = {"US": "US", "CA": "CA"}

    def __init__(self):
        super().__init__()
        self.api_key    = os.getenv("CJ_API_KEY", "")
        self.website_id = os.getenv("CJ_WEBSITE_ID", "")
        if self.api_key:
            self.session.headers.update({"Authorization": f"Bearer {self.api_key}"})

    def _is_configured(self) -> bool:
        return bool(self.api_key and self.website_id)

    def fetch_deals(self, country_code: str) -> list:
        if not self._is_configured():
            return []
        area = self.COUNTRY_AREA.get(country_code)
        if not area:
            return []

        url = (
            f"https://product-search.api.cj.com/v2/product-search"
            f"?website-id={self.website_id}"
            f"&advertiser-ids=joined"
            f"&keywords=laptop+notebook"
            f"&serviceable-area={area}"
            f"&records-per-page=100"
        )
        try:
            _human_delay(1.5, 4.0)
            resp = _retry_get(self.session, url, timeout=20)
            if resp and resp.status_code == 200:
                products = resp.json().get("products", {}).get("product", [])
                # La API devuelve dict si hay 1 resultado, lista si hay varios
                if isinstance(products, dict):
                    products = [products]
                return self._normalize(products, country_code)
        except Exception as e:
            print(f"❌ [CJ] {country_code}: {e}")
        return []

    def _normalize(self, raw_data: list, country_code: str) -> list:
        def clean_price(val) -> float:
            return float(str(val).replace("$", "").replace(",", "").strip() or 0)

        normalized = []
        for item in raw_data:
            raw_deal = {
                "sku_original":  str(item.get("sku") or item.get("@id", "")),
                "retailer_slug": str(item.get("advertiser-name", "cj")).lower().replace(" ", "_"),
                "country_code":  country_code,
                "brand":         str(item.get("brand", "Genérica")),
                "name":          str(item.get("name", "")),
                "financials": {
                    "original_price": clean_price(item.get("retail-price", 0)),
                    "current_price":  clean_price(item.get("sale-price") or item.get("retail-price", 0)),
                },
                "urls": {
                    "image":         str(item.get("image-url", "")),
                    "affiliate_raw": str(item.get("buy-url", "")),
                },
            }
            normalized.append(self.normalizer.normalize_laptop_data(raw_deal))
        return normalized


# ==============================================================================
# ORCHESTRATOR PRINCIPAL
# Países → API: LATAM → MercadoLibre | ES → Awin | US/CA → CJ
# ==============================================================================
class MarketHunterOrchestrator:
    def __init__(self):
        self.ml_api   = MercadoLibreAPI()
        self.awin_api = AwinNetworkAPI()
        self.cj_api   = CJAffiliateAPI()

        # Mapeo explícito: qué API maneja qué país
        self._tasks = (
            [(self.ml_api,   c) for c in ["AR", "MX", "BR", "CO", "CL"]] +
            [(self.awin_api, c) for c in ["ES"]]                           +
            [(self.cj_api,   c) for c in ["US"]]
        )

    def hunt_all_markets(self) -> list:
        """Dispara todas las fuentes en paralelo. Cada hilo maneja su propia sesión."""
        all_deals = []

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {
                executor.submit(api.fetch_deals, country): (type(api).__name__, country)
                for api, country in self._tasks
            }
            for future in as_completed(futures):
                api_name, country = futures[future]
                try:
                    deals = future.result()
                    all_deals.extend(deals)
                    if deals:
                        print(f"✅ [MarketHunter/{api_name}] {country}: {len(deals)} ofertas.")
                    else:
                        print(f"⚠️  [MarketHunter/{api_name}] {country}: sin resultados (¿API key configurada?).")
                except Exception as e:
                    print(f"🚨 [MarketHunter/{api_name}] {country}: {e}")

        return all_deals
