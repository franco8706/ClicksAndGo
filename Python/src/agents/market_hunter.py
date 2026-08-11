import os
import re
import time
import base64
import random
import requests
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote_plus
from defusedxml import ElementTree as DefusedET
from src.agents.data_normalizer import DataNormalizerAgent, prewarm_image_cache
from src.agents.taxonomy import classify_product

# Pool de User-Agents de browsers reales — rota en cada sesión para evitar fingerprinting
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
]

# ==============================================================================
# 🛡️ CLASIFICADOR DE CATÁLOGO DIGITAL — allowlist + denylist
# Único punto de verdad para "esto es un producto de tecnología que vendemos".
# Se aplica a TODO lo que traiga cualquier adaptador (presente o futuro, ej. un
# Amazon PA-API): nada entra al catálogo salvo que matchee explícitamente estas
# categorías. El denylist es defensa en profundidad — rechaza aunque alguna
# keyword del allowlist matchee por coincidencia (ej. un feed mixto de Awin).
# ==============================================================================
_CATEGORY_KEYWORDS = {
    "laptop":     ["laptop", "notebook", "portátil", "portatil"],
    "desktop":    ["desktop", "pc de escritorio", "computadora de escritorio",
                   "all-in-one", "all in one", "torre pc", "cpu de escritorio"],
    "monitor":    ["monitor", "pantalla gamer", "display led", "display monitor"],
    "keyboard":   ["teclado", "keyboard"],
    "mouse":      ["mouse", "raton", "ratón"],
    "headphones": ["auricular", "audífono", "audifono", "headphone", "headset", "earphone"],
    "webcam":     ["webcam", "cámara web", "camara web"],
    "printer":    ["impresora", "printer"],
    "supplies":   ["tóner", "toner", "cartucho", "tinta", "ink cartridge", "insumo"],
}

_DENYLIST_KEYWORDS = [
    # Rubros ajenos al catálogo
    "ropa", "remera", "camiseta", "pantalon", "pantalón", "zapatilla", "calzado",
    "zapato", "moda", "joyer", "bijouterie", "mueble", "juguete", "perfume",
    "maquillaje", "cosmétic", "alimento", "bebida", "clothing", "apparel",
    "shoes", "jewelry", "furniture", "toy", "makeup", "cosmetic", "grocery",

    # 🔧 Repuestos, partes y accesorios.
    #
    # El catálogo vende productos TERMINADOS. Los feeds de retailers grandes
    # (Newegg vía Rakuten) están dominados por repuestos cuyo nombre contiene
    # la categoría real —"Laptop Motherboard", "Laptop Batteries", "AC Adapter
    # for Gaming Laptop"— así que sin esto entraban clasificados como laptops.
    # Medido sobre el feed real: era el caso mayoritario, no un borde.
    #
    # ⚠️ NO agregar "accessories" a secas: la taxonomía de Rakuten usa
    # "Electronics Accessories" como raíz de categorías legítimas (mice,
    # keyboards), así que esa palabra sola descartaría productos válidos. Por
    # eso las entradas de accesorios son frases completas.
    #
    # El criterio ante la duda es descartar: hay 111k laptops disponibles en el
    # feed, así que perder algún producto bueno por filtrar de más cuesta menos
    # que publicar un motherboard como si fuera una notebook.
    "motherboard", "mainboard", "placa madre", "placa base",
    "battery", "batteries", "batería", "bateria",
    # "adapter" a secas y no "ac adapter": el título real era "AC DC Adapter"
    # y la frase más específica no matcheaba. Ninguna de las 9 categorías del
    # catálogo es un adaptador, así que la palabra suelta no tiene falsos
    # positivos que perder.
    "adapter", "power supply", "charger", "cargador",
    "replacement", "repuesto", "laptop parts", "spare part",
    "computer accessories", "monitor accessories", "video accessories",
    "kvm", "docking station", "racks & mounts", "screen protector",
    "carcasa", "funda", "heatsink", "disipador",

    # Complementos que se venden PARA un equipo pero no son el equipo. Los
    # detectó la medición sobre el feed real: sin estas entradas entraban como
    # laptops un filtro de privacidad, un hub USB, un touchpad suelto, un
    # apoyamuñecas y una placa WiFi.
    # ⚠️ NO agregar "for laptop" acá. Se probó y descartaba periféricos
    # legítimos que solo declaran compatibilidad ("Gaming Keyboard ... for
    # Laptop PC"). Medido sobre el feed real: costaba 3 productos válidos y no
    # aportaba ninguno, porque la regla de coincidencia más temprana ya
    # clasifica bien esos títulos y los accesorios reales caen por su propio
    # nombre ("usb hub", "privacy filter").
    "compatible with",
    "cable", "usb hub", " hub,", "privacy filter", "wrist rest",
    "screen extender", "monitor extender",
    "touchpad", "trackpad", "cooling fan", "lcd screen", "screen for",
    "wifi card", "network card", "surge protect", "adaptador",

    # Memorias y almacenamiento sueltos: son componentes, no equipos. Sus
    # títulos dicen "Laptop" para indicar compatibilidad ("DDR5 SO-DIMM ...
    # Laptop Memory") y entraban como notebooks.
    # No se filtra por "ram" a secas: aparece dentro de "program", "panoramic"
    # y "dram", y descartaría productos legítimos.
    "ddr3", "ddr4", "ddr5", "so-dimm", "sodimm", "dimm",
    "memory module", "memoria ram", "ssd upgrade",

    # Transporte y protección
    "backpack", "mochila", "sleeve", "laptop bag", "maletín", "maletin",

    # Superficies y soportes. Mismo patrón que arriba —el accesorio de X se
    # clasificaba como X— pero acá el nombre repite la categoría entera:
    # "Gaming Mouse Pad" contiene "mouse", "Monitor Riser Stand" contiene
    # "monitor". Solo el complemento distingue uno del otro.
    # Se usan frases y no palabras sueltas a propósito: "stand" sola
    # descartaría cualquier título con "standard".
    "mouse pad", "mousepad", "desk mat", "grip pad", "sticker",
    "monitor stand", "monitor mount", "monitor riser", "monitor arm",
    "laptop stand", "riser stand", "wall mount", "keyboard tray",

    # Consumibles y partes de impresora (la impresora sí se vende; el cabezal
    # y el repuesto no), más impresoras que no son de computadora.
    "printhead", "print head", "printer nozzle", "printer case",
    "tattoo", "stencil", "transfer roller", "fuser", "drum unit",
    "ink damper", "damper", "accessories -",
    # Impresión 3D: es otro rubro, y su consumible (filamento) no es insumo de
    # oficina. Nada de esto entra en la categoría "printer" del catálogo.
    "3d printer", "3d printing", "filament", "resin",
    # Complementos de mouse que repiten la palabra "mouse" en el título
    "mouse feet", "skate pad", "mouse skate",

    # Video que no es un monitor de computadora
    "backup camera", "rear view", "reversing monitor", "baby monitor",
    "video adapter", "hdmi adapter",
]

