# =====================================================================
# ⚖️  LEGAL COMPLIANCE AGENT — Clicks & Go v4.1
#
# Abogado digital del sistema de afiliación.
# Monitorea diariamente los Términos de Servicio, Políticas de
# Privacidad y Programas de Afiliados de cada red y retailer.
#
# Flujo:
#   1. Descarga el texto público de cada URL monitoreada
#   2. Calcula SHA-256 y compara contra el snapshot anterior en MongoDB
#   3. Si hay cambio → Gemini 2.5 Flash analiza el diff y el riesgo
#   4. Fallback → Antigravity detecta señales de riesgo heurísticamente
#   5. Severidad HIGH/CRITICAL → alerta en Rails (hardware_news)
#   6. La frecuencia se auto-regula: si el último ciclo halló HIGH/CRITICAL,
#      el siguiente chequeo se adelanta a 6h en vez de 24h.
# =====================================================================

import hashlib
import datetime
import os
import time
import random
import requests
from typing import Optional
from bs4 import BeautifulSoup

from src.providers import TASK_LEGAL_AUDIT

# URL del motor Rust — preprocesa el diff antes de llamar a Gemini.
# RUST_API_URL puede venir como base (docker: http://rust_engine:8080) o como
# endpoint completo (Cloud Run: https://.../api/v1/score/batch) — recortamos
# cualquier path /api/... para quedarnos con la base. Sin esto, en Cloud Run
# se armaba .../score/batch/api/v1/legal/diff (404) y TODOS los diffs legales
# caían a Antigravity sin el pre-análisis barato de Rust.
_RUST_DIFF_URL = (
    os.getenv("RUST_API_URL", "http://rust_engine:8080").split("/api/")[0].rstrip("/")
    + "/api/v1/legal/diff"
)

# ── Retardo humano para no saturar servidores legales ────────────────────────
def _polite_delay():
    time.sleep(random.uniform(3.0, 7.0))


