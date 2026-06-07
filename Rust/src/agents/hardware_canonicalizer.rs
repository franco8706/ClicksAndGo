// =====================================================================
// 🔬 HARDWARE CANONICALIZER — Clicks & Go v4.2
//
// Preprocesador para Gemini: normaliza nombres de CPU/GPU cross-retailer
// y genera un `gemini_context` pre-calculado que reemplaza ~200 tokens
// de análisis de specs crudas por 3 frases estructuradas de alta densidad.
//
// Resultado: Gemini recibe contexto limpio → menos tokens → menor costo
// y mayor precisión semántica en badges, categorías y ai_reasoning.
// =====================================================================

use serde::{Deserialize, Serialize};

// ── Tiers de hardware (mapean directamente a segmento de precio/audiencia) ───
#[derive(Debug, Clone, Serialize, PartialEq, PartialOrd)]
pub enum HardwareTier {
    Unknown,
    Budget,    // Celeron / Pentium / integradas básicas
    Entry,     // i3 / Ryzen 3 / GTX 1650
    Mid,       // i5 / Ryzen 5 / RTX 3050-3060
    High,      // i7 / Ryzen 7 / RTX 4060-4070
    Flagship,  // i9 / Ryzen 9 / RTX 4080 / M2 Pro / M3 Pro
    Elite,     // i9-HX / RTX 4090 / M3 Max / M4 Max
}

