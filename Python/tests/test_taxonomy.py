"""Tests de la taxonomía de catálogo digital (v8).

Los casos NO son inventados: cada uno es una ruta o un título que apareció en
el muestreo real de la Product Search API de Rakuten (2026-08-06, 170 rutas
distintas sobre 693.670 productos). Varios fijan errores que la medición
expuso y que no eran predecibles leyendo el código.
"""

import pytest

from src.agents.taxonomy import (
    TAXONOMY,
    ALL_SUBCATEGORIES,
    SUBCATEGORY_PARENT,
    classify_product,
    is_valid_pair,
)


# ──────────────────────────────────────────────────────────────────────
# Integridad de la taxonomía
# ──────────────────────────────────────────────────────────────────────

def test_no_hay_subcategorias_duplicadas_entre_categorias():
    """Una subcategoría en dos categorías haría ambigua la navegación."""
    todas = [s for subs in TAXONOMY.values() for s in subs]
    assert len(todas) == len(set(todas)), "subcategoría repetida en dos ramas"


def test_los_9_codigos_originales_sobreviven_con_su_nombre():
    """No puede haber migración de datos: la FK `fk_laptops_product_type`
    referencia estos códigos y el DTO público los expone.

    Si alguno se renombrara, las 70 filas existentes quedarían apuntando a un
    código inexistente y la FK rechazaría la migración entera.
    """
    for code in ("laptop", "desktop", "monitor", "keyboard", "mouse",
                 "headphones", "webcam", "printer", "supplies"):
        assert code in ALL_SUBCATEGORIES, f"se perdió el código heredado {code}"


def test_toda_subcategoria_tiene_categoria_padre():
    for sub in ALL_SUBCATEGORIES:
        assert SUBCATEGORY_PARENT[sub] in TAXONOMY


def test_is_valid_pair():
    assert is_valid_pair("computing", "laptop")
    assert not is_valid_pair("computing", "ram")      # ram es de components
    assert not is_valid_pair("inventada", "laptop")


# ──────────────────────────────────────────────────────────────────────
# Clasificación — rutas reales del feed
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("pri,sec,esperado", [
    ("Electronics", "Computers~~Laptops",                              ("computing", "laptop")),
    ("Electronics", "Computers~~Desktop Computers",                    ("computing", "desktop")),
    ("Electronics", "Video~~Computer Monitors",                        ("displays", "monitor")),
    ("Electronics", "Electronics Accessories~~Computer Components~~RAM", ("components", "ram")),
    ("Electronics", "Electronics Accessories~~Power~~Batteries~~Laptop Batteries", ("power", "batteries")),
    ("Electronics", "Print Copy Scan & Fax~~Toner & Inkjet Cartridges", ("printing", "supplies")),
    ("Electronics", "Networking~~Bridges & Routers",                   ("networking", "routers")),
    ("Electronics", "Electronics Accessories~~Computer Components~~Input Devices~~Keyboards", ("peripherals", "keyboard")),
    ("Electronics", "Electronics Accessories~~Computer Components~~Input Devices~~Mice & Trackballs", ("peripherals", "mouse")),
    ("Electronics", "Electronics Accessories~~Computer Accessories~~Laptop Docking Stations", ("accessories", "docking_stations")),
    ("Electronics", "Electronics Accessories~~Computer Components~~Laptop Parts~~Laptop Replacement Screens", ("accessories", "laptop_parts")),
])
def test_rutas_reales_del_feed(pri, sec, esperado):
    assert classify_product(pri, sec, "") == esperado


def test_la_hoja_le_gana_a_la_rama():
    """"Laptop Batteries" es una batería, no una laptop.

    La rama de arriba dice "Power", pero es la HOJA la que describe el
    producto. Si mandara la rama, todas las baterías de notebook entrarían
    como notebooks.
    """
    assert classify_product(
        "Electronics", "Electronics Accessories~~Power~~Batteries~~Laptop Batteries", ""
    ) == ("power", "batteries")


