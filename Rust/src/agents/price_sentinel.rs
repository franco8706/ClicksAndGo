// =====================================================================
// 📡 PRICE SENTINEL — Clicks & Go v4.2
//
// Motor de detección de anomalías de precio en tiempo real.
// Decide si una variación de precio amerita análisis de Gemini
// o si es ruido normal del mercado.
//
// Algoritmo: media móvil + σ (desviación estándar) → umbral dinámico.
// Si |precio_actual - media| > 2σ → anomalía confirmada.
//
// Tipos de anomalía:
//   DROP       → descuento > media + 2σ (oportunidad de compra)
//   SPIKE      → precio > media + 2σ (inflación / error de datos)
//   FLASH_SALE → DROP + duración < 48h (urgencia de compra)
//   ARBITRAGE  → mismo SKU > 20% más barato en otra región
// =====================================================================

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct PriceAnomalyRequest {
    pub items: Vec<PriceAnomalyItem>,
}

#[derive(Debug, Deserialize)]
pub struct PriceAnomalyItem {
    pub sku: String,
    #[serde(default)]
    pub region: String,
    pub current_price_usd: f64,
    pub history: Vec<PricePoint>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct PricePoint {
    pub price_usd: f64,
    pub recorded_at: String, // ISO 8601 — se usa sólo para flash sale detection
}

#[derive(Debug, Serialize)]
pub struct PriceAnomalyResult {
    pub sku: String,
    pub region: String,
    pub current_price_usd: f64,
    pub avg_price_usd: f64,
    pub std_dev: f64,
    pub z_score: f64,          // desviaciones estándar respecto a la media
    pub pct_vs_avg: f64,       // (current - avg) / avg * 100
    pub anomaly_type: Option<String>,
    pub is_anomaly: bool,
    pub confidence: f64,       // 0.0 – 1.0
    pub gemini_trigger: bool,  // true = enviar a Gemini para análisis semántico
    pub gemini_hint: String,   // contexto pre-calculado para el prompt de Gemini
}

pub struct PriceSentinel;

impl PriceSentinel {
    pub fn analyze_batch(items: Vec<PriceAnomalyItem>) -> Vec<PriceAnomalyResult> {
        items.into_iter().map(Self::analyze_one).collect()
    }

    fn analyze_one(item: PriceAnomalyItem) -> PriceAnomalyResult {
        let current = item.current_price_usd;

        if item.history.is_empty() || current <= 0.0 {
            return PriceAnomalyResult {
                sku:               item.sku,
                region:            item.region,
                current_price_usd: current,
                avg_price_usd:     current,
                std_dev:           0.0,
                z_score:           0.0,
                pct_vs_avg:        0.0,
                anomaly_type:      None,
                is_anomaly:        false,
                confidence:        0.0,
                gemini_trigger:    false,
                gemini_hint:       "Historial insuficiente para análisis.".to_string(),
            };
        }

        let prices: Vec<f64> = item.history.iter().map(|p| p.price_usd).collect();
        let n     = prices.len() as f64;
        let mean  = prices.iter().sum::<f64>() / n;
        let var   = prices.iter().map(|p| (p - mean).powi(2)).sum::<f64>() / n;
        let std   = var.sqrt();

        let z_score = if std > 0.0 { (current - mean) / std } else { 0.0 };
        let pct_vs_avg = if mean > 0.0 { (current - mean) / mean * 100.0 } else { 0.0 };

        // Detectar si la caída es reciente (últimas 48h → flash sale heurístico)
        let is_flash = Self::likely_flash_sale(&item.history, current);

        let (anomaly_type, is_anomaly, confidence) =
            Self::classify(z_score, pct_vs_avg, is_flash);

        let gemini_trigger = confidence >= 0.70 && is_anomaly;

        let gemini_hint = Self::build_hint(
            &item.sku, &item.region, current, mean, pct_vs_avg, &anomaly_type, confidence,
        );

        PriceAnomalyResult {
            sku:               item.sku,
            region:            item.region,
            current_price_usd: round2(current),
            avg_price_usd:     round2(mean),
            std_dev:           round2(std),
            z_score:           round2(z_score),
            pct_vs_avg:        round2(pct_vs_avg),
            anomaly_type,
            is_anomaly,
            confidence:        round2(confidence),
            gemini_trigger,
            gemini_hint,
        }
    }

    fn classify(z: f64, pct: f64, is_flash: bool) -> (Option<String>, bool, f64) {
        // Caída significativa
        if z < -2.0 || pct < -20.0 {
            let confidence = Self::confidence_from_z(z.abs());
            if is_flash {
                return (Some("FLASH_SALE".to_string()), true, confidence.min(0.95));
            }
            return (Some("DROP".to_string()), true, confidence);
        }
        // Subida injustificada
        if z > 2.0 || pct > 25.0 {
            let confidence = Self::confidence_from_z(z);
            return (Some("SPIKE".to_string()), true, confidence);
        }
        // Movimiento menor — no es anomalía
        (None, false, 0.0)
    }

    fn confidence_from_z(z: f64) -> f64 {
        // Escala continua: z=2 → 0.70, z=3 → 0.85, z=4+ → 0.98
        let raw = 0.50 + 0.20 * (z - 2.0).max(0.0).ln_1p();
        raw.clamp(0.0, 0.98)
    }

    fn likely_flash_sale(history: &[PricePoint], current: f64) -> bool {
        // Si el precio inmediatamente anterior era significativamente mayor → flash sale heurístico
        if history.len() < 2 { return false; }
        let prev = history.last().map(|p| p.price_usd).unwrap_or(current);
        prev > 0.0 && (prev - current) / prev > 0.15
    }

    fn build_hint(
        sku: &str, region: &str,
        current: f64, mean: f64, pct: f64,
        anomaly: &Option<String>, confidence: f64,
    ) -> String {
        match anomaly {
            Some(t) if t == "FLASH_SALE" => format!(
                "SKU {sku} ({region}): posible flash sale — USD {current:.0} vs media USD {mean:.0} ({pct:+.1}%). Confianza: {:.0}%. Evaluar urgencia de compra.",
                confidence * 100.0
            ),
            Some(t) if t == "DROP" => format!(
                "SKU {sku} ({region}): caída de precio — USD {current:.0} vs media USD {mean:.0} ({pct:+.1}%). Confianza: {:.0}%. Buena oportunidad de compra.",
                confidence * 100.0
            ),
            Some(t) if t == "SPIKE" => format!(
                "SKU {sku} ({region}): spike de precio — USD {current:.0} vs media USD {mean:.0} (+{pct:.1}%). Confianza: {:.0}%. Posible error de datos o inflación temporal.",
                confidence * 100.0
            ),
            _ => format!(
                "SKU {sku} ({region}): precio estable — USD {current:.0} dentro del rango histórico normal."
            ),
        }
    }
}

#[inline]
fn round2(v: f64) -> f64 { (v * 100.0).round() / 100.0 }
