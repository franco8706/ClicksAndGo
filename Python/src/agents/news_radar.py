import os
import re
import requests
from bs4 import BeautifulSoup
import datetime
from src.providers import TASK_NEWS_EVAL
from src.rails_client import NEWS_PATH, post_json_detail, rails_url

class NewsRadarAgent:
    def __init__(self, orchestrator):
        self.orchestrator = orchestrator
        self.ai = orchestrator.ai
        # 🔗 Vía rails_url: concatenar a mano generaba un path duplicado y
        # POSTeaba a un 404 desde el 2026-06-09 (ver src/rails_client.py).
        self.rails_api_url = rails_url(NEWS_PATH)

        # Fuentes RSS de hardware, laptops y tech, agrupadas por IDIOMA.
        self.rss_feeds = {
            # ── Inglés ────────────────────────────────────────────────────
            "Toms_Hardware":    "https://www.tomshardware.com/feeds/all",
            "The_Verge_Tech":   "https://www.theverge.com/rss/index.xml",
            "Ars_Technica":     "https://feeds.arstechnica.com/arstechnica/technology-lab",
            "Engadget":         "https://www.engadget.com/rss.xml",
            "TechRadar_Laptops":"https://www.techradar.com/rss",
            "CNET_Tech":        "https://www.cnet.com/rss/news/",
            "Wired":            "https://www.wired.com/feed/rss",
            "NotebookCheck":    "https://www.notebookcheck.net/News.255.0.html",
            "Digital_Trends":   "https://www.digitaltrends.com/feed/",
            "Laptop_Mag":       "https://www.laptopmag.com/feeds/all",
            # ── Español ───────────────────────────────────────────────────
            "Xataka_ES":        "https://www.xataka.com/feedburner.xml",
            "Genbeta_ES":       "https://www.genbeta.com/feedburner.xml",
            "Hipertextual_ES":  "https://hipertextual.com/feed/",
            "ComputerHoy_ES":   "https://computerhoy.20minutos.es/rss/",
            # ── Portugués ─────────────────────────────────────────────────
            "Tecnoblog_BR":     "https://tecnoblog.net/feed/",
            "Canaltech_BR":     "https://canaltech.com.br/rss/",
            "OlharDigital_BR":  "https://olhardigital.com.br/feed/",
            # ── Italiano ──────────────────────────────────────────────────
            "HDblog_IT":        "https://www.hdblog.it/feed/",
            "TomsHardware_IT":  "https://www.tomshw.it/feed",
            "PuntoInformatico_IT": "https://www.punto-informatico.it/feed/",
        }

        # 🌍 Marca de IDIOMA de cada feed, guardada en `country_code`.
        #
        # El valor NO significa "solo para este país": es el representante del
        # GRUPO LINGÜÍSTICO. Rails expande el país del visitante a su grupo
        # (`NEWS_LANG_PEERS` en notebooks_controller), así que un argentino
        # recibe lo marcado "ES" porque está en su idioma, aunque el medio sea
        # español.
        #
        # No se emite una fila por país a propósito: `save_news_batch` hace
        # `find_or_initialize_by(title:)`, o sea que deduplica por título — las
        # cinco copias de un artículo en español colapsarían en una sola y
        # ganaría el último país procesado. La expansión tiene que vivir del
        # lado de la lectura, no de la escritura.
        #
        # El diseño anterior ataba Xataka a "ES" literal y nada más, así que un
        # argentino recibía 20 noticias EN INGLÉS y ni siquiera veía la única
        # fuente en su idioma. Medido el 2026-08-15: AR, US, BR y ES devolvían
        # exactamente el mismo titular en inglés.
        #
        # Los feeds en inglés quedan como GLOBAL (None): son el relleno de
        # cualquier país sin cobertura propia, y Rails los ordena después de
        # las noticias en el idioma del visitante.
        self.feed_country = {
            "Xataka_ES": "ES", "Genbeta_ES": "ES",
            "Hipertextual_ES": "ES", "ComputerHoy_ES": "ES",
            "Tecnoblog_BR": "BR", "Canaltech_BR": "BR", "OlharDigital_BR": "BR",
            "HDblog_IT": "IT", "TomsHardware_IT": "IT", "PuntoInformatico_IT": "IT",
        }

        # Palabras clave para quedarse solo con lo relevante a hardware/tech,
        # en los CUATRO idiomas de los feeds (en/es/pt/it).
        #
        # ⚠️ Se comparan como PALABRA COMPLETA, no como subcadena. Medido sobre
        # 40 artículos reales de Xataka: la comparación por subcadena dejaba
        # pasar 10 y 9 eran basura — "ram" dentro de "programadores", "ai"
        # dentro de otras palabras, "pc" suelto. Entraban al ticker faros
        # nucleares soviéticos, árboles de Madrid y precios de la vivienda.
        #
        # `precio` y `oferta` se quitaron a propósito: en un medio generalista
        # matchean vivienda, supermercado y coches. El producto ya tiene una
        # sección de ofertas reales; el ticker es de noticias.
        self._tech_keywords = {
            # Cómputo y componentes (universal)
            "laptop", "notebook", "netbook", "ultrabook", "macbook", "chromebook",
            "cpu", "gpu", "ssd", "hdd", "nvme", "ram", "vram", "pc", "arm", "risc",
            "intel", "amd", "nvidia", "qualcomm", "snapdragon", "ryzen", "radeon",
            "geforce", "apple", "lenovo", "asus", "acer", "msi", "dell", "hp",
            "thinkpad", "chip", "chipset", "procesador", "processore", "processador",
            "processor", "placa", "motherboard", "gráfica", "grafica",
            # Sistemas y software
            "windows", "linux", "macos", "android", "ios", "chromeos", "software",
            "hardware", "firmware", "driver", "app", "aplicación", "aplicativo",
            # IA (palabra completa: "ai" suelto matchea medio diccionario)
            "ia", "ai", "inteligencia artificial", "intelligenza artificiale",
            "inteligência artificial", "artificial intelligence", "chatgpt",
            "copilot", "gemini", "openai", "llm",
            # Dispositivos
            "smartphone", "teléfono", "telefono", "celular", "móvil", "movil",
            "tablet", "monitor", "teclado", "tastiera", "teclado", "ratón",
            "mouse", "auriculares", "cuffie", "fone", "impresora", "stampante",
            "impressora", "consola", "console", "wearable", "smartwatch",
            # Términos de dominio
            "tecnología", "tecnologia", "technology", "tech", "informática",
            "informatica", "computación", "computador", "computer", "ordenador",
            "batería", "bateria", "battery", "batteria", "pantalla", "schermo",
            "tela", "display", "memoria", "almacenamiento", "armazenamento",
            "gaming", "videojuego", "videogioco", "benchmark", "overclock",
        }

        # Se compila una sola vez: este patrón corre contra cada artículo de
        # cada feed en cada ciclo. `\b` es Unicode-aware en Python 3, así que
        # respeta acentos ("portátil", "tecnología").
        self._tech_pattern = re.compile(
            r"\b(?:" + "|".join(re.escape(k) for k in sorted(self._tech_keywords)) + r")\b",
            re.IGNORECASE,
        )

    # ── Public ───────────────────────────────────────────────────────────────

    def scan_and_report(self):
        self.orchestrator.log_action("NewsRadar", f"Iniciando escaneo de {len(self.rss_feeds)} feeds RSS...")
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
            if not self._tech_pattern.search(combined):
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
        # `post_json_detail` autentica, verifica el status, loguea el modo de
        # fallo y devuelve el cuerpo con el conteo REAL de lo persistido.
        # Antes esto informaba el status code dentro de un mensaje [SUCCESS]:
        # un 404 se leía como éxito y las noticias quedaron 51 días congeladas.
        ok, status, cuerpo = post_json_detail(NEWS_PATH, {"news": news_batch})
        if ok:
            # 🔍 El conteo lo dice RAILS, no nosotros. Un 201 significa que
            # aceptó el request; cuántos artículos sobrevivieron a Postgres es
            # otra cosa (una `category` más larga que varchar(50) descarta ese
            # artículo). Repetir `len(news_batch)` sería inventar un éxito.
            guardados = cuerpo.get("saved", len(news_batch))
            descartados = cuerpo.get("discarded", 0)
            if descartados:
                self.orchestrator.log_action(
                    "NewsRadar",
                    f"Rails guardó {guardados}/{len(news_batch)} artículos; "
                    f"descartó {descartados} (ver el detalle en los logs de Rails).",
                    "WARNING",
                )
            else:
                self.orchestrator.log_action(
                    "NewsRadar", f"{guardados} artículos guardados en Rails."
                )
        else:
            self.orchestrator.log_action(
                "NewsRadar",
                f"Rails RECHAZÓ el lote (HTTP {status}). {len(news_batch)} artículos NO guardados.",
                "ERROR",
            )