# Marcas reales del rubro. Sirve para extraer la marca del título cuando el
# feed no la trae como campo propio (Rakuten no la expone): tomar la primera
# palabra devolvía números de parte como "NBL_N15_MB" en vez de "Dell".
_MARCAS_CONOCIDAS = (
    "apple", "macbook", "dell", "hp", "lenovo", "asus", "acer", "msi",
    "samsung", "lg", "sony", "microsoft", "razer", "logitech", "corsair",
    "gigabyte", "toshiba", "huawei", "xiaomi", "alienware", "aorus",
    "benq", "aoc", "viewsonic", "philips", "epson", "canon", "brother",
    "hyperx", "steelseries", "redragon", "thermaltake", "cooler master",
    "kingston", "crucial", "western digital", "seagate", "intel", "amd",
)


def extract_brand(title: str) -> str:
    """Marca reconocida dentro del título, o 'Genérica' si no matchea ninguna.

    Devuelve el nombre capitalizado como se escribe comercialmente. Prefiere la
    coincidencia que aparezca antes en el título: "Dell Inspiron" es un Dell,
    aunque más adelante el texto mencione "Intel" o "GeForce".
    """
    bajo = str(title or "").lower()
    encontrado = [(bajo.find(m), m) for m in _MARCAS_CONOCIDAS if m in bajo]
    if not encontrado:
        return "Genérica"
    marca = min(encontrado)[1]
    # "macbook" identifica a Apple pero no es el nombre de la marca
    return "Apple" if marca == "macbook" else marca.title()


def _match_mas_temprano(texto: str):
    """Categoría cuya keyword aparece ANTES en el texto, o None.

    El orden del diccionario no puede decidir esto. Medido sobre el feed real
    de Newegg: "KOORUI Mechanical Gaming Keyboard ... for Laptop" salía como
    laptop —no como teclado— solo porque "laptop" está primera en
    `_CATEGORY_KEYWORDS`. Los títulos de retail nombran el producto al
    principio y sus compatibilidades después, así que la keyword más temprana
    es la que describe QUÉ ES la cosa.
    """
    posiciones = [
        (texto.find(kw), code)
        for code, keywords in _CATEGORY_KEYWORDS.items()
        for kw in keywords
        if kw in texto
    ]
    return min(posiciones)[1] if posiciones else None


