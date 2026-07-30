"""Tests del cliente de Rails.

Este archivo existe por el bug que estuvo 51 días en producción sin que nadie
lo viera: tres agentes concatenaban su path sobre un `RAILS_API_URL` que ya
traía path, POSTeaban a un 404, y el código logueaba el status dentro de un
mensaje de éxito. Cada test de acá corresponde a una parte de ese fallo.
"""

import os
from unittest.mock import MagicMock, patch

import pytest


def _fresh(env_value: str):
    """Importa `rails_client` con un `RAILS_API_URL` dado (se lee en runtime)."""
    import importlib

    os.environ["RAILS_API_URL"] = env_value
    import src.rails_client as rc

    return importlib.reload(rc)


# ── Resolución de URL: el bug exacto de producción ───────────────────────────

@pytest.mark.parametrize(
    "env_value",
    [
        # La forma REAL de producción: base + endpoint. Es la que rompía todo.
        "https://clicks-rails-798903122073.us-central1.run.app/api/v1/notebooks",
        # docker-compose: base pelada.
        "http://rails_backend:3000",
        # Con barra final.
        "http://rails_backend:3000/",
        # Apuntando a otro endpoint.
        "https://x.run.app/api/v1/products",
        # Con query string pegada.
        "https://x.run.app/api/v1/notebooks?country=US",
    ],
)
def test_news_url_nunca_duplica_el_path(env_value):
    rc = _fresh(env_value)
    url = rc.rails_url(rc.NEWS_PATH)

    # La regresión concreta: /api/v1/ aparecía dos veces → 404.
    assert url.count("/api/v1/") == 1, f"path duplicado en {url}"
    assert url.endswith("/api/v1/notebooks/hardware_news")
    assert "notebooks/api" not in url


def test_products_url_nunca_duplica_el_path():
    rc = _fresh("https://x.run.app/api/v1/notebooks")
    url = rc.rails_url(rc.PRODUCTS_PATH)
    assert url == "https://x.run.app/api/v1/notebooks"
    assert url.count("/api/v1/") == 1


def test_rails_base_no_arrastra_ningun_path():
    rc = _fresh("https://x.run.app/api/v1/notebooks/hardware_news")
    assert rc.rails_base() == "https://x.run.app"


def test_rails_base_cae_al_default_si_el_env_esta_vacio():
    rc = _fresh("")
    assert rc.rails_base() == rc.DEFAULT_RAILS_URL


def test_rails_url_tolera_path_sin_barra_inicial():
    rc = _fresh("http://rails_backend:3000")
    assert rc.rails_url("api/v1/x") == "http://rails_backend:3000/api/v1/x"


# ── Autenticación: el otro bug (endpoints de escritura abiertos) ─────────────

def test_internal_headers_incluye_la_clave_compartida():
    os.environ["INTERNAL_API_KEY"] = "clave-de-prueba"
    rc = _fresh("http://rails_backend:3000")
    h = rc.internal_headers()
    assert h["X-Internal-Key"] == "clave-de-prueba"
    assert h["Content-Type"] == "application/json"


def test_internal_headers_no_explota_sin_clave():
    os.environ.pop("INTERNAL_API_KEY", None)
    rc = _fresh("http://rails_backend:3000")
    assert rc.internal_headers()["X-Internal-Key"] == ""


# ── post_json: verificar el status, no imprimirlo ────────────────────────────

def _mock_response(status: int, text: str = ""):
    resp = MagicMock()
    resp.status_code = status
    resp.text = text
    return resp


@pytest.mark.parametrize("status", [200, 201, 204, 299])
def test_post_json_ok_solo_con_2xx(status):
    rc = _fresh("http://rails_backend:3000")
    with patch.object(rc.requests, "post", return_value=_mock_response(status)):
        ok, got = rc.post_json("/x", {})
    assert ok is True
    assert got == status


@pytest.mark.parametrize("status", [301, 400, 401, 404, 422, 500, 502, 503])
def test_post_json_reporta_fallo_en_todo_lo_que_no_sea_2xx(status):
    """El corazón del bug: un 404 se leía como éxito."""
    rc = _fresh("http://rails_backend:3000")
    with patch.object(rc.requests, "post", return_value=_mock_response(status)):
        ok, got = rc.post_json("/x", {})
    assert ok is False, f"{status} NO puede considerarse éxito"
    assert got == status


def test_post_json_nunca_lanza_si_la_red_falla():
    rc = _fresh("http://rails_backend:3000")
    with patch.object(rc.requests, "post", side_effect=OSError("ECONNREFUSED")):
        ok, status = rc.post_json("/x", {})
    assert ok is False
    assert status == 0  # 0 = la petición ni salió


def test_post_json_manda_la_clave_y_pega_en_la_url_correcta():
    os.environ["INTERNAL_API_KEY"] = "k"
    rc = _fresh("https://x.run.app/api/v1/notebooks")
    with patch.object(rc.requests, "post", return_value=_mock_response(201)) as m:
        rc.post_json(rc.NEWS_PATH, {"news": []})

    url = m.call_args[0][0]
    assert url == "https://x.run.app/api/v1/notebooks/hardware_news"
    assert m.call_args.kwargs["headers"]["X-Internal-Key"] == "k"
    assert m.call_args.kwargs["timeout"] > 0  # nunca sin timeout


def test_post_json_loguea_error_en_401_y_404(caplog):
    """Los dos fallos silenciosos deben quedar registrados como ERROR."""
    import logging

    rc = _fresh("http://rails_backend:3000")
    for status, marca in ((401, "INTERNAL_API_KEY"), (404, "path duplicado")):
        caplog.clear()
        with caplog.at_level(logging.ERROR):
            with patch.object(rc.requests, "post", return_value=_mock_response(status)):
                rc.post_json("/x", {})
        assert any(r.levelno >= logging.ERROR for r in caplog.records)
        assert marca in caplog.text
