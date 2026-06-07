// =====================================================================
// 🔗 LINK VALIDATOR — Clicks & Go v4.2
//
// Valida links de afiliados de forma concurrente (Tokio async).
// Verifica para cada URL:
//   - Accesibilidad (HTTP 2xx/3xx)
//   - Cadena de redirecciones (máx 5 hops)
//   - Presencia del affiliate tag en la URL final
//   - Tiempo de respuesta (latencia)
//
// El resultado alimenta el Legal Agent y el pipeline de scraping
// para detectar links rotos antes de que lleguen al frontend.
// =====================================================================

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

#[derive(Debug, Deserialize)]
pub struct LinkValidationRequest {
    pub links: Vec<AffiliateLink>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct AffiliateLink {
    #[serde(default)]
    pub sku: Option<String>,
    pub url: String,
    #[serde(default)]
    pub expected_tag: Option<String>,  // e.g. "clicks_lenovo_ar"
    #[serde(default)]
    pub network: Option<String>,       // AWIN | CJ | MERCADOLIBRE | etc.
}

#[derive(Debug, Serialize)]
pub struct LinkCheckResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sku: Option<String>,
    pub url: String,
    pub reachable: bool,
    pub http_status: u16,
    pub latency_ms: u64,
    pub redirect_count: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub final_url: Option<String>,
    pub has_affiliate_tag: bool,
    pub tag_found: Option<String>,
    pub verdict: String,   // "OK" | "BROKEN" | "MISSING_TAG" | "REDIRECT_LOOP" | "TIMEOUT"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

pub struct LinkValidator;

impl LinkValidator {
    /// Valida un lote de links en paralelo con Tokio.
    /// Cada link tiene timeout propio de 12s para no bloquear el batch.
    /// Límite de concurrencia: máx 20 requests simultáneos.
    /// Sin él, 200 links = 200 conexiones TCP abiertas al mismo tiempo.
    const MAX_CONCURRENT: usize = 20;

    pub async fn validate_batch(
        client: &Client,
        links: Vec<AffiliateLink>,
    ) -> Vec<LinkCheckResult> {
        let mut handles = Vec::with_capacity(links.len());
        let semaphore = std::sync::Arc::new(tokio::sync::Semaphore::new(Self::MAX_CONCURRENT));

        for link in links {
            let c   = client.clone();
            let sem = semaphore.clone();
            handles.push(tokio::spawn(async move {
                // Acquire antes de cada request — se libera al salir del scope
                let _permit = sem.acquire_owned().await;
                Self::check_one(&c, link).await
            }));
        }

        let mut results = Vec::with_capacity(handles.len());
        for handle in handles {
            match handle.await {
                Ok(r) => results.push(r),
                Err(e) => {
                    // Panic en la tarea — no propagamos al batch
                    results.push(LinkCheckResult {
                        sku: None, url: String::new(), reachable: false,
                        http_status: 0, latency_ms: 0, redirect_count: 0,
                        final_url: None, has_affiliate_tag: false, tag_found: None,
                        verdict: "BROKEN".to_string(),
                        error: Some(format!("task panic: {e}")),
                    });
                }
            }
        }
        results
    }

    async fn check_one(client: &Client, link: AffiliateLink) -> LinkCheckResult {
        let start  = Instant::now();
        let url    = link.url.clone();
        let tag    = link.expected_tag.clone();

        // Timeout individual por link
        let result = tokio::time::timeout(
            Duration::from_secs(12),
            Self::follow_redirects(client, &url),
        )
        .await;

        let latency_ms = start.elapsed().as_millis() as u64;

        match result {
            Err(_) => LinkCheckResult {
                sku: link.sku, url, reachable: false,
                http_status: 0, latency_ms,
                redirect_count: 0, final_url: None,
                has_affiliate_tag: false, tag_found: None,
                verdict: "TIMEOUT".to_string(),
                error: Some("Timeout after 12s".to_string()),
            },
            Ok(Err(e)) => LinkCheckResult {
                sku: link.sku, url, reachable: false,
                http_status: 0, latency_ms,
                redirect_count: 0, final_url: None,
                has_affiliate_tag: false, tag_found: None,
                verdict: "BROKEN".to_string(),
                error: Some(e.to_string()),
            },
            Ok(Ok(outcome)) => {
                let status = outcome.final_status;
                let reachable = status >= 200 && status < 400;

                let final_url_str = outcome.final_url.clone();
                let (has_tag, tag_found) = if let Some(ref t) = tag {
                    let found = final_url_str.as_deref().unwrap_or(&url).contains(t.as_str());
                    (found, if found { Some(t.clone()) } else { None })
                } else {
                    (true, None) // sin tag esperado → asumimos OK
                };

                let verdict = if !reachable {
                    "BROKEN".to_string()
                } else if !has_tag && tag.is_some() {
                    "MISSING_TAG".to_string()
                } else {
                    "OK".to_string()
                };

                LinkCheckResult {
                    sku: link.sku, url,
                    reachable, http_status: status, latency_ms,
                    redirect_count: outcome.redirect_count,
                    final_url: outcome.final_url,
                    has_affiliate_tag: has_tag, tag_found,
                    verdict, error: None,
                }
            }
        }
    }

    /// Sigue la cadena de redirecciones manualmente (máx 5 hops).
    /// reqwest por defecto sigue redirecciones pero no nos da el conteo;
    /// aquí capturamos cada hop para detectar loops y obtener la URL final.
    async fn follow_redirects(
        client: &Client,
        start_url: &str,
    ) -> Result<RedirectOutcome, reqwest::Error> {
        let mut current = start_url.to_string();
        let mut count: u8 = 0;

        loop {
            // Usamos HEAD para no descargar el body — mínimo ancho de banda
            let resp = client
                .head(&current)
                .header("User-Agent", "ClicksAndGo_LinkValidator/4.2")
                .send()
                .await?;

            let status = resp.status().as_u16();

            // Redirección → seguir manualmente
            if (301..=308).contains(&status) {
                if let Some(loc) = resp.headers().get("location") {
                    if let Ok(next) = loc.to_str() {
                        count += 1;
                        if count >= 5 {
                            // Demasiados hops → posible loop
                            return Ok(RedirectOutcome {
                                final_status: 508, // Loop Detected (RFC)
                                final_url: Some(next.to_string()),
                                redirect_count: count,
                            });
                        }
                        // URL relativa → combinar con la base
                        current = if next.starts_with("http") {
                            next.to_string()
                        } else {
                            format!("{}{}", start_url, next)
                        };
                        continue;
                    }
                }
            }

            // No es redirección (o no hay Location header)
            return Ok(RedirectOutcome {
                final_status: status,
                final_url: if current != start_url { Some(current) } else { None },
                redirect_count: count,
            });
        }
    }
}

struct RedirectOutcome {
    final_status: u16,
    final_url: Option<String>,
    redirect_count: u8,
}
