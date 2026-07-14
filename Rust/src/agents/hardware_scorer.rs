// =====================================================================
// HARDWARE SCORER v4.3 — Motor matemático de bajo nivel
//
// CAMBIOS v4.3:
//   - Intel Core Ultra 5/7/9 (Meteor Lake / Lunar Lake / Arrow Lake)
//   - Apple M4 Pro, M4 Ultra correctamente clasificados
//   - RTX 4050 añadido (faltaba → score 0.0 antes)
//   - Snapdragon X Elite / X Plus reconocidos
//   - RTX 2060/2070/2080 añadidos (laptops reacondicionadas)
//   - Score fijo por doble-conteo: "m2 pro" ya no matchea "m2"
// =====================================================================

pub struct HardwareScorerAgent;

impl HardwareScorerAgent {
    /// Motor de scoring v4.3 — todo en f64 para precisión plena.
    /// El orden de los if-else importa: de más específico a menos.
    #[inline]
    pub fn calculate_score(cpu: &str, ram: i32, gpu: &str) -> f64 {
        let mut score: f64 = 4.0;
        let cpu_l = cpu.to_ascii_lowercase();
        let gpu_l = gpu.to_ascii_lowercase();

        // ── RAM ───────────────────────────────────────────────────────────────
        score += match ram {
            r if r >= 64 =>  2.5,  // workstation / ML training
            r if r >= 32 =>  2.0,
            r if r >= 16 =>  1.0,
            r if r <   8 => -1.5,
            _             =>  0.0,
        };

        // ── CPU (orden: más específico primero para evitar falsos match) ──────
        score += cpu_score(&cpu_l);

        // ── GPU (orden: más específico primero) ───────────────────────────────
        score += gpu_score(&gpu_l);

        round1(score.clamp(1.0, 10.0))
    }

    /// Scoring GENÉRICO para productos sin CPU/GPU (multi-producto):
    /// impresoras, teclados, mouse, auriculares, webcams, monitores, insumos.
    /// Deriva el `deal_score` de señales financieras y de reputación, no de
    /// hardware. Mantiene la misma escala 1.0–10.0 del scorer de laptops.
    ///   - `discount_pct`: 0–100, principal driver de "oportunidad".
    ///   - `rating`: 0.0–5.0 (reseñas del retailer); <=0 => se ignora.
    ///   - `reviews`: nº de reseñas; da un pequeño bonus de confianza.
    #[inline]
    pub fn calculate_generic_score(discount_pct: i32, rating: f64, reviews: i64) -> f64 {
        let mut score: f64 = 5.0;

        // Descuento: hasta +3.0 (un 40%+ de descuento es una gran oferta).
        let d = discount_pct.clamp(0, 100) as f64;
        score += (d / 40.0 * 3.0).min(3.0);

        // Reputación: rating 0–5 aporta hasta +1.5 (centrado en 3.0★).
        if rating > 0.0 {
            score += ((rating.clamp(0.0, 5.0) - 3.0) / 2.0 * 1.5).clamp(-1.5, 1.5);
        }

        // Confianza por volumen de reseñas: hasta +0.5.
        if reviews > 0 {
            score += ((reviews as f64).log10() / 4.0 * 0.5).min(0.5);
        }

        round1(score.clamp(1.0, 10.0))
    }

    /// Matemática financiera de bajo nivel.
    /// f64 obligatorio: precios ARS/CLP tienen 6-7 dígitos significativos.
    #[inline]
    pub fn compute_financial_math(
        current_price: f64,
        original_price: f64,
        exchange_rate: f64,
        currency: &str,
    ) -> (i32, f64, f64) {
        let discount_pct = if original_price > current_price && original_price > 0.0 {
            ((original_price - current_price) / original_price * 100.0).round() as i32
        } else {
            0
        };

        let usd_reference_price = if currency != "USD" && exchange_rate > 0.0 {
            round2(current_price / exchange_rate)
        } else {
            round2(current_price)
        };

        let savings = if original_price > current_price {
            round2(original_price - current_price)
        } else {
            0.0
        };

        (discount_pct, usd_reference_price, savings)
    }
}

