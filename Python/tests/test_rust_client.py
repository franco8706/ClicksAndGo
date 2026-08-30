"""
Cliente autenticado Python → Rust.

`clicks-rust` se cierra con IAM (deja de ser `allUsers`), así que cada llamada
tiene que adjuntar un token de identidad. Lo que estos tests protegen:

  1. El `audience` es la URL BASE del servicio. Cloud Run rechaza un token
     emitido para otra audiencia, así que mandar la URL con path daría 403 en
     todas las llamadas — y el scoring dejaría de actualizarse en silencio.
  2. Fuera de Cloud Run (docker-compose) no hay servidor de metadatos: la
     llamada sale sin cabecera en vez de hacer fallar el pipeline.
  3. El token se cachea: sin caché, cada ítem de un batch de 500 pediría uno.
"""

import threading
import time
from unittest.mock import MagicMock, patch

import pytest

import src.rust_client as rc


@pytest.fixture(autouse=True)
def _limpiar_cache():
    """Cada test arranca sin token cacheado."""
    with rc._cache_lock:
        rc._cache.clear()
    yield
    with rc._cache_lock:
        rc._cache.clear()


def _respuesta(texto="token-abc", status=200):
    r = MagicMock()
    r.status_code = status
    r.text = texto
    return r


# ── audience: el error que rompería TODAS las llamadas ──────────────────────

@pytest.mark.parametrize(
    "env,esperado",
    [
        ("https://clicks-rust-x.run.app/api/v1/score/batch", "https://clicks-rust-x.run.app"),
        ("https://clicks-rust-x.run.app", "https://clicks-rust-x.run.app"),
        ("http://rust_engine:8080/api/v1/score/batch", "http://rust_engine:8080"),
    ],
)
def test_el_audience_es_la_url_base_sin_path(monkeypatch, env, esperado):
    monkeypatch.setenv("RUST_API_URL", env)
    assert rc.rust_base_url() == esperado


def test_el_token_se_pide_para_la_url_base(monkeypatch):
    monkeypatch.setenv("RUST_API_URL", "https://clicks-rust-x.run.app/api/v1/score/batch")
    with patch.object(rc.requests, "get", return_value=_respuesta()) as m:
        rc.auth_headers()
    assert m.call_args.kwargs["params"]["audience"] == "https://clicks-rust-x.run.app"


# ── Degradación fuera de Cloud Run ──────────────────────────────────────────

def test_sin_servidor_de_metadatos_no_rompe_el_pipeline():
    """En local no hay metadata server: se sale sin cabecera, no se explota."""
    with patch.object(rc.requests, "get", side_effect=rc.requests.RequestException("no DNS")):
        assert rc.auth_headers("https://x") == {}


def test_un_error_del_metadata_server_no_rompe():
    with patch.object(rc.requests, "get", return_value=_respuesta("", 500)):
        assert rc.auth_headers("https://x") == {}


def test_con_token_arma_el_bearer():
    with patch.object(rc.requests, "get", return_value=_respuesta("mi-token")):
        assert rc.auth_headers("https://x") == {"Authorization": "Bearer mi-token"}


# ── Caché: un batch de 500 no debe pedir 500 tokens ─────────────────────────

def test_el_token_se_cachea_entre_llamadas():
    with patch.object(rc.requests, "get", return_value=_respuesta()) as m:
        for _ in range(10):
            rc.auth_headers("https://x")
    assert m.call_count == 1, "el token debe pedirse una sola vez"


def test_ocho_hilos_no_piden_ocho_tokens():
    """El backfill y el orquestador llaman desde varios hilos a la vez."""
    llamadas = []
    lock = threading.Lock()

    def fake_get(*_a, **_k):
        time.sleep(0.002)  # latencia del metadata server: abre la carrera
        with lock:
            llamadas.append(1)
        return _respuesta()

    with patch.object(rc.requests, "get", side_effect=fake_get):
        hilos = [threading.Thread(target=lambda: rc.auth_headers("https://x")) for _ in range(8)]
        for h in hilos:
            h.start()
        for h in hilos:
            h.join()

    assert len(llamadas) <= 2, f"se pidieron {len(llamadas)} tokens para 8 hilos"


# ── post_rust: adjunta la cabecera y NO traga errores ───────────────────────

def test_post_rust_adjunta_la_autorizacion(monkeypatch):
    monkeypatch.setenv("RUST_API_URL", "https://r.run.app/api/v1/score/batch")
    with patch.object(rc.requests, "get", return_value=_respuesta("t1")), \
         patch.object(rc.requests, "post", return_value=_respuesta()) as post:
        rc.post_rust("https://r.run.app/api/v1/score/batch", {"items": []})
    assert post.call_args.kwargs["headers"]["Authorization"] == "Bearer t1"


def test_post_rust_propaga_el_fallo_de_red():
    """Tragar el error volvería invisible un Rust caído."""
    with patch.object(rc.requests, "get", return_value=_respuesta()), \
         patch.object(rc.requests, "post", side_effect=rc.requests.RequestException("caído")):
        with pytest.raises(rc.requests.RequestException):
            rc.post_rust("https://r/x", {})


def test_post_rust_sin_payload_no_manda_json(monkeypatch):
    """`benchmarks/run` se invoca sin cuerpo."""
    with patch.object(rc.requests, "get", return_value=_respuesta()), \
         patch.object(rc.requests, "post", return_value=_respuesta()) as post:
        rc.post_rust("https://r/x")
    assert "json" not in post.call_args.kwargs
