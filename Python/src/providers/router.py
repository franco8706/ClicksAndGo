# =====================================================================
# 🔀 PROVIDER ROUTER - Orquestador de proveedores con failover en cascada
# Política v4.4 (3 niveles):
#   1. Vertex AI    (primario — requiere billing GCP activo)
#   2. Gemini API   (secundario — API key de AI Studio, sin billing GCP;
#                    mantiene inteligencia real desde AWS o cualquier nube)
#   3. Antigravity  (fallback heurístico de costo cero — nunca falla)
# Es el ÚNICO punto de entrada que usan los agentes para pedir inteligencia.
# =====================================================================
from typing import Any, Tuple

from .vertex_provider import VertexProvider
from .gemini_provider import GeminiProvider
from .antigravity_provider import AntigravityProvider


class ProviderRouter:
    def __init__(self, orchestrator=None):
        self.orchestrator = orchestrator
        self.vertex = VertexProvider()
        self.gemini = GeminiProvider()
        self.antigravity = AntigravityProvider()

    def status(self) -> dict:
        return {
            "primary": self.vertex.name,
            "primary_active": self.vertex.available(),
            "secondary": self.gemini.name,
            "secondary_active": self.gemini.available(),
            "fallback": self.antigravity.name,
        }

    def _budget_ok(self) -> bool:
        # Respeta el presupuesto diario de IA si el orquestador lo gestiona
        if self.orchestrator and hasattr(self.orchestrator, "can_use_ai"):
            return self.orchestrator.can_use_ai()
        return True

    def _log(self, msg: str, level: str = "WARNING"):
        if self.orchestrator:
            self.orchestrator.log_action("ProviderRouter", msg, level)

    def complete_json(self, prompt: str, task: str = "", payload: Any = None) -> Tuple[Any, str]:
        """Devuelve (resultado_json, nombre_proveedor_usado). Cascada 3 niveles."""
        budget_ok = self._budget_ok()

        # Nivel 1: Vertex AI (billing GCP)
        if budget_ok and self.vertex.available():
            try:
                return self.vertex.complete_json(prompt, task=task, payload=payload), self.vertex.name
            except Exception as e:
                self._log(f"Vertex falló, probando Gemini API: {e}")

        # Nivel 2: Gemini API por API key (sin billing GCP)
        if budget_ok and self.gemini.available():
            try:
                return self.gemini.complete_json(prompt, task=task, payload=payload), self.gemini.name
            except Exception as e:
                self._log(f"Gemini API falló, activando Antigravity: {e}")

        # Nivel 3: Fallback de costo cero (siempre disponible)
        return self.antigravity.complete_json(prompt, task=task, payload=payload), self.antigravity.name
