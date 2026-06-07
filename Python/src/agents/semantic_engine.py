import json
from src.providers import TASK_SEMANTIC_BATCH


class SemanticEngineAgent:
    """Motor Cognitivo Batch: enriquece lotes de laptops (SEO/UX/categoría)
    delegando en el ProviderRouter (Vertex AI -> Antigravity)."""

    def __init__(self, orchestrator):
        self.orchestrator = orchestrator
        self.ai = orchestrator.ai

    def enrich_batch(self, laptops_batch: list) -> list:
        # Payload comprimido: lo usa Vertex en el prompt y Antigravity como datos crudos
        compressed_payload = [{
            "sku": l["sku_original"],
            "name": l["name"],
            "ram": l["hardware"]["ram_gb"],
            "cpu": l["hardware"].get("cpu", ""),
            "gpu": l["hardware"].get("gpu", ""),
        } for l in laptops_batch]

        prompt = f"""
        Actúa como un experto en hardware. Analiza este lote de laptops: {json.dumps(compressed_payload)}
        Devuelve UN ARRAY JSON donde cada objeto contenga el "sku" y la inteligencia.
        Estructura requerida por objeto:
        {{"sku": "...", "seo_title": "max 60 chars", "seo_description": "max 150 chars",
          "ux_badge": "Gamer Pro/Workstation/etc", "ui_accent_color": "blue-500",
          "ai_reasoning": "Veredicto técnico corto",
          "category": "gaming|business|ultrabook|workstation|budget|creator|student"}}
        Devuelve ÚNICAMENTE el JSON array.
        """

        try:
            ai_results, provider = self.ai.complete_json(
                prompt, task=TASK_SEMANTIC_BATCH, payload=compressed_payload
            )
            if not isinstance(ai_results, list):
                raise ValueError("La IA no devolvió un array")

            ai_map = {item["sku"]: item for item in ai_results if "sku" in item}
            for laptop in laptops_batch:
                intel = ai_map.get(laptop["sku_original"])
                self._apply_intelligence(laptop, intel or {})
            self.orchestrator.log_action(
                "SemanticEngine", f"Lote enriquecido por '{provider}' ({len(laptops_batch)} items)."
            )
            return laptops_batch
        except Exception as e:
            self.orchestrator.log_action("SemanticEngine", f"Fallo de enriquecimiento: {e}", "WARNING")
            for laptop in laptops_batch:
                self._apply_intelligence(laptop, {})
            return laptops_batch

    def _apply_intelligence(self, laptop: dict, intel: dict):
        ram = laptop.get("hardware", {}).get("ram_gb", 8)
        default_color = "emerald-500" if ram >= 16 else "blue-500"

        laptop["intelligence"] = {
            "ai_reasoning": intel.get("ai_reasoning", ""),
            "ai_badge": intel.get("ux_badge", "Verificado"),
            "ui_accent_color": intel.get("ui_accent_color", default_color),
            # 🏷️ La categoría ahora viaja hasta el serializer de Rails y el frontend
            "category": intel.get("category", "business"),
        }
        laptop["seo"] = {
            "title": intel.get("seo_title", ""),
            "description": intel.get("seo_description", ""),
        }
