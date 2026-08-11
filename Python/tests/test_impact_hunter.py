"""Tests del adaptador de Impact.com (Partner Catalogs API v16).

Impact es la primera red del proyecto que publica SEÑAL DE OFERTA real
—`OriginalPrice`, `DiscountPercentage`, `StockAvailability`, `Condition`—, así
que estos tests cubren sobre todo el riesgo nuevo: que esa señal se lea mal y
termine afirmando algo falso sobre un producto (un descuento que no existe, un
refurbished vendido como nuevo, o una ficha agotada recibiendo tráfico pago).

Corren OFFLINE: ninguno toca la red (ver `conftest.py`).
"""

import pytest

from src.agents.market_hunter import (
    ImpactRadiusAPI,
    MarketHunterOrchestrator,
    RetailerAPI,
)


def item_muestra(**overrides) -> dict:
    """Un ítem con la forma exacta del esquema OpenAPI v16 de Impact."""
    base = {
        "Id": "12345-LEN-X1C-G12",
        "CatalogItemId": "LEN-X1C-G12",
        "CatalogId": "12345",
        "CampaignName": "Lenovo US",
        "Name": "Lenovo ThinkPad X1 Carbon Gen 12 16GB RAM 512GB SSD",
        "Manufacturer": "Lenovo",
        "Category": "Computers",
        "SubCategory": "Laptops",
        "CurrentPrice": "1299.00",
        "OriginalPrice": "1899.00",
        "DiscountPercentage": "31",
        "Currency": "USD",
        "StockAvailability": "InStock",
        "Condition": "New",
        "ImageUrl": "https://p1-ofp.static.pub/thinkpad-x1.png",
        "Url": "https://lenovo.pxf.io/c/1234567/89012/3456?u=https%3A%2F%2Fwww.lenovo.com",
    }
    base.update(overrides)
    return base


def catalogo_muestra(**overrides) -> dict:
    """Un catálogo con la forma real que devolvió la API (verificado en vivo)."""
    base = {
        "Id": "12345",
        "Name": "Lenovo US Feed",
        "AdvertiserName": "Lenovo",
        "AdvertiserLocation": "United States",
        "CampaignName": "Lenovo US",
        "NumberOfItems": "335",
        "Currency": "USD",
        "ServiceAreas": ["United States"],
    }
    base.update(overrides)
    return base


def normalizar(**overrides) -> list:
    return ImpactRadiusAPI()._normalize([item_muestra(**overrides)], "US")


# ──────────────────────────────────────────────────────────────────────────
# Precios: el campo llega como STRING y lo llena cada comerciante
# ──────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("crudo,esperado", [
    ("1299.00",   1299.0),
    ("$1,299.00", 1299.0),   # símbolo y separador de miles
    ("1299",      1299.0),
    ("",          0.0),
    (None,        0.0),
    ("N/A",       0.0),      # texto libre: no puede explotar
    (".",         0.0),
    ("-",         0.0),
])
def test_precio_tolera_lo_que_manda_el_comerciante(crudo, esperado):
    assert ImpactRadiusAPI._precio(crudo) == esperado


def test_sin_precio_actual_no_entra_al_catalogo():
    """Un producto sin precio no es una oferta comparable."""
    assert normalizar(CurrentPrice="") == []
    assert normalizar(CurrentPrice="0") == []


# ──────────────────────────────────────────────────────────────────────────
# Descuento — la señal que el feed de Rakuten no tiene
# ──────────────────────────────────────────────────────────────────────────

def test_descuento_real_llega_al_scoring():
    """El caso que justifica toda la integración: 1299 sobre 1899 es un 31%.

    Con Rakuten esto valía score genérico 5.0 por falta de evidencia.
    """
    fin = normalizar()[0]["financials"]
    assert fin["current_price"] == 1299.0
    assert fin["original_price"] == 1899.0
    assert fin["discount_pct"] == 31


def test_reconstruye_el_precio_de_referencia_desde_el_porcentaje():
    """Si falta `OriginalPrice` pero la marca declara el %, se deriva.

    Es aritmética sobre un dato afirmado por el comerciante, no un descuento
    inventado: 800 con 20% off implica un precio de lista de 1000.
    """
    fin = normalizar(OriginalPrice="", CurrentPrice="800", DiscountPercentage="20")[0]["financials"]
    assert fin["original_price"] == 1000.0
    assert fin["discount_pct"] == 20


