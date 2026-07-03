# =====================================================================
# 🔷 GEMINI API PROVIDER (Google AI Studio) - Proveedor cognitivo secundario
# Usa la Gemini API por API KEY (GEMINI_API_KEY) — NO requiere proyecto
# GCP con facturación activa ni service account. Tiene free tier.
# Es el puente cognitivo mientras Vertex AI (billing GCP) esté caído,
# y funciona desde cualquier nube (AWS, etc.).
# Implementado con stdlib (urllib) — cero dependencias nuevas.
# =====================================================================
import os
import json
import urllib.request
import urllib.error
from typing import Any

from .base import LLMProvider

_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(LLMProvider):
    name = "gemini_api"

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.timeout = int(os.getenv("GEMINI_TIMEOUT_S", "30"))

        if not self.api_key:
            print("⚠️ [GeminiProvider] GEMINI_API_KEY ausente. Gemini API deshabilitado.")
        else:
            print(f"✅ [GeminiProvider] Activo: {self.model_name} (API key, sin billing GCP)")

    def available(self) -> bool:
        return bool(self.api_key)

    def complete_json(self, prompt: str, task: str = "", payload: Any = None) -> Any:
        url = f"{_API_BASE}/{self.model_name}:generateContent"
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                # 🛡️ Salida estructurada estricta — mismo contrato que VertexProvider
                "responseMimeType": "application/json",
                "temperature": 0.4,
            },
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        # Extracción defensiva del texto de la primera candidata
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"Gemini API sin candidatos: {json.dumps(data)[:300]}")
        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts).strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
