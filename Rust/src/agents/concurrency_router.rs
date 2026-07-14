use crate::agents::hardware_scorer::{HardwareScorerAgent, type_spec_bonus};
use crate::models::{HardwareSpecs, ScoreResult, MAX_BATCH_SIZE};
use rayon::prelude::*;
use tokio::task;

pub struct ConcurrencyRouter;

impl ConcurrencyRouter {
    /// Procesa un lote de specs en paralelo usando todos los núcleos (Rayon).
    /// Toma ownership del Vec — sin .to_vec() cuando el batch ya está en límite.
    pub async fn process_batch(mut specs_batch: Vec<HardwareSpecs>) -> Vec<ScoreResult> {
        // Truncar silenciosamente solo si el batch excede el límite
        if specs_batch.len() > MAX_BATCH_SIZE {
            eprintln!(
                "[ConcurrencyRouter] Batch truncado: {} → {} ítems",
                specs_batch.len(),
                MAX_BATCH_SIZE
            );
            specs_batch.truncate(MAX_BATCH_SIZE);
        }

        // spawn_blocking → Rayon en pool separado del event loop de Tokio
        match task::spawn_blocking(move || {
            specs_batch
                .into_par_iter()
                .map(score_one)
                .collect::<Vec<_>>()
        })
        .await
        {
            Ok(results) => results,
            Err(e) => {
                eprintln!("[ConcurrencyRouter] spawn_blocking panic: {e:?}");
                vec![]
            }
        }
    }
}

/// Calcula el score completo de un ítem — función pura, sin side-effects.
/// Inline hint para que Rayon pueda vectorizar el hot loop.
#[inline]
fn score_one(specs: HardwareSpecs) -> ScoreResult {
    // La matemática financiera es universal (aplica a cualquier producto).
    let (discount_pct, usd_reference_price, savings) =
        HardwareScorerAgent::compute_financial_math(
            specs.current_price,
            specs.original_price,
            specs.exchange_rate,
            &specs.currency,
        );

    // 📦 Multi-producto: laptop/desktop se puntúan por hardware (CPU/GPU/RAM);
    // el resto (impresoras, teclados, mouse, auriculares…) no tiene hardware de
    // cómputo, así que usa el scorer genérico por señales financieras/reputación.
    let type_l = specs.product_type.to_ascii_lowercase();
    let is_hardware_scored = matches!(type_l.as_str(), "laptop" | "desktop" | "");

    let base_score = if is_hardware_scored {
        HardwareScorerAgent::calculate_score(&specs.cpu, specs.ram_gb, &specs.gpu)
    } else {
        // Genérico (descuento + reputación) + bonus por señales de calidad del tipo.
        let generic = HardwareScorerAgent::calculate_generic_score(discount_pct, specs.rating, specs.reviews);
        (generic + type_spec_bonus(&type_l, &specs.specs)).clamp(1.0, 10.0)
    };

    // Bonus por descuento fuerte (> 15%) solo para hardware — el scorer genérico
    // ya incorpora el descuento en su cálculo.
    let final_score = if is_hardware_scored && discount_pct > 15 {
        (base_score + 0.5).clamp(1.0, 10.0)
    } else {
        base_score
    };

    ScoreResult {
        sku:                 specs.sku,
        score:               (final_score * 10.0).round() / 10.0,
        discount_pct,
        usd_reference_price,
        savings,
    }
}