def classify_digital_product(title: str, category_hint: str = ""):
    """Clasifica un item en una de las 9 categorías reales o None si no aplica.

    None = descartar. No hay categoría "genérica" de fallback: un producto que
    no matchea ninguna keyword del catálogo real (ej. ropa, un accesorio no
    tecnológico, o cualquier cosa ambigua) se rechaza en vez de colarse mal
    etiquetado — así el sitio nunca muestra algo fuera de tecnología.

    Manda el TÍTULO, y la categoría del feed queda de respaldo. Probé el orden
    inverso contra el feed real y salía peor: un "V80 Wired Gaming Mouse" venía
    categorizado por Newegg como "Printers Copiers & Fax" y la categoría se
    imponía sobre un título que decía "Mouse" en la cuarta palabra. El
    comerciante se equivoca al categorizar más seguido de lo que el título
    miente, y con la regla de coincidencia más temprana el título ya resuelve
    solo el caso que motivaba priorizar la categoría.
    """
    # `str(...)` y no solo `or ""`: esto recibe lo que venga de un feed de
    # terceros, y un campo numérico o una lista no pueden tumbar la ingesta.
    titulo = str(title or "").lower()
    categoria = str(category_hint or "").lower()

    if any(term in f"{titulo} {categoria}" for term in _DENYLIST_KEYWORDS):
        return None

    return _match_mas_temprano(titulo) or _match_mas_temprano(categoria)


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
        # ⚠️ `Timeout` va aparte de `ConnectionError`: NO son la misma rama del
        # árbol de excepciones de requests. `ReadTimeout` hereda solo de
        # `Timeout`, así que con `except ConnectionError` a secas un servidor
        # que acepta la conexión y después no responde se escapaba del backoff
        # y propagaba hacia arriba sin reintentar ni una vez. (`ConnectTimeout`
        # sí hereda de ambas y quedaba cubierto, lo que hacía el hueco más
        # difícil de ver.) Verificado sobre la jerarquía real de la librería.
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
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

    #: Claves donde cada red publica la foto. Son distintas por API y no hay
    #: forma de adivinarlas: Awin usa `merchant_image_url`, CJ `image-url`,
    #: Rakuten `imageurl`, MercadoLibre `image` e Impact `ImageUrl`.
    #: ⚠️ Impact la escribe en CamelCase — sin esta entrada el prewarm no la
    #: veía y cada foto de Lenovo se verificaba serialmente dentro del bucle,
    #: que es exactamente el cuello de botella que costó 3,2 min por corrida.
    _CLAVES_IMAGEN = ("image", "merchant_image_url", "image-url", "imageurl",
                      "thumbnail", "ImageUrl")

    def _prewarm_images(self, raw_data: list) -> None:
        """Verifica en paralelo las imágenes del lote antes de normalizar.

        `normalize_laptop_data` verifica cada foto por HTTP antes de aceptarla
        (política de imágenes reales). Hacerlo dentro del bucle serial costaba
        217 ms por producto medidos contra la CDN real — ~3,2 minutos para las
        900 fotos de una corrida de Rakuten, dentro de un ciclo que ya venía
        peleando por terminar antes de que Cloud Run lo cortara.

        Esto NO relaja ninguna verificación: llena la misma caché que consulta
        `_image_responds_ok`, así que el bucle de abajo la encuentra resuelta.
        Es puramente un cambio de latencia, no de criterio.
        """
        urls = [
            item[k]
            for item in raw_data
            if isinstance(item, dict)
            for k in self._CLAVES_IMAGEN
            if isinstance(item.get(k), str) and item[k].startswith("https://")
        ]
        if urls:
            prewarm_image_cache(urls)


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
        self._prewarm_images(raw_data)
        normalized = []
        for item in raw_data[:50]:
            title = str(item.get("title", "Laptop Genérica"))
            # fetch_deals siempre busca `q=laptop`: el título real (marca+modelo,
            # ej. "Lenovo IdeaPad 3 15.6") casi nunca repite la palabra "laptop",
            # así que se pasa como pista de categoría. El denylist sigue activo
            # como red de seguridad ante un resultado desalineado del buscador.
            product_type = classify_digital_product(title, category_hint="laptop")
            if not product_type:
                continue  # fuera del catálogo digital — se descarta, no se etiqueta a ciegas

            image = str(item.get("thumbnail", "")).replace("http://", "https://").replace("-I.jpg", "-O.jpg")
            raw_deal = {
                "sku_original":  str(item.get("id", "")),
                "retailer_slug": "mercadolibre",
                "country_code":  country_code,
                "brand":         self._detect_brand(title),
                "name":          title,
                "product_type":  product_type,
                "financials": {
                    "original_price": float(item.get("original_price") or item.get("price", 0)),
                    "current_price":  float(item.get("price", 0)),
                },
                "urls": {
                    "image":         image,
                    "affiliate_raw": str(item.get("permalink", "")),
                },
            }
            result = self.normalizer.normalize_laptop_data(raw_deal)
            if result:
                normalized.append(result)
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
                # El feed trae el catálogo COMPLETO del merchant (ropa, hogar,
                # todo) — filtrar acá con el clasificador de las 9 categorías
                # reales es obligatorio, no una optimización. Sin costo extra
                # de red: ya está todo descargado, solo se descarta en Python.
                digital_items = [
                    i for i in items
                    if classify_digital_product(
                        str(i.get("product_name", "")),
                        str(i.get("category_name", "")),
                    )
                ]
                return self._normalize(digital_items[:100], country_code)
        except Exception as e:
            print(f"❌ [Awin] {country_code}: {e}")
        return []

    def _normalize(self, raw_data: list, country_code: str) -> list:
        self._prewarm_images(raw_data)
        normalized = []
        for item in raw_data:
            name = str(item.get("product_name", ""))
            product_type = classify_digital_product(name, str(item.get("category_name", "")))
            if not product_type:
                continue  # defensa en profundidad — ya se filtró en fetch_deals, pero no se asume

            raw_deal = {
                "sku_original":  str(item.get("aw_product_id") or item.get("merchant_product_id", "")),
                "retailer_slug": str(item.get("merchant_name", "awin")).lower().replace(" ", "_"),
                "country_code":  country_code,
                "brand":         str(item.get("brand_name", "Genérica")),
                "name":          name,
                "product_type":  product_type,
                "financials": {
                    "original_price": float(item.get("store_price") or item.get("search_price") or 0),
                    "current_price":  float(item.get("search_price") or 0),
                },
                "urls": {
                    "image":         str(item.get("merchant_image_url", "")),
                    "affiliate_raw": str(item.get("display_url", "")),
                },
            }
            result = self.normalizer.normalize_laptop_data(raw_deal)
            if result:
                normalized.append(result)
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
        self._prewarm_images(raw_data)
        def clean_price(val) -> float:
            return float(str(val).replace("$", "").replace(",", "").strip() or 0)

        normalized = []
        for item in raw_data:
            name = str(item.get("name", ""))
            # Mismo motivo que MercadoLibre: la búsqueda ya filtró por
            # keywords=laptop+notebook, pero el nombre real del producto
            # (marca+modelo) puede no repetir esas palabras. Se pasa como pista;
            # el denylist sigue protegiendo ante un falso positivo del buscador.
            product_type = classify_digital_product(name, category_hint="laptop notebook")
            if not product_type:
                continue

            raw_deal = {
                "sku_original":  str(item.get("sku") or item.get("@id", "")),
                "retailer_slug": str(item.get("advertiser-name", "cj")).lower().replace(" ", "_"),
                "country_code":  country_code,
                "brand":         str(item.get("brand", "Genérica")),
                "name":          name,
                "product_type":  product_type,
                "financials": {
                    "original_price": clean_price(item.get("retail-price", 0)),
                    "current_price":  clean_price(item.get("sale-price") or item.get("retail-price", 0)),
                },
                "urls": {
                    "image":         str(item.get("image-url", "")),
                    "affiliate_raw": str(item.get("buy-url", "")),
                },
            }
            result = self.normalizer.normalize_laptop_data(raw_deal)
            if result:
                normalized.append(result)
        return normalized


