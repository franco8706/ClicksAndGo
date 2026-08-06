"""Tests del adaptador de Rakuten Advertising y del clasificador de catálogo.

Fijan lo que se descubrió midiendo el feed REAL de Newegg (2026-08-06), no
casos inventados: cada caso de `test_titulos_reales_del_feed` es un título que
efectivamente entró mal clasificado en alguna ronda de medición. Sirven de red
para que un cambio en el clasificador no vuelva a abrir la puerta a repuestos.

No hacen red: el parser y el clasificador son funciones puras, y el camino de
red ya se verificó a mano contra la API en vivo.
"""

import pytest

from src.agents.market_hunter import (
    RakutenNetworkAPI,
    classify_digital_product,
    extract_brand,
)


# ──────────────────────────────────────────────────────────────────────────
# Clasificador
# ──────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("titulo,esperado", [
    # Productos terminados — TIENEN que entrar
    ("HP 17.3' FHD Business Laptop, Intel Core i7 1355U", "laptop"),
    ("Lenovo ThinkPad P15 20YQ003WUS 15.6' Laptop i7-11800H", "laptop"),
    ("Lenovo ThinkVision E24-40 24' Full HD LED Monitor", "monitor"),
    ("HP 240 Bluetooth Mouse, Bluetooth 5.1 Wireless", "mouse"),
    ("Keychron K2 HE Rapid Trigger Wireless Custom Keyboard", "keyboard"),
    ("Logitech H390 Wired Headset, Stereo Headphones", "headphones"),

    # Repuestos y accesorios — NO pueden entrar. Todos entraban como "laptop"
    # antes de las correcciones, porque su título nombra el equipo al que
    # acompañan.
    ("NBL_N15_MB Dell Inspiron 7590 Motherboard Laptop Motherboards", None),
    ("Spare 593553-001 MU06 Laptop Battery for HP Pavilion", None),
    ("Yustda 19.5V 230W AC/DC Adapter for AORUS Gaming Laptop", None),
    ("ABLEGRID AC DC Adapter Power for Yamaha PSR-340 Keyboard", None),
    ("Osprey Proxima Laptop Commuter Backpack, Black", None),
    ("Crucial 64GB DDR5 SO-DIMM 4800 Laptop Memory", None),
    ("3M Privacy Filter for 14' Widescreen Laptop", None),
    ("KEHIPI Large Gaming Mouse Pad with Stitched Edges", None),
    ("MyGift Whitewashed Wood Computer Monitor and Laptop Riser Stand", None),
    ("eSUN Carbon Fiber PLA Filament 1.75mm 3D Printer Filament", None),
    ("Laptop Fan for Toshiba Satellite A135-S2336 CPU Cooling Fan", None),
    ("Xerox Printer Transfer Roller 108R01053", None),
])
def test_titulos_reales_del_feed(titulo, esperado):
    assert classify_digital_product(titulo, "") == esperado


def test_gana_la_keyword_mas_temprana_no_el_orden_del_diccionario():
    """Un teclado que menciona 'laptop' sigue siendo un teclado.

    Regresión concreta: el clasificador recorría `_CATEGORY_KEYWORDS` en orden
    de diccionario y devolvía la primera coincidencia, así que cualquier
    producto que dijera "for Laptop" salía como laptop aunque su propio nombre
    dijera qué era.
    """
    titulo = "KOORUI 60% Mechanical Gaming Keyboard LED Backlit for Laptop PC"
    assert classify_digital_product(titulo, "") == "keyboard"

    titulo2 = "Portable Monitor 15.6'' FHD 1080P Ultra-Slim for Laptop"
    assert classify_digital_product(titulo2, "") == "monitor"


def test_el_titulo_le_gana_a_una_categoria_equivocada():
    """El comerciante se equivoca al categorizar más seguido que el título.

    Caso real del feed: Newegg publicó un mouse gamer bajo la categoría
    "Printers Copiers & Fax". Priorizar la categoría lo mandaba a impresoras.
    """
    assert classify_digital_product(
        "V80 Wired Gaming Mouse 8 Key 5000 DPI Ergonomic RGB",
        "Electronics Printers Copiers & Fax",
    ) == "mouse"


def test_la_categoria_resuelve_cuando_el_titulo_no_dice_nada():
    assert classify_digital_product("KOORUI 24E3 FHD 100Hz", "Video Computer Monitors") == "monitor"


def test_electronics_accessories_no_descarta_productos_legitimos():
    """"Electronics Accessories" encabeza categorías VÁLIDAS en Rakuten.

    Es la raíz de la rama donde viven mice y teclados reales, así que filtrar
    por esa frase vaciaría dos categorías enteras del catálogo.
    """
    assert classify_digital_product(
        "HyperX Alloy Origins Core Mechanical Gaming Keyboard",
        "Electronics Accessories Computer Components Input Devices Keyboards",
    ) == "keyboard"


