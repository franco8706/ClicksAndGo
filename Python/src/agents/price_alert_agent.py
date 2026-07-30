"""
🔔 PriceAlertAgent — Motor de re-engagement de Clicks & Go.

Corre tras cada ciclo de precios (paso 9 del MasterOrchestrator). Detecta las
alertas de precio cuyo objetivo ya se alcanzó y avisa al usuario por email
(Resend), para traerlo de vuelta a completar la compra afiliada.

Zero-Trust: NO toca PostgreSQL. Consume los endpoints REST de Rails
(`/api/v1/price_alerts/pending` y `/mark_notified`), protegidos por
INTERNAL_API_KEY. La comparación precio<=objetivo la resuelve Rails (dueño
de la DB); acá solo se envían emails y se marca lo enviado.
"""

import os
import time

import requests

RESEND_ENDPOINT = "https://api.resend.com/emails"

# 🔁 Reintentos del envío individual. El ciclo que dispara este agente es
# diario, así que sin reintento en el momento un 503 puntual de Resend retrasa
# el aviso ~24h — y una alerta de precio que llega tarde no sirve.
EMAIL_RETRY_ATTEMPTS = 3
EMAIL_RETRY_BASE_DELAY = 1.0  # segundos; backoff 1s, 2s

# Símbolos por moneda para un email legible (fallback: el código ISO).
_CURRENCY_SYMBOL = {
    "USD": "US$", "ARS": "$", "EUR": "€", "MXN": "MX$",
    "BRL": "R$", "COP": "COL$", "CLP": "CLP$",
}


