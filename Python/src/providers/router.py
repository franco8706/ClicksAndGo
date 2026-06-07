# =====================================================================
# 🔀 PROVIDER ROUTER - Orquestador de proveedores con failover
# Política: Vertex AI primario (sujeto a cuota diaria) -> Antigravity fallback.
# Es el ÚNICO punto de entrada que usan los agentes para pedir inteligencia.
# =====================================================================
from typing import Any, Tuple

from .vertex_provider import VertexProvider
from .antigravity_provider import AntigravityProvider


class ProviderRouter:
    def __init__(self, orchestrator=None):
        self.orchestrator = orchestrator
        self.vertex = VertexProvider()
        self.antigravity = AntigravityProvider()

    def status(self) -> dict:
        return {
            "primary": self.vertex.name,
            "primary_active": self.vertex.available(),
            "fallback": self.antigravity.name,
        }

    def _can_use_primary(self) -> bool:
        if not self.vertex.available():
            return False
        # Respeta el presupuesto diario de IA si el orquestador lo gestiona
        if self.orchestrator and hasattr(self.orchestrator, "can_use_ai"):
            return self.orchestrator.can_use_ai()
        return True

    def complete_json(self, prompt: str, task: str = "", payload: Any = None) -> Tuple[Any, str]:
        """Devuelve (resultado_json, nombre_proveedor_usado)."""
        if self._can_use_primary():
            try:
                result = self.vertex.complete_json(prompt, task=task, payload=payload)
                return result, self.vertex.name
            except Exception as e:
                if self.orchestrator:
                    self.orchestrator.log_action(
                        "ProviderRouter", f"Vertex falló, activando Antigravity: {e}", "WARNING"
                    )
        # Fallback de costo cero (siempre disponible)
        return self.antigravity.complete_json(prompt, task=task, payload=payload), self.antigravity.name