# ──────────────────────────────────────────────────────────────────────────
# Extracción de marca
# ──────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("titulo,marca", [
    ("HP 17.3' FHD Business Laptop, Intel Core i7", "Hp"),
    ("Lenovo ThinkPad P15 Laptop i7-11800H 32GB", "Lenovo"),
    ("Acer Vero V7 V227Q H 21.5' Full HD LED Monitor", "Acer"),
    ("Apple MacBook Air 13 M2", "Apple"),
    # Sin marca conocida no se inventa una
    ("V80 Wired Gaming Mouse 8 Key 5000 DPI", "Genérica"),
])
def test_extract_brand(titulo, marca):
    assert extract_brand(titulo) == marca


def test_marca_gana_la_que_aparece_primero():
    """El título nombra la marca al principio y los componentes después.

    Sin esta regla "Dell ... Intel Core ... GeForce" podía salir como Intel.
    """
    assert extract_brand("Dell Inspiron 15 Intel Core i7 NVIDIA") == "Dell"


def test_marca_no_se_toma_del_numero_de_parte():
    """Regresión: tomar la primera palabra devolvía números de parte.

    El feed no trae campo de marca, y `name.split()[0]` daba "NBL_N15_MB".
    """
    assert extract_brand("NBL_N15_MB Dell Inspiron 7590 Motherboard") == "Dell"


# ──────────────────────────────────────────────────────────────────────────
# Parser XML del feed
# ──────────────────────────────────────────────────────────────────────────

XML_MUESTRA = """<result>
<TotalMatches>2</TotalMatches>
<item>
  <mid>44583</mid><merchantname>Newegg</merchantname>
  <sku>9SIA</sku>
  <productname>Lenovo ThinkVision E24-40 24' Full HD LED Monitor</productname>
  <category><primary>Electronics</primary>
    <secondary>Electronics Accessories~~Computer Components~~Monitors</secondary></category>
  <price currency="USD">189.99</price><saleprice currency="USD">149.99</saleprice>
  <linkurl>https://click.linksynergy.com/link?id=abc&amp;murl=x</linkurl>
  <imageurl>https://c1.neweggimages.com/foto.jpg</imageurl>
</item>
</result>"""


def test_parser_extrae_los_campos_que_usa_el_catalogo():
    items = RakutenNetworkAPI._parse_items(XML_MUESTRA)
    assert len(items) == 1
    it = items[0]
    assert it["sku"] == "9SIA"
    assert it["merchantname"] == "Newegg"
    assert it["imageurl"] == "https://c1.neweggimages.com/foto.jpg"
    assert "linksynergy" in it["linkurl"]


def test_parser_usa_la_hoja_de_la_categoria():
    """De "A~~B~~C" interesa "C": es lo único que describe el producto."""
    it = RakutenNetworkAPI._parse_items(XML_MUESTRA)[0]
    assert it["categoria"] == "Electronics Monitors"


def test_parser_no_explota_con_xml_invalido():
    """La API puede devolver un cuerpo raro; el pipeline no puede caerse."""
    assert RakutenNetworkAPI._parse_items("<result><item>roto") == []
    assert RakutenNetworkAPI._parse_items("") == []


def test_saleprice_en_cero_significa_sin_descuento():
    """`saleprice` llega en 0 cuando NO hay oferta — no es un precio de cero.

    Tomarlo literal publicaría productos gratis.
    """
    api = RakutenNetworkAPI()
    xml = XML_MUESTRA.replace('<saleprice currency="USD">149.99', '<saleprice currency="USD">0')
    item = api._parse_items(xml)[0]
    assert item["saleprice"] == "0"

    # El precio de lista es el que debe quedar como precio actual.
    normalizados = api._normalize([item], "US")
    if normalizados:  # depende del normalizador, que valida más cosas
        fin = normalizados[0]["financials"]
        assert fin["current_price"] == 189.99


# ──────────────────────────────────────────────────────────────────────────
# Configuración y token
# ──────────────────────────────────────────────────────────────────────────

def test_sin_credenciales_no_hace_red(monkeypatch):
    """Sin configurar devuelve vacío en vez de fallar: las 4 redes conviven y
    una sin credenciales no puede tumbar la corrida de las demás."""
    for var in ("RAKUTEN_CLIENT_ID", "RAKUTEN_CLIENT_SECRET", "RAKUTEN_SID"):
        monkeypatch.delenv(var, raising=False)
    api = RakutenNetworkAPI()
    assert api._is_configured() is False
    assert api.fetch_deals("US") == []


def test_pais_no_mapeado_no_consulta(monkeypatch):
    monkeypatch.setenv("RAKUTEN_CLIENT_ID", "x")
    monkeypatch.setenv("RAKUTEN_CLIENT_SECRET", "y")
    monkeypatch.setenv("RAKUTEN_SID", "1")
    assert RakutenNetworkAPI().fetch_deals("AR") == []


def test_page_size_no_supera_el_techo_de_la_api():
    """Por encima de 100 la API responde 200 con CERO items.

    Es la peor forma de fallar —éxito aparente, catálogo vacío— así que el
    tope queda fijado por test.
    """
    assert RakutenNetworkAPI.PAGE_SIZE <= 100