class PriceAlertAgent:
    def __init__(self, orchestrator):
        self.orchestrator = orchestrator
        # Base de Rails derivada de RAILS_API_URL (que apunta a .../api/v1/notebooks).
        rails_url = getattr(orchestrator, "rails_api_url", "") or ""
        self.rails_base = rails_url.split("/api/v1/")[0] or "http://rails_backend:3000"

        self.internal_key = os.getenv("INTERNAL_API_KEY", "")
        self.resend_key = os.getenv("AUTH_RESEND_KEY", "")
        self.from_email = os.getenv("AUTH_FROM_EMAIL", "noreply@clicks-and-go.com")
        # Base pública para armar el link al producto en el email.
        self.web_url = os.getenv("PUBLIC_WEB_URL", "https://clicks-and-go.com").rstrip("/")

    def _log(self, action, status="SUCCESS"):
        # Reutiliza el logger Zero-Trust del orquestador si está disponible.
        log = getattr(self.orchestrator, "log_action", None)
        if callable(log):
            log("PriceAlertAgent", action, status)
        else:
            print(f"[PriceAlertAgent] {status}: {action}")

    # ------------------------------------------------------------------
    def check_and_notify(self):
        """Punto de entrada: consulta pendientes, notifica y marca."""
        pending = self._fetch_pending()
        if not pending:
            self._log("Sin alertas de precio para notificar.")
            return

        if not self.resend_key:
            # Hay gente para avisar pero falta configurar Resend: NO marcamos
            # como notificadas para que se envíen cuando haya API key.
            self._log(
                f"{len(pending)} alertas alcanzadas pero AUTH_RESEND_KEY no está configurada; se enviarán cuando exista.",
                "WARNING",
            )
            return

        sent_ids = []
        for alert in pending:
            if self._send_email(alert):
                sent_ids.append(alert.get("id"))

        marked = self._mark_notified(sent_ids)
        self._log(f"Alertas alcanzadas: {len(pending)} · emails enviados: {len(sent_ids)} · marcadas: {marked}.")

    # ------------------------------------------------------------------
    def _headers(self):
        return {"X-Internal-Key": self.internal_key, "Content-Type": "application/json"}

    def _fetch_pending(self):
        try:
            res = requests.get(
                f"{self.rails_base}/api/v1/price_alerts/pending",
                headers=self._headers(),
                timeout=10,
            )
            if res.status_code == 200:
                data = res.json()
                return data if isinstance(data, list) else []
            self._log(f"Rails respondió {res.status_code} al pedir alertas pendientes.", "WARNING")
        except Exception as e:
            self._log(f"No se pudo consultar alertas pendientes: {e}", "ERROR")
        return []

    def _mark_notified(self, ids):
        ids = [i for i in ids if i]
        if not ids:
            return 0
        try:
            res = requests.post(
                f"{self.rails_base}/api/v1/price_alerts/mark_notified",
                headers=self._headers(),
                json={"ids": ids},
                timeout=10,
            )
            if res.status_code == 200:
                return res.json().get("marked", 0)
            self._log(f"Rails respondió {res.status_code} al marcar notificadas.", "WARNING")
        except Exception as e:
            self._log(f"No se pudieron marcar alertas como notificadas: {e}", "ERROR")
        return 0

    # ------------------------------------------------------------------
    def _fmt_price(self, value, moneda):
        symbol = _CURRENCY_SYMBOL.get((moneda or "USD").upper(), f"{moneda} ")
        try:
            return f"{symbol}{float(value):,.0f}"
        except (TypeError, ValueError):
            return f"{symbol}{value}"

    def _send_email(self, alert):
        to = alert.get("email")
        if not to:
            return False

        brand = alert.get("brand", "")
        model = alert.get("model", "")
        title = f"{brand} {model}".strip() or "tu producto"
        # ⚖️ Cumplimiento Amazon Associates: PROHIBIDO mostrar precios de
        # productos fuera del sitio aprobado (los precios solo pueden vivir
        # en la web, y a futuro deben venir de PAAPI con <24h). El email
        # solo menciona el OBJETIVO que fijó el propio usuario (dato suyo,
        # no de Amazon) y lo invita a ver el precio vigente en el sitio.
        target = self._fmt_price(alert.get("target_price"), alert.get("moneda"))
        slug = alert.get("slug", "")
        link = f"{self.web_url}/es/laptop/{slug}" if slug else self.web_url
        panel_link = f"{self.web_url}/es/panel"
        greeting = f"Hola {alert.get('name')}," if alert.get("name") else "Hola,"

        html = f"""
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0a0e14">
          <p style="font-size:12px;letter-spacing:2px;color:#2563eb;font-weight:700;text-transform:uppercase">Clicks &amp; Go · Alerta de precio</p>
          <h1 style="font-size:22px;margin:8px 0 4px">💸 ¡Tu alerta se activó!</h1>
          <p style="color:#414855">{greeting} el producto que estabas siguiendo alcanzó el precio objetivo que definiste:</p>
          <div style="border:1px solid #e6e8ec;border-radius:8px;padding:20px;margin:16px 0">
            <p style="font-weight:700;font-size:16px;margin:0 0 8px">{title}</p>
            <p style="margin:0;color:#059669;font-size:15px;font-weight:700">Tu objetivo: {target}</p>
            <p style="margin:6px 0 0;color:#6b7280;font-size:13px">El precio vigente lo ves en el sitio — puede variar en cualquier momento.</p>
          </div>
          <a href="{link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:2px">Ver el precio actual →</a>
          <p style="color:#9aa1ac;font-size:11px;margin-top:24px">Recibís este email porque creaste una alerta de precio en Clicks &amp; Go. En el sitio encontrarás enlaces de afiliado: si comprás a través de ellos podemos ganar una comisión, sin costo extra para vos. Podés gestionar o eliminar tus alertas desde <a href="{panel_link}" style="color:#6b7280">tu panel</a>.</p>
        </div>
        """.strip()

        payload = {
            "from": self.from_email,
            "to": [to],
            # Sin precio en el asunto (mismo criterio que el cuerpo).
            "subject": f"💸 {title} alcanzó tu precio objetivo",
            "html": html,
        }
        # 🔁 Reintentos ante fallo TRANSITORIO de Resend.
        #
        # Ya existe durabilidad: `check_and_notify` solo marca como notificadas
        # las alertas cuyo envío devolvió True, así que un fallo no pierde el
        # email — lo reintenta el ciclo siguiente. El problema es que el ciclo
        # es DIARIO (`full-cycle-daily` a las 04:00), o sea que un 503 puntual
        # de Resend retrasa el aviso ~24h y la alerta de precio pierde su valor.
        #
        # Se reintenta acá mismo en vez de montar una cola con persistencia:
        # Postgres ya cumple ese rol (la fila no marcada ES la cola) y una cola
        # aparte agregaría infraestructura sin resolver nada que esto no cubra.
        for intento in range(1, EMAIL_RETRY_ATTEMPTS + 1):
            try:
                res = requests.post(
                    RESEND_ENDPOINT,
                    headers={"Authorization": f"Bearer {self.resend_key}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=10,
                )
                if res.status_code in (200, 201):
                    return True

                # 4xx (salvo 429) es determinista: email inválido, dominio no
                # verificado, key revocada. Reintentar solo repite el error.
                if 400 <= res.status_code < 500 and res.status_code != 429:
                    self._log(
                        f"Resend rechazó definitivamente el email a {to} ({res.status_code}). No se reintenta.",
                        "ERROR",
                    )
                    return False

                self._log(
                    f"Resend respondió {res.status_code} para {to} (intento {intento}/{EMAIL_RETRY_ATTEMPTS}).",
                    "WARNING",
                )
            except Exception as e:
                self._log(
                    f"Fallo al enviar email a {to} (intento {intento}/{EMAIL_RETRY_ATTEMPTS}): {e}",
                    "WARNING",
                )

            if intento < EMAIL_RETRY_ATTEMPTS:
                time.sleep(EMAIL_RETRY_BASE_DELAY * (2 ** (intento - 1)))  # 1s, 2s

        self._log(f"Email a {to} no pudo enviarse tras {EMAIL_RETRY_ATTEMPTS} intentos; queda pendiente para el próximo ciclo.", "ERROR")
        return False
