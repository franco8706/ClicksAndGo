"""Tests del escudo de normalización — la frontera donde entra el dato sucio.

Cubre en particular `clean_image_url`, que implementa la política de "solo
imágenes reales": es la primera de las 4 capas y la única que puede rechazar
una URL ANTES de que llegue a Postgres.
"""

import os
from unittest.mock import MagicMock, patch

import pytest

from src.agents.data_normalizer import (
    DataNormalizerAgent,
    _KNOWN_PLACEHOLDER_MD5,
    _STOCK_IMAGE_HOSTS,
    clean_image_url,
)


@pytest.fixture
def agent():
    return DataNormalizerAgent()


# ── clean_image_url: sin red (verificación apagada) ──────────────────────────

@pytest.mark.parametrize("host", _STOCK_IMAGE_HOSTS)
def test_descarta_todos_los_bancos_de_stock(host):
    assert clean_image_url(f"https://{host}/photo-123.jpg") == ""


def test_descarta_subdominios_de_un_banco_de_stock():
    assert clean_image_url("https://cdn.images.unsplash.com/x.jpg") == ""


@pytest.mark.parametrize("valor", ["", None, "   ", "no-es-url", "ftp://x/y.png", "//x/y.png"])
def test_descarta_valores_invalidos(valor):
    assert clean_image_url(valor) == ""


def test_promueve_http_a_https():
    """La API de MercadoLibre devuelve thumbnails en http; el sitio va por TLS."""
    got = clean_image_url("http://http2.mlstatic.com/D_NQ_123-O.webp")
    assert got.startswith("https://")
    assert got == "https://http2.mlstatic.com/D_NQ_123-O.webp"


def test_acepta_una_cdn_de_retailer_legitima():
    url = "https://m.media-amazon.com/images/I/71abc.jpg"
    assert clean_image_url(url) == url


def test_no_lanza_con_una_url_malformada():
    # No debe explotar aunque urlparse falle o el host quede vacío.
    assert clean_image_url("https://") == ""


# ── clean_image_url: con verificación HTTP encendida ─────────────────────────

def _resp(status=200, ctype="image/png", body=b"x" * 100):
    r = MagicMock()
    r.status_code = status
    r.headers = {"Content-Type": ctype}
    r.raw.read.return_value = body
    r.close = MagicMock()
    return r


@pytest.fixture
def verify_on(monkeypatch):
    import src.agents.data_normalizer as dn

    monkeypatch.setattr(dn, "_IMG_VERIFY_ENABLED", True)
    dn._img_cache.clear()  # la caché es por proceso: aislar cada test
    return dn


def test_descarta_si_la_cdn_devuelve_404(verify_on):
    with patch.object(verify_on.requests, "get", return_value=_resp(status=404)):
        assert verify_on.clean_image_url("https://i.dell.com/x.psd") == ""


def test_descarta_si_la_cdn_devuelve_403(verify_on):
    """Scene7 (i.dell.com) responde 403, no 404, ante un asset ausente."""
    with patch.object(verify_on.requests, "get", return_value=_resp(status=403)):
        assert verify_on.clean_image_url("https://i.dell.com/x.psd") == ""


def test_descarta_si_redirige_a_html(verify_on):
    """ASUS daba 200 pero con text/html: parecía válido con `curl -o /dev/null`."""
    with patch.object(verify_on.requests, "get", return_value=_resp(ctype="text/html")):
        assert verify_on.clean_image_url("https://dlcdnwebimgs.asus.com/x/fwebp") == ""


def test_descarta_el_placeholder_de_marca_aunque_de_200_image(verify_on):
    """El caso MSI: 200 + image/png y aun así NO es el producto (logo del dragón)."""
    import hashlib

    md5_conocido = next(iter(_KNOWN_PLACEHOLDER_MD5))
    # Se construye un cuerpo cuyo md5 coincide con el blocklist, mockeando hashlib.
    with patch.object(verify_on.requests, "get", return_value=_resp()):
        with patch.object(hashlib, "md5") as m:
            m.return_value.hexdigest.return_value = md5_conocido
            assert verify_on.clean_image_url("https://asset.msi.com/x/600.png") == ""


def test_acepta_una_imagen_real_verificada(verify_on):
    url = "https://store.storeimages.cdn-apple.com/is/mbp16"
    with patch.object(verify_on.requests, "get", return_value=_resp()):
        assert verify_on.clean_image_url(url) == url


def test_acepta_sin_hashear_si_el_archivo_supera_el_techo(verify_on):
    """Una foto real suele pasarse del techo: se acepta sin pagar el ancho de banda."""
    grande = b"x" * (verify_on._IMG_HASH_MAX_BYTES + 1)
    url = "https://m.media-amazon.com/images/I/71.jpg"
    with patch.object(verify_on.requests, "get", return_value=_resp(body=grande)):
        assert verify_on.clean_image_url(url) == url


def test_no_lanza_si_la_cdn_no_responde(verify_on):
    with patch.object(verify_on.requests, "get", side_effect=OSError("timeout")):
        assert verify_on.clean_image_url("https://x.com/y.png") == ""


def test_cachea_el_resultado_para_no_repetir_la_verificacion(verify_on):
    url = "https://m.media-amazon.com/images/I/71.jpg"
    with patch.object(verify_on.requests, "get", return_value=_resp()) as m:
        verify_on.clean_image_url(url)
        verify_on.clean_image_url(url)
    assert m.call_count == 1


# ── Saneamiento numérico y de texto ─────────────────────────────────────────

@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("1.299,00", 1299.0),
        ("$2,999.00", 2999.0),
        ("2999", 2999.0),
        (2999, 2999.0),
        (2999.5, 2999.5),
        ("", 0.0),
        (None, 0.0),
        ("sin numeros", 0.0),
    ],
)
def test_extract_number(agent, entrada, esperado):
    assert agent.extract_number(entrada) == esperado


def test_extract_number_nunca_lanza_con_basura(agent):
    for basura in ([], {}, object(), "···"):
        assert isinstance(agent.extract_number(basura), float)


def test_sanitize_string_recorta_y_normaliza(agent):
    assert agent.sanitize_string("  Lenovo  ") == "Lenovo"
    assert agent.sanitize_string(None) == ""


def test_normalize_laptop_data_nunca_emite_una_imagen_de_stock(agent):
    """Test de integración de la capa 1: el dato sucio no puede pasar."""
    raw = {
        "sku_original": "SKU-1",
        "retailer_slug": "amazon_us",
        "country_code": "US",
        "brand": "HP",
        "name": "HP Laptop 15",
        "product_type": "laptop",
        "financials": {"original_price": 999, "current_price": 899},
        "urls": {
            "image": "https://images.unsplash.com/photo-1.jpg",
            "affiliate_raw": "https://amazon.com/dp/X?tag=clicksandgo-20",
        },
    }
    out = agent.normalize_laptop_data(raw)
    assert out is not None
    assert out["urls"]["image"] == ""
    # El link de afiliado NO se toca: es la fuente de la comisión.
    assert out["urls"]["affiliate_raw"] == raw["urls"]["affiliate_raw"]
