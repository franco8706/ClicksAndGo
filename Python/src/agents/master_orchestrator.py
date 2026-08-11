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
from src.agents.price_alert_agent import PriceAlertAgent
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

        # 📦 Tamaño de lote para el scoring en Rust. Debe ser ≤ `MAX_BATCH_SIZE`
        # de `Rust/src/models.rs` (500) o Rust responde 413. Se mantiene igual a
        # ese tope: es el punto de mayor rendimiento medido (~5.150 ítems/s).
        self.RUST_BATCH_SIZE = int(os.getenv("RUST_BATCH_SIZE", "500"))

        # 🧠 Lotes semánticos simultáneos contra Gemini. Moderado a propósito:
        # el trabajo es I/O, pero el servicio tiene cuota y saturarlo cambiaría
        # un cuello de latencia por uno de rate limit.
        self.SEMANTIC_WORKERS = int(os.getenv("SEMANTIC_WORKERS", "6"))
        
        # 🌐 Endpoints de Microservicios Internos
        self.rust_batch_url = os.getenv("RUST_API_URL", "http://rust_engine:8080/api/v1/score/batch")
        self.rust_benchmark_url = os.getenv("RUST_BENCHMARK_URL", "http://rust_engine:8080/api/v1/benchmarks/run")
        self.rails_api_url = os.getenv("RAILS_API_URL", "http://rails_backend:3000/api/v1/notebooks")

        # 🔐 Clave compartida para ESCRIBIR en Rails. Rails corre con
        # `ingress: all` en Cloud Run: sin esta cabecera, `POST /notebooks`
        # queda abierto a internet y cualquiera puede inyectar productos (con
        # SUS links de afiliado) en el catálogo. Ver InternalApiAuth.
        self.internal_key = os.getenv("INTERNAL_API_KEY", "")

        # 🗄️ ZERO-TRUST: Estado migrado a MongoDB (Stateless Container)
        # Acepta MONGODB_URI (Atlas, prod) o MONGO_URI (local docker).
        mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI", "mongodb://mongodb_lake:27017")
        try:
            # Timeout estricto para no colgar el arranque si Mongo no está listo
            self.mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            # 🛡️ MongoClient es LAZY: el constructor nunca falla. Sin este ping,
            # db_connected quedaba True aun sin Mongo y cada insert posterior
            # lanzaba ServerSelectionTimeoutError rompiendo el pipeline.
            self.mongo_client.admin.command("ping")
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
        try:
            doc = self.db.ai_quota.find_one({"date": self._get_today_date_str()})
            return doc["calls"] if doc else 0
        except Exception:
            return 0  # Mongo intermitente: asumimos cuota vacía en vez de romper

    def _save_api_quota(self, calls):
        if not self.db_connected: return
        try:
            self.db.ai_quota.update_one(
                {"date": self._get_today_date_str()},
                {"$set": {"calls": calls}},
                upsert=True
            )
        except Exception:
            pass  # best-effort: la cuota no debe tumbar el routing de IA

    def log_action(self, agent_name, action, status="SUCCESS"):
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{agent_name}]: {action} - [{status}]"
        print(f"📝 {log_entry}")
        
        # Telemetría Inmortal en MongoDB (best-effort: nunca rompe el pipeline)
        if self.db_connected:
            try:
                self.db.agent_logs.insert_one({
                    "timestamp": timestamp, "agent": agent_name, "action": action, "status": status
                })
            except Exception:
                pass

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
        try:
            forecaster.update_global_calendar()
        except Exception as e:
            self.log_action("MasterOrchestrator", f"Fallo en MarketIntelligence: {e}", "ERROR")

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
        market_hunter = MarketHunterOrchestrator(orchestrator=self)
        deals = market_hunter.hunt_all_markets()
        self.log_action("MarketHunter", f"Capturadas {len(deals)} ofertas verificadas.")
        
        if not deals: return

        # 5. 🎯 Inyección de Inteligencia Comercial (FOMO)
        deals = forecaster.enrich_batch_with_intelligence(deals)

        # 6. 🧠 Enriquecimiento Semántico en Lotes (Gemini SEO/UX)
        # ⏱️ EN PARALELO. Con Vertex realmente activo (antes caía siempre al
        # fallback heurístico, que es instantáneo) cada lote de 10 tarda ~30 s
        # contra Gemini. Medido en el primer ciclo completo: 88 lotes en serie
        # = **43 de los 50 minutos** del ciclo, contra un techo de Job de 60.
        # El trabajo es I/O puro, así que paralelizarlo lo baja a ~7 min.
        #
        # `SEMANTIC_WORKERS` es deliberadamente moderado: son llamadas a un
        # servicio con cuota, y saturarlo cambiaría un cuello de latencia por
        # uno de rate limit. Se conserva el ORDEN original del catálogo.
        semantic_engine = SemanticEngineAgent(orchestrator=self)
        chunk_size = 10
        lotes = [deals[i:i + chunk_size] for i in range(0, len(deals), chunk_size)]
        enriched_deals = []

        if lotes:
            workers = max(1, min(self.SEMANTIC_WORKERS, len(lotes)))
            with ThreadPoolExecutor(max_workers=workers) as executor:
                # `executor.map` devuelve en el orden de entrada, no de término.
                for resultado in executor.map(semantic_engine.enrich_batch, lotes):
                    enriched_deals.extend(resultado)
            
        # 7. 🚀 Evaluación Matemática Masiva (Rust Rayon)
        #
        # ⚠️ EN LOTES DE `RUST_BATCH_SIZE`. Rust rechaza con 413 los lotes que
        # superan su `MAX_BATCH_SIZE` (500). Antes los recortaba en silencio
        # devolviendo 200: se mandaba el catálogo entero en un solo POST y solo
        # los primeros 500 productos volvían con score real — el resto caía al
        # neutral 5.0 sin que nada lo indicara. Medido el 2026-08-10 enviando
        # 1.000 y 5.000 ítems: 200 OK con 500 resultados en ambos casos.
        try:
            # 🚀 Payload COMPLETO: Rust necesita los campos financieros para su matemática de bajo nivel
            hardware_payload = {
                "items": [{
                    "sku": d["sku_original"],
                    # 📦 Multi-producto: Rust decide el scorer según product_type.
                    "product_type": d.get("product_type", "laptop"),
                    "cpu": d.get("hardware", {}).get("cpu", ""),
                    "gpu": d.get("hardware", {}).get("gpu", ""),
                    "ram_gb": d.get("hardware", {}).get("ram_gb", 0),
                    # Señales de reputación para el scorer genérico (no-laptops).
                    "rating": float(d.get("specs", {}).get("rating", 0) or 0),
                    "reviews": int(d.get("specs", {}).get("reviews", 0) or 0),
                    # Specs del tipo → bonus de scoring por tipo en Rust.
                    "specs": d.get("specs", {}) if isinstance(d.get("specs"), dict) else {},
                    "current_price": float(d["financials"].get("current_price", 0)),
                    "original_price": float(d["financials"].get("original_price", 0)),
                    "exchange_rate": float(d["financials"].get("applied_exchange_rate", 1.0)),
                    "currency": d.get("currency", "USD"),
                } for d in enriched_deals]
            }
            items = hardware_payload["items"]
            score_map = {}
            lotes_ok = lotes_fallidos = 0

            for i in range(0, len(items), self.RUST_BATCH_SIZE):
                lote = items[i:i + self.RUST_BATCH_SIZE]
                res_rust = requests.post(self.rust_batch_url, json={"items": lote}, timeout=30)
                if res_rust.status_code == 200:
                    score_map.update(
                        {it["sku"]: it for it in res_rust.json() if "sku" in it}
                    )
                    lotes_ok += 1
                else:
                    lotes_fallidos += 1
                    self.log_action(
                        "RustEngine",
                        f"Lote {i}-{i + len(lote)} rechazado ({res_rust.status_code}): "
                        f"{res_rust.text[:150]}",
                        "WARNING",
                    )

            # Reporte honesto: cuántos productos quedaron SIN score real. Es la
            # métrica que faltaba — el catálogo terminó con 98,8% en score 0 sin
            # que ninguna línea de log lo dijera.
            sin_score = 0
            for deal in enriched_deals:
                result = score_map.get(deal["sku_original"])
                if result:
                    deal["intelligence"]["deal_score"] = result.get("score", 5.0)
                    # Reusamos la matemática financiera resuelta en metal por Rust
                    deal["financials"]["discount_pct"] = result.get("discount_pct", deal["financials"].get("discount_pct", 0))
                else:
                    deal["intelligence"]["deal_score"] = 5.0
                    sin_score += 1

            nivel = "WARNING" if (sin_score or lotes_fallidos) else "SUCCESS"
            self.log_action(
                "RustEngine",
                f"Scoring: {len(score_map)}/{len(items)} productos puntuados en "
                f"{lotes_ok} lote(s) de {self.RUST_BATCH_SIZE}"
                + (f", {lotes_fallidos} lote(s) fallido(s)" if lotes_fallidos else "")
                + (f", {sin_score} con score neutral 5.0" if sin_score else ""),
                nivel,
            )
        except Exception as e:
            self.log_action("RustEngine", f"Error de conexión con Rust: {e}", "ERROR")
            for deal in enriched_deals:
                deal["intelligence"].setdefault("deal_score", 5.0)

        # 8. 🗄️ Persistencia Transaccional — POR LOTES
        #
        # ⚠️ Antes: un POST por producto con `ThreadPoolExecutor(5)` y
        # `except Exception: pass`. Medido en el primer ciclo completo
        # (2026-08-10): de 882 ofertas **solo 35 requests llegaron a Rails** y
        # 30 se guardaron. Las otras 847 murieron a nivel de conexión en 37
        # segundos y el `pass` las hizo desaparecer: el log decía "30/882
        # guardadas" sin una sola línea que explicara el resto.
        #
        # `post_products_batch` ya existía —con 26 tests— y NADIE la llamaba.
        # Trocea en lotes de 50 (el tope de Rails), reintenta con criterio,
        # distingue el timeout del gateway (donde Rails sí persistió) de un
        # fallo real, y devuelve cuentas verificables en vez de silencio.
        # 882 productos pasan de 882 requests a 18.
        from src.rails_client import post_products_batch

        try:
            guardados, fallidos = post_products_batch(enriched_deals)
        except Exception as e:
            self.log_action(
                "MasterOrchestrator",
                f"La persistencia por lotes falló entera: {e}",
                "ERROR",
            )
            guardados, fallidos = 0, len(enriched_deals)

        no_confirmados = len(enriched_deals) - guardados - fallidos
        nivel = "SUCCESS" if fallidos == 0 and no_confirmados == 0 else "WARNING"
        self.log_action(
            "MasterOrchestrator",
            f"Misión completada. {guardados}/{len(enriched_deals)} ofertas guardadas en PostgreSQL"
            + (f", {fallidos} fallidas" if fallidos else "")
            # Ni guardados ni fallidos: el gateway cortó y Rails pudo haber
            # persistido igual. Decirlo es lo único honesto desde acá.
            + (f", {no_confirmados} sin confirmar (¿corte del gateway?)" if no_confirmados else "")
            + ".",
            nivel,
        )

        # 9. 🔔 Re-engagement: notificar alertas de precio alcanzadas (email vía Resend).
        #    Corre después de persistir los precios nuevos — así compara contra lo más fresco.
        try:
            PriceAlertAgent(self).check_and_notify()
        except Exception as e:
            self.log_action("PriceAlertAgent", f"Fallo al procesar alertas de precio: {e}", "ERROR")