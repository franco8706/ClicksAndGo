"""Backfill de scoring para el catálogo histórico.

Por qué existe
--------------
`deal_score` arranca en 0 y solo lo pisa el motor de Rust cuando puntúa. La
cacería diaria re-puntúa únicamente lo que la red devuelve HOY —unos 878
productos por corrida sobre keywords fijas—, así que todo lo ingerido antes de
que el ciclo diario funcionara se quedó en 0 y **no se auto-sana**: si Rakuten
no vuelve a listar ese producto, nadie lo va a volver a mirar nunca.

Medido el 2026-08-11: 2231 de 3100 productos (72%) en `deal_score = 0`.

Un 0 no es una oferta mala, es una oferta sin evaluar. Se nota en dos lugares:
la ficha no puede mostrar señal de precio, y el scope `ofertas_destacadas`
(`deal_score >= 8.5`) no puede encontrarla aunque sea la mejor oferta del sitio.

Cómo funciona
-------------
Tres pasos por tanda, hasta que no queden pendientes:

  1. `GET /products/unscored`  → candidatos con los campos que Rust consume.
  2. `POST` al motor de Rust   → scoring real, en lotes de `RUST_BATCH_SIZE`.
  3. `POST /products/scores`   → escribe SOLO la columna `deal_score`.

Se usa el `id` y no el `sku_original` como identificador: el SKU solo es único
por retailer, así que dos comerciantes con el mismo SKU se pisarían el score.
"""
from __future__ import annotations

import os

import requests

from src.rails_client import internal_headers, rails_url

#: Tope de Rust (`MAX_BATCH_SIZE`). Por encima responde 413 — antes recortaba
#: en silencio y devolvía 200 con medio resultado.
RUST_BATCH_SIZE = 500

#: Rutas completas: `rails_base()` devuelve solo esquema + host.
PATH_UNSCORED = "/api/v1/products/unscored"
PATH_SCORES   = "/api/v1/products/scores"

#: Tanda que se pide a Rails por vuelta (su `BACKFILL_MAX` es 500).
#: 250 y no 500 por el mismo motivo que `post_products_batch` usa 50: Rails
#: corre con `timeoutSeconds: 30` en Cloud Run. Acá cada producto es un
#: `update_all` de una sola columna —sin `lock!` ni validaciones, órdenes de
#: magnitud más barato que la ingesta—, pero el techo de 30 s sigue estando.
TANDA = 250

#: Freno duro. Sin esto, un error que impidiera bajar el contador de pendientes
#: dejaría el Job dando vueltas hasta el timeout de Cloud Run.
MAX_VUELTAS = 40


class ScoreBackfillAgent:
    def __init__(self, orchestrator=None):
        self.orchestrator = orchestrator
        self.rust_url = os.getenv(
            "RUST_API_URL", "http://rust_engine:8080/api/v1/score/batch"
        )

    def _log(self, mensaje: str, status: str = "SUCCESS") -> None:
        print(mensaje, flush=True)
        if self.orchestrator is not None:
            try:
                self.orchestrator.log_action("ScoreBackfill", mensaje.strip(), status)
            except Exception:
                pass  # la telemetría nunca puede tumbar el backfill

    def _pendientes(self, limite: int) -> tuple[list, int]:
        resp = requests.get(
            rails_url(PATH_UNSCORED),
            params={"limit": limite},
            headers=internal_headers(),
            timeout=60,
        )
        if resp.status_code != 200:
            self._log(
                f"🚨 [Backfill] /products/unscored → {resp.status_code}: {resp.text[:200]}",
                "ERROR",
            )
            return [], 0
        datos = resp.json()
        return datos.get("items") or [], int(datos.get("pending_total") or 0)

    def _puntuar(self, items: list) -> dict:
        """Manda a Rust en lotes y devuelve {id: score}.

        Un lote rechazado se reporta y se sigue con los demás: perder una tanda
        es recuperable en la vuelta siguiente, abortar todo no.
        """
        scores: dict = {}
        for i in range(0, len(items), RUST_BATCH_SIZE):
            lote = items[i:i + RUST_BATCH_SIZE]
            payload = [{
                # Rust devuelve este `sku` tal cual: le pasamos el id de Rails.
                "sku":            str(it["id"]),
                "product_type":   it.get("product_type") or "laptop",
                "cpu":            it.get("cpu") or "",
                "gpu":            it.get("gpu") or "",
                "ram_gb":         int(it.get("ram_gb") or 0),
                "rating":         float(it.get("rating") or 0),
                "reviews":        int(it.get("reviews") or 0),
                "specs":          it.get("specs") if isinstance(it.get("specs"), dict) else {},
                "current_price":  float(it.get("current_price") or 0),
                "original_price": float(it.get("original_price") or 0),
                "exchange_rate":  float(it.get("exchange_rate") or 1.0),
                "currency":       it.get("currency") or "USD",
            } for it in lote]

            try:
                resp = requests.post(self.rust_url, json={"items": payload}, timeout=60)
            except requests.RequestException as e:
                self._log(f"🚨 [Backfill] Rust inalcanzable: {e}", "ERROR")
                continue

            if resp.status_code != 200:
                self._log(
                    f"🚨 [Backfill] Rust rechazó el lote ({resp.status_code}): "
                    f"{resp.text[:150]}",
                    "ERROR",
                )
                continue

            for res in resp.json():
                if "sku" in res and res.get("score"):
                    scores[str(res["sku"])] = float(res["score"])
        return scores

    def _escribir(self, scores: dict) -> int:
        if not scores:
            return 0
        # El `id` es un UUID: viaja como string de punta a punta. Convertirlo a
        # entero en cualquiera de las dos puntas rompe el match en silencio.
        items = [{"id": k, "deal_score": v} for k, v in scores.items()]
        resp = requests.post(
            rails_url(PATH_SCORES),
            json={"items": items},
            headers=internal_headers(),
            timeout=120,
        )
        if resp.status_code != 200:
            self._log(
                f"🚨 [Backfill] /products/scores → {resp.status_code}: {resp.text[:200]}",
                "ERROR",
            )
            return 0
        return int(resp.json().get("updated") or 0)

    def run(self) -> int:
        """Puntúa todo lo pendiente. Devuelve cuántos productos actualizó."""
        _, total_inicial = self._pendientes(1)
        if not total_inicial:
            self._log("✅ [Backfill] No hay productos sin score.")
            return 0

        self._log(f"🔢 [Backfill] {total_inicial} productos sin score. Empezando…")

        actualizados = 0
        for vuelta in range(1, MAX_VUELTAS + 1):
            items, pendientes = self._pendientes(TANDA)
            if not items:
                break

            scores = self._puntuar(items)
            escritos = self._escribir(scores)
            actualizados += escritos

            self._log(
                f"🔢 [Backfill] Vuelta {vuelta}: {escritos}/{len(items)} puntuados "
                f"({pendientes} pendientes antes de esta vuelta)."
            )

            # Si una vuelta no escribe nada, la siguiente pediría exactamente
            # los mismos productos: cortar acá evita el bucle infinito y deja
            # el fallo visible en vez de disfrazarlo de progreso.
            if escritos == 0:
                self._log(
                    "⚠️ [Backfill] Una vuelta no actualizó ningún producto. "
                    "Se corta para no repetir la misma tanda.",
                    "WARNING",
                )
                break

        self._log(
            f"✅ [Backfill] Completado: {actualizados}/{total_inicial} productos puntuados.",
            "SUCCESS" if actualizados else "WARNING",
        )
        return actualizados
