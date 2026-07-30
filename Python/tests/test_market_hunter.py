"""Tests del clasificador de catálogo digital.

`classify_digital_product` es la guarda que decide qué producto entra al sitio.
Un falso positivo publica ropa o juguetes en una web de tecnología; un falso
negativo descarta stock vendible. Se aplica a TODO lo que traiga cualquier
adaptador (ML, Awin, CJ y los futuros), así que su comportamiento es crítico.
"""

import pytest

from src.agents.market_hunter import (
    _CATEGORY_KEYWORDS,
    _DENYLIST_KEYWORDS,
    classify_digital_product,
)


# ── Las 9 categorías reales se reconocen ─────────────────────────────────────

@pytest.mark.parametrize(
    "titulo,esperado",
    [
        ("Notebook Lenovo IdeaPad 3 15.6", "laptop"),
        ("Laptop HP Pavilion 14", "laptop"),
        ("Portátil ASUS VivoBook", "laptop"),
        ("PC de escritorio Dell OptiPlex", "desktop"),
        ("All-in-One HP 24", "desktop"),
        ("Monitor LG UltraGear 27", "monitor"),
        ("Teclado mecánico Keychron K2", "keyboard"),
        ("Mouse Logitech MX Master 3", "mouse"),
        ("Auriculares Sony WH-1000XM5", "headphones"),
        ("Headset HyperX Cloud II", "headphones"),
        ("Webcam Logitech Brio 4K", "webcam"),
        ("Impresora Epson EcoTank L3250", "printer"),
        ("Cartucho de tinta HP 667", "supplies"),
        ("Tóner Brother TN-2370", "supplies"),
    ],
)
def test_reconoce_las_categorias_reales(titulo, esperado):
    assert classify_digital_product(titulo) == esperado


def test_cubre_las_9_categorias_declaradas():
    """Si se agrega un tipo al esquema, este test obliga a cubrirlo."""
    assert len(_CATEGORY_KEYWORDS) == 9


# ── El denylist rechaza lo que no es tecnología ──────────────────────────────

@pytest.mark.parametrize(
    "titulo",
    [
        "Remera de algodón talle L",
        "Zapatillas running Nike",
        "Perfume Chanel N5",
        "Juguete didáctico de madera",
        "Mueble de living 3 cuerpos",
        "Maquillaje set de labiales",
        "Jewelry gold necklace",
        "Grocery pack de arroz",
    ],
)
def test_rechaza_productos_fuera_del_catalogo(titulo):
    assert classify_digital_product(titulo) is None


def test_el_denylist_gana_sobre_el_allowlist():
    """Defensa en profundidad: un feed mixto de Awin no puede colar ropa
    solo porque el título mencione una keyword de tecnología."""
    assert classify_digital_product("Remera con estampa de laptop gamer") is None
    assert classify_digital_product("Funda de mouse de tela — moda") is None


def test_no_hay_categoria_generica_de_fallback():
    """Lo ambiguo se descarta, no se etiqueta a ciegas."""
    assert classify_digital_product("Producto genérico sin identificar") is None
    assert classify_digital_product("") is None
    assert classify_digital_product(None) is None


# ── category_hint: cómo lo usan los adaptadores reales ───────────────────────

def test_el_hint_permite_clasificar_un_titulo_sin_la_palabra_clave():
    """MercadoLibre y CJ buscan `q=laptop`, pero el título real suele ser
    solo marca+modelo. El hint lo resuelve."""
    assert classify_digital_product("Lenovo IdeaPad 3", category_hint="laptop") == "laptop"
    assert classify_digital_product("Dell XPS 15 9530", category_hint="laptop notebook") == "laptop"


def test_el_denylist_sigue_activo_incluso_con_hint():
    """Red de seguridad ante un resultado desalineado del buscador."""
    assert classify_digital_product("Remera Lenovo oficial", category_hint="laptop") is None


def test_la_categoria_del_feed_puede_decidir():
    """Awin manda `category_name`: se usa como pista igual que el hint."""
    assert classify_digital_product("Brio 4K", category_hint="Webcams") == "webcam"


# ── Robustez ante entradas raras ─────────────────────────────────────────────

@pytest.mark.parametrize("entrada", [None, "", "   ", 12345, [], {}])
def test_nunca_lanza_con_entradas_invalidas(entrada):
    try:
        resultado = classify_digital_product(entrada)
    except (TypeError, AttributeError):
        pytest.fail(f"classify_digital_product lanzó con {entrada!r}")
    assert resultado is None or isinstance(resultado, str)


def test_es_insensible_a_mayusculas_y_acentos_del_allowlist():
    assert classify_digital_product("NOTEBOOK LENOVO") == "laptop"
    assert classify_digital_product("Audífono Bluetooth") == "headphones"
    assert classify_digital_product("Ratón inalámbrico") == "mouse"


def test_el_denylist_no_esta_vacio():
    """Un denylist vacío desactivaría la defensa en profundidad sin avisar."""
    assert len(_DENYLIST_KEYWORDS) > 10
