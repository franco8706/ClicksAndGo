import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Importación limpia gracias a la Fachada (__init__.py)
from src.agents import MasterOrchestratorAgent, NewsRadarAgent
from src.agents.legal_agent import LegalComplianceAgent

# Instanciación global (Singleton)
orchestrator = MasterOrchestratorAgent()

# 🛡️ MUTEX: Candado de Concurrencia (Previene ataques de clonación)
mission_lock = asyncio.Lock()

# =====================================================================
# 🔄 CICLO DE VIDA DEL SERVIDOR (Lifespan)
# =====================================================================
NEWS_SCAN_INTERVAL = 6 * 60 * 60  # 6 horas

async def _news_radar_loop():
    """Corre NewsRadar al arrancar y luego cada 6 horas sin bloquear el servidor."""
    await asyncio.sleep(30)  # espera a que Rails esté listo
    while True:
        try:
            agent = NewsRadarAgent(orchestrator=orchestrator)
            await asyncio.to_thread(agent.scan_and_report)
        except Exception as e:
            orchestrator.log_action("NewsRadarLoop", f"Error en ciclo automático: {e}", "ERROR")
        await asyncio.sleep(NEWS_SCAN_INTERVAL)

@asynccontextmanager
async def lifespan(app: FastAPI):
    orchestrator.log_action("API_Gateway", "Arrancando microservicio Python v4.3...")
    task = asyncio.create_task(_news_radar_loop())
    yield
    task.cancel()
    orchestrator.log_action("API_Gateway", "Apagado graceful. Cerrando conexiones...")
    if hasattr(orchestrator, 'mongo_client'):
        orchestrator.mongo_client.close()

# =====================================================================
# ⚙️ CONFIGURACIÓN DE LA APLICACIÓN FASTAPI
# =====================================================================
app = FastAPI(
    title="Clicks & Go - Python AI Engine",
    description="Microservicio de Inteligencia Artificial y Scraping",
    version="4.0",
    lifespan=lifespan
)

# 🛡️ ZERO-TRUST: Configuración estricta de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://rails_backend:3000", 
        "http://rust_engine:8080"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# =====================================================================
# 📡 ENDPOINTS DE CONTROL Y SALUD
# =====================================================================
@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "service": "python_ai_engine",
        "version": "4.0",
        "ai_quota_used": orchestrator._load_api_quota(),
        "ai_providers": orchestrator.ai.status(),
        "mission_locked": mission_lock.locked()
    }

# =====================================================================
# 🚀 ENDPOINTS TÁCTICOS (MISIONES DE AGENTES)
# =====================================================================
async def execute_locked_mission(task_func):
    """Wrapper para ejecutar misiones asegurando que el candado se libere siempre"""
    try:
        # Ejecutamos la tarea pesada (CPU/Red) en un hilo del sistema operativo
        await asyncio.to_thread(task_func)
    finally:
        mission_lock.release()

@app.post("/api/v1/tasks/full-cycle")
async def trigger_full_cycle(background_tasks: BackgroundTasks):
    """Dispara la misión diaria completa. Protegido por Mutex."""
    if mission_lock.locked():
        raise HTTPException(status_code=429, detail="🚨 Operación denegada: Ya hay una misión táctica en curso.")
    
    await mission_lock.acquire()
    try:
        background_tasks.add_task(execute_locked_mission, orchestrator.execute_daily_missions)
        return {"status": "queued", "message": "Cacería global encolada y asegurada."}
    except Exception as e:
        mission_lock.release()
        raise HTTPException(status_code=500, detail="Fallo interno al encolar.")

@app.post("/api/v1/tasks/news-radar")
async def trigger_news_radar(background_tasks: BackgroundTasks):
    """Dispara únicamente el escaneo de feeds RSS."""
    try:
        agent = NewsRadarAgent(orchestrator=orchestrator)
        background_tasks.add_task(asyncio.to_thread, agent.scan_and_report)
        return {"status": "queued", "message": "Misión NewsRadar encolada en Background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Fallo interno al encolar.")

# =====================================================================
# ⚖️  LEGAL COMPLIANCE AGENT — Endpoints
# =====================================================================

@app.post("/api/v1/legal/audit")
async def trigger_legal_audit(background_tasks: BackgroundTasks, mode: str = "check"):
    """
    Dispara la auditoría legal de afiliados.

    mode=full   → Analiza todas las fuentes sin importar si cambiaron.
                  Llamado por Cloud Scheduler daily a las 03:00 UTC.

    mode=check  → Sólo hace re-auditoría si el último ciclo tuvo HIGH/CRITICAL.
                  Llamado por Cloud Scheduler cada 6h para respuesta rápida.
    """
    legal_agent = LegalComplianceAgent(orchestrator=orchestrator)

    if mode == "check" and not legal_agent.should_run_accelerated():
        return {
            "status": "skipped",
            "message": "Sin alertas activas. Re-chequeo acelerado no necesario.",
        }

    force_full = mode == "full"
    background_tasks.add_task(asyncio.to_thread, legal_agent.run_audit, force_full)
    return {
        "status":  "queued",
        "message": f"Auditoría legal ({mode}) encolada en Background.",
    }

@app.get("/api/v1/legal/status")
async def legal_status():
    """
    Devuelve el estado del último ciclo de auditoría legal.
    Útil para dashboards de monitoreo.
    """
    if not orchestrator.db_connected:
        return {"status": "no_db", "message": "MongoDB no disponible"}

    state = orchestrator.db["legal_state"].find_one(
        {"key": "last_cycle"}, {"_id": 0}
    )
    recent_alerts = list(
        orchestrator.db["legal_alerts"]
        .find({"resolved": False}, {"_id": 0})
        .sort("recorded_at", -1)
        .limit(10)
    )
    return {
        "last_cycle":     state or {},
        "open_alerts":    recent_alerts,
        "alert_count":    len(recent_alerts),
        "accelerated_mode": state.get("accelerate", False) if state else False,
    }