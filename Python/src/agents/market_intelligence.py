import os
import requests
import datetime
from pymongo import MongoClient
from src.providers import TASK_PROMO_CALENDAR

class MarketIntelligenceAgent:
    """
    Sub-Agente Predictivo (Promo Forecaster) v4.0.
    Analiza noticias en tiempo real para determinar fechas EXACTAS de eventos de e-commerce.
    """

    def __init__(self, orchestrator=None):
        self.orchestrator = orchestrator
        self.ai = orchestrator.ai if orchestrator else None
        self.rails_api_url = os.getenv("RAILS_API_URL", "http://rails_backend:3000") + "/api/v1/notebooks/hardware_news"

        # Conexión al Data Lake para guardar el calendario dinámico
        mongo_uri = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI", "mongodb://mongodb_lake:27017")
        try:
            self.mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            self.db = self.mongo_client["clicks_and_go_db"]
            self.db_connected = True
        except Exception:
            self.db_connected = False

    def update_global_calendar(self):
        """Lee las noticias de Rails, usa IA para extraer fechas exactas y guarda el calendario."""
        if not self.ai or not self.db_connected:
            return

        self.orchestrator.log_action("MarketIntelligence", "Analizando noticias para extraer calendario exacto de ofertas...")

        try:
            # 1. Obtener las últimas noticias frescas de Rails
            res = requests.get(self.rails_api_url, timeout=10)
            news_data = res.json() if res.status_code == 200 else []
            
            # Comprimimos las noticias para el prompt
            news_context = "\n".join([f"- {n.get('title')}: {n.get('summary')}" for n in news_data])
            
            today_str = datetime.date.today().isoformat()
            
            # 2. Prompt estricto para extraer fechas exactas y retailers
            prompt = f"""
            Eres un analista de inteligencia de mercado de e-commerce. Hoy es {today_str}.
            Analiza estas noticias recientes de nuestra base de datos:
            {news_context}
            
            Identifica eventos de descuentos EXACTOS (ej. Hot Sale, CyberMonday, Prime Day) activos o próximos a iniciar en los próximos 30 días.
            Si las noticias no lo mencionan, usa tu conocimiento actualizado para determinar las fechas oficiales en este año.
            
            Devuelve ÚNICAMENTE un JSON array con esta estructura estricta:
            [
              {{
                "event_name": "Nombre del Evento",
                "country_code": "AR",
                "start_date": "YYYY-MM-DD",
                "end_date": "YYYY-MM-DD",
                "retailers": ["mercadolibre", "amazon", "lenovo_ar", "hp_es", "*"] // Usa "*" si aplica a todos en ese país
              }}
            ]
            Si no hay eventos, devuelve [].
            """
            
            calendar, provider = self.ai.complete_json(
                prompt, task=TASK_PROMO_CALENDAR, payload=news_data
            )
            if not isinstance(calendar, list):
                calendar = []
            self.orchestrator.log_action("MarketIntelligence", f"Calendario evaluado por '{provider}'.")

            # 3. Guardar el calendario dinámico en MongoDB
            self.db.promo_calendar.replace_one(
                {"dataset": "latest"},
                {"dataset": "latest", "events": calendar, "updated_at": today_str},
                upsert=True
            )
            
            self.orchestrator.log_action("MarketIntelligence", f"Calendario actualizado. {len(calendar)} eventos exactos detectados.")
            
        except Exception as e:
            self.orchestrator.log_action("MarketIntelligence", f"Fallo al actualizar calendario: {e}", "ERROR")

    def _get_active_event(self, country_code: str, retailer_slug: str) -> dict:
        """Cruza la fecha exacta de hoy con el calendario en MongoDB."""
        if not self.db_connected: return None

        calendar_doc = self.db.promo_calendar.find_one({"dataset": "latest"})
        if not calendar_doc: return None

        today = datetime.date.today()

        for event in calendar_doc.get("events", []):
            if event.get("country_code") != country_code: continue

            # Verificar si el retailer participa en el evento (o si aplica a todos '*')
            retailers = event.get("retailers", [])
            if retailer_slug not in retailers and "*" not in retailers:
                continue

            try:
                start_date = datetime.datetime.strptime(event["start_date"], "%Y-%m-%d").date()
                end_date = datetime.datetime.strptime(event["end_date"], "%Y-%m-%d").date()
                
                # Si hoy está dentro de las fechas exactas del evento
                if start_date <= today <= end_date:
                    days_left = (end_date - today).days
                    return {
                        "is_promo_season": True,
                        "promo_event": event["event_name"],
                        "market_urgency": "CRITICAL" if days_left <= 2 else "HIGH",
                        "fomo_message": f"🔥 {event['event_name']} activo. Termina en {days_left} días."
                    }
                
                # Pre-calentamiento (FOMO): Si faltan 5 días o menos para que empiece
                days_to_start = (start_date - today).days
                if 0 < days_to_start <= 5:
                    return {
                        "is_promo_season": True,
                        "promo_event": event["event_name"],
                        "market_urgency": "MEDIUM",
                        "fomo_message": f"⏳ Anticipación: {event['event_name']} comienza en {days_to_start} días."
                    }
            except Exception:
                continue

        return None

    def enrich_batch_with_intelligence(self, laptops_batch: list) -> list:
        """Aplica la inteligencia cruzada a las laptops."""
        for laptop in laptops_batch:
            country = laptop.get("country_code", "US")
            retailer = laptop.get("retailer_slug", "generic")
            
            # Consultar fechas exactas
            intel = self._get_active_event(country, retailer)
            
            if "metadata_extra" not in laptop:
                laptop["metadata_extra"] = {}

            if intel:
                laptop["metadata_extra"].update(intel)
            else:
                laptop["metadata_extra"].update({
                    "is_promo_season": False,
                    "promo_event": "Standard",
                    "market_urgency": "LOW",
                    "fomo_message": None
                })
                
        return laptops_batch