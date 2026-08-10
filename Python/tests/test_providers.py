"""Tests de la capa de proveedores cognitivos.

Nacen de una auditoría (2026-08-10) que encontró a Vertex AI **deshabilitado
desde el primer despliegue**: `GOOGLE_APPLICATION_CREDENTIALS` estaba declarada
vacía en el manifiesto y el guard la exigía como archivo existente, aunque en
Cloud Run las credenciales llegan por ADC del service account adjunto. Toda la
capa cognitiva corría sobre la heurística de Antigravity sin decisión humana.

Ningún test acá llama a Vertex de verdad: se verifica la LÓGICA DE ACTIVACIÓN,
que es donde estuvo el fallo, y el contrato de failover del router.
"""
import sys
import types

import pytest

from src.providers.vertex_provider import VertexProvider
from src.providers.antigravity_provider import AntigravityProvider
from src.providers.router import ProviderRouter


# ── Activación de Vertex ──────────────────────────────────────────────────

def _vertex_falso(monkeypatch, debe_fallar=False):
    """Inyecta un `vertexai` de mentira para no tocar la red ni exigir el SDK."""
    creado = {}

    class _Modelo:
        def __init__(self, nombre):
            creado["modelo"] = nombre

    def _init(project=None, location=None):
        if debe_fallar:
            raise RuntimeError("credenciales inválidas")
        creado["project"] = project
        creado["location"] = location

    mod = types.ModuleType("vertexai")
    mod.init = _init
    sub = types.ModuleType("vertexai.generative_models")
    sub.GenerativeModel = _Modelo
    sub.GenerationConfig = object
    monkeypatch.setitem(sys.modules, "vertexai", mod)
    monkeypatch.setitem(sys.modules, "vertexai.generative_models", sub)
    return creado


def test_se_activa_sin_archivo_de_credenciales_usando_adc(monkeypatch):
    """El caso que estaba roto: sin archivo, Vertex debe activarse igual."""
    creado = _vertex_falso(monkeypatch)
    monkeypatch.setenv("GCP_PROJECT_ID", "clicks-and-go")
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)

    assert VertexProvider().available() is True
    assert creado["project"] == "clicks-and-go"


def test_se_activa_con_la_variable_declarada_vacia(monkeypatch):
    """El caso EXACTO de producción: la variable existía, con valor ''."""
    _vertex_falso(monkeypatch)
    monkeypatch.setenv("GCP_PROJECT_ID", "clicks-and-go")
    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", "")

    assert VertexProvider().available() is True


def test_se_deshabilita_si_la_ruta_declarada_no_existe(monkeypatch):
    """Config equivocada: eso SÍ debe frenar, y es el único caso que frena."""
    _vertex_falso(monkeypatch)
    monkeypatch.setenv("GCP_PROJECT_ID", "clicks-and-go")
    monkeypatch.setenv("GOOGLE_APPLICATION_CREDENTIALS", "/no/existe/llave.json")

    assert VertexProvider().available() is False


def test_se_deshabilita_sin_project_id(monkeypatch):
    _vertex_falso(monkeypatch)
    monkeypatch.delenv("GCP_PROJECT_ID", raising=False)

    assert VertexProvider().available() is False


def test_se_deshabilita_si_la_inicializacion_falla(monkeypatch):
    """Sin ADC disponible, `vertexai.init` lanza y el proveedor queda inactivo."""
    _vertex_falso(monkeypatch, debe_fallar=True)
    monkeypatch.setenv("GCP_PROJECT_ID", "clicks-and-go")
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)

    assert VertexProvider().available() is False


# ── Failover del router ───────────────────────────────────────────────────

class _OrquestadorFalso:
    def __init__(self, permite_ia=True):
        self.permite_ia = permite_ia
        self.logs = []

    def can_use_ai(self):
        return self.permite_ia

    def log_action(self, agente, accion, status="SUCCESS"):
        self.logs.append((agente, accion, status))


def test_router_cae_a_antigravity_si_vertex_no_esta_disponible(monkeypatch):
    monkeypatch.delenv("GCP_PROJECT_ID", raising=False)
    router = ProviderRouter(orchestrator=_OrquestadorFalso())

    _, usado = router.complete_json("prompt", task="score")
    assert usado == AntigravityProvider.name


def test_router_respeta_el_presupuesto_diario(monkeypatch):
    """Con cuota agotada no se llama al primario aunque esté disponible."""
    _vertex_falso(monkeypatch)
    monkeypatch.setenv("GCP_PROJECT_ID", "clicks-and-go")
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)

    router = ProviderRouter(orchestrator=_OrquestadorFalso(permite_ia=False))
    assert router.vertex.available() is True

    _, usado = router.complete_json("prompt")
    assert usado == AntigravityProvider.name


def test_router_cae_a_antigravity_si_vertex_lanza(monkeypatch):
    """Failover en caliente: el primario responde error y el ciclo no se corta."""
    _vertex_falso(monkeypatch)
    monkeypatch.setenv("GCP_PROJECT_ID", "clicks-and-go")
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)

    orq = _OrquestadorFalso()
    router = ProviderRouter(orchestrator=orq)
    monkeypatch.setattr(
        router.vertex, "complete_json",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("429 quota")),
    )

    _, usado = router.complete_json("prompt")
    assert usado == AntigravityProvider.name
    # El failover no puede ser mudo: tiene que quedar rastro en telemetría.
    assert any(a[0] == "ProviderRouter" and a[2] == "WARNING" for a in orq.logs)


def test_status_refleja_si_el_primario_esta_activo(monkeypatch):
    """`/health` publica esto: si miente, la auditoría del sistema miente."""
    monkeypatch.delenv("GCP_PROJECT_ID", raising=False)
    st = ProviderRouter().status()
    assert st["primary"] == "vertex_ai"
    assert st["primary_active"] is False
    assert st["fallback"] == "antigravity"
