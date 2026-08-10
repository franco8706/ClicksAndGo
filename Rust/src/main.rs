pub mod agents;
pub mod models;

use axum::{
    extract::{DefaultBodyLimit, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use dotenvy::dotenv;
use mongodb::{options::ClientOptions, Client as MongoClient};
use serde_json::json;
use std::{
    env, error::Error,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tokio::{net::TcpListener, signal};
use tower_http::{
    compression::CompressionLayer,
    cors::{AllowOrigin, CorsLayer},
};

use crate::agents::benchmark_scraper::BenchmarkScraperAgent;
use crate::agents::concurrency_router::ConcurrencyRouter;
use crate::agents::devops::DevopsAgent;
use crate::agents::hardware_scorer::HardwareScorerAgent;
use crate::agents::hardware_canonicalizer::HardwareCanonicalizer;
use crate::agents::price_sentinel::PriceSentinel;
use crate::agents::legal_differ::LegalDiffer;
use crate::agents::link_validator::LinkValidator;
use crate::models::{
    BatchSpecs, HardwareSpecs, ScoreResult, MAX_BATCH_SIZE,
    CanonicalizeRequest, CanonicalResult,
    PriceAnomalyRequest, PriceAnomalyResult,
    LegalDiffRequest, LegalDiffResult,
    LinkValidationRequest, LinkCheckResult,
};

// ── Estado compartido ─────────────────────────────────────────────────────────
#[derive(Clone)]
struct AppState {
    http_client:   Arc<reqwest::Client>,
    mongo_client:  Arc<MongoClient>,
    health_cache:  Arc<Mutex<HealthCache>>,
}

// Cache de resultado de health check: evita ping a MongoDB en cada request
struct HealthCache {
    mongo_ok: bool,
    expires:  Instant,
}

impl HealthCache {
    fn new() -> Self {
        Self { mongo_ok: false, expires: Instant::now() }
    }
    fn is_fresh(&self) -> bool { Instant::now() < self.expires }
    fn update(&mut self, ok: bool) {
        self.mongo_ok = ok;
        self.expires  = Instant::now() + Duration::from_secs(5); // TTL 5s
    }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async fn health(State(state): State<AppState>) -> Json<serde_json::Value> {
    // Lock sólo para leer el cache — se libera ANTES del .await
    let cached = {
        let c = state.health_cache.lock().unwrap();
        if c.is_fresh() { Some(c.mongo_ok) } else { None }
    };

    let mongo_ok = if let Some(ok) = cached {
        ok // Respuesta desde cache, sin tocar MongoDB
    } else {
        let ok = state
            .mongo_client
            .database("admin")
            .run_command(mongodb::bson::doc! { "ping": 1 })
            .await
            .is_ok();
        // Re-adquirir lock sólo para escribir — tampoco cruza un await
        state.health_cache.lock().unwrap().update(ok);
        ok
    };

    Json(json!({
        "status":  if mongo_ok { "ok" } else { "degraded" },
        "service": "rust_engine",
        "version": "4.3",
        "mongo":   mongo_ok
    }))
}

async fn calculate_deal_score(
    Json(specs): Json<HardwareSpecs>,
) -> Json<ScoreResult> {
    let score = HardwareScorerAgent::calculate_score(&specs.cpu, specs.ram_gb, &specs.gpu);
    let (discount_pct, usd_reference_price, savings) = HardwareScorerAgent::compute_financial_math(
        specs.current_price,
        specs.original_price,
        specs.exchange_rate,
        &specs.currency,
    );
    Json(ScoreResult { sku: specs.sku, score, discount_pct, usd_reference_price, savings })
}

/// Puntúa un lote. **Rechaza** los que exceden el tope en vez de recortarlos.
///
/// ⚠️ Antes devolvía `200 OK` con los primeros `MAX_BATCH_SIZE` ítems y
/// descartaba el resto en silencio (solo un `eprintln!` que nadie lee). Medido
/// el 2026-08-10: enviando 1.000 y 5.000 ítems la respuesta era `200` con
/// **500** resultados en ambos casos. El orquestador manda el catálogo entero
/// en un solo lote, así que eso significaba miles de productos sin score real
/// y un `deal_score` neutral servido como si fuera calculado.
///
/// Un `413` es ruidoso y accionable; un `200` a medias es indistinguible del
/// éxito. Quien llama debe trocear (ver `score_batch_chunked` en Python).
async fn calculate_batch_scores(
    Json(batch): Json<BatchSpecs>,
) -> Response {
    if batch.items.is_empty() {
        return (StatusCode::OK, Json(Vec::<ScoreResult>::new())).into_response();
    }

    if batch.items.len() > MAX_BATCH_SIZE {
        let recibidos = batch.items.len();
        eprintln!(
            "[score/batch] Rechazado: {} ítems supera el máximo de {}",
            recibidos, MAX_BATCH_SIZE
        );
        return (
            StatusCode::PAYLOAD_TOO_LARGE,
            Json(serde_json::json!({
                "error": "batch_too_large",
                "received": recibidos,
                "max_batch_size": MAX_BATCH_SIZE,
                "hint": "Trocear el lote; la respuesta parcial sería indistinguible del éxito.",
            })),
        )
            .into_response();
    }

    let results = ConcurrencyRouter::process_batch(batch.items).await;
    (StatusCode::OK, Json(results)).into_response()
}

async fn run_benchmarks(
    State(state): State<AppState>,
) -> Json<serde_json::Value> {
    // Reutilizamos el cliente HTTP del AppState — sin TLS handshake ni alloc extra
    let agent = BenchmarkScraperAgent::new(&state.http_client);

    let cpu_count = match env::var("BENCHMARK_CPU_URL") {
        Ok(url) if !url.is_empty() => {
            agent.scrape_category(&url).await.map(|v| v.len()).unwrap_or(0)
        }
        _ => 0,
    };
    let gpu_count = match env::var("BENCHMARK_GPU_URL") {
        Ok(url) if !url.is_empty() => {
            agent.scrape_category(&url).await.map(|v| v.len()).unwrap_or(0)
        }
        _ => 0,
    };

    Json(json!({
        "status":    "ok",
        "cpu_count": cpu_count,
        "gpu_count": gpu_count,
        "source":    if cpu_count + gpu_count > 0 { "scraped" } else { "no_source_configured" }
    }))
}

// ── Nuevos handlers: coprocesador Gemini ──────────────────────────────────────

/// POST /api/v1/hardware/canonicalize
/// Input: lista de items con cpu/gpu/ram crudos de distintos retailers.
/// Output: nombres canónicos + tier + gemini_context listo para inyectar en prompt.
async fn canonicalize_hardware(
    Json(req): Json<CanonicalizeRequest>,
) -> (StatusCode, Json<Vec<CanonicalResult>>) {
    let results = tokio::task::spawn_blocking(move || {
        HardwareCanonicalizer::canonicalize_batch(req.items)
    })
    .await
    .unwrap_or_default();
    (StatusCode::OK, Json(results))
}

/// POST /api/v1/price/anomalies
/// Input: historial de precios por SKU.
/// Output: anomalías detectadas + gemini_trigger (bool) + gemini_hint.
async fn detect_price_anomalies(
    Json(req): Json<PriceAnomalyRequest>,
) -> (StatusCode, Json<Vec<PriceAnomalyResult>>) {
    let results = tokio::task::spawn_blocking(move || {
        PriceSentinel::analyze_batch(req.items)
    })
    .await
    .unwrap_or_default();
    (StatusCode::OK, Json(results))
}

/// POST /api/v1/legal/diff
/// Input: pares (prev_text, curr_text) de páginas de ToS.
/// Output: hash, deltas, risk_signals, risk_score, gemini_priority, gemini_brief.
/// Ahorra ~98% de tokens al Legal Agent de Python antes de llamar a Gemini.
async fn compute_legal_diff(
    Json(req): Json<LegalDiffRequest>,
) -> (StatusCode, Json<Vec<LegalDiffResult>>) {
    let results = tokio::task::spawn_blocking(move || {
        LegalDiffer::diff_batch(req.items)
    })
    .await
    .unwrap_or_default();
    (StatusCode::OK, Json(results))
}

/// POST /api/v1/links/validate
/// Input: lista de URLs de afiliados con tag esperado.
/// Output: reachable, http_status, redirect_count, has_affiliate_tag, verdict.
/// Concurrente: Tokio spawns un task por link, timeout 12s por link.
async fn validate_affiliate_links(
    State(state): State<AppState>,
    Json(req): Json<LinkValidationRequest>,
) -> (StatusCode, Json<Vec<LinkCheckResult>>) {
    let results = LinkValidator::validate_batch(&state.http_client, req.links).await;
    (StatusCode::OK, Json(results))
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    dotenv().ok();

    println!("=== CLICKS & GO — RUST ENGINE v4.1 ===");

    // 1. Pool Rayon — detecta CPUs respetando cgroups del contenedor Cloud Run
    let cpu_count = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(2);
    rayon::ThreadPoolBuilder::new()
        .num_threads(cpu_count * 2) // 2 threads por vCPU para CPU-bound
        .thread_name(|i| format!("rayon-{i}"))
        .build_global()
        .expect("Fallo al inicializar pool Rayon");
    println!("[Rayon] Pool de {} threads listo ({} vCPUs detectadas)", cpu_count * 2, cpu_count);

    // 2. Conexión MongoDB (Arc compartida entre AppState y DevopsAgent)
    let mongo_url = env::var("MONGO_URI")
        .or_else(|_| env::var("MONGODB_URI"))
        .unwrap_or_else(|_| "mongodb://127.0.0.1:27017".to_string());
    let mut mongo_options = ClientOptions::parse(&mongo_url).await?;
    // ⏱️ Timeouts cortos de selección/conexión (2s). Sin esto, el driver usa su
    // default de 30s: el health-check de boot (check_health) y el handler /health
    // se cuelgan 30s si Mongo está caído, y el startupProbe de Cloud Run (~20s)
    // mata el contenedor en crash-loop. La telemetría es best-effort — jamás
    // debe bloquear el arranque del motor matemático. Espeja el Python
    // (serverSelectionTimeoutMS=2000).
    mongo_options.server_selection_timeout = Some(Duration::from_secs(2));
    mongo_options.connect_timeout = Some(Duration::from_secs(2));
    let mongo_client = Arc::new(MongoClient::with_options(mongo_options)?);

    // 3. Cliente HTTP — pool tuneado para Cloud Run (2 vCPUs)
    let http_client = Arc::new(
        reqwest::Client::builder()
            .user_agent("ClicksAndGo_Rust_Engine/4.3")
            .timeout(Duration::from_secs(15))
            .connect_timeout(Duration::from_secs(5))
            .pool_max_idle_per_host(10)   // conexiones keep-alive por host
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Duration::from_secs(60))
            .build()
            .expect("Fallo al construir cliente HTTP"),
    );

    // 4. Telemetría de arranque (fire-and-forget — no bloquea el boot)
    let devops = DevopsAgent::new("RustEngine", Arc::clone(&mongo_client));
    let boot_health = devops.check_health().await;
    if !boot_health.mongo_ok {
        eprintln!("[WARN] MongoDB inalcanzable. Telemetría deshabilitada.");
    }
    devops.write_system_log("Boot", "Motor matemático Rust v4.1 iniciado.");

    // 5. Estado compartido
    let state = AppState {
        http_client,
        mongo_client: Arc::clone(&mongo_client),
        health_cache: Arc::new(Mutex::new(HealthCache::new())),
    };

    // 6. CORS estrictamente interno (no expuesto a internet)
    let internal_origins: Vec<_> = ["http://python_ai:5001", "http://rails_backend:3000"]
        .iter()
        .map(|s| s.parse().expect("origen inválido"))
        .collect();
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(internal_origins))
        .allow_methods([axum::http::Method::POST, axum::http::Method::GET])
        .allow_headers([axum::http::header::CONTENT_TYPE]);

    // 7. Router con límite de payload (1 MB) — protege contra DoS de batches gigantes
    let app = Router::new()
        // ── Scoring matemático (existentes) ──────────────────────────────
        .route("/health",                    get(health))
        .route("/api/v1/score",              post(calculate_deal_score))
        .route("/api/v1/score/batch",        post(calculate_batch_scores))
        .route("/api/v1/benchmarks/run",     post(run_benchmarks))
        // ── Coprocesador Gemini (nuevos v4.2) ─────────────────────────────
        .route("/api/v1/hardware/canonicalize", post(canonicalize_hardware))
        .route("/api/v1/price/anomalies",       post(detect_price_anomalies))
        .route("/api/v1/legal/diff",            post(compute_legal_diff))
        .route("/api/v1/links/validate",        post(validate_affiliate_links))
        .layer(DefaultBodyLimit::max(4_194_304))
        .layer(CompressionLayer::new())   // gzip/deflate automático — reduce payload ~70%
        .layer(cors)
        .with_state(state);

    // 8. Bind y arranque con graceful shutdown
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{port}");
    let listener = TcpListener::bind(&addr).await?;
    println!("[Axum] Escuchando en http://{addr}");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    devops.write_system_log("Shutdown", "Apagado graceful completado.");
    println!("[Main] Motor apagado de forma segura.");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async { signal::ctrl_c().await.expect("manejador Ctrl+C") };

    #[cfg(unix)]
    let sigterm = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("manejador SIGTERM")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let sigterm = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c   => {},
        _ = sigterm  => {},
    }
    println!("[Shutdown] Señal recibida. Finalizando requests en vuelo...");
}
