import datetime
import os
import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from pymongo import MongoClient

from src.agents.market_hunter import MarketHunterOrchestrator
from src.agents.news_radar import NewsRadarAgent
from src.agents.market_intelligence import MarketIntelligenceAgent
from src.agents.semantic_engine import SemanticEngineAgent
from src.agents.legal_agent import LegalComplianceAgent
from src.providers import ProviderRouter

class MasterOrchestratorAgent:
    """
    El Director Ejecutivo (CEO) de Clicks & Go v4.0.
    Controla presupuestos de IA, logs Zero-Trust y delega tareas críticas a Rust y Rails.
    """
    def __init__(self):
        # 💰 Tope diario de llamadas a IA de pago (Vertex/Gemini). Al superarlo,
        # el router cae a Antigravity (costo cero). Configurable por entorno
        # para ajustar el gasto sin tocar código (ej. AI_DAILY_LIMIT=100 en prod).
        self.DAILY_LIMIT = int(os.getenv("AI_DAILY_LIMIT", "500"))
        
        # 🌐 Endpoints de Microservicios Internos
        self.rust_batch_url = os.getenv("RUST_API_URL", "http://rust_engine:8080/api/v1/score/batch")
        self.rust_benchmark_url = os.getenv("RUST_BENCHMARK_URL", "http://rust_engine:8080/api/v1/benchmarks/run")
        self.rails_api_url = os.getenv("RAILS_API_URL", "http://rails_backend:3000/api/v1/notebooks")
        
        # 🗄️ ZERO-TRUST: Estado migrado a MongoDB (Stateless Container)
        # Acepta MONGODB_URI (Atlas, prod) o MONGO_URI (local docker).
        mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI", "mongodb://mongodb_lake:27017")
        try:
            # Timeout estricto para no colgar el arranque si Mongo no está listo
            self.mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            self.db = self.mongo_client["clicks_and_go_db"]
            self.db_connected = True
        except Exception:
            self.db_connected = False
            print("⚠️ [MasterOrchestrator] Operando sin conexión al Data Lake.")

        # 🧠 Enrutador de proveedores cognitivos (Vertex AI primario + Antigravity fallback)
        self.ai = ProviderRouter(orchestrator=self)
        self.log_action(
            "MasterOrchestrator",
            f"Proveedores IA -> {self.ai.status()}"
        )

    def _get_today_date_str(self):
        return datetime.datetime.now().strftime("%Y-%m-%d")

    def _load_api_quota(self):
        if not self.db_connected: return 0
        doc = self.db.ai_quota.find_one({"date": self._get_today_date_str()})
        return doc["calls"] if doc else 0

    def _save_api_quota(self, calls):
        if not self.db_connected: return
        self.db.ai_quota.update_one(
            {"date": self._get_today_date_str()},
            {"$set": {"calls": calls}},
            upsert=True
        )

    def log_action(self, agent_name, action, status="SUCCESS"):
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{agent_name}]: {action} - [{status}]"
        print(f"📝 {log_entry}")
        
        # Telemetría Inmortal en MongoDB
        if self.db_connected:
            self.db.agent_logs.insert_one({
                "timestamp": timestamp, "agent": agent_name, "action": action, "status": status
            })

    def can_use_ai(self):
        current_calls = self._load_api_quota()
        if current_calls >= self.DAILY_LIMIT:
            self.log_action("MasterOrchestrator", "Presupuesto IA agotado. Activando heurística ANTIGRAVITY.", "WARNING")
            return False
        self._save_api_quota(current_calls + 1)
        return True

    # =====================================================================
    # 🚀 OPERACIÓN TÁCTICA PRINCIPAL (PIPELINE GLOBAL)
    # =====================================================================
    def execute_daily_missions(self):
        self.log_action("MasterOrchestrator", "Iniciando Pipeline de Inteligencia Global v4.0...")

        # 0. ⚖️ Auditoría Legal de Afiliados (primero que todo — la salud del negocio)
        try:
            legal_agent = LegalComplianceAgent(orchestrator=self)
            legal_results = legal_agent.run_audit()
            if legal_results.get("critical", 0) > 0:
                self.log_action(
                    "LegalAgent",
                    f"ALERTA CRÍTICA: {legal_results['critical']} fuente(s) con riesgo de ban. "
                    "Revisar MongoDB colección legal_alerts de inmediato.",
                    "CRITICAL",
                )
        except Exception as e:
            self.log_action("MasterOrchestrator", f"Fallo en LegalAgent: {e}", "ERROR")

        # 1. 📰 Radar de Noticias
        try:
            news_agent = NewsRadarAgent(orchestrator=self)
            news_agent.scan_and_report()
        except Exception as e:
            self.log_action("MasterOrchestrator", f"Fallo en NewsRadar: {e}", "ERROR")

        # 2. 📅 Inteligencia de Mercado (Calendario Exacto)
        forecaster = MarketIntelligenceAgent(orchestrator=self)
        forecaster.update_global_calendar()

        # 3. 🧮 Delegación de Benchmarks a RUST (¡Seguridad de Memoria!)
        try:
            # Python simplemente da la orden. Rust hace el trabajo sucio en C++.
            res_bench = requests.post(self.rust_benchmark_url, timeout=30)
            if res_bench.status_code == 200:
                data = res_bench.json()
                self.log_action("MasterOrchestrator", f"Rust extrajo {data.get('cpu_count')} CPUs y {data.get('gpu_count')} GPUs de forma segura.")
            else:
                self.log_action("MasterOrchestrator", f"Fallo al invocar Rust Benchmarks ({res_bench.status_code})", "WARNING")
        except Exception as e:
            self.log_action("MasterOrchestrator", f"Timeout delegando a Rust: {e}", "ERROR")

        # 4. 🛒 Cacería Comercial (APIs Multihilo)
        market_hunter = MarketHunterOrchestrator()
        deals = market_hunter.hunt_all_markets()
        self.log_action("MarketHunter", f"Capturadas {len(deals)} ofertas verificadas.")
        
        if not deals: return

        # 5. 🎯 Inyección de Inteligencia Comercial (FOMO)
        deals = forecaster.enrich_batch_with_intelligence(deals)

        # 6. 🧠 Enriquecimiento Semántico en Lotes (Gemini SEO/UX)
        semantic_engine = SemanticEngineAgent(orchestrator=self)
        chunk_size = 10
        enriched_deals = []
        for i in range(0, len(deals), chunk_size):
            batch = deals[i:i + chunk_size]
            enriched_deals.extend(semantic_engine.enrich_batch(batch))
            
        # 7. 🚀 Evaluación Matemática Masiva (Rust Rayon)
        try:
            # 🚀 Payload COMPLETO: Rust necesita los campos financieros para su matemática de bajo nivel
            hardware_payload = {
                "items": [{
                    "sku": d["sku_original"],
                    "cpu": d["hardware"]["cpu"],
                    "gpu": d["hardware"]["gpu"],
                    "ram_gb": d["hardware"]["ram_gb"],
                    "current_price": float(d["financials"].get("current_price", 0)),
                    "original_price": float(d["financials"].get("original_price", 0)),
                    "exchange_rate": float(d["financials"].get("applied_exchange_rate", 1.0)),
                    "currency": d.get("currency", "USD"),
                } for d in enriched_deals]
            }
            res_rust = requests.post(self.rust_batch_url, json=hardware_payload, timeout=15)
            if res_rust.status_code == 200:
                scores = res_rust.json()
                score_map = {item["sku"]: item for item in scores if "sku" in item}
                for deal in enriched_deals:
                    result = score_map.get(deal["sku_original"])
                    if result:
                        deal["intelligence"]["deal_score"] = result.get("score", 5.0)
                        # Reusamos la matemática financiera resuelta en metal por Rust
                        deal["financials"]["discount_pct"] = result.get("discount_pct", deal["financials"].get("discount_pct", 0))
                    else:
                        deal["intelligence"]["deal_score"] = 5.0
            else:
                self.log_action("RustEngine", f"Fallo Batch Rust ({res_rust.status_code}). Asignando score neutral.", "WARNING")
                for deal in enriched_deals:
                    deal["intelligence"].setdefault("deal_score", 5.0)
        except Exception as e:
            self.log_action("RustEngine", f"Error de conexión con Rust: {e}", "ERROR")
            for deal in enriched_deals:
                deal["intelligence"].setdefault("deal_score", 5.0)

        # 8. 🗄️ Persistencia Transaccional (Ataque Paralelo a Rails)
        success_count = 0
        # Disparamos 5 hilos simultáneos apuntando al Puma Server de Rails
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(requests.post, self.rails_api_url, json=deal, timeout=5) for deal in enriched_deals]
            for future in as_completed(futures):
                try:
                    if future.result().status_code == 201: success_count += 1
                except Exception: pass

        self.log_action("MasterOrchestrator", f"Misión completada. {success_count}/{len(enriched_deals)} ofertas guardadas en PostgreSQL.")