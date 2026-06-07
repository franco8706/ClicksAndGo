# =====================================================================
# 🪂 ANTIGRAVITY PROVIDER - Proveedor de contingencia de costo cero
# Implementa la MISMA interfaz que Vertex. Cuando Vertex cae o se agota
# la cuota, este proveedor emula la salida con heurística determinista,
# garantizando que el pipeline nunca se detenga (Zero-Downtime).
# =====================================================================
from typing import Any

from .base import (
    LLMProvider,
    TASK_SEMANTIC_BATCH,
    TASK_NEWS_EVAL,
    TASK_PROMO_CALENDAR,
    TASK_LEGAL_AUDIT,
)


class AntigravityProvider(LLMProvider):
    name = "antigravity"

    def available(self) -> bool:
        # Siempre disponible: corre 100% en memoria, sin red ni credenciales.
        return True

    def complete_json(self, prompt: str, task: str = "", payload: Any = None) -> Any:
        if task == TASK_SEMANTIC_BATCH:
            return self._semantic_batch(payload or [])
        if task == TASK_NEWS_EVAL:
            return self._news_eval(payload or {})
        if task == TASK_PROMO_CALENDAR:
            return []  # Sin IA no inventamos fechas de eventos: array vacío seguro.
        if task == TASK_LEGAL_AUDIT:
            return self._legal_audit(payload or {})
        return []

    # ---------------------------------------------------------------
    # 💻 Enriquecimiento semántico de laptops (SEO/UX/categoría)
    # ---------------------------------------------------------------
    def _semantic_batch(self, payload: list) -> list:
        results = []
        for item in payload:
            name = str(item.get("name", "Laptop"))
            ram = int(item.get("ram", 8) or 8)
            gpu = str(item.get("gpu", "")).lower()
            cpu = str(item.get("cpu", "")).lower()

            category = self._infer_category(name.lower(), gpu, cpu, ram)
            high_perf = ram >= 16
            results.append({
                "sku": item.get("sku"),
                "seo_title": f"{name[:48]} | Análisis y Precio",
                "seo_description": "Auditoría técnica de hardware verificada por Clicks & Go.",
                "ux_badge": "Alto Rendimiento" if high_perf else "Uso Cotidiano",
                "ui_accent_color": "emerald-500" if high_perf else "blue-500",
                "ai_reasoning": (
                    "Hardware ideal para multitarea exigente y cargas pesadas."
                    if high_perf else
                    "Configuración equilibrada para ofimática y uso diario."
                ),
                "category": category,
            })
        return results

    def _infer_category(self, name: str, gpu: str, cpu: str, ram: int) -> str:
        if any(g in gpu for g in ["rtx", "radeon rx", "gtx"]):
            return "gaming"
        if "iris" in gpu or "integr" in gpu:
            if ram >= 16:
                return "ultrabook"
            return "business"
        if ram >= 32:
            return "workstation"
        if any(w in name for w in ["macbook", "air", "aero", "ultra"]):
            return "ultrabook"
        if ram <= 8:
            return "budget"
        return "business"

    # ---------------------------------------------------------------
    # ⚖️ Auditoría legal heurística (sin IA, 100% determinista)
    # Principio: cambio de hash = revisión necesaria.
    # Palabras clave de riesgo → elevan severidad automáticamente.
    # ---------------------------------------------------------------
    def _legal_audit(self, payload: dict) -> dict:
        source      = str(payload.get("source", "unknown"))
        prev_hash   = str(payload.get("prev_hash", ""))
        curr_hash   = str(payload.get("curr_hash", ""))
        curr_text   = str(payload.get("curr_text", "")).lower()
        prev_len    = int(payload.get("prev_length", 0))
        curr_len    = int(payload.get("curr_length", 0))
        hash_changed = prev_hash != curr_hash and bool(prev_hash)

        # Señales de riesgo crítico en el texto actual
        CRITICAL_SIGNALS = [
            "terminate", "suspend account", "ban", "prohibited",
            "legal action", "immediate termination", "account closure",
        ]
        HIGH_SIGNALS = [
            "commission rate", "cookie window", "cookie duration",
            "prohibited content", "restricted", "no longer permit",
            "changes to payment", "payment terms", "prohibited categories",
        ]
        MEDIUM_SIGNALS = [
            "updated", "amended", "modification", "revised",
            "new requirement", "additional condition",
        ]

        critical_hit = any(s in curr_text for s in CRITICAL_SIGNALS)
        high_hit     = any(s in curr_text for s in HIGH_SIGNALS)
        medium_hit   = any(s in curr_text for s in MEDIUM_SIGNALS)

        # Pérdida grande de contenido = posible eliminación de cláusulas favorables
        significant_shrink = prev_len > 0 and curr_len < prev_len * 0.85

        if not hash_changed:
            severity = "NONE"
            action   = "none"
            ban_risk = False
            summary  = f"{source}: sin cambios detectados."
        elif critical_hit or significant_shrink:
            severity = "CRITICAL"
            action   = "pause_campaign"
            ban_risk = True
            summary  = f"{source}: cambios críticos detectados. Revisión legal urgente."
        elif high_hit:
            severity = "HIGH"
            action   = "review"
            ban_risk = True
            summary  = f"{source}: cambios en comisiones, cookies o contenido prohibido."
        elif medium_hit:
            severity = "MEDIUM"
            action   = "review"
            ban_risk = False
            summary  = f"{source}: modificaciones detectadas. Revisar en las próximas 48h."
        else:
            severity = "LOW"
            action   = "review"
            ban_risk = False
            summary  = f"{source}: cambio de contenido menor. Revisión de rutina."

        risk_areas = []
        if "commission" in curr_text or "payment" in curr_text:
            risk_areas.append("commissions")
        if "cookie" in curr_text:
            risk_areas.append("cookie_window")
        if "prohibit" in curr_text or "restrict" in curr_text:
            risk_areas.append("prohibited_content")
        if "geo" in curr_text or "region" in curr_text or "country" in curr_text:
            risk_areas.append("geo_restrictions")
        if "privacy" in curr_text or "data" in curr_text:
            risk_areas.append("data_privacy")

        return {
            "severity":           severity,
            "summary":            summary,
            "risk_areas":         risk_areas or ["general_terms"],
            "recommended_action": action,
            "ban_risk":           ban_risk,
            "provider":           "antigravity",
        }

    # ---------------------------------------------------------------
    # 📰 Evaluación heurística de noticias
    # ---------------------------------------------------------------
    def _news_eval(self, payload: dict) -> dict:
        title = str(payload.get("title", ""))
        summary = str(payload.get("summary", ""))
        source = str(payload.get("source", "Global Tech"))
        text = (title + " " + summary).lower()

        if any(w in text for w in ["hack", "crisis", "breach", "vulnerab"]):
            impact = "CRITICAL"
        elif any(w in text for w in ["rtx", "ryzen", "lanzamiento", "launch", "nvidia", "amd"]):
            impact = "HIGH"
        else:
            impact = "MEDIUM"

        clean = summary[:147] + "..." if len(summary) > 150 else summary
        return {
            "summary": clean or "Resumen no disponible.",
            "impact_score": impact,
            "category": source.replace("_", " "),
        }
