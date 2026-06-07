// =====================================================================
// 📦 ECOSISTEMA AGÉNTICO RUST v4.2 — Coprocesador de Vertex AI / Gemini
// =====================================================================

// Telemetría y logs hacia MongoDB
pub mod devops;

// Motor matemático: scoring de hardware
pub mod hardware_scorer;

// Procesamiento masivo paralelo (Rayon work-stealing)
pub mod concurrency_router;

// Scraper de benchmarks PassMark
pub mod benchmark_scraper;

// Normalización cross-retailer de CPU/GPU + generador de contexto para Gemini
pub mod hardware_canonicalizer;

// Detección de anomalías de precio (spike/drop/flash_sale)
pub mod price_sentinel;

// Motor de diff legal: pre-analiza cambios de ToS para el Legal Agent de Python
pub mod legal_differ;

// Validador concurrente de links de afiliados
pub mod link_validator;