def test_sin_descuento_no_se_inventa_uno():
    """Sin `OriginalPrice` ni porcentaje, el precio de lista NO se fabrica."""
    fin = normalizar(OriginalPrice="", DiscountPercentage="0")[0]["financials"]
    assert fin["discount_pct"] == 0
    assert fin["original_price"] <= fin["current_price"]


@pytest.mark.parametrize("pct", ["95", "99", "100", "150"])
def test_porcentaje_absurdo_no_reconstruye_precio(pct):
    """Un 100% haría división por cero y un 99% inflaría el precio ×100.

    Ante un valor imposible se prefiere no tener precio de referencia antes
    que publicar uno delirante.
    """
    fin = normalizar(OriginalPrice="", CurrentPrice="800", DiscountPercentage=pct)[0]["financials"]
    assert fin["original_price"] <= fin["current_price"]
    assert fin["discount_pct"] == 0


# ──────────────────────────────────────────────────────────────────────────
# Stock: no mandar tráfico afiliado a una ficha que no se puede comprar
# ──────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("estado", [
    "OutOfStock", "out of stock", "OUT_OF_STOCK", "out-of-stock",
    "Discontinued", "SoldOut", "Unavailable",
])
def test_agotado_no_se_publica(estado):
    """El valor lo escribe cada comerciante: se compara normalizado."""
    assert normalizar(StockAvailability=estado) == []


@pytest.mark.parametrize("estado", ["InStock", "in stock", "PreOrder", ""])
def test_disponible_o_desconocido_si_se_publica(estado):
    """Ausencia de dato no es ausencia de stock: solo se descarta lo negativo."""
    assert len(normalizar(StockAvailability=estado)) == 1


# ──────────────────────────────────────────────────────────────────────────
# Condición: un refurbished guardado como nuevo es una afirmación falsa
# ──────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("crudo,esperado", [
    ("New",          "new"),
    ("Refurbished",  "refurbished"),
    ("Renewed",      "refurbished"),
    ("Used",         "refurbished"),
    ("Open Box",     "open_box"),
    ("OpenBox",      "open_box"),
    ("",             "new"),
    ("vaya a saber", "new"),
])
def test_condicion_se_mapea_al_enum(crudo, esperado):
    assert normalizar(Condition=crudo)[0]["condition"] == esperado


# ──────────────────────────────────────────────────────────────────────────
# Atribución: el enlace ya viene firmado — tocarlo rompe la comisión
# ──────────────────────────────────────────────────────────────────────────

def test_el_enlace_de_tracking_no_se_reescribe():
    url = "https://lenovo.pxf.io/c/1234567/89012/3456?u=https%3A%2F%2Fwww.lenovo.com"
    assert normalizar()[0]["urls"]["affiliate_raw"] == url


def test_la_marca_declarada_gana_sobre_el_regex_del_titulo():
    """`Manufacturer` lo declara el comerciante; `extract_brand` lo adivina."""
    assert normalizar()[0]["brand"] == "Lenovo"


def test_sin_manufacturer_cae_al_titulo():
    assert normalizar(Manufacturer="")[0]["brand"].lower() == "lenovo"


def test_el_slug_identifica_al_comerciante_no_a_la_red():
    """Aplastar todo bajo "impact" haría incomparables las marcas entre sí."""
    assert normalizar()[0]["retailer_slug"] == "lenovo_us"


# ──────────────────────────────────────────────────────────────────────────
# Configuración: una red sin credenciales no puede tumbar a las otras cuatro
# ──────────────────────────────────────────────────────────────────────────

