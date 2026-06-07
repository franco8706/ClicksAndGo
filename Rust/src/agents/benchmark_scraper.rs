use reqwest::Client;
use scraper::{Html, Selector};
use serde::Serialize;
use std::error::Error;
use std::sync::OnceLock;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::time::sleep;

#[derive(Debug, Serialize)]
pub struct BenchmarkResult {
    pub model: String,
    pub score: i32,
}

// Pool de User-Agents reales — rota por microsegundo para evitar fingerprinting
const USER_AGENTS: &[&str] = &[
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

/// Selecciona un User-Agent rotando por microsegundo — sin dependencia de `rand`
fn pick_ua() -> &'static str {
    let idx = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_micros() as usize)
        .unwrap_or(0)
        % USER_AGENTS.len();
    USER_AGENTS[idx]
}

/// Delay variable entre 3 y 7 segundos — imita comportamiento humano, evita WAF
async fn human_delay() {
    let base_ms: u64 = 3_000;
    let jitter_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_millis() as u64 % 4_000)
        .unwrap_or(1_500);
    sleep(Duration::from_millis(base_ms + jitter_ms)).await;
}

// ── Selectores compilados una vez, reutilizados en todos los requests ──────────
static ROW_SEL:   OnceLock<Selector> = OnceLock::new();
static NAME_SEL:  OnceLock<Selector> = OnceLock::new();
static COUNT_SEL: OnceLock<Selector> = OnceLock::new();

fn row_sel()   -> &'static Selector { ROW_SEL.get_or_init(||   Selector::parse("ul.chartlist li").expect("row selector")) }
fn name_sel()  -> &'static Selector { NAME_SEL.get_or_init(||  Selector::parse(".prdname").expect("name selector")) }
fn count_sel() -> &'static Selector { COUNT_SEL.get_or_init(|| Selector::parse(".count").expect("count selector")) }

pub struct BenchmarkScraperAgent<'a> {
    client: &'a Client,
}

impl<'a> BenchmarkScraperAgent<'a> {
    pub fn new(client: &'a Client) -> Self {
        Self { client }
    }

    /// Extrae benchmarks de una URL pública (PassMark CPU/GPU).
    /// I/O async en Tokio event loop + CPU parsing en hilo dedicado (spawn_blocking).
    pub async fn scrape_category(
        &self,
        url: &str,
    ) -> Result<Vec<BenchmarkResult>, Box<dyn Error + Send + Sync>> {
        // Cortesía: delay variable antes de cada request para no saturar el servidor
        human_delay().await;

        let html = self
            .client
            .get(url)
            // Headers que imitan un browser real — reduce probabilidad de bloqueo
            .header("User-Agent",                pick_ua())
            .header("Accept",                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
            .header("Accept-Language",           "en-US,en;q=0.9,es;q=0.8")
            .header("Accept-Encoding",           "gzip, deflate, br")
            .header("Cache-Control",             "no-cache")
            .header("Referer",                   "https://www.google.com/")
            .header("Sec-Fetch-Dest",            "document")
            .header("Sec-Fetch-Mode",            "navigate")
            .header("Sec-Fetch-Site",            "cross-site")
            .header("Upgrade-Insecure-Requests", "1")
            .send()
            .await?
            .text()
            .await?;

        // CPU: delegada a hilo del SO para no bloquear el event loop de Tokio
        let results = tokio::task::spawn_blocking(move || {
            let doc = Html::parse_document(&html);
            doc.select(row_sel())
                .filter_map(|row| {
                    let name  = row.select(name_sel()).next()?.text().collect::<String>();
                    let raw   = row.select(count_sel()).next()?.text().collect::<String>();
                    let score = raw.replace(',', "").trim().parse::<i32>().ok()?;
                    Some(BenchmarkResult { model: name.trim().to_string(), score })
                })
                .collect::<Vec<_>>()
        })
        .await?;

        Ok(results)
    }
}