# ── Catálogo de URLs a vigilar ───────────────────────────────────────────────
#
# Cada entrada define:
#   source   → clave única en MongoDB (estable entre versiones)
#   url      → página pública a monitorear
#   network  → red de afiliados o retailer al que pertenece
#   region   → cobertura geográfica
#   priority → HIGH = auditoría siempre; NORMAL = sólo si hay cambio de hash
#
MONITORED_SOURCES = [
    # ── Redes de afiliados ──────────────────────────────────────────────────
    {
        "source":   "awin_publisher_terms",
        "url":      "https://www.awin.com/gb/legal/terms-and-conditions",
        "network":  "AWIN",
        "region":   "ES/EU/GB",
        "priority": "HIGH",
    },
    {
        "source":   "awin_publisher_code_of_conduct",
        "url":      "https://www.awin.com/gb/legal/publisher-code-of-conduct",
        "network":  "AWIN",
        "region":   "ES/EU/GB",
        "priority": "HIGH",
    },
    # ⚠️ El Publisher Service Agreement de CJ dejó de ser público (verificado
    # 2026-07-19: /legal/publisher-service-agreement → 404 real, sin URL nueva;
    # el texto completo solo se ve dentro de la cuenta de publisher). Al dar de
    # alta la cuenta CJ: revisar el PSA manualmente al aceptar y en cada aviso
    # de cambio que CJ notifica por email al publisher. Mientras tanto, las dos
    # páginas legales públicas de CJ (abajo) siguen monitoreadas.
    {
        "source":   "cj_terms_of_use",
        "url":      "https://www.cj.com/legal/terms",
        "network":  "CJ",
        "region":   "US/CA",
        "priority": "HIGH",
    },
    {
        "source":   "amazon_associates_operating_agreement",
        "url":      "https://affiliate-program.amazon.com/help/operating/agreement",
        "network":  "AMAZON_PAAPI",
        "region":   "US",
        "priority": "HIGH",
    },
    {
        "source":   "mercadolibre_api_terms",
        # 2026-07-19: el dominio developers.mercadolibre.com.ar murió (404);
        # la doc vive ahora en developers.mercadolibre.com (sin .ar).
        "url":      "https://developers.mercadolibre.com/es_ar/terminos-condiciones",
        "network":  "MERCADOLIBRE",
        "region":   "AR/MX/BR/CO/CL",
        "priority": "HIGH",
    },
    # ── Programas de afiliados de retailers ────────────────────────────────
    # Los programas de afiliados de las marcas corren DENTRO de las redes
    # (Awin/CJ) — estas páginas se monitorean como señal temprana de cambios
    # de términos del retailer. URLs re-verificadas el 2026-07-19.
    {
        "source":   "hp_terms_of_use",
        # La landing del programa (shop/cv/affiliate) bloquea bots (timeout);
        # los términos generales sí son públicos y estables.
        "url":      "https://www.hp.com/us-en/terms-of-use.html",
        "network":  "HP",
        "region":   "US",
        "priority": "NORMAL",
    },
    {
        "source":   "dell_affiliate_program",
        "url":      "https://www.dell.com/en-us/lp/affiliate-program",
        "network":  "DELL",
        "region":   "US",
        "priority": "NORMAL",
    },
    {
        "source":   "lenovo_legal_hub",
        # /us/en/affiliate/ murió (404); el hub legal cubre los términos.
        "url":      "https://www.lenovo.com/us/en/legal/",
        "network":  "LENOVO",
        "region":   "US",
        "priority": "NORMAL",
    },
    {
        "source":   "asus_affiliate_program",
        # URL nueva verificada (la vieja /us/landing-page/affiliate/ → 404).
        "url":      "https://www.asus.com/us/site/affiliate-program/",
        "network":  "ASUS",
        "region":   "US",
        "priority": "NORMAL",
    },
    # ── Políticas generales con impacto en afiliación ─────────────────────
    {
        "source":   "awin_privacy_policy",
        "url":      "https://www.awin.com/gb/legal/privacy-policy",
        "network":  "AWIN",
        "region":   "ES/EU/GB",
        "priority": "NORMAL",
    },
    {
        "source":   "cj_privacy_policy",
        "url":      "https://www.cj.com/legal/privacy",
        "network":  "CJ",
        "region":   "US/CA",
        "priority": "NORMAL",
    },
]

# Severidades que activan re-chequeo acelerado (6h en vez de 24h)
ACCELERATE_SEVERITIES = {"HIGH", "CRITICAL"}

# Severidades que disparan alerta visible en el frontend (hardware_news)
ALERT_SEVERITIES = {"HIGH", "CRITICAL"}