impl HardwareTier {
    fn label(&self) -> &'static str {
        match self {
            HardwareTier::Unknown  => "desconocido",
            HardwareTier::Budget   => "entrada económica",
            HardwareTier::Entry    => "entrada",
            HardwareTier::Mid      => "gama media",
            HardwareTier::High     => "alto rendimiento",
            HardwareTier::Flagship => "flagship",
            HardwareTier::Elite    => "élite / workstation",
        }
    }
    // Bonus aplicado al deal_score base cuando se combina con descuento financiero
    pub fn score_bonus(&self) -> f64 {
        match self {
            HardwareTier::Elite    => 2.5,
            HardwareTier::Flagship => 1.5,
            HardwareTier::High     => 1.0,
            HardwareTier::Mid      => 0.5,
            _                      => 0.0,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct CanonicalResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sku: Option<String>,
    pub canonical_cpu: String,
    pub canonical_gpu: String,
    pub cpu_tier: String,
    pub gpu_tier: String,
    pub combined_tier: String,
    pub category_hint: String,  // gaming | creator | ultrabook | business | budget
    pub gemini_context: String, // Frase lista para inyectar en el prompt de Gemini
}

#[derive(Debug, Deserialize)]
pub struct CanonicalizeRequest {
    pub items: Vec<CanonicalizeItem>,
}

#[derive(Debug, Deserialize)]
pub struct CanonicalizeItem {
    #[serde(default)]
    pub sku: Option<String>,
    pub cpu: String,
    pub gpu: String,
    #[serde(default)]
    pub ram_gb: i32,
    #[serde(default)]
    pub current_price_usd: f64,
    #[serde(default)]
    pub discount_pct: i32,
}

pub struct HardwareCanonicalizer;

impl HardwareCanonicalizer {
    pub fn canonicalize_batch(items: Vec<CanonicalizeItem>) -> Vec<CanonicalResult> {
        items.into_iter().map(Self::canonicalize_one).collect()
    }

    fn canonicalize_one(item: CanonicalizeItem) -> CanonicalResult {
        let canonical_cpu = Self::normalize_cpu(&item.cpu);
        let canonical_gpu = Self::normalize_gpu(&item.gpu);
        let cpu_tier      = Self::cpu_tier(&item.cpu);
        let gpu_tier      = Self::gpu_tier(&item.gpu);
        let combined_tier = Self::combined_tier(&cpu_tier, &gpu_tier);
        let category_hint = Self::infer_category(&item.gpu, &item.cpu, item.ram_gb);

        let gemini_context = Self::build_gemini_context(
            &canonical_cpu, &canonical_gpu,
            &cpu_tier, &gpu_tier, &combined_tier,
            &category_hint,
            item.ram_gb, item.current_price_usd, item.discount_pct,
        );

        CanonicalResult {
            sku: item.sku,
            canonical_cpu,
            canonical_gpu,
            cpu_tier:      combined_tier_str(&cpu_tier),
            gpu_tier:      combined_tier_str(&gpu_tier),
            combined_tier: combined_tier_str(&combined_tier),
            category_hint,
            gemini_context,
        }
    }

    // ── Normalización de CPU ───────────────────────────────────────────────

    pub fn normalize_cpu(raw: &str) -> String {
        let s = raw.trim();

        // Apple Silicon
        if let Some(m) = extract_apple_chip(s) { return m; }

        // AMD Ryzen
        if let Some(m) = extract_ryzen(s) { return m; }

        // Intel Core
        if let Some(m) = extract_intel_core(s) { return m; }

        // Qualcomm Snapdragon X
        if s.to_ascii_lowercase().contains("snapdragon") {
            return format!("Qualcomm {}", clean_parens(s));
        }

        // Fallback: limpiar paréntesis y frecuencias
        clean_parens(s).to_string()
    }

    // ── Normalización de GPU ───────────────────────────────────────────────

    pub fn normalize_gpu(raw: &str) -> String {
        let s   = raw.trim();
        let low = s.to_ascii_lowercase();

        // Apple GPU integrada
        if low.contains("apple") && (low.contains("-core gpu") || low.contains("core gpu")) {
            return clean_parens(s).to_string();
        }

        // NVIDIA RTX / GTX
        for tier_key in &["rtx 5", "rtx 4090", "rtx 4080", "rtx 4070", "rtx 4060",
                          "rtx 4050", "rtx 3080", "rtx 3070", "rtx 3060", "rtx 3050",
                          "gtx 1650", "gtx 1660", "rtx 2060", "rtx 2070", "rtx 2080"] {
            if low.contains(tier_key) {
                let model = extract_rtx_model(&low, tier_key);
                return format!("NVIDIA {}", model);
            }
        }

        // AMD Radeon RX
        for rx in &["rx 7900", "rx 7800", "rx 7700", "rx 7600",
                    "rx 6800", "rx 6700", "rx 6600", "rx 6500",
                    "radeon rx"] {
            if low.contains(rx) {
                return format!("AMD {}", clean_parens(s));
            }
        }

        // Intel Arc
        if low.contains("arc a") {
            return format!("Intel {}", clean_parens(s));
        }

        // Integradas conocidas
        if low.contains("iris xe")     { return "Intel Iris Xe Graphics".to_string(); }
        if low.contains("iris plus")   { return "Intel Iris Plus Graphics".to_string(); }
        if low.contains("uhd")         { return "Intel UHD Graphics".to_string(); }
        if low.contains("radeon 610")  { return "AMD Radeon 610M".to_string(); }
        if low.contains("radeon 680")  { return "AMD Radeon 680M".to_string(); }
        if low.contains("radeon 890")  { return "AMD Radeon 890M".to_string(); }
        if low.contains("radeon") && !low.contains("rx") {
            return "AMD Radeon Graphics (integrada)".to_string();
        }

        clean_parens(s).to_string()
    }

    // ── Tiers ─────────────────────────────────────────────────────────────

    pub fn cpu_tier(raw: &str) -> HardwareTier {
        let low = raw.to_ascii_lowercase();

        // Elite: desktop-class mobile chips
        if low.contains("i9") && (low.contains("hx") || low.contains("13980") || low.contains("14900")) {
            return HardwareTier::Elite;
        }
        if low.contains("m3 max") || low.contains("m4 max") || low.contains("m4 ultra") {
            return HardwareTier::Elite;
        }

        // Flagship
        if low.contains("i9") || low.contains("ryzen 9") || low.contains("m3 pro")
            || low.contains("m2 max") || low.contains("m2 pro") || low.contains("snapdragon x elite") {
            return HardwareTier::Flagship;
        }

        // High
        if low.contains("i7") || low.contains("ryzen 7") || low.contains("m3")
            || low.contains("m2") || low.contains("snapdragon x plus") {
            return HardwareTier::High;
        }

        // Mid
        if low.contains("i5") || low.contains("ryzen 5") || low.contains("m1") {
            return HardwareTier::Mid;
        }

        // Entry
        if low.contains("i3") || low.contains("ryzen 3") || low.contains("ryzen 5 5500u") {
            return HardwareTier::Entry;
        }

        // Budget
        if low.contains("celeron") || low.contains("pentium") || low.contains("athlon") {
            return HardwareTier::Budget;
        }

        HardwareTier::Unknown
    }

    pub fn gpu_tier(raw: &str) -> HardwareTier {
        let low = raw.to_ascii_lowercase();

        // Elite
        if low.contains("rtx 4090") || low.contains("rtx 5090") || low.contains("rx 7900")
            || (low.contains("apple") && (low.contains("38-core") || low.contains("40-core"))) {
            return HardwareTier::Elite;
        }

        // Flagship
        if low.contains("rtx 4080") || low.contains("rtx 3080") || low.contains("rx 7800")
            || (low.contains("apple") && low.contains("-core gpu")) {
            return HardwareTier::Flagship;
        }

        // High
        if low.contains("rtx 4070") || low.contains("rtx 3070") || low.contains("rx 7700")
            || low.contains("rx 6800") {
            return HardwareTier::High;
        }

        // Mid
        if low.contains("rtx 4060") || low.contains("rtx 3060") || low.contains("rtx 4050")
            || low.contains("rx 7600") || low.contains("rx 6700") || low.contains("arc a") {
            return HardwareTier::Mid;
        }

        // Entry
        if low.contains("rtx 3050") || low.contains("gtx 1660") || low.contains("rx 6600")
            || low.contains("rx 6500") {
            return HardwareTier::Entry;
        }

        // Budget (integradas)
        if low.contains("iris") || low.contains("uhd") || low.contains("radeon")
            || low.contains("gtx 1650") {
            return HardwareTier::Budget;
        }

        HardwareTier::Unknown
    }

    fn combined_tier(cpu: &HardwareTier, gpu: &HardwareTier) -> HardwareTier {
        // El tier combinado es el mayor de los dos (el componente más fuerte manda)
        if cpu >= gpu { cpu.clone() } else { gpu.clone() }
    }

    fn infer_category(gpu: &str, cpu: &str, ram: i32) -> String {
        let g = gpu.to_ascii_lowercase();
        let c = cpu.to_ascii_lowercase();

        if g.contains("rtx") || g.contains("rx 7") || g.contains("rx 6") {
            return "gaming".to_string();
        }
        if (c.contains("m3 max") || c.contains("m4") || c.contains("m2 max") || c.contains("i9"))
            && ram >= 32 {
            return "creator".to_string();
        }
        if g.contains("iris") || g.contains("uhd") || g.contains("radeon 6") {
            if ram >= 16 {
                return "ultrabook".to_string();
            }
            if c.contains("i7") || c.contains("ryzen 7") {
                return "business".to_string();
            }
        }
        if ram <= 8 {
            return "budget".to_string();
        }
        "business".to_string()
    }

    // ── Generador de contexto para Gemini ─────────────────────────────────

    fn build_gemini_context(
        cpu: &str, gpu: &str,
        cpu_tier: &HardwareTier, gpu_tier: &HardwareTier, combined: &HardwareTier,
        category: &str,
        ram_gb: i32, price_usd: f64, discount: i32,
    ) -> String {
        let tier_desc = combined.label();

        let ram_desc = match ram_gb {
            r if r >= 64 => format!("{}GB RAM (clase workstation)", r),
            r if r >= 32 => format!("{}GB RAM (multitarea pesada y VMs)", r),
            r if r >= 16 => format!("{}GB RAM (multitarea fluida)", r),
            r if r >= 8  => format!("{}GB RAM (uso cotidiano)", r),
            r            => format!("{}GB RAM (limitado)", r),
        };

        let financial_desc = if price_usd > 0.0 && discount > 0 {
            format!(
                "USD {:.0} con {}% de descuento sobre MSRP",
                price_usd, discount
            )
        } else if price_usd > 0.0 {
            format!("USD {:.0}", price_usd)
        } else {
            "precio no disponible".to_string()
        };

        let performance_signal = match combined {
            HardwareTier::Elite    => "Capacidad equivalente a workstation de escritorio. Óptimo para render 3D, edición 8K y gaming 4K.",
            HardwareTier::Flagship => "Rendimiento flagship: gaming 1440p, edición 4K y desarrollo pesado sin compromisos.",
            HardwareTier::High     => "Alto rendimiento: gaming 1080p fluido, desarrollo de software y edición de video.",
            HardwareTier::Mid      => "Rendimiento equilibrado para multitarea, gaming casual y trabajo profesional.",
            HardwareTier::Entry    => "Rendimiento de entrada: ofimática, streaming y tareas livianas.",
            HardwareTier::Budget   => "Rendimiento básico para navegación, documentos y videollamadas.",
            HardwareTier::Unknown  => "Rendimiento por determinar según benchmarks.",
        };

        format!(
            "[{tier_desc}] Laptop {category}: {cpu} (CPU {cpu_tier}), {gpu} (GPU {gpu_tier}), {ram_desc}. {financial_desc}. {performance_signal}",
            tier_desc    = tier_desc,
            category     = category,
            cpu          = cpu,
            cpu_tier     = cpu_tier.label(),
            gpu          = gpu,
            gpu_tier     = gpu_tier.label(),
            ram_desc     = ram_desc,
            financial_desc = financial_desc,
        )
    }
}

// ── Helpers privados ──────────────────────────────────────────────────────────

fn combined_tier_str(t: &HardwareTier) -> String {
    // Lookup directo — evita format!+to_ascii_lowercase (2 heap allocs)
    match t {
        HardwareTier::Unknown  => "unknown",
        HardwareTier::Budget   => "budget",
        HardwareTier::Entry    => "entry",
        HardwareTier::Mid      => "mid",
        HardwareTier::High     => "high",
        HardwareTier::Flagship => "flagship",
        HardwareTier::Elite    => "elite",
    }
    .to_string()
}

fn clean_parens(s: &str) -> &str {
    // Trunca en el primer paréntesis "(": "Core i9-13900H (2.6GHz)" → "Core i9-13900H"
    s.split('(').next().unwrap_or(s).trim()
}

fn extract_apple_chip(s: &str) -> Option<String> {
    let low = s.to_ascii_lowercase();
    for model in &[
        "M4 Ultra", "M4 Max", "M4 Pro", "M4",
        "M3 Ultra", "M3 Max", "M3 Pro", "M3",
        "M2 Ultra", "M2 Max", "M2 Pro", "M2",
        "M1 Ultra", "M1 Max", "M1 Pro", "M1",
    ] {
        if low.contains(&model.to_ascii_lowercase()) {
            return Some(format!("Apple {}", model));
        }
    }
    None
}

fn extract_ryzen(s: &str) -> Option<String> {
    let low = s.to_ascii_lowercase();
    if !low.contains("ryzen") && !low.contains("threadripper") { return None; }
    // Extraer "Ryzen 9 7940HS", "Ryzen 5 7530U", etc.
    let cleaned = clean_parens(s);
    // Normalizar "AMD Ryzen" vs "Ryzen" vs "RYZEN"
    if low.contains("amd") {
        Some(format!("AMD {}", normalize_ryzen_str(cleaned)))
    } else {
        Some(format!("AMD {}", normalize_ryzen_str(cleaned)))
    }
}

fn normalize_ryzen_str(s: &str) -> String {
    let low = s.to_ascii_lowercase();
    let without_amd = if low.starts_with("amd ") { &s[4..] } else { s };
    // Capitalizar correctamente "ryzen" → "Ryzen"
    if without_amd.to_ascii_lowercase().starts_with("ryzen") {
        format!("Ryzen{}", &without_amd[5..])
    } else {
        without_amd.to_string()
    }
}

fn extract_intel_core(s: &str) -> Option<String> {
    let low = s.to_ascii_lowercase();
    if !low.contains("intel") && !low.contains("core i") && !low.contains("xeon") { return None; }
    let cleaned = clean_parens(s);
    let without_intel = if cleaned.to_ascii_lowercase().starts_with("intel ") {
        &cleaned[6..]
    } else {
        cleaned
    };
    // Normalizar "Core i9-14900HX" vs "core i9 14900HX"
    let normalized = without_intel
        .replace("core i", "Core i")
        .replace("Core i9 ", "Core i9-")
        .replace("Core i7 ", "Core i7-")
        .replace("Core i5 ", "Core i5-")
        .replace("Core i3 ", "Core i3-");
    Some(format!("Intel {}", normalized.trim()))
}

fn extract_rtx_model(low: &str, tier: &str) -> String {
    // Extraer el modelo con VRAM: "rtx 4080 12gb" → "RTX 4080 12GB"
    if let Some(pos) = low.find(tier) {
        let fragment = &low[pos..];
        // Tomar hasta el primer no-alfanumérico después del número de VRAM
        let tokens: Vec<&str> = fragment.split_whitespace().collect();
        let model_tokens: Vec<String> = tokens.iter()
            .take(3) // "rtx", "4080", "12gb"
            .map(|t| {
                // Capitalizar RTX, uppercase VRAM
                if t.starts_with("rtx") || t.starts_with("gtx") {
                    t.to_ascii_uppercase()
                } else if t.ends_with("gb") {
                    t.to_ascii_uppercase()
                } else {
                    t.to_string()
                }
            })
            .collect();
        return model_tokens.join(" ");
    }
    tier.to_ascii_uppercase()
}
