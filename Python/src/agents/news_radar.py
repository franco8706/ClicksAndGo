import os
import requests
from bs4 import BeautifulSoup
import datetime
from src.providers import TASK_NEWS_EVAL

class NewsRadarAgent:
    def __init__(self, orchestrator):
        self.orchestrator = orchestrator
        self.ai = orchestrator.ai
        self.rails_api_url = (
            os.getenv("RAILS_API_URL", "http://rails_backend:3000")
            + "/api/v1/notebooks/hardware_news"
        )

        # Fuentes RSS especializadas en hardware, laptops y tech — globales + latam
        self.rss_feeds = {
            "Toms_Hardware":    "https://www.tomshardware.com/feeds/all",
            "The_Verge_Tech":   "https://www.theverge.com/rss/index.xml",
            "Ars_Technica":     "https://feeds.arstechnica.com/arstechnica/technology-lab",
            "Engadget":         "https://www.engadget.com/rss.xml",
            "TechRadar_Laptops":"https://www.techradar.com/rss",
            "CNET_Tech":        "https://www.cnet.com/rss/news/",
            "Wired":            "https://www.wired.com/feed/rss",
            "Xataka_ES":        "https://www.xataka.com/feedburner.xml",
            "NotebookCheck":    "https://www.notebookcheck.net/News.255.0.html",
            "Digital_Trends":   "https://www.digitaltrends.com/feed/",
            "Laptop_Mag":       "https://www.laptopmag.com/feeds/all",
        }

        # 🌍 País del feed (ISO alpha-2). Los que no figuran son globales
        # (country_code NULL → Rails los sirve a todos los países). Un feed
        # regional se muestra SOLO a los visitantes de su país — el ticker
        # del hero ya se pide por país detectado por IP.
        self.feed_country = {
            "Xataka_ES": "ES",
        }

        # Palabras clave para filtrar solo artículos relevantes a hardware/tech
        self._tech_keywords = {
            "laptop", "notebook", "cpu", "gpu", "processor", "intel", "amd", "nvidia",
            "arm", "snapdragon", "apple", "macbook", "windows", "linux", "chip",
            "ram", "ssd", "battery", "display", "screen", "ai", "artificial",
            "tech", "technology", "computer", "pc", "hardware", "software",
            "procesador", "portátil", "ordenador", "tecnología", "inteligencia",
            "memoria", "almacenamiento", "pantalla", "precio", "oferta",
        }

    # ── Public ───────────────────────────────────────────────────────────────

    def scan_and_report(self):
        self.orchestrator.log_action("NewsRadar", "Iniciando escaneo de 11 feeds RSS...")
        news_batch = []

        for tag, url in self.rss_feeds.items():
            try:
                items = self._fetch_items(url)
                for item in items:
                    evaluated = self._evaluate_news(item["title"], item["summary"], tag)
                    if evaluated:
                        news_batch.append({
                            "category":    evaluated["category"],
                            "title":       item["title"][:250],
                            "summary":     evaluated["summary"],
                            "impact_score": evaluated["impact_score"],
                            "source_url":  item.get("url"),
                            "recorded_at": datetime.datetime.utcnow().isoformat(),
                            # 🌍 Feed regional → noticia solo para su país
                            "country_code": self.feed_country.get(tag),
                        })
            except Exception as e:
                self.orchestrator.log_action(
                    "NewsRadar", f"Error en feed {tag}: {e}", "ERROR"
                )

        self.orchestrator.log_action(
            "NewsRadar", f"{len(news_batch)} artículos recopilados de {len(self.rss_feeds)} feeds."
        )

        if news_batch:
            self._send_to_rails(news_batch)

    # ── Private ──────────────────────────────────────────────────────────────

    def _fetch_items(self, url: str, max_items: int = 6) -> list[dict]:
        """Descarga un feed RSS/Atom y devuelve los últimos max_items artículos."""
        resp = requests.get(url, timeout=12, headers={"User-Agent": "ClicksAndGo-NewsBot/4.3"})
        resp.raise_for_status()

        # lxml-xml es más robusto para RSS; html.parser es fallback si lxml no está disponible
        try:
            soup = BeautifulSoup(resp.content, "lxml-xml")
        except Exception:
            soup = BeautifulSoup(resp.content, "html.parser")

        # RSS 2.0
        items = soup.find_all("item")
        # Atom
        if not items:
            items = soup.find_all("entry")

        results = []
        for item in items:
            if len(results) >= max_items:
                break
            title_tag = item.find("title")
            desc_tag  = item.find("description") or item.find("summary") or item.find("content")
            link_tag  = item.find("link") or item.find("id")
            title   = title_tag.get_text(strip=True) if title_tag else ""
            raw_txt = BeautifulSoup(desc_tag.get_text(), "html.parser").get_text() if desc_tag else ""
            # Extrae URL: puede ser texto del tag o atributo href
            if link_tag:
                article_url = (link_tag.get("href") or link_tag.get_text(strip=True)) or None
            else:
                article_url = None
            if not title or len(raw_txt) < 20:
                continue
            combined = (title + " " + raw_txt).lower()
            if not any(kw in combined for kw in self._tech_keywords):
                continue
            results.append({"title": title, "summary": raw_txt, "url": article_url})

        return results

    def _evaluate_news(self, title: str, raw_summary: str, source_tag: str) -> dict | None:
        prompt = (
            f'Analiza: "{title}". Texto: "{raw_summary[:500]}"\n'
            'Responde ÚNICAMENTE con JSON: '
            '{"summary": "máx 150 chars en español", '
            '"impact_score": "CRITICAL|HIGH|MEDIUM|LOW", '
            '"category": "tag descriptivo en español"}'
        )
        payload = {"title": title, "summary": raw_summary, "source": source_tag}
        try:
            data, _ = self.ai.complete_json(prompt, task=TASK_NEWS_EVAL, payload=payload)
            if not isinstance(data, dict):
                raise ValueError("Respuesta no es objeto JSON")
            if data.get("impact_score") not in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                data["impact_score"] = "MEDIUM"
            return data
        except Exception:
            return self._deterministic_eval(title, raw_summary, source_tag)

    def _deterministic_eval(self, title: str, raw_summary: str, source_tag: str) -> dict:
        text = (title + " " + raw_summary).lower()
        if any(w in text for w in ["hack", "vulnerab", "breach", "exploit", "crisis"]):
            impact = "CRITICAL"
        elif any(w in text for w in ["rtx", "ryzen", "snapdragon", "intel", "apple m", "launch", "lanzamiento"]):
            impact = "HIGH"
        elif any(w in text for w in ["laptop", "notebook", "precio", "oferta", "deal", "review"]):
            impact = "MEDIUM"
        else:
            impact = "LOW"

        category_map = {
            "Toms_Hardware":     "Hardware Global",
            "The_Verge_Tech":    "Tech Global",
            "Ars_Technica":      "Tecnología",
            "Engadget":          "Gadgets",
            "TechRadar_Laptops": "Tech Radar",
            "CNET_Tech":         "CNET News",
            "Wired":             "Wired Tech",
            "Xataka_ES":         "Xataka España",
            "NotebookCheck":     "NotebookCheck",
            "Digital_Trends":    "Digital Trends",
            "Laptop_Mag":        "Laptop Mag",
        }

        return {
            "summary": (raw_summary[:147] + "...") if len(raw_summary) > 147 else raw_summary,
            "impact_score": impact,
            "category": category_map.get(source_tag, source_tag.replace("_", " ")),
        }

    def _send_to_rails(self, news_batch: list[dict]):
        try:
            resp = requests.post(
                self.rails_api_url,
                json={"news": news_batch},
                timeout=15,
            )
            self.orchestrator.log_action(
                "NewsRadar",
                f"Rails respondió {resp.status_code}. {len(news_batch)} artículos enviados.",
            )
        except Exception as e:
            self.orchestrator.log_action("NewsRadar", f"Fallo enviando a Rails: {e}", "ERROR")