class LegalComplianceAgent:
    """
    Abogado digital del ecosistema Clicks & Go.

    Cada ejecución:
      - Descarga y audita todas las fuentes de MONITORED_SOURCES
      - Almacena snapshots en MongoDB (colección legal_snapshots)
      - Registra alertas en MongoDB (colección legal_alerts)
      - Postea alertas HIGH/CRITICAL al frontend vía Rails hardware_news
    """

    MONGO_SNAPSHOTS = "legal_snapshots"
    MONGO_ALERTS    = "legal_alerts"
    MONGO_STATE     = "legal_state"

    def __init__(self, orchestrator):
        self.orchestrator     = orchestrator
        self.ai               = orchestrator.ai
        self.rails_news_url   = (
            os.getenv("RAILS_API_URL", "http://rails_backend:3000")
            + "/api/v1/notebooks/hardware_news"
        )
        self.db_connected     = orchestrator.db_connected
        self.db               = orchestrator.db if orchestrator.db_connected else None

    # ── Punto de entrada público ──────────────────────────────────────────────

    def run_audit(self, force_full: bool = False) -> dict:
        """
        Ejecuta el ciclo de auditoría legal completo.

        force_full=True  → analiza todas las fuentes sin importar el hash.
        force_full=False → sólo analiza las que cambiaron (modo economía).

        Retorna un resumen con contadores para el log del orquestador.
        """
        self.orchestrator.log_action("LegalAgent", "Iniciando auditoría de compliance de afiliados...")

        results = {
            "checked": 0,
            "changed": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "none": 0,
            "errors": 0,
        }

        for source_def in MONITORED_SOURCES:
            try:
                _polite_delay()
                result = self._audit_source(source_def, force_full=force_full)
                results["checked"] += 1
                # Un fetch fallido es un ERROR de monitoreo, no "sin novedad":
                # contarlo como NONE ocultaría que la fuente quedó sin vigilar.
                if result.get("error") == "fetch_failed":
                    results["errors"] += 1
                    continue
                sev = result.get("severity", "NONE").upper()
                results[sev.lower()] = results.get(sev.lower(), 0) + 1
                if result.get("changed"):
                    results["changed"] += 1
                if sev in ALERT_SEVERITIES:
                    self._post_alert_to_rails(source_def, result)
            except Exception as e:
                results["errors"] += 1
                self.orchestrator.log_action(
                    "LegalAgent",
                    f"Error auditando {source_def['source']}: {e}",
                    "ERROR",
                )

        # Persiste el estado del ciclo para que Cloud Scheduler decida la frecuencia
        self._save_cycle_state(results)

        self.orchestrator.log_action(
            "LegalAgent",
            f"Auditoría completada: {results['checked']} fuentes, "
            f"{results['changed']} cambios, "
            f"CRITICAL={results['critical']} HIGH={results['high']}",
        )
        return results

    def should_run_accelerated(self) -> bool:
        """
        Devuelve True si el último ciclo detectó HIGH/CRITICAL,
        lo que indica que el siguiente debe ejecutarse en 6h, no 24h.
        """
        if not self.db_connected:
            return False
        state = self.db[self.MONGO_STATE].find_one({"key": "last_cycle"})
        if not state:
            return False
        return state.get("accelerate", False)

    # ── Lógica interna ────────────────────────────────────────────────────────

    def _audit_source(self, source_def: dict, force_full: bool) -> dict:
        source = source_def["source"]
        url    = source_def["url"]

        # 1. Descargar y limpiar el texto público
        curr_text = self._fetch_clean_text(url)
        if not curr_text:
            # 🛡️ CEGUERA LEGAL: un fetch fallido NO puede ser silencioso. Si una
            # fuente HIGH lleva 3+ ciclos inaccesible (anti-bot, cambio de URL,
            # caída), el monitoreo de ese contrato está ciego — y no enterarse
            # de un cambio de ToS es exactamente el riesgo que este agente
            # existe para prevenir. Escalamos como CRITICAL para que dispare
            # la alerta por email (Cloud Monitoring observa "- [CRITICAL]").
            fails = self._register_fetch_failure(source)
            if fails >= 3 and source_def.get("priority") == "HIGH":
                self.orchestrator.log_action(
                    "LegalAgent",
                    f"CEGUERA LEGAL: {source} ({source_def['network']}) lleva "
                    f"{fails} ciclos inaccesible desde Cloud Run. El monitoreo "
                    f"de ese contrato está CIEGO — revisar manualmente {url}",
                    "CRITICAL",
                )
                self._post_alert_to_rails(source_def, {
                    "severity": "HIGH",
                    "summary": (
                        f"Fuente legal inaccesible hace {fails} ciclos "
                        f"({source_def['network']}). Sin monitoreo automático: "
                        "revisar los términos manualmente."
                    ),
                })
            return {"severity": "NONE", "changed": False, "error": "fetch_failed"}
        self._register_fetch_success(source)

        curr_hash = hashlib.sha256(curr_text.encode()).hexdigest()
        curr_len  = len(curr_text)

        # 2. Cargar snapshot previo de MongoDB
        prev_snap = self._load_snapshot(source)
        prev_hash = prev_snap.get("hash", "") if prev_snap else ""
        prev_len  = prev_snap.get("text_length", 0) if prev_snap else 0

        hash_changed = curr_hash != prev_hash and bool(prev_hash)
        is_first_run = not bool(prev_hash)

        # 3. Decidir si hacer análisis de IA
        needs_ai = force_full or hash_changed or source_def.get("priority") == "HIGH"

        if is_first_run:
            # Primera ejecución: guardar baseline sin alerta (nada que comparar)
            analysis = {
                "severity": "NONE",
                "summary": f"{source}: línea base registrada. Próximas ejecuciones compararán contra esta versión.",
                "risk_areas": [],
                "recommended_action": "none",
                "ban_risk": False,
                "provider": "baseline",
            }
        elif needs_ai:
            analysis = self._analyze_with_ai(
                source_def=source_def,
                prev_hash=prev_hash,
                curr_hash=curr_hash,
                prev_len=prev_len,
                curr_text=curr_text,
                curr_len=curr_len,
            )
        else:
            analysis = {
                "severity": "NONE",
                "summary": f"{source}: sin cambios. Hash idéntico al anterior.",
                "risk_areas": [],
                "recommended_action": "none",
                "ban_risk": False,
                "provider": "hash_check",
            }

        analysis["changed"] = hash_changed

        # 4. Guardar snapshot actualizado
        self._save_snapshot(source_def, curr_hash, curr_len, curr_text, analysis)

        # 5. Si hay cambio y severidad > NONE → guardar alerta
        if hash_changed and analysis.get("severity", "NONE") != "NONE":
            self._save_alert(source_def, prev_hash, curr_hash, analysis)

        return analysis

    def _analyze_with_ai(
        self,
        source_def: dict,
        prev_hash: str,
        curr_hash: str,
        prev_len: int,
        curr_text: str,
        curr_len: int,
    ) -> dict:
        source  = source_def["source"]
        network = source_def["network"]
        region  = source_def["region"]
        prev_text = self._load_prev_text(source)

        # ── Paso 1: Pre-análisis por Rust (ahorra ~98% de tokens a Gemini) ──
        rust_diff = self._get_rust_diff(source, network, prev_text, curr_text)

        # Si Rust dice SKIP → no gastamos cuota de Gemini
        if rust_diff and rust_diff.get("gemini_priority") == "SKIP":
            self.orchestrator.log_action(
                "LegalAgent",
                f"{source}: Rust clasificó como SKIP (risk_score={rust_diff.get('risk_score', 0)}). Sin llamada a Gemini.",
            )
            severity = "LOW" if rust_diff.get("changed") else "NONE"
            return {
                "severity":           severity,
                "summary":            rust_diff.get("gemini_brief", f"{source}: cambio menor detectado."),
                "risk_areas":         ["general_terms"],
                "recommended_action": "none",
                "ban_risk":           False,
                "key_clauses":        [],
                "deadline_days":      None,
                "provider":           "rust_prefilter",
                "rust_risk_score":    rust_diff.get("risk_score", 0),
            }

        # ── Paso 2: Gemini recibe el brief de Rust (no el texto completo) ──
        rust_brief = (
            rust_diff.get("gemini_brief", "") if rust_diff
            else f"Sin pre-análisis de Rust. Delta: {curr_len - prev_len:+d} chars."
        )
        rust_signals = (
            "; ".join(rust_diff.get("risk_signals", [])[:5]) if rust_diff else "N/A"
        )
        rust_score = rust_diff.get("risk_score", 0) if rust_diff else 0

        prompt = f"""
You are a senior legal compliance specialist for affiliate marketing programs.
Your job is to protect the Clicks & Go platform from affiliate account bans,
commission clawbacks, and ToS violations.

RUST PRE-ANALYSIS (already computed — trust these numbers):
- Source: {source}
- Affiliate network: {network} | Regions: {region}
- Risk score computed by Rust: {rust_score}/100
- Risk signals found: {rust_signals}
- Rust brief: {rust_brief}

YOUR TASK:
Based on the Rust pre-analysis above, provide the final compliance verdict.
Do NOT re-analyze the raw text — the risk signals are already extracted.
Focus on the BUSINESS IMPACT for an affiliate laptop price comparison site.

Return ONLY valid JSON:
{{
  "severity": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "summary": "Max 250 chars. Business impact for affiliate program.",
  "risk_areas": ["commissions", "cookie_window", "prohibited_content", "geo_restrictions", "data_privacy", "link_format", "disclosure_requirements", "payment_terms"],
  "recommended_action": "none" | "review" | "update_links" | "update_disclosures" | "pause_campaign" | "consult_lawyer",
  "ban_risk": true | false,
  "key_clauses": ["max 3 action items"],
  "deadline_days": null | number
}}
"""

        result, provider_name = self.ai.complete_json(
            prompt=prompt,
            task=TASK_LEGAL_AUDIT,
            payload={
                "source":      source,
                "prev_hash":   prev_hash,
                "curr_hash":   curr_hash,
                "prev_length": prev_len,
                "curr_length": curr_len,
                "curr_text":   curr_text,
            },
        )

        if isinstance(result, dict):
            result["provider"]         = provider_name
            result["rust_risk_score"]  = rust_score
            return result

        return {
            "severity":           "LOW",
            "summary":            f"{source}: cambio detectado. Análisis automático no disponible.",
            "risk_areas":         ["general_terms"],
            "recommended_action": "review",
            "ban_risk":           False,
            "key_clauses":        [],
            "deadline_days":      None,
            "provider":           provider_name,
            "rust_risk_score":    rust_score,
        }

    def _get_rust_diff(
        self,
        source: str,
        network: str,
        prev_text: str,
        curr_text: str,
    ) -> Optional[dict]:
        """Llama al endpoint /api/v1/legal/diff de Rust para pre-análisis de bajo costo."""
        try:
            resp = requests.post(
                _RUST_DIFF_URL,
                json={"items": [{"source": source, "network": network,
                                 "prev_text": prev_text or "", "curr_text": curr_text}]},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data[0] if data else None
        except Exception as e:
            self.orchestrator.log_action(
                "LegalAgent",
                f"Rust diff no disponible para {source}: {e}. Usando Antigravity directo.",
                "WARNING",
            )
        return None

    def _load_prev_text(self, source: str) -> str:
        """Recupera el texto de la versión anterior desde MongoDB (para enviar a Rust)."""
        if not self.db_connected:
            return ""
        snap = self.db[self.MONGO_SNAPSHOTS].find_one(
            {"source": source}, {"text_preview": 1}
        )
        return (snap or {}).get("text_preview", "") if snap else ""

    # ── Persistencia MongoDB ──────────────────────────────────────────────────

    def _register_fetch_failure(self, source: str) -> int:
        """Incrementa el contador de ciclos consecutivos sin poder leer la fuente.
        Devuelve el total actual (1 si Mongo no está disponible: sin historial
        no se puede acumular, y alertar al primer fallo sería ruido)."""
        if not self.db_connected:
            return 1
        doc = self.db[self.MONGO_STATE].find_one_and_update(
            {"key": f"fetch_fail:{source}"},
            {"$inc": {"count": 1},
             "$set": {"last_failure": datetime.datetime.utcnow().isoformat()}},
            upsert=True,
            return_document=True,
        )
        return int((doc or {}).get("count", 1))

    def _register_fetch_success(self, source: str):
        """Un fetch exitoso resetea el contador de ceguera de esa fuente."""
        if not self.db_connected:
            return
        self.db[self.MONGO_STATE].delete_one({"key": f"fetch_fail:{source}"})

    def _load_snapshot(self, source: str) -> Optional[dict]:
        if not self.db_connected:
            return None
        return self.db[self.MONGO_SNAPSHOTS].find_one({"source": source})

    def _save_snapshot(
        self,
        source_def: dict,
        curr_hash: str,
        curr_len: int,
        curr_text: str,
        analysis: dict,
    ):
        if not self.db_connected:
            return
        self.db[self.MONGO_SNAPSHOTS].update_one(
            {"source": source_def["source"]},
            {"$set": {
                "source":       source_def["source"],
                "url":          source_def["url"],
                "network":      source_def["network"],
                "region":       source_def["region"],
                "hash":         curr_hash,
                "text_length":  curr_len,
                "text_preview": curr_text[:500],
                "last_analysis": analysis,
                "recorded_at":  datetime.datetime.utcnow().isoformat(),
            }},
            upsert=True,
        )

    def _save_alert(self, source_def: dict, prev_hash: str, curr_hash: str, analysis: dict):
        if not self.db_connected:
            return
        self.db[self.MONGO_ALERTS].insert_one({
            "source":       source_def["source"],
            "network":      source_def["network"],
            "region":       source_def["region"],
            "severity":     analysis.get("severity"),
            "summary":      analysis.get("summary"),
            "ban_risk":     analysis.get("ban_risk", False),
            "risk_areas":   analysis.get("risk_areas", []),
            "action":       analysis.get("recommended_action"),
            "key_clauses":  analysis.get("key_clauses", []),
            "deadline_days":analysis.get("deadline_days"),
            "prev_hash":    prev_hash,
            "curr_hash":    curr_hash,
            "provider":     analysis.get("provider"),
            "resolved":     False,
            "recorded_at":  datetime.datetime.utcnow().isoformat(),
        })

    def _save_cycle_state(self, results: dict):
        if not self.db_connected:
            return
        accelerate = results.get("critical", 0) > 0 or results.get("high", 0) > 0
        self.db[self.MONGO_STATE].update_one(
            {"key": "last_cycle"},
            {"$set": {
                "key":         "last_cycle",
                "results":     results,
                "accelerate":  accelerate,
                "recorded_at": datetime.datetime.utcnow().isoformat(),
            }},
            upsert=True,
        )

    # ── Rails alert (visible en frontend como noticia de compliance) ──────────

    def _post_alert_to_rails(self, source_def: dict, analysis: dict):
        severity = analysis.get("severity", "HIGH")
        impact_map = {"CRITICAL": "CRITICAL", "HIGH": "HIGH", "MEDIUM": "MEDIUM"}
        impact = impact_map.get(severity, "HIGH")

        news_payload = {
            "news": [{
                "category":    f"COMPLIANCE — {source_def['network']}",
                "title":       f"[{severity}] Cambio en ToS: {source_def['network']} ({source_def['region']})",
                "summary":     analysis.get("summary", "Cambio detectado en términos del programa de afiliados."),
                "impact_score": impact,
                "country_code": None,
                "recorded_at":  datetime.datetime.utcnow().isoformat(),
            }]
        }
        try:
            resp = requests.post(self.rails_news_url, json=news_payload, timeout=10)
            self.orchestrator.log_action(
                "LegalAgent",
                f"Alerta {severity} enviada a Rails para {source_def['source']} (HTTP {resp.status_code})",
            )
        except Exception as e:
            self.orchestrator.log_action(
                "LegalAgent",
                f"No se pudo enviar alerta a Rails: {e}",
                "WARNING",
            )

    # ── Scraping de texto limpio ──────────────────────────────────────────────

    def _fetch_clean_text(self, url: str) -> str:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept":          "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
            "Cache-Control":   "no-cache",
        }
        try:
            resp = requests.get(url, headers=headers, timeout=20)
            resp.raise_for_status()
        except Exception as e:
            self.orchestrator.log_action("LegalAgent", f"Fetch falló para {url}: {e}", "WARNING")
            return ""

        soup = BeautifulSoup(resp.text, "html.parser")

        # Eliminar elementos no textuales
        for tag in soup(["script", "style", "nav", "header", "footer", "img", "svg", "form"]):
            tag.decompose()

        # Extraer sólo el cuerpo legal (main > article > section > div)
        main = soup.find("main") or soup.find("article") or soup.find("body")
        raw = main.get_text(separator="\n") if main else soup.get_text(separator="\n")

        # Normalizar espacios en blanco
        lines = [line.strip() for line in raw.splitlines() if line.strip()]
        return "\n".join(lines)