// ── CPU scoring — extraído a función para reutilización en canonicalizer ──────
#[inline]
pub fn cpu_score(cpu_l: &str) -> f64 {
    // ── Elite: desktop-class mobile, máxima potencia ──────────────────────────
    if cpu_l.contains("i9") && (cpu_l.contains("hx") || cpu_l.contains("13980") || cpu_l.contains("14900"))
        || cpu_l.contains("m4 ultra") || cpu_l.contains("m3 ultra")
        || cpu_l.contains("core ultra 9") || cpu_l.contains("ultra 9 185")
        || cpu_l.contains("ultra 9 288")
    {
        return 2.5;
    }

    // ── Flagship ──────────────────────────────────────────────────────────────
    if cpu_l.contains("i9")
        || cpu_l.contains("ryzen 9")
        || cpu_l.contains("m4 max") || cpu_l.contains("m3 max") || cpu_l.contains("m2 max")
        || cpu_l.contains("core ultra 7") || cpu_l.contains("ultra 7 165") || cpu_l.contains("ultra 7 258")
        || cpu_l.contains("snapdragon x elite")
    {
        return 2.0;
    }

    // ── High ──────────────────────────────────────────────────────────────────
    if cpu_l.contains("i7")
        || cpu_l.contains("ryzen 7")
        || cpu_l.contains("m4 pro") || cpu_l.contains("m3 pro") || cpu_l.contains("m2 pro")
        || cpu_l.contains("m4")      // M4 base
        || cpu_l.contains("core ultra 5") || cpu_l.contains("ultra 5 125") || cpu_l.contains("ultra 5 226")
        || cpu_l.contains("snapdragon x plus")
    {
        return 1.5;
    }

    // ── Mid ───────────────────────────────────────────────────────────────────
    if cpu_l.contains("i5")
        || cpu_l.contains("ryzen 5")
        || cpu_l.contains("m3") || cpu_l.contains("m2") || cpu_l.contains("m1")
    {
        return 1.0;
    }

    // ── Entry ─────────────────────────────────────────────────────────────────
    if cpu_l.contains("i3") || cpu_l.contains("ryzen 3") {
        return 0.0; // base score sin bonus ni penalización
    }

    // ── Budget ────────────────────────────────────────────────────────────────
    if cpu_l.contains("celeron") || cpu_l.contains("pentium") || cpu_l.contains("athlon") {
        return -1.0;
    }

    0.0
}

// ── GPU scoring — extraído a función para reutilización en canonicalizer ──────
#[inline]
pub fn gpu_score(gpu_l: &str) -> f64 {
    // ── Elite: RTX 4090 / 5090, RX 7900 ──────────────────────────────────────
    if gpu_l.contains("rtx 4090") || gpu_l.contains("rtx 5090") || gpu_l.contains("rx 7900")
        || (gpu_l.contains("apple") && (gpu_l.contains("38-core") || gpu_l.contains("40-core")))
    {
        return 2.5;
    }

    // ── Flagship: RTX 4080, RTX 3080, RX 7800 ────────────────────────────────
    if gpu_l.contains("rtx 4080") || gpu_l.contains("rtx 3080")
        || gpu_l.contains("rx 7800") || gpu_l.contains("rx 6800")
        || (gpu_l.contains("apple") && gpu_l.contains("-core gpu"))
    {
        return 2.0;
    }

    // ── High: RTX 4070, RTX 3070, RX 7700 ────────────────────────────────────
    if gpu_l.contains("rtx 4070") || gpu_l.contains("rtx 3070")
        || gpu_l.contains("rx 7700") || gpu_l.contains("rtx 2080") || gpu_l.contains("rtx 2070")
    {
        return 1.5;
    }

    // ── Mid: RTX 4060, RTX 3060, RX 7600 ─────────────────────────────────────
    if gpu_l.contains("rtx 4060") || gpu_l.contains("rtx 3060")
        || gpu_l.contains("rx 7600") || gpu_l.contains("rx 6700")
        || gpu_l.contains("rtx 2060") || gpu_l.contains("arc a") // Intel Arc A770/A730
    {
        return 1.0;
    }

    // ── Entry: RTX 4050, RTX 3050, GTX 1660, RX 6600 ─────────────────────────
    if gpu_l.contains("rtx 4050") || gpu_l.contains("rtx 3050")
        || gpu_l.contains("gtx 1660") || gpu_l.contains("rx 6600") || gpu_l.contains("rx 6500")
    {
        return 0.5;
    }

    // ── Budget: GTX 1650, integradas ──────────────────────────────────────────
    // Las integradas no suman ni restan — ya están penalizadas en el score base
    0.0
}

