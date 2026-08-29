"""
Presupuesto diario de IA — reserva atómica.

`market_hunter` corre con 8 hilos y cada uno puede disparar llamadas de IA.
La versión anterior de `can_use_ai` leía el contador y después lo escribía con
`$set`, así que los 8 hilos leían el mismo valor y registraban UNA llamada de
ocho. El límite no contenía el gasto real de Vertex/Gemini.
"""
import threading
import time
from unittest.mock import MagicMock

from src.agents.master_orchestrator import MasterOrchestratorAgent


class _ColeccionCuotaFake:
    """Emula el `$inc` atómico de Mongo, con la latencia de red incluida.

    ⚠️ El `sleep` NO es decorativo. Sin él este test pasa incluso con la
    lógica vieja de leer-y-escribir: con el GIL y operaciones instantáneas,
    los hilos se serializan solos y la carrera casi no se abre. Medido:
    sin latencia, la versión con bug concedía exactamente 50 de 50 (parecía
    correcta); con 2 ms de ida y vuelta —lo que tarda Mongo de verdad—
    concedía 200 de 50, es decir 4× el presupuesto, y dejaba el contador en 30.

    La latencia es lo que hace que este test pueda fallar, y un test que no
    puede fallar no prueba nada.
    """

    LATENCIA_RED = 0.002

    def __init__(self):
        self.calls = 0
        self._lock = threading.Lock()

    def find_one_and_update(self, _filtro, update, **_kw):
        time.sleep(self.LATENCIA_RED)
        with self._lock:  # el $inc del servidor es atómico
            self.calls += update["$inc"]["calls"]
            return {"calls": self.calls}


def _orquestador(limite):
    orq = MasterOrchestratorAgent.__new__(MasterOrchestratorAgent)
    orq.DAILY_LIMIT = limite
    orq.db_connected = True
    orq.db = MagicMock()
    orq.db.ai_quota = _ColeccionCuotaFake()
    orq.log_action = lambda *a, **k: None
    return orq


def test_concede_exactamente_el_limite_y_ni_una_mas():
    orq = _orquestador(5)
    concedidas = sum(1 for _ in range(20) if orq.can_use_ai())
    assert concedidas == 5, f"se concedieron {concedidas}, el tope es 5"


def test_ocho_hilos_concurrentes_no_comparten_el_mismo_cupo():
    """El bug real: 8 hilos leían el mismo contador y todos se creían el primero."""
    limite = 20
    orq = _orquestador(limite)
    concedidas = []
    lock = threading.Lock()

    def worker():
        for _ in range(12):
            if orq.can_use_ai():
                with lock:
                    concedidas.append(1)

    hilos = [threading.Thread(target=worker) for _ in range(8)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    # 8 hilos × 12 intentos = 96 intentos contra un tope de 50.
    assert len(concedidas) == limite, (
        f"se concedieron {len(concedidas)} llamadas con un tope de {limite}: "
        "la reserva no es atómica"
    )


def test_sin_mongo_no_bloquea_el_pipeline():
    """La cuota controla gasto, no correctitud: sin telemetría se sigue."""
    orq = MasterOrchestratorAgent.__new__(MasterOrchestratorAgent)
    orq.DAILY_LIMIT = 1
    orq.db_connected = False
    assert orq.can_use_ai() is True


def test_un_fallo_de_mongo_no_tumba_el_routing():
    orq = _orquestador(5)
    orq.db.ai_quota = MagicMock()
    orq.db.ai_quota.find_one_and_update.side_effect = RuntimeError("mongo caído")
    assert orq.can_use_ai() is True