def test_sin_credenciales_no_hace_red(monkeypatch):
    for var in ("IMPACT_ACCOUNT_SID", "IMPACT_AUTH_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    api = ImpactRadiusAPI()
    assert api._is_configured() is False
    assert api.fetch_deals("US") == []


def test_credencial_a_medias_no_alcanza(monkeypatch):
    """Con SID pero sin token la llamada daría 401 en cada corrida."""
    monkeypatch.setenv("IMPACT_ACCOUNT_SID", "IRxyz")
    monkeypatch.delenv("IMPACT_AUTH_TOKEN", raising=False)
    assert ImpactRadiusAPI()._is_configured() is False


def test_pais_no_mapeado_no_consulta(monkeypatch):
    monkeypatch.setenv("IMPACT_ACCOUNT_SID", "IRxyz")
    monkeypatch.setenv("IMPACT_AUTH_TOKEN", "secreto")
    assert ImpactRadiusAPI().fetch_deals("AR") == []


def test_basic_auth_queda_armada(monkeypatch):
    monkeypatch.setenv("IMPACT_ACCOUNT_SID", "IRxyz")
    monkeypatch.setenv("IMPACT_AUTH_TOKEN", "secreto")
    assert ImpactRadiusAPI().session.auth == ("IRxyz", "secreto")


# ──────────────────────────────────────────────────────────────────────────
# Integración con el resto del cazador
# ──────────────────────────────────────────────────────────────────────────

def test_impact_esta_registrado_en_el_orquestador():
    """Sin esto el adaptador existe pero nunca corre — el fallo más silencioso
    posible: cero errores, cero productos, y nada que lo explique."""
    orq = MarketHunterOrchestrator()
    apis = {type(api).__name__ for api, _ in orq._tasks}
    assert "ImpactRadiusAPI" in apis
    assert ("US" in [c for api, c in orq._tasks if type(api).__name__ == "ImpactRadiusAPI"])


def test_la_clave_de_imagen_de_impact_esta_en_el_prewarm():
    """Impact escribe `ImageUrl` en CamelCase. Sin esta entrada el prewarm no
    la ve y cada foto se verifica serialmente dentro del bucle — el cuello de
    botella de 3,2 min por corrida que ya se corrigió una vez."""
    assert "ImageUrl" in RetailerAPI._CLAVES_IMAGEN


def test_paginado_dentro_de_los_limites_de_la_api():
    """El paginado de la API corta a los 20.000 registros totales."""
    assert ImpactRadiusAPI.PAGE_SIZE <= 100
    assert ImpactRadiusAPI.PAGE_SIZE * ImpactRadiusAPI.MAX_PAGES <= 20_000


def test_dedupe_por_id_entre_catalogos():
    """`CatalogItemId` solo es único DENTRO de un catálogo; `Id` lo es entre
    catálogos. Al sumar marcas, deduplicar por el primero las colisionaría."""
    api = ImpactRadiusAPI()
    a = item_muestra(Id="111-SKU", CatalogItemId="SKU")
    b = item_muestra(Id="222-SKU", CatalogItemId="SKU", Name="Lenovo ThinkVision 27 Monitor",
                     Category="Electronics", SubCategory="Monitors")
    assert len(api._normalize([a, b], "US")) == 2


@pytest.mark.parametrize("valor", ["PENDIENTE", "pendiente", "unset", "changeme", ""])
def test_el_placeholder_del_secreto_mantiene_la_red_apagada(monkeypatch, valor):
    """Cloud Run exige que un secreto referenciado tenga al menos una versión,
    así que se crean con `PENDIENTE`. Si eso contara como configurado, la
    cuenta comería un 401 por corrida sin traer nada."""
    monkeypatch.setenv("IMPACT_ACCOUNT_SID", valor)
    monkeypatch.setenv("IMPACT_AUTH_TOKEN", valor)
    assert ImpactRadiusAPI()._is_configured() is False


def test_credenciales_con_salto_de_linea_igual_funcionan(monkeypatch):
    """Se copian y pegan del panel: llegan con `\\n` más veces de las deseadas."""
    monkeypatch.setenv("IMPACT_ACCOUNT_SID", "IRxyz\n")
    monkeypatch.setenv("IMPACT_AUTH_TOKEN", "  secreto  ")
    api = ImpactRadiusAPI()
    assert api._is_configured() is True
    assert api.session.auth == ("IRxyz", "secreto")


# ──────────────────────────────────────────────────────────────────────────
# Categorías: el separador cambia según el comerciante
# ──────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("categoria,subcategoria", [
    ("Computers|Laptops",                  ""),
    ("Electronics > Computers > Laptops",  "Laptops"),
    ("Computers/Laptops",                  ""),
    ("Computers~~Laptops",                 ""),
    ("",                                   "Laptops"),
])
def test_la_laptop_entra_con_cualquier_separador(categoria, subcategoria):
    """`classify_product` NO busca keywords en `primary` —solo en `secondary`
    y el título—, así que un producto cuya única pista está en `Category` se
    descartaba entero. Verificado: ('Computers|Laptops', '', 'Lenovo IdeaPad
    3') devolvía None, o sea que la laptop no entraba al catálogo."""
    r = normalizar(Category=categoria, SubCategory=subcategoria,
                   Name="Lenovo IdeaPad 3 8GB RAM 256GB SSD")
    assert len(r) == 1
    assert r[0]["product_type"] == "laptop"


