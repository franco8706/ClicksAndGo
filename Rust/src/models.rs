use serde::{Deserialize, Serialize};

pub const MAX_BATCH_SIZE: usize = 500;

// Re-exports para que main.rs use un único punto de importación
pub use crate::agents::hardware_canonicalizer::{CanonicalizeRequest, CanonicalResult};
pub use crate::agents::price_sentinel::{PriceAnomalyRequest, PriceAnomalyResult};
pub use crate::agents::legal_differ::{LegalDiffRequest, LegalDiffResult};
pub use crate::agents::link_validator::{LinkValidationRequest, LinkCheckResult};

/// Especificaciones y datos financieros crudos entrantes
#[derive(Debug, Deserialize, Clone)]
pub struct HardwareSpecs {
    #[serde(default)]
    pub sku: Option<String>,
    pub cpu: String,
    pub gpu: String,
    pub ram_gb: i32,

    // f64: precisión de 15-17 dígitos, obligatorio para precios LATAM de 6-7 cifras (ARS, CLP)
    #[serde(default)]
    pub current_price: f64,
    #[serde(default)]
    pub original_price: f64,
    #[serde(default)]
    pub exchange_rate: f64,
    #[serde(default = "default_currency")]
    pub currency: String,
}

fn default_currency() -> String {
    "USD".to_string()
}

/// Respuesta completa con score hardware + matemática financiera resuelta en Rust
#[derive(Debug, Serialize)]
pub struct ScoreResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sku: Option<String>,
    pub score: f64,
    pub discount_pct: i32,
    pub usd_reference_price: f64,
    pub savings: f64,
}

#[derive(Debug, Deserialize)]
pub struct BatchSpecs {
    pub items: Vec<HardwareSpecs>,
}
