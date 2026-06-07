# =====================================================================
# 🛰️ VERTEX AI PROVIDER (Google Cloud) - Proveedor cognitivo primario
# Autenticación vía service account (GOOGLE_APPLICATION_CREDENTIALS),
# mismo proyecto/billing/region que el resto de la infra Google Cloud.
# =====================================================================
import os
import json
from typing import Any

from .base import LLMProvider


class VertexProvider(LLMProvider):
    name = "vertex_ai"

    def __init__(self):
        self._ready = False
        self.model = None
        self.model_name = os.getenv("VERTEX_MODEL", "gemini-2.5-flash")

        project = os.getenv("GCP_PROJECT_ID")
        location = os.getenv("GCP_LOCATION", "us-central1")
        creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

        if not project:
            print("⚠️ [VertexProvider] GCP_PROJECT_ID ausente. Vertex deshabilitado.")
            return
        if not creds or not os.path.exists(creds):
            print("⚠️ [VertexProvider] Credenciales (GOOGLE_APPLICATION_CREDENTIALS) no encontradas. Vertex deshabilitado.")
            return

        try:
            import vertexai
            from vertexai.generative_models import GenerativeModel

            vertexai.init(project=project, location=location)
            self.model = GenerativeModel(self.model_name)
            self._ready = True
            print(f"✅ [VertexProvider] Activo: {self.model_name} @ {project}/{location}")
        except Exception as e:
            print(f"⚠️ [VertexProvider] Fallo al inicializar Vertex AI: {e}")
            self._ready = False

    def available(self) -> bool:
        return self._ready and self.model is not None

    def complete_json(self, prompt: str, task: str = "", payload: Any = None) -> Any:
        from vertexai.generative_models import GenerationConfig

        # 🛡️ Salida estructurada estricta (enforce_structured_output del .Agents/config.yaml)
        config = GenerationConfig(
            response_mime_type="application/json",
            temperature=0.4,
        )
        response = self.model.generate_content(prompt, generation_config=config)
        text = (response.text or "").strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