def test_lo_que_no_es_catalogo_digital_sigue_afuera():
    """La traducción de categorías no puede ablandar el filtro."""
    assert normalizar(Category="Home & Garden > Furniture", SubCategory="Chairs",
                      Name="Lenovo Gaming Chair") == []


def test_la_hoja_no_se_duplica():
    """Si `SubCategory` ya es la hoja de `Category`, no se repite."""
    _, secondary = ImpactRadiusAPI._categorias(
        {"Category": "Computers > Laptops", "SubCategory": "Laptops"})
    assert secondary == "Computers~~Laptops"


def test_una_pagina_de_un_solo_item_no_se_pierde(monkeypatch):
    """La API es XML por debajo y su JSON colapsa la lista de un elemento en
    un objeto. Sin normalizarlo, esa página se perdía entera y además cortaba
    el paginado como si no quedaran más productos."""
    monkeypatch.setenv("IMPACT_ACCOUNT_SID", "IRxyz")
    monkeypatch.setenv("IMPACT_AUTH_TOKEN", "secreto")
    api = ImpactRadiusAPI()

    llamadas = {"n": 0}

    def fake_get_json(url, params):
        llamadas["n"] += 1
        # Objeto suelto en vez de lista — el caso que rompía.
        return {"Items": item_muestra(CatalogId="12345")} if llamadas["n"] == 1 else {"Items": []}

    api._catalogos_cache = [catalogo_muestra()]
    monkeypatch.setattr(api, "_get_json", fake_get_json)
    monkeypatch.setattr("src.agents.market_hunter._human_delay", lambda *a, **k: None)

    assert len(api.fetch_deals("US")) == 1


# ──────────────────────────────────────────────────────────────────────────
# País: el catálogo asociado decide el mercado, no una constante hardcodeada
# ──────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("catalogo,esperado", [
    ({"ServiceAreas": ["Argentina"]},                          {"AR"}),
    ({"ServiceAreas": ["United States"]},                      {"US"}),
    ({"ServiceAreas": ["Argentina", "Chile"]},                 {"AR", "CL"}),
    ({"ServiceAreas": "Argentina"},                            {"AR"}),   # string suelto
    ({"ServiceAreas": [], "AdvertiserLocation": "Mexico"},     {"MX"}),   # fallback
    ({"ServiceAreas": ["Narnia"]},                             set()),    # país no soportado
])
def test_los_paises_salen_de_lo_que_declara_impact(catalogo, esperado):
    """Se mapea por `ServiceAreas` y NO se infiere por moneda: un feed en USD
    puede vender a varios países y la inferencia daría un país equivocado."""
    assert ImpactRadiusAPI()._paises_del_catalogo(catalogo_muestra(**catalogo)) == esperado


def test_sin_catalogo_para_el_pais_no_se_piden_productos(monkeypatch):
    """El orquestador llama por cada mercado del sitio y hoy solo uno tiene
    feed. Barrer los otros sería pura latencia contra la API."""
    monkeypatch.setenv("IMPACT_ACCOUNT_SID", "IRxyz")
    monkeypatch.setenv("IMPACT_AUTH_TOKEN", "secreto")
    api = ImpactRadiusAPI()
    api._catalogos_cache = [catalogo_muestra(ServiceAreas=["Argentina"], Id="4491")]

    def explota(*a, **k):
        raise AssertionError("no debería pedir productos para un país sin catálogo")

    monkeypatch.setattr(api, "_get_json", explota)
    assert api.fetch_deals("US") == []


def test_los_productos_de_otro_catalogo_no_entran_con_el_pais_equivocado(monkeypatch):
    """`ItemSearch` barre TODOS los catálogos de la cuenta. Sin filtrar por
    CatalogId, al sumar una segunda marca en otro país sus productos entrarían
    con el `country_code` y la moneda del mercado equivocado."""
    monkeypatch.setenv("IMPACT_ACCOUNT_SID", "IRxyz")
    monkeypatch.setenv("IMPACT_AUTH_TOKEN", "secreto")
    api = ImpactRadiusAPI()
    api._catalogos_cache = [
        catalogo_muestra(Id="111", ServiceAreas=["United States"]),
        catalogo_muestra(Id="222", ServiceAreas=["Argentina"]),
    ]

    def fake(url, params):
        if params.get("Page") != 1:
            return {"Items": []}
        return {"Items": [
            item_muestra(Id="a", CatalogId="111", Name="Lenovo ThinkPad US 16GB RAM"),
            item_muestra(Id="b", CatalogId="222", Name="Lenovo ThinkPad AR 16GB RAM"),
        ]}

    monkeypatch.setattr(api, "_get_json", fake)
    monkeypatch.setattr("src.agents.market_hunter._human_delay", lambda *a, **k: None)

    us = api.fetch_deals("US")
    assert len(us) == 1
    assert "US" in us[0]["name"]


