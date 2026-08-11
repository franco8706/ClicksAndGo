#!/usr/bin/env python3
"""Entrypoint del ciclo agéntico diario para **Cloud Run Jobs**.

Por qué existe
--------------
El ciclo corría como `BackgroundTask` de FastAPI detrás de
`POST /api/v1/tasks/full-cycle`: el endpoint respondía al instante y el trabajo
seguía "por detrás". En Cloud Run **Services** eso no se sostiene —

  · `cpu-throttling: true` ⇒ fuera de una request la CPU se estrangula,
  · `timeoutSeconds: 300`  ⇒ el ciclo real necesita ~15 minutos,
  · `minScale: 0`          ⇒ la instancia se apaga cuando parece ociosa.

Medido el 2026-08-10: el ciclo arrancó 04:00:05, llegó a la cacería comercial
04:14:12 y recibió `SIGTERM` a las 04:15:12. En cuatro días de logs **no existe
una sola línea `Misión completada`** — los pasos 5 a 9 (enriquecimiento,
scoring en Rust, persistencia y alertas de precio) nunca se ejecutaron. El
catálogo quedó con el 98,8% de los productos sin `deal_score`.

Cloud Run **Jobs** es lo correcto para esto: CPU garantizada durante toda la
ejecución, timeout de hasta 24 h, reintentos configurables y coste cero cuando
no corre. El proceso vive mientras el trabajo vive, y termina con un código de
salida que el scheduler puede leer.

Uso
---
    python run_cycle.py             # ciclo completo (el diario)
    python run_cycle.py news        # solo el radar de noticias
    python run_cycle.py legal       # solo la auditoría legal
    python run_cycle.py backfill    # re-puntúa el catálogo sin `deal_score`

Códigos de salida: `0` éxito, `1` fallo. Cloud Run Jobs marca la ejecución como
fallida con cualquier código distinto de cero, y eso sí se puede alertar.
"""
from __future__ import annotations

import sys
import time
import traceback


def _run_full_cycle() -> None:
    from src.agents import MasterOrchestratorAgent

    orquestador = MasterOrchestratorAgent()
    orquestador.execute_daily_missions()


def _run_news() -> None:
    from src.agents import MasterOrchestratorAgent, NewsRadarAgent

    NewsRadarAgent(orchestrator=MasterOrchestratorAgent()).scan_and_report()


def _run_legal() -> None:
    from src.agents import MasterOrchestratorAgent
    from src.agents.legal_agent import LegalComplianceAgent

    LegalComplianceAgent(orchestrator=MasterOrchestratorAgent()).run_audit()


def _run_backfill() -> None:
    from src.agents import MasterOrchestratorAgent
    from src.agents.score_backfill import ScoreBackfillAgent

    ScoreBackfillAgent(orchestrator=MasterOrchestratorAgent()).run()


TAREAS = {
    "full": _run_full_cycle,
    "news": _run_news,
    "legal": _run_legal,
    # Puntual, no diaria: repara el catálogo ingerido antes de que el ciclo
    # funcionara. Es idempotente —solo toca lo que está en `deal_score = 0`—
    # así que correrla de más no rompe nada.
    "backfill": _run_backfill,
}


def main() -> int:
    tarea = (sys.argv[1] if len(sys.argv) > 1 else "full").strip().lower()
    if tarea not in TAREAS:
        print(f"❌ Tarea desconocida: '{tarea}'. Opciones: {', '.join(TAREAS)}", file=sys.stderr)
        return 2

    print(f"🚀 [Job] Ejecutando '{tarea}'...", flush=True)
    inicio = time.monotonic()
    try:
        TAREAS[tarea]()
    except Exception:
        # Traza completa a stderr: en un Job es lo único que queda cuando algo
        # revienta, y el código de salida ≠ 0 es lo que hace visible el fallo.
        transcurrido = time.monotonic() - inicio
        print(f"🚨 [Job] '{tarea}' falló tras {transcurrido:.0f}s", file=sys.stderr, flush=True)
        traceback.print_exc()
        return 1

    transcurrido = time.monotonic() - inicio
    print(f"✅ [Job] '{tarea}' completada en {transcurrido:.0f}s ({transcurrido/60:.1f} min)", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
