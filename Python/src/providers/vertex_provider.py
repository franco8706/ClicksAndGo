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

        # 🔑 Credenciales: archivo explícito O Application Default Credentials.
        #
        # Antes se EXIGÍA `GOOGLE_APPLICATION_CREDENTIALS` apuntando a un archivo
        # existente, y sin eso Vertex quedaba deshabilitado. En Cloud Run ese
        # archivo no existe ni debe existir: las credenciales llegan por ADC
        # desde el service account adjunto, que es el patrón recomendado (no hay
        # llave privada que rotar ni filtrar).
        #
        # Consecuencia medida el 2026-08-10: la variable estaba declarada VACÍA
        # en el manifiesto, el guard la tomaba como ausente y el proveedor
        # primario llevaba deshabilitado desde el primer despliegue — con
        # `clicks-sa` adjunto, `roles/aiplatform.user` concedido y
        # `aiplatform.googleapis.com` habilitada. Toda la capa cognitiva corría
        # sobre la heurística de Antigravity sin que nadie lo hubiera decidido.
        #
        # Ahora solo se rechaza el caso realmente roto: una ruta declarada que
        # NO existe (config equivocada). Vacía o ausente ⇒ se intenta ADC, y si
        # tampoco hay, `vertexai.init` falla y cae al `except` de abajo.
        if creds and not os.path.exists(creds):
            print(f"⚠️ [VertexProvider] GOOGLE_APPLICATION_CREDENTIALS apunta a '{creds}', que no existe. Vertex deshabilitado.")
            return
        if not creds:
            print("ℹ️ [VertexProvider] Sin archivo de credenciales: usando Application Default Credentials.")

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