# ==============================================================================
# 4. RAKUTEN ADVERTISING (ex LinkShare) — Product Search API (US)
#
# Es la PRIMERA red con afiliación viva del proyecto (asociada 2026-08-06).
# Resuelve el bloqueo de fondo del catálogo: el feed trae `<imageurl>` con la
# foto real alojada por el propio comerciante, así que las fichas dejan de
# depender de imágenes de terceros — con contrato y comisión de por medio.
#
# Verificado contra la API en vivo antes de escribir esto:
#   • 100 de 100 items de una página traen `imageurl` real (cobertura total).
#   • `linkurl` ya viene firmado con el ID de publisher de la cuenta, así que
#     el clic acredita sin post-procesar nada.
#   • El techo de página es 100: `max=200` devuelve CERO items, no un error.
#     Pedir de más no degrada, vacía — de ahí que PAGE_SIZE sea un tope duro.
#   • La respuesta es XML (no JSON, a diferencia de Awin/CJ).
#
# ⚠️ El feed disponible depende del comerciante, no de la red: ASUS BR (MID
# 54082) está asociado pero publica CERO productos acá. Ver nota en fetch_deals.
#
# Cómo obtener acceso:
#   1. Registrarse como Publisher en https://rakutenadvertising.com
#   2. Asociarse a comerciantes desde Anunciantes > Buscar
#   3. Crear una app en https://developers.rakutenadvertising.com
#      (Account and Application > Add Application) → Client ID + Client Secret
#   4. El SID está arriba a la derecha del panel de editor
# Variables requeridas: RAKUTEN_CLIENT_ID, RAKUTEN_CLIENT_SECRET, RAKUTEN_SID
# ==============================================================================
class RakutenNetworkAPI(RetailerAPI):
    TOKEN_URL  = "https://api.linksynergy.com/token"
    SEARCH_URL = "https://api.linksynergy.com/productsearch/1.0"

    # Techo duro de la API, no una preferencia: por encima de 100 la respuesta
    # llega vacía (200 OK con 0 items), que es peor que un error porque pasa
    # por éxito. Nunca subir este número sin volver a medirlo contra la API.
    PAGE_SIZE = 100

    # Margen para no usar un token a punto de vencer: si la llamada sale justo
    # en el borde de los 3600s, el 401 llegaría igual. Se renueva 5 min antes.
    TOKEN_MARGEN_S = 300

    # Un keyword por categoría real del catálogo. La API busca por texto, no
    # expone "traeme todo", así que el barrido se arma con estos términos y el
    # clasificador descarta lo que no corresponda.
    COUNTRY_KEYWORDS = {
        "US": ["laptop", "notebook computer", "monitor", "keyboard",
               "mouse", "headset", "webcam", "printer", "toner cartridge"],
    }

    def __init__(self):
        super().__init__()
        self.client_id     = os.getenv("RAKUTEN_CLIENT_ID", "")
        self.client_secret = os.getenv("RAKUTEN_CLIENT_SECRET", "")
        self.sid           = os.getenv("RAKUTEN_SID", "")
        self._token        = ""
        self._token_vence  = 0.0

    def _is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.sid)

    def _access_token(self) -> str:
        """Token OAuth2 cacheado en memoria, renovado solo cuando hace falta.

        Los access tokens de Rakuten viven 1 hora. Guardar uno en una variable
        de entorno lo condenaría a vencerse y dejar el pipeline fallando en
        silencio, así que en el entorno van SOLO las credenciales estables
        (client id/secret) y el token se pide acá en caliente.
        """
        if self._token and time.time() < self._token_vence:
            return self._token

        credenciales = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        try:
            resp = self.session.post(
                self.TOKEN_URL,
                headers={"Authorization": f"Bearer {credenciales}"},
                data={"scope": self.sid},
                timeout=self.timeout,
            )
            if resp.status_code != 200:
                print(f"❌ [Rakuten] token HTTP {resp.status_code}: {resp.text[:200]}")
                return ""
            datos = resp.json()
            self._token = str(datos.get("access_token", ""))
            vida = int(datos.get("expires_in", 3600))
            self._token_vence = time.time() + max(vida - self.TOKEN_MARGEN_S, 60)
            return self._token
        except Exception as e:
            print(f"❌ [Rakuten] no se pudo obtener token: {e}")
            return ""

    def fetch_deals(self, country_code: str) -> list:
        if not self._is_configured():
            return []
        keywords = self.COUNTRY_KEYWORDS.get(country_code)
        if not keywords:
            return []

        token = self._access_token()
        if not token:
            return []

        # Deduplica por SKU entre keywords: "laptop" y "notebook computer"
        # devuelven solapamiento, y sin esto el mismo producto entraría dos
        # veces con distinto origen de búsqueda.
        vistos: set = set()
        crudos: list = []

        for kw in keywords:
            try:
                _human_delay(1.0, 2.5)  # respeta el rate limit por minuto (403)
                resp = _retry_get(
                    self.session,
                    f"{self.SEARCH_URL}?keyword={quote_plus(kw)}&max={self.PAGE_SIZE}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=30,
                )
                if not resp or resp.status_code != 200:
                    continue
                for item in self._parse_items(resp.text):
                    sku = item.get("sku", "")
                    if sku and sku not in vistos:
                        vistos.add(sku)
                        crudos.append(item)
            except Exception as e:
                print(f"❌ [Rakuten] {country_code}/{kw}: {e}")

        if not crudos:
            # Silencio informativo: pasa cuando los comerciantes asociados no
            # publican feed (le ocurre a ASUS BR). No es un fallo de red ni de
            # credenciales, así que se distingue del error para no despistar.
            print(f"⚠️  [Rakuten] {country_code}: 0 productos "
                  f"(¿los comerciantes asociados publican feed?)")
        return self._normalize(crudos, country_code)

    @staticmethod
    def _parse_items(xml_text: str) -> list:
        """Convierte el XML de la API en dicts planos.

        Usa defusedxml en vez de xml.etree: el parser estándar es vulnerable a
        expansión de entidades y esto procesa contenido remoto. La respuesta
        viene de Rakuten sobre TLS, pero un parser seguro cuesta lo mismo.
        """
        try:
            raiz = DefusedET.fromstring(xml_text)
        except Exception:
            return []

        items = []
        for nodo in raiz.findall("item"):
            def txt(tag: str) -> str:
                el = nodo.find(tag)
                return (el.text or "").strip() if el is not None else ""

            categoria = nodo.find("category")
            primaria = secundaria = ""
            if categoria is not None:
                p, s = categoria.find("primary"), categoria.find("secondary")
                primaria   = (p.text or "").strip() if p is not None else ""
                secundaria = (s.text or "").strip() if s is not None else ""

            # La categoría viene jerárquica con "~~" como separador:
            #   Electronics Accessories~~Power~~Batteries~~Laptop Batteries
            # La HOJA es lo que describe el producto de verdad ("Laptop
            # Batteries"); los niveles de arriba son tan genéricos que sirven
            # de poco y encima confunden al clasificador, porque "Electronics
            # Accessories" también encabeza categorías legítimas.
            hoja = secundaria.split("~~")[-1].strip() if secundaria else ""

            items.append({
                "sku":          txt("sku"),
                "mid":          txt("mid"),
                "merchantname": txt("merchantname"),
                "productname":  txt("productname"),
                "price":        txt("price"),
                "saleprice":    txt("saleprice"),
                "linkurl":      txt("linkurl"),
                "imageurl":     txt("imageurl"),
                # Jerarquía CRUDA — la taxonomía necesita la ruta completa
                # para poder evaluar la hoja primero y la rama después.
                "primary":       primaria,
                "secondary_raw": secundaria,
                # Versión aplanada, solo para diagnóstico y logs legibles.
                "categoria":    f"{primaria} {hoja}".strip(),
            })
        return items

    def _normalize(self, raw_data: list, country_code: str) -> list:
        self._prewarm_images(raw_data)
        normalized = []
        for item in raw_data:
            name = item.get("productname", "")

            # 📂 Taxonomía v8 sobre la jerarquía CRUDA del feed. Se le pasa
            # `secondary` sin aplanar porque `classify_product` mira primero
            # la hoja de la ruta, que es el dato más específico que hay.
            #
            # El resultado (`subcategoría`) va directo a `product_type`: en la
            # taxonomía v8 son lo mismo. La categoría macro no se guarda acá —
            # sale del JOIN con `product_categories.family`.
            par = classify_product(item.get("primary", ""),
                                   item.get("secondary_raw", ""),
                                   name)
            if not par:
                continue  # no es catálogo digital, o no ubicable en la taxonomía
            product_type = par[1]

            def num(clave: str) -> float:
                try:
                    return float(item.get(clave) or 0)
                except (TypeError, ValueError):
                    return 0.0

            precio_lista = num("price")
            precio_oferta = num("saleprice")
            # `saleprice` llega en 0 cuando NO hay descuento — no es un precio
            # de cero. Tomarlo tal cual mandaría productos gratis al catálogo.
            precio_actual = precio_oferta if precio_oferta > 0 else precio_lista

            raw_deal = {
                "sku_original":  item.get("sku", ""),
                "retailer_slug": item.get("merchantname", "rakuten").lower().replace(" ", "_"),
                "country_code":  country_code,
                "brand":         extract_brand(name),
                "name":          name,
                "product_type":  product_type,
                "financials": {
                    "original_price": precio_lista,
                    "current_price":  precio_actual,
                },
                "urls": {
                    # `linkurl` ya viene firmado con el ID de publisher: no se
                    # reescribe ni se le concatena nada, o se rompe el tracking.
                    "image":         item.get("imageurl", ""),
                    "affiliate_raw": item.get("linkurl", ""),
                },
            }
            result = self.normalizer.normalize_laptop_data(raw_deal)
            if result:
                normalized.append(result)
        return normalized