def test_gana_la_regla_mas_especifica_no_el_orden_de_la_lista():
    """Regresión medida: un "SteelSeries Arctis Gaming Headset … 30 Hour
    Battery" salía como `power/batteries`, porque la regla de baterías está
    más arriba en LEAF_RULES que la de auriculares.

    Ahora gana el fragmento MÁS LARGO (el más específico), así que la
    correctitud dejó de depender de mantener el orden de la lista.
    """
    assert classify_product(
        "Vehicles & Parts", "", "SteelSeries Arctis 7+ Wireless Gaming Headset - 30 Hour Battery"
    ) == ("peripherals", "headphones")


# ──────────────────────────────────────────────────────────────────────
# Rechazos — lo que NO es catálogo digital
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("pri,nombre", [
    ("Furniture",             "SINPAID Computer Desk 40 inches with 2-Tier Shelves"),
    ("Luggage & Bags",        "Osprey Proxima Laptop Commuter Backpack, Black"),
    ("Health & Beauty",       "Braun ExactFit 3 Blood Pressure Monitor for Home Use"),
    ("Toys & Games",          "Funko POP! Retro Toys: Mouse Trap Game - Caged Mouse"),
    ("Animals & Pet Supplies", "Kruuse Task for Buster Activity Mat, Mouse Trap"),
    ("Apparel & Accessories", "Polar Vantage V3 GPS Smart Watch for Men & Women"),
])
def test_rechaza_lo_que_no_es_tecnologia(pri, nombre):
    """Newegg es un marketplace y revende de todo.

    Estos seis vienen del mismo feed y contienen palabras del catálogo
    ("computer", "laptop", "monitor", "mouse") — por eso el filtro no puede
    basarse solo en el título.
    """
    assert classify_product(pri, "", nombre) is None


def test_una_señal_tecnologica_fuerte_rescata_una_rama_equivocada():
    """El comerciante se equivoca al categorizar más seguido que el título.

    Medido: 15 de 56 rechazos (27%) eran productos legítimos mal ubicados.
    Tres headsets gamer de marca estaban publicados bajo "Vehicles & Parts".
    """
    assert classify_product(
        "Vehicles & Parts", "", "Lenovo Legion H600 Wireless Gaming Headset"
    ) == ("peripherals", "headphones")


def test_el_rescate_no_deja_entrar_un_juguete():
    """El rescate solo admite frases imposibles en otro rubro.

    Por eso son "gaming headset" y "graphics card", no "headset" ni "card":
    con reglas laxas el Funko POP "Mouse Trap" entraría como mouse.
    """
    assert classify_product("Toys & Games", "", "Funko POP! Mouse Trap Game") is None


def test_descarta_la_fila_corrupta_del_feed():
    """El feed trae basura: se observó un `<primary>` que era una URL entera.

    No se intenta interpretarla — se descarta, porque una fila así no tiene
    ninguna categoría real de la que colgar.
    """
    url = "https://www.newegg.com/samsung-ls37fg75denxza-37-wuhd-180-hz/p/N82E16824027373"
    assert classify_product(url, "Electronics > Video > Computer Monitors", "") is None


# ──────────────────────────────────────────────────────────────────────
# Robustez
# ──────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("entrada", [None, "", "   ", 12345, [], {}])
def test_nunca_lanza_con_entradas_invalidas(entrada):
    """Esto procesa feeds de terceros: un campo numérico o nulo no puede
    tumbar la ingesta entera."""
    try:
        classify_product(entrada, entrada, entrada)
    except (TypeError, AttributeError) as e:
        pytest.fail(f"classify_product lanzó con {entrada!r}: {e}")


def test_lo_no_clasificable_se_descarta_sin_categoria_de_relleno():
    """No hay rama "otros" a nivel producto.

    Algo que no se pudo ubicar no se puede navegar ni filtrar en el sitio, y
    una categoría de relleno sería una bolsa creciente de productos que el
    visitante nunca encuentra.
    """
    assert classify_product("Electronics", "", "Zxqw Blerg 9000") is None