def test_impact_registrado_en_todos_los_mercados_del_sitio():
    """El adaptador descubre por API qué país sirve cada catálogo, así que
    registrarlo solo en US dejaría fuera al único feed asociado (Lenovo AR)."""
    orq = MarketHunterOrchestrator()
    paises = {c for api, c in orq._tasks if type(api).__name__ == "ImpactRadiusAPI"}
    assert {"AR", "US", "MX", "ES"} <= paises


def test_el_log_no_culpa_a_la_credencial_cuando_esta_bien(monkeypatch, capsys):
    """Con Impact asociado solo a Argentina, seis mercados devuelven 0 por
    diseño. El mensaje viejo decía siempre "¿API key configurada?" y eran seis
    WARNING por corrida culpando a una credencial que estaba perfecta."""
    monkeypatch.setenv("IMPACT_ACCOUNT_SID", "IRxyz")
    monkeypatch.setenv("IMPACT_AUTH_TOKEN", "secreto")
    orq = MarketHunterOrchestrator()
    orq._tasks = [(orq.impact_api, "MX")]
    monkeypatch.setattr(orq.impact_api, "_catalogos_disponibles",
                        lambda: [catalogo_muestra(ServiceAreas=["Argentina"])])

    orq.hunt_all_markets()
    salida = capsys.readouterr().out
    assert "API key" not in salida
    assert "no hay feed" in salida


def test_el_log_si_avisa_cuando_falta_la_credencial(monkeypatch, capsys):
    for var in ("IMPACT_ACCOUNT_SID", "IMPACT_AUTH_TOKEN"):
        monkeypatch.delenv(var, raising=False)
    orq = MarketHunterOrchestrator()
    orq._tasks = [(orq.impact_api, "AR")]

    orq.hunt_all_markets()
    assert "sin credenciales configuradas" in capsys.readouterr().out


# ──────────────────────────────────────────────────────────────────────────
# Hardware: el scorer no puede puntuar lo que no lee
# ──────────────────────────────────────────────────────────────────────────

DESC_REAL = ('"Color: Grey", "Tipo de pantalla: 14 in", "Procesador: Intel® Core™ '
             'Ultra 7 355", "Sistema operativo: Windows", "Memoria total: 32 GB", '
             '"Unidad de disco primaria: 1 TB", "Configura". Todo en un solo dispositivo.')


def test_extrae_el_hardware_de_la_descripcion_estructurada():
    """El normalizador saca las specs del TÍTULO por regex, y los títulos de
    Lenovo Argentina están en español sin el patrón "16GB RAM 512GB SSD" que
    traen los de Rakuten. Medido: laptops con 21% de descuento real puntuando
    4,5 — el scorer afirmando "hardware mediocre" sobre lo que no podía leer."""
    hw = ImpactRadiusAPI._hardware({"Description": DESC_REAL, "Name": "Lenovo ThinkPad X1"})
    assert hw["cpu"].startswith("Intel")
    assert hw["ram_gb"] == 32
    assert hw["storage_gb"] == 1024   # 1 TB → GB


def test_el_hardware_declarado_le_gana_al_regex_del_titulo():
    """Extremo a extremo: la RAM declarada (32) debe pisar el default de 8."""
    d = normalizar(Description=DESC_REAL,
                   Name="Lenovo ThinkPad X1 2-en-1 Gen 11 Aura Edition")[0]
    assert d["hardware"]["ram_gb"] == 32
    assert d["hardware"]["storage_gb"] == 1024
    assert d["hardware"]["cpu"] != "Procesador Estándar"


def test_lo_que_no_esta_en_la_descripcion_no_se_inventa():
    """Sin specs declaradas se cae a la heurística del título, no a un valor
    fabricado: el título sí trae "16GB RAM 512GB SSD"."""
    hw = ImpactRadiusAPI._hardware({"Description": "Puro texto de marketing.", "Name": "Lenovo X"})
    assert hw == {}
    d = normalizar(Description="Puro texto de marketing.")[0]
    assert d["hardware"]["ram_gb"] == 16      # del título de la muestra
    assert d["hardware"]["storage_gb"] == 512