# ==============================================================================
# 5. IMPACT.COM (ex Impact Radius) — Partner Catalogs API (US)
#
# Afiliación de Lenovo aceptada 2026-08-11. Es la red más rica en señal de todo
# el proyecto, y eso importa más que el volumen: el feed de Rakuten/Newegg trae
# `price` y `saleprice` y nada más, así que el 97% del catálogo terminaba con
# score genérico 5.0 por ausencia de evidencia, no por ser malas ofertas.
#
# Impact sí publica lo que faltaba, con nombres verificados contra el esquema
# OpenAPI v16 de la Partner Catalogs API:
#   • `OriginalPrice` + `CurrentPrice` + `DiscountPercentage` → descuento REAL.
#   • `StockAvailability` → deja de publicarse lo que no se puede comprar.
#   • `Condition` → un refurbished deja de guardarse como nuevo.
#   • `Manufacturer` → marca declarada por el comerciante, no adivinada del
#     título por regex (`extract_brand` acierta menos de lo que parece).
#   • `Promotions[]` → cupones vigentes con código y fecha de expiración.
#
# ⚠️ `Url` YA viene firmada con el ID de partner de la cuenta ("Tracking URL
# for the product page, unique to your partner account" — dixit el esquema).
# No se reescribe ni se le concatena nada, igual que el `linkurl` de Rakuten,
# o se rompe la atribución de la comisión.
#
# Se usa `Catalogs/ItemSearch` y no `Catalogs/{id}/Items` a propósito: busca
# sobre TODOS los catálogos disponibles en una sola llamada y está paginado.
# Así, cuando se sume otra marca en Impact (el modelo de negocio es sumar
# marcas), entra sola sin tocar código ni configuración.
#
# Cómo obtener las credenciales:
#   1. app.impact.com → arriba a la derecha, el menú de la cuenta → Settings
#   2. API Access (o "Technical Settings") → mostrar el Account SID y el Auth Token
#   3. Son las MISMAS para todas las marcas del programa: no hay una por marca.
# Variables requeridas: IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN
# ==============================================================================
class ImpactRadiusAPI(RetailerAPI):
    BASE_URL = "https://api.impact.com/Mediapartners"

    # Documentado como default de la API; se declara explícito para no depender
    # de un default remoto que puede cambiar sin avisar.
    PAGE_SIZE = 100

    # Techo de páginas por keyword. La API corta el paginado en 20.000 registros
    # totales; 20 páginas × 100 es holgado para un barrido por término y evita
    # que un catálogo enorme monopolice el presupuesto de tiempo del ciclo.
    MAX_PAGES = 20

    # Estados que NO se publican. Se comparan normalizados (sin espacios, en
    # minúsculas) porque el valor lo escribe cada comerciante: se han visto
    # "OutOfStock", "out of stock" y "OUT_OF_STOCK" para lo mismo.
    STOCK_NO_PUBLICABLE = {"outofstock", "discontinued", "unavailable", "soldout"}

    # Mapeo al enum de `ProductCondition` (new | refurbished | open_box). Lo que
    # no matchee cae a "new", que es el default histórico del normalizador.
    CONDICIONES = {
        "new": "new", "brandnew": "new",
        "refurbished": "refurbished", "renewed": "refurbished", "used": "refurbished",
        "openbox": "open_box", "open_box": "open_box",
    }

    COUNTRY_KEYWORDS = {
        "US": ["laptop", "notebook computer", "desktop computer", "monitor",
               "keyboard", "mouse", "headset", "webcam", "printer", "toner cartridge"],
    }

    def __init__(self):
        super().__init__()
        # `.strip()` no es cosmético: estas credenciales se copian y pegan del
        # panel de Impact y llegan con un salto de línea al final más veces de
        # las que uno querría. Con el salto, la Basic auth se arma mal y la API
        # responde 401 en cada corrida sin ninguna pista de por qué.
        self.account_sid = os.getenv("IMPACT_ACCOUNT_SID", "").strip()
        self.auth_token  = os.getenv("IMPACT_AUTH_TOKEN", "").strip()
        if self._is_configured():
            # Basic auth a nivel sesión: el esquema de Impact es
            # `base64(AccountSID:AuthToken)` en el header Authorization, y
            # requests lo arma solo a partir de la tupla.
            self.session.auth = (self.account_sid, self.auth_token)

    #: Valores que significan "el secreto existe pero todavía no tiene la
    #: credencial real". Cloud Run exige que un secreto referenciado tenga al
    #: menos una versión, así que se crean con `PENDIENTE` y el adaptador se
    #: mantiene apagado hasta que se cargue el valor de verdad. Sin esto, la
    #: cuenta saldría a pedir con un token falso y comería un 401 por corrida.
    _PLACEHOLDERS = {"", "pendiente", "unset", "changeme", "todo", "placeholder"}

    def _is_configured(self) -> bool:
        return not (
            self.account_sid.lower() in self._PLACEHOLDERS
            or self.auth_token.lower() in self._PLACEHOLDERS
        )

    def _get_json(self, url: str, params: dict) -> dict:
        """GET autenticado que devuelve dict, o {} ante cualquier fallo.

        El `Accept` va explícito: la API responde XML cuando no se lo pide en
        JSON, y el parseo fallaría en silencio devolviendo cero productos —
        indistinguible de "el catálogo está vacío".
        """
        resp = _retry_get(
            self.session, url, params=params,
            headers={"Accept": "application/json"}, timeout=30,
        )
        if resp is None:
            print("❌ [Impact] sin respuesta tras reintentos")
            return {}
        if resp.status_code == 401:
            print("❌ [Impact] 401: Account SID o Auth Token inválidos.")
            return {}
        if resp.status_code == 403:
            # El 403 acá NO es "credenciales mal": es el token sin el permiso
            # de catálogos, o la marca todavía sin aprobar la asociación.
            print("❌ [Impact] 403: el token no tiene acceso a Catalogs "
                  "(¿la marca aprobó la asociación?).")
            return {}
        if resp.status_code != 200:
            print(f"❌ [Impact] HTTP {resp.status_code}: {resp.text[:200]}")
            return {}
        try:
            return resp.json()
        except ValueError:
            print(f"❌ [Impact] respuesta no-JSON: {resp.text[:200]}")
            return {}

    def _catalogos_disponibles(self) -> list:
        """Lista los catálogos visibles para la cuenta. Solo diagnóstico.

        Es la diferencia entre "no hay productos" y "no hay catálogos": lo
        primero puede ser un keyword sin match; lo segundo significa que la
        asociación con la marca no está activa y ninguna corrida va a traer
        nada por más que se reintente.
        """
        datos = self._get_json(f"{self.BASE_URL}/{self.account_sid}/Catalogs", {})
        catalogos = datos.get("Catalogs") or []
        return catalogos if isinstance(catalogos, list) else []

    def fetch_deals(self, country_code: str) -> list:
        if not self._is_configured():
            return []
        keywords = self.COUNTRY_KEYWORDS.get(country_code)
        if not keywords:
            return []

        vistos: set = set()
        crudos: list = []

        for kw in keywords:
            for page in range(1, self.MAX_PAGES + 1):
                try:
                    _human_delay(0.5, 1.5)
                    datos = self._get_json(
                        f"{self.BASE_URL}/{self.account_sid}/Catalogs/ItemSearch",
                        {"Keyword": kw, "PageSize": self.PAGE_SIZE, "Page": page},
                    )
                    items = datos.get("Items") or []
                    if not isinstance(items, list) or not items:
                        break

                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        # `Id` combina catálogo + ítem de la marca, así que es
                        # único entre catálogos; `CatalogItemId` solo lo es
                        # dentro de uno y colisionaría al sumar marcas.
                        ident = item.get("Id") or item.get("CatalogItemId") or ""
                        if ident and ident not in vistos:
                            vistos.add(ident)
                            crudos.append(item)

                    # Última página: la API devolvió menos de lo pedido.
                    if len(items) < self.PAGE_SIZE:
                        break
                except Exception as e:
                    print(f"❌ [Impact] {country_code}/{kw} p{page}: {e}")
                    break

        if not crudos:
            catalogos = self._catalogos_disponibles()
            if not catalogos:
                print(f"⚠️  [Impact] {country_code}: 0 catálogos visibles "
                      f"(la asociación con la marca no está activa).")
            else:
                resumen = ", ".join(
                    f"{c.get('AdvertiserName', '?')}({c.get('NumberOfItems', '?')})"
                    for c in catalogos[:5]
                )
                print(f"⚠️  [Impact] {country_code}: 0 productos tras el barrido, "
                      f"pero hay {len(catalogos)} catálogo(s): {resumen}")
        return self._normalize(crudos, country_code)

    @staticmethod
    def _precio(valor) -> float:
        """Convierte el precio (string en el esquema) a float.

        Se limpia el símbolo de moneda y los separadores de miles porque el
        campo lo llena cada comerciante: se ven "1299.00", "$1,299.00" y "".
        """
        if valor in (None, ""):
            return 0.0
        texto = re.sub(r"[^\d.\-]", "", str(valor))
        try:
            return float(texto) if texto not in ("", "-", ".") else 0.0
        except ValueError:
            return 0.0

    def _normalize(self, raw_data: list, country_code: str) -> list:
        self._prewarm_images(raw_data)
        normalized = []
        descartados_stock = 0

        for item in raw_data:
            name = item.get("Name", "")

            par = classify_product(item.get("Category", ""),
                                   item.get("SubCategory", ""),
                                   name)
            if not par:
                continue
            product_type = par[1]

            # 📦 Stock: es el dato que Rakuten no da y que evita mandar tráfico
            # afiliado a una ficha agotada — un clic que no puede convertir.
            estado = re.sub(r"[\s_-]", "", str(item.get("StockAvailability", ""))).lower()
            if estado in self.STOCK_NO_PUBLICABLE:
                descartados_stock += 1
                continue

            precio_actual = self._precio(item.get("CurrentPrice"))
            precio_lista  = self._precio(item.get("OriginalPrice"))
            if precio_actual <= 0:
                continue  # sin precio no hay oferta que comparar

            # 💰 Descuento declarado por el comerciante. Si no vino
            # `OriginalPrice` pero sí el porcentaje, se reconstruye el precio de
            # referencia: es aritmética sobre un dato que la marca afirma, no un
            # descuento inventado. El tope del 95% descarta valores absurdos
            # (un 100% haría division-by-zero y un 99% inflaría el precio ×100).
            descuento = self._precio(item.get("DiscountPercentage"))
            if precio_lista <= precio_actual and 0 < descuento < 95:
                precio_lista = round(precio_actual / (1 - descuento / 100), 2)

            raw_deal = {
                "sku_original":  str(item.get("CatalogItemId") or item.get("Id") or ""),
                # El slug identifica al COMERCIANTE, no a la red: así "lenovo"
                # queda comparable con lo que llegue de otras redes en vez de
                # quedar todo aplastado bajo "impact".
                "retailer_slug": str(item.get("CampaignName")
                                     or item.get("Manufacturer")
                                     or "impact").lower().replace(" ", "_"),
                "country_code":  country_code,
                "currency":      item.get("Currency") or "",
                # `Manufacturer` es la marca declarada; `extract_brand` es un
                # regex sobre el título y solo se usa si la marca no vino.
                "brand":         item.get("Manufacturer") or extract_brand(name),
                "name":          name,
                "product_type":  product_type,
                "condition":     self.CONDICIONES.get(
                    re.sub(r"[\s_-]", "", str(item.get("Condition", ""))).lower(), "new"),
                "in_stock":      True,
                "financials": {
                    "original_price": precio_lista,
                    "current_price":  precio_actual,
                },
                "urls": {
                    "image": item.get("ImageUrl", ""),
                    # Ya firmada con el ID de partner — no tocar.
                    "affiliate_raw": item.get("Url", ""),
                },
            }
            result = self.normalizer.normalize_laptop_data(raw_deal)
            if result:
                normalized.append(result)

        if descartados_stock:
            print(f"ℹ️  [Impact] {country_code}: {descartados_stock} productos "
                  f"descartados por estar sin stock.")
        return normalized


