# =====================================================================
# 🧠 CONTRATO UNIVERSAL DE PROVEEDORES COGNITIVOS - Clicks & Go v4.1
# Todo proveedor (Vertex AI real o Antigravity heurístico) implementa
# la MISMA interfaz, permitiendo failover transparente y costo cero.
# =====================================================================
from abc import ABC, abstractmethod
from typing import Any

# Tareas soportadas por el ecosistema (las usa Antigravity para emular salida)
TASK_SEMANTIC_BATCH = "semantic_batch"   # Enriquecimiento SEO/UX de lotes de laptops
TASK_NEWS_EVAL = "news_eval"             # Evaluación de impacto de una noticia
TASK_PROMO_CALENDAR = "promo_calendar"   # Extracción de calendario de promociones
TASK_LEGAL_AUDIT = "legal_audit"         # Auditoría de ToS/privacidad de redes de afiliados y retailers


class LLMProvider(ABC):
    """Interfaz mínima que cualquier proveedor de inteligencia debe cumplir."""

    name: str = "base"

    @abstractmethod
    def available(self) -> bool:
        """Indica si el proveedor está listo para operar."""
        raise NotImplementedError

    @abstractmethod
    def complete_json(self, prompt: str, task: str = "", payload: Any = None) -> Any:
        """
        Devuelve SIEMPRE una estructura JSON ya parseada (dict o list).
        - Vertex usa `prompt`.
        - Antigravity usa `task` + `payload` para emular la salida sin costo.
        """
        raise NotImplementedError
