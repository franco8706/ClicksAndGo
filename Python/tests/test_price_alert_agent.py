"""Tests del agente de alertas de precio.

Dos invariantes que no pueden romperse:
  1. **Durabilidad**: solo se marca como notificada la alerta cuyo email SÍ
     salió. Marcar de más pierde el aviso para siempre (la fila deja de estar
     pendiente y nadie vuelve a intentarlo).
  2. **Cumplimiento Amazon**: el email NO puede llevar el precio del producto
     (el Operating Agreement exige que el precio venga de la API oficial con
     <24h y timestamp; un email es un snapshot sin forma de refrescarse).
"""

from unittest.mock import MagicMock, patch

import pytest

from src.agents.price_alert_agent import (
    EMAIL_RETRY_ATTEMPTS,
    PriceAlertAgent,
)


class FakeOrchestrator:
    rails_api_url = "http://rails_backend:3000/api/v1/notebooks"

    def __init__(self):
        self.logs = []

    def log_action(self, agent, message, status="SUCCESS"):
        self.logs.append((status, message))


@pytest.fixture
def agent(monkeypatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "k")
    monkeypatch.setenv("AUTH_RESEND_KEY", "resend-k")
    monkeypatch.setenv("PUBLIC_WEB_URL", "https://clicks-and-go.com")
    a = PriceAlertAgent(FakeOrchestrator())
    # Sin esperas reales entre reintentos.
    monkeypatch.setattr("src.agents.price_alert_agent.time.sleep", lambda _: None)
    return a


def _resp(status):
    r = MagicMock()
    r.status_code = status
    return r


ALERT = {
    "id": "alert-1",
    "email": "user@example.com",
    "marca": "HP",
    "modelo": "Laptop 15",
    "slug": "hp-laptop-15-us",
    "target_price": "899.00",
    "moneda": "USD",
}


# ── La base de Rails se deriva bien (misma clase de bug que el 404) ──────────

def test_deriva_la_base_de_rails_sin_duplicar_el_path(agent):
    assert agent.rails_base == "http://rails_backend:3000"
    assert "/api/v1/" not in agent.rails_base


# ── Reintentos del envío ────────────────────────────────────────────────────

def test_envia_al_primer_intento(agent):
    with patch("src.agents.price_alert_agent.requests.post", return_value=_resp(200)) as m:
        assert agent._send_email(ALERT) is True
    assert m.call_count == 1


@pytest.mark.parametrize("status", [429, 500, 502, 503])
def test_reintenta_ante_fallo_transitorio_y_se_recupera(agent, status):
    with patch(
        "src.agents.price_alert_agent.requests.post",
        side_effect=[_resp(status), _resp(200)],
    ) as m:
        assert agent._send_email(ALERT) is True
    assert m.call_count == 2


def test_agota_los_reintentos_y_devuelve_False(agent):
    with patch("src.agents.price_alert_agent.requests.post", return_value=_resp(503)) as m:
        assert agent._send_email(ALERT) is False
    assert m.call_count == EMAIL_RETRY_ATTEMPTS


@pytest.mark.parametrize("status", [400, 401, 403, 422])
def test_NO_reintenta_ante_un_rechazo_definitivo(agent, status):
    """Email inválido o key revocada: reintentar solo repite el mismo error."""
    with patch("src.agents.price_alert_agent.requests.post", return_value=_resp(status)) as m:
        assert agent._send_email(ALERT) is False
    assert m.call_count == 1


def test_reintenta_si_la_red_falla(agent):
    with patch(
        "src.agents.price_alert_agent.requests.post",
        side_effect=[OSError("timeout"), _resp(201)],
    ) as m:
        assert agent._send_email(ALERT) is True
    assert m.call_count == 2


def test_nunca_lanza_aunque_todo_falle(agent):
    with patch("src.agents.price_alert_agent.requests.post", side_effect=OSError("down")):
        assert agent._send_email(ALERT) is False


# ── Durabilidad: no marcar lo que no se envió ───────────────────────────────

def test_solo_marca_como_notificadas_las_que_se_enviaron(agent):
    dos_alertas = [dict(ALERT, id="a1"), dict(ALERT, id="a2", email="b@example.com")]

    with patch.object(agent, "_fetch_pending", return_value=dos_alertas), \
         patch.object(agent, "_send_email", side_effect=[True, False]), \
         patch.object(agent, "_mark_notified", return_value=1) as mark:
        agent.check_and_notify()

    # Solo la primera. La segunda queda pendiente para el próximo ciclo.
    mark.assert_called_once_with(["a1"])


def test_sin_resend_key_no_marca_ninguna(monkeypatch):
    """Si falta la key, las alertas deben quedar pendientes, no perderse."""
    monkeypatch.delenv("AUTH_RESEND_KEY", raising=False)
    monkeypatch.setenv("INTERNAL_API_KEY", "k")
    a = PriceAlertAgent(FakeOrchestrator())

    with patch.object(a, "_fetch_pending", return_value=[ALERT]), \
         patch.object(a, "_mark_notified") as mark:
        a.check_and_notify()

    mark.assert_not_called()


def test_sin_alertas_pendientes_no_hace_nada(agent):
    with patch.object(agent, "_fetch_pending", return_value=[]), \
         patch.object(agent, "_send_email") as send:
        agent.check_and_notify()
    send.assert_not_called()


# ── Cumplimiento Amazon Associates ──────────────────────────────────────────

def test_el_email_no_incluye_el_precio_actual_del_producto(agent):
    """El Operating Agreement prohíbe mostrar precios fuera de la API oficial.
    El email solo puede llevar el objetivo que el USUARIO eligió."""
    capturado = {}

    def capturar(*args, **kwargs):
        capturado.update(kwargs.get("json") or {})
        return _resp(200)

    alerta = dict(ALERT, precio_actual="777.00")
    with patch("src.agents.price_alert_agent.requests.post", side_effect=capturar):
        agent._send_email(alerta)

    cuerpo = (capturado.get("html", "") + capturado.get("subject", ""))
    assert "777" not in cuerpo, "el email filtró el precio actual del retailer"


def test_el_email_lleva_al_sitio_y_no_a_un_link_directo_de_afiliado(agent):
    capturado = {}

    def capturar(*args, **kwargs):
        capturado.update(kwargs.get("json") or {})
        return _resp(200)

    with patch("src.agents.price_alert_agent.requests.post", side_effect=capturar):
        agent._send_email(ALERT)

    assert "clicks-and-go.com" in capturado.get("html", "")