# ==============================================================================
# ORCHESTRATOR PRINCIPAL
# Países → API: LATAM → MercadoLibre | ES → Awin | US → CJ + Rakuten + Impact
# ==============================================================================
class MarketHunterOrchestrator:
    def __init__(self, orchestrator=None):
        # 📡 El orquestador se inyecta para escribir telemetría en MongoDB.
        # Antes este agente reportaba SOLO con `print()`: 11 llamadas a stdout
        # y cero a `log_action`. Es el agente que llena el catálogo, o sea el
        # más caro de tener fallando a ciegas, y sus errores no llegaban a la
        # colección `agent_logs` — solo a los logs de Cloud Run, donde nadie
        # mira salvo que ya sospeche. Opcional: sin orquestador sigue
        # funcionando igual (los tests lo instancian pelado).
        self.orchestrator = orchestrator
        self.ml_api      = MercadoLibreAPI()
        self.awin_api    = AwinNetworkAPI()
        self.cj_api      = CJAffiliateAPI()
        self.rakuten_api = RakutenNetworkAPI()
        self.impact_api  = ImpactRadiusAPI()

        # Mapeo explícito: qué API maneja qué país. US queda cubierto por dos
        # redes a propósito — es el único mercado con afiliación viva hoy, y
        # cada red aporta comerciantes distintos; el dedupe por SKU en
        # PersistenceOrchestrator evita colisiones.
        self._tasks = (
            [(self.ml_api,      c) for c in ["AR", "MX", "BR", "CO", "CL"]] +
            [(self.awin_api,    c) for c in ["ES"]]                          +
            [(self.cj_api,      c) for c in ["US"]]                          +
            [(self.rakuten_api, c) for c in ["US"]]                          +
            [(self.impact_api,  c) for c in ["US"]]
        )

    def _log(self, mensaje: str, status: str = "SUCCESS") -> None:
        """Reporta a stdout y, si hay orquestador, también a telemetría."""
        print(mensaje)
        if self.orchestrator is not None:
            try:
                self.orchestrator.log_action("MarketHunter", mensaje.strip(), status)
            except Exception:
                pass  # la telemetría nunca puede tumbar la cacería

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
                        self._log(f"✅ [MarketHunter/{api_name}] {country}: {len(deals)} ofertas.")
                    else:
                        self._log(f"⚠️  [MarketHunter/{api_name}] {country}: sin resultados (¿API key configurada?).", "WARNING")
                except Exception as e:
                    self._log(f"🚨 [MarketHunter/{api_name}] {country}: {e}", "ERROR")

        return all_deals
