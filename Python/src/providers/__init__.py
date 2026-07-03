# =====================================================================
# 🧠 PAQUETE DE PROVEEDORES COGNITIVOS (Fachada)
# =====================================================================
from .base import (
    LLMProvider,
    TASK_SEMANTIC_BATCH,
    TASK_NEWS_EVAL,
    TASK_PROMO_CALENDAR,
    TASK_LEGAL_AUDIT,
)
from .vertex_provider import VertexProvider
from .gemini_provider import GeminiProvider
from .antigravity_provider import AntigravityProvider
from .router import ProviderRouter

__all__ = [
    "LLMProvider",
    "VertexProvider",
    "GeminiProvider",
    "AntigravityProvider",
    "ProviderRouter",
    "TASK_SEMANTIC_BATCH",
    "TASK_NEWS_EVAL",
    "TASK_PROMO_CALENDAR",
    "TASK_LEGAL_AUDIT",
]