#[inline(always)]
pub fn round1(v: f64) -> f64 { (v * 10.0).round() / 10.0 }

#[inline(always)]
pub fn round2(v: f64) -> f64 { (v * 100.0).round() / 100.0 }

// ── Scoring por tipo (multi-producto) ─────────────────────────────────────────
/// Bonus (0.0–1.5) por señales de calidad propias de cada tipo de producto, leídas
/// de las specs del JSONB. El router lo suma al `calculate_generic_score` para
/// productos sin CPU/GPU (monitor, teclado, mouse, auriculares, webcam, impresora,
/// insumos). Laptops/desktops NO lo usan (los puntúa el scorer de hardware).
#[inline]
pub fn type_spec_bonus(product_type: &str, specs: &serde_json::Map<String, serde_json::Value>) -> f64 {
    let num  = |k: &str| specs.get(k).and_then(serde_json::Value::as_f64);
    let flag = |k: &str| specs.get(k).and_then(serde_json::Value::as_bool).unwrap_or(false);
    let text = |k: &str| specs.get(k).and_then(serde_json::Value::as_str).unwrap_or("").to_ascii_lowercase();

    let mut bonus: f64 = 0.0;
    match product_type {
        "monitor" => {
            if let Some(hz) = num("refresh_hz") {
                bonus += if hz >= 240.0 { 0.8 } else if hz >= 144.0 { 0.5 } else if hz >= 120.0 { 0.3 } else { 0.0 };
            }
            let res = text("resolution");
            if res.contains("3840") || res.contains("2160") || res.contains("4k") { bonus += 0.5; }
            else if res.contains("2560") || res.contains("1440") { bonus += 0.3; }
            let panel = text("panel");
            if panel.contains("oled") { bonus += 0.5; } else if panel.contains("ips") { bonus += 0.3; }
        }
        "keyboard" => {
            let sw = text("switch");
            // Mecánico (cualquier switch que no sea membrana/tijera) suma calidad.
            if !sw.is_empty() && !sw.contains("membran") && !sw.contains("scissor") && !sw.contains("tijera") {
                bonus += 0.4;
            }
            if flag("wireless") { bonus += 0.3; }
            if flag("backlit")  { bonus += 0.2; }
        }
        "mouse" => {
            if let Some(dpi) = num("dpi") {
                bonus += if dpi >= 20000.0 { 0.5 } else if dpi >= 8000.0 { 0.3 } else { 0.0 };
            }
            if flag("wireless") { bonus += 0.3; }
        }
        "headphones" => {
            if flag("anc")      { bonus += 0.5; }
            if flag("wireless") { bonus += 0.3; }
        }
        "webcam" => {
            let res = text("resolution");
            if res.contains("4k") || res.contains("2160") { bonus += 0.5; }
            else if res.contains("1080") { bonus += 0.2; }
            if let Some(fps) = num("fps") { if fps >= 60.0 { bonus += 0.3; } }
        }
        "printer" => {
            if flag("wifi")  { bonus += 0.3; }
            if flag("color") { bonus += 0.2; }
            if let Some(ppm) = num("ppm") { if ppm >= 25.0 { bonus += 0.3; } }
        }
        "supplies" => {
            if let Some(y) = num("yield_pages") {
                bonus += if y >= 1000.0 { 0.4 } else if y >= 300.0 { 0.2 } else { 0.0 };
            }
        }
        _ => {}
    }
    bonus.min(1.5)
}
