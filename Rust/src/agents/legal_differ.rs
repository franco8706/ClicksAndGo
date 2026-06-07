// =====================================================================
// ⚖️  LEGAL DIFFER — Clicks & Go v4.2
//
// Preprocesador de texto legal para el Legal Compliance Agent de Python.
// Rust pre-computa estadísticas del diff antes de que Gemini las analice:
//
//   - Hash FNV-1a 64-bit de cada versión (sin deps externos)
//   - Longitud delta y % de cambio
//   - Términos clave añadidos / eliminados (tokenización simple)
//   - Risk signals: palabras de alta alerta detectadas por Rust
//   - risk_score (0–100) + gemini_priority (SKIP / NORMAL / URGENT)
//
// Beneficio: Gemini recibe un diff pre-analizado de ~100 tokens en vez
// de los dos textos completos (~6000 tokens). Ahorro: ~98% de tokens.
// =====================================================================

use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Deserialize)]
pub struct LegalDiffRequest {
    pub items: Vec<LegalDiffItem>,
}

#[derive(Debug, Deserialize)]
pub struct LegalDiffItem {
    pub source: String,
    pub network: String,
    pub prev_text: String,
    pub curr_text: String,
}

#[derive(Debug, Serialize)]
pub struct LegalDiffResult {
    pub source: String,
    pub network: String,
    pub prev_hash: String,      // hex FNV-1a 64-bit
    pub curr_hash: String,
    pub changed: bool,
    pub length_delta: i64,
    pub length_pct_change: f64,
    pub added_terms: Vec<String>,
    pub removed_terms: Vec<String>,
    pub risk_signals: Vec<String>,
    pub risk_score: u8,         // 0–100
    pub gemini_priority: String, // "SKIP" | "NORMAL" | "URGENT"
    pub gemini_brief: String,   // Resumen listo para inyectar en prompt de Gemini
}

// Palabras que elevan el risk_score cuando APARECEN en el texto actual
const CRITICAL_TERMS: &[&str] = &[
    "terminate", "termination", "suspend", "suspension",
    "ban", "banned", "banning", "prohibit", "prohibited",
    "legal action", "immediate removal", "account closure",
    "cease and desist", "void this agreement",
];

const HIGH_TERMS: &[&str] = &[
    "commission rate", "commission rates", "revised commission",
    "cookie window", "cookie duration", "attribution window",
    "prohibited content", "prohibited categories",
    "no longer permit", "changes to payment", "payment terms",
    "restricted region", "geographic restriction",
    "new requirement", "mandatory disclosure",
];

const MEDIUM_TERMS: &[&str] = &[
    "updated", "amended", "modification", "revised",
    "effective date", "additional condition", "new policy",
    "privacy update", "data processing",
];

pub struct LegalDiffer;

impl LegalDiffer {
    pub fn diff_batch(items: Vec<LegalDiffItem>) -> Vec<LegalDiffResult> {
        items.into_iter().map(Self::diff_one).collect()
    }

    fn diff_one(item: LegalDiffItem) -> LegalDiffResult {
        let prev_hash = fnv1a_hex(&item.prev_text);
        let curr_hash = fnv1a_hex(&item.curr_text);
        let changed   = prev_hash != curr_hash;

        let prev_len = item.prev_text.len() as i64;
        let curr_len = item.curr_text.len() as i64;
        let delta    = curr_len - prev_len;
        let pct_change = if prev_len > 0 {
            round2(delta as f64 / prev_len as f64 * 100.0)
        } else {
            0.0
        };

        // Tokenización simple: palabras únicas en minúsculas (≥ 4 chars para reducir ruido)
        let prev_tokens = tokenize(&item.prev_text);
        let curr_tokens = tokenize(&item.curr_text);
        let added_terms:   Vec<String> = curr_tokens.difference(&prev_tokens)
            .filter(|t| t.len() >= 5)
            .take(20)
            .cloned()
            .collect();
        let removed_terms: Vec<String> = prev_tokens.difference(&curr_tokens)
            .filter(|t| t.len() >= 5)
            .take(20)
            .cloned()
            .collect();

        // Risk signals: términos clave encontrados en el texto ACTUAL
        let curr_low = item.curr_text.to_ascii_lowercase();
        let mut risk_signals: Vec<String> = Vec::new();
        let mut risk_score: u8 = 0;

        for term in CRITICAL_TERMS {
            if curr_low.contains(term) {
                risk_signals.push(format!("[CRITICAL] \"{}\"", term));
                risk_score = risk_score.saturating_add(25);
            }
        }
        for term in HIGH_TERMS {
            if curr_low.contains(term) {
                risk_signals.push(format!("[HIGH] \"{}\"", term));
                risk_score = risk_score.saturating_add(10);
            }
        }
        for term in MEDIUM_TERMS {
            if curr_low.contains(term) {
                risk_signals.push(format!("[MEDIUM] \"{}\"", term));
                risk_score = risk_score.saturating_add(3);
            }
        }
        risk_score = risk_score.min(100);

        // Penalizar shrink significativo de contenido (≥15% más corto → posible eliminación de cláusulas favorables)
        if pct_change < -15.0 {
            risk_score = risk_score.saturating_add(20).min(100);
            risk_signals.push(format!("[HIGH] Contenido reducido {:.1}%", pct_change));
        }

        let gemini_priority = if !changed {
            "SKIP"
        } else if risk_score >= 60 {
            "URGENT"
        } else if risk_score >= 20 {
            "NORMAL"
        } else {
            "SKIP"
        }
        .to_string();

        let gemini_brief = Self::build_brief(
            &item.source, &item.network,
            changed, delta, pct_change,
            &risk_signals, risk_score, &gemini_priority,
        );

        LegalDiffResult {
            source: item.source,
            network: item.network,
            prev_hash,
            curr_hash,
            changed,
            length_delta: delta,
            length_pct_change: pct_change,
            added_terms,
            removed_terms,
            risk_signals,
            risk_score,
            gemini_priority,
            gemini_brief,
        }
    }

    fn build_brief(
        source: &str, network: &str,
        changed: bool, delta: i64, pct: f64,
        signals: &[String], score: u8, priority: &str,
    ) -> String {
        if !changed {
            return format!("{source} ({network}): Sin cambios. Hash idéntico. Análisis innecesario.");
        }
        let signal_summary = if signals.is_empty() {
            "Sin señales de riesgo crítico.".to_string()
        } else {
            signals.iter().take(5).cloned().collect::<Vec<_>>().join("; ")
        };
        format!(
            "{source} ({network}) — CAMBIO DETECTADO. Delta: {delta:+} chars ({pct:+.1}%). \
             Risk score: {score}/100. Prioridad: {priority}. \
             Señales: {signal_summary}"
        )
    }
}

// ── FNV-1a 64-bit hash — sin dependencias externas ───────────────────────────
fn fnv1a_hex(text: &str) -> String {
    const OFFSET: u64 = 14695981039346656037;
    const PRIME:  u64 = 1099511628211;
    let mut hash = OFFSET;
    for byte in text.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(PRIME);
    }
    format!("{:016x}", hash)
}

fn tokenize(text: &str) -> HashSet<String> {
    text.to_ascii_lowercase()
        .split(|c: char| !c.is_alphabetic())
        .filter(|w| w.len() >= 4)
        .map(String::from)
        .collect()
}

#[inline]
fn round2(v: f64) -> f64 { (v * 100.0).round() / 100.0 }
