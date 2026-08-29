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
use std::net::IpAddr;
use std::time::{Duration, Instant};

// =====================================================================
// 🛡️ GUARDA ANTI-SSRF
//
// Este servicio corre en Cloud Run con `ingress: all` y `allUsers`, o sea
// PÚBLICO y sin autenticación. `/api/v1/links/validate` toma URLs del cuerpo
// del request y las visita siguiendo redirects. Sin este filtro, cualquiera
// en internet podía usarlo como proxy hacia la red interna de GCP — en
// particular el metadata server (169.254.169.254), que entrega tokens OAuth
// de la service account del contenedor. Eso es escalada de un endpoint de
// "validar links" a robo de credenciales de la nube.
//
// El chequeo resuelve el host a IP y rechaza todo lo que no sea una IP
// pública ruteable. Se aplica a la URL inicial Y a cada salto de redirect:
// el bypass clásico es un host público que responde 302 hacia una IP interna.
// =====================================================================

/// `true` solo si el destino es seguro de visitar: esquema http(s), y TODAS
/// las IPs a las que resuelve el host son públicas. Ante cualquier duda
/// (parseo fallido, DNS que no resuelve, una sola IP interna) devuelve `false`
/// — se prefiere marcar un link como no verificable a filtrar la red interna.
async fn is_public_destination(raw_url: &str) -> bool {
    let parsed = match reqwest::Url::parse(raw_url) {
        Ok(u) => u,
        Err(_) => return false,
    };
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return false, // file://, gopher://, etc. — nunca
    }
    // Se posee el host como String (no `&str` prestado de `parsed`): el
    // borrow no puede cruzar el `.await` de la resolución DNS sin disparar el
    // borrow-checker (E0597) — fue justo lo que falló el primer build.
    let host: String = match parsed.host_str() {
        Some(h) => h.to_string(),
        None => return false,
    };

    // Si el host YA es una IP literal, se chequea directo (sin DNS).
    if let Ok(ip) = host.parse::<IpAddr>() {
        return is_public_ip(&ip);
    }

    // Host por nombre → resolver y exigir que TODAS las IPs sean públicas.
    // Un dominio del atacante puede resolver a 169.254.169.254; basta una
    // interna para rechazar. El puerto es irrelevante para el chequeo de IP.
    let port = parsed.port_or_known_default().unwrap_or(80);
    let addrs = match tokio::net::lookup_host((host.as_str(), port)).await {
        Ok(a) => a,
        Err(_) => return false, // DNS que no resuelve → no verificable
    };

    let mut alguna = false;
    for addr in addrs {
        alguna = true;
        if !is_public_ip(&addr.ip()) {
            return false;
        }
    }
    alguna // sin resultados de DNS → no verificable → false
}

/// Rechaza loopback, privadas (RFC1918), link-local (incluye el metadata
/// server 169.254.169.254), no especificadas, y los rangos internos de IPv6.
fn is_public_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            !v4.is_loopback()
                && !v4.is_private()
                && !v4.is_link_local()    // 169.254.0.0/16 — metadata server GCP/AWS
                && !v4.is_unspecified()   // 0.0.0.0
                && !v4.is_broadcast()
                && !v4.is_documentation()
                && v4.octets()[0] != 0
                // 100.64.0.0/10 (CGNAT) y 192.0.0.0/24 no tienen helper estable:
                && !(v4.octets()[0] == 100 && (64..=127).contains(&v4.octets()[1]))
        }
        IpAddr::V6(v6) => {
            // ⚠️ `is_unique_local` y `is_unicast_link_local` recién se
            // estabilizaron en Rust 1.84; el Dockerfile usa `rust:slim-bookworm`
            // sin pin de versión, así que no se puede depender de ellos sin
            // arriesgar que NO compile el build de Cloud Build. Se chequean los
            // segmentos por bits, que es estable desde 1.0 y hace lo mismo.
            let seg = v6.segments();
            let es_ula = (seg[0] & 0xfe00) == 0xfc00;        // fc00::/7
            let es_link_local = (seg[0] & 0xffc0) == 0xfe80; // fe80::/10
            !v6.is_loopback()
                && !v6.is_unspecified()
                && !es_ula
                && !es_link_local
                // IPv4 mapeada (::ffff:a.b.c.d): re-chequear como IPv4, porque
                // ::ffff:169.254.169.254 alcanza el metadata server igual.
                && v6.to_ipv4_mapped().map_or(true, |m| is_public_ip(&IpAddr::V4(m)))
        }
    }
}

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

    /// Cliente PROPIO con los redirects DESACTIVADOS.
    ///
    /// 🔴 Por qué no se usa el `http_client` compartido del AppState: reqwest
    /// sigue hasta 10 redirects por defecto y ese cliente no fija ninguna
    /// política. Con auto-follow, la cadena la resuelve reqwest por dentro y
    /// el bucle manual de `follow_redirects` nunca ve un 3xx — o sea que la
    /// guarda anti-SSRF alcanzaba a validar SOLO la URL inicial. Un host
    /// público que respondiera 302 hacia 169.254.169.254 la esquivaba entera,
    /// que es justo el bypass que la guarda dice cubrir.
    ///
    /// Se detectó midiendo contra producción: una URL `http://` que debía
    /// redirigir a `https://` devolvía `redirect_count: 0`, prueba de que el
    /// bucle manual no estaba corriendo.
    ///
    /// Con `Policy::none()` cada 3xx vuelve al bucle, que valida el destino
    /// ANTES de cada salto. No se toca el cliente compartido para no alterar
    /// al benchmark_scraper, que sí quiere auto-follow.
    fn client_sin_redirects() -> &'static Client {
        static CLIENTE: std::sync::OnceLock<Client> = std::sync::OnceLock::new();
        CLIENTE.get_or_init(|| {
            Client::builder()
                .user_agent("ClicksAndGo_LinkValidator/4.2")
                .timeout(Duration::from_secs(15))
                .connect_timeout(Duration::from_secs(5))
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .expect("Fallo al construir el cliente del LinkValidator")
        })
    }

    pub async fn validate_batch(
        _client: &Client,
        links: Vec<AffiliateLink>,
    ) -> Vec<LinkCheckResult> {
        // Se ignora el cliente compartido a propósito (ver `client_sin_redirects`).
        let client = Self::client_sin_redirects();
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
            // 🛡️ SSRF: se valida el destino ANTES de cada request — la inicial
            // y cada salto de redirect. Un host público que responde 302 hacia
            // 169.254.169.254 es el bypass clásico; chequear solo la URL de
            // entrada no alcanza.
            if !is_public_destination(&current).await {
                return Ok(RedirectOutcome {
                    final_status: 403, // Forbidden: destino interno/no ruteable
                    final_url: Some(current),
                    redirect_count: count,
                });
            }

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
                        // 🔗 Resolución RFC 3986 contra la URL que emitió ESTE
                        // redirect (`current`), no contra la original.
                        //
                        // Antes: `format!("{}{}", start_url, next)`, con tres
                        // fallas. (1) Usaba `start_url`, así que del segundo
                        // salto en adelante resolvía contra la base equivocada.
                        // (2) Concatenaba en crudo: base `https://x.com/a/b` +
                        // `/c` daba `https://x.com/a/b/c` en vez de
                        // `https://x.com/c`. (3) `starts_with("http")` es falso
                        // para `//cdn.example.com/x` (protocolo-relativa), que
                        // terminaba pegada al final de la base.
                        //
                        // No es cosmético: las redes de afiliados encadenan
                        // redirects (linksynergy → comerciante), y una URL mal
                        // resuelta marca como BROKEN un link que SÍ funciona —
                        // es decir, nos haría desactivar un link que cobra.
                        current = match reqwest::Url::parse(&current)
                            .and_then(|base| base.join(next))
                        {
                            Ok(u) => u.to_string(),
                            // Location ilegible → se corta acá en vez de
                            // seguir a una URL inventada.
                            Err(_) => {
                                return Ok(RedirectOutcome {
                                    final_status: status,
                                    final_url: Some(current),
                                    redirect_count: count,
                                });
                            }
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

#[cfg(test)]
mod ssrf_tests {
    use super::*;

    // ── La guarda depende de que NO haya auto-follow ────────────────────
    //
    // Si el cliente sigue redirects por su cuenta, el bucle manual nunca ve
    // un 3xx y `is_public_destination` solo alcanza a validar la URL inicial:
    // un host público que responda 302 a 169.254.169.254 esquiva la guarda
    // entera. Este test fija que el validador use su propio cliente y que sea
    // distinto del compartido (que sí quiere auto-follow para el scraper).

    #[tokio::test]
    async fn el_cliente_del_validador_no_sigue_redirects_solo() {
        // Se levanta un servidor local que responde 302 hacia otra ruta. Si el
        // cliente siguiera el redirect por su cuenta, veríamos el 200 del
        // destino; con Policy::none() tiene que verse el 302 crudo — que es lo
        // que devuelve el control al bucle manual donde vive la guarda SSRF.
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            for _ in 0..2 {
                if let Ok((mut sock, _)) = listener.accept().await {
                    let mut buf = [0u8; 1024];
                    let _ = sock.read(&mut buf).await;
                    let req = String::from_utf8_lossy(&buf);
                    let resp: &[u8] = if req.starts_with("HEAD /destino") {
                        b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n"
                    } else {
                        b"HTTP/1.1 302 Found\r\nLocation: /destino\r\nContent-Length: 0\r\n\r\n"
                    };
                    let _ = sock.write_all(resp).await;
                }
            }
        });

        let resp = LinkValidator::client_sin_redirects()
            .head(format!("http://{addr}/origen"))
            .send()
            .await
            .expect("el servidor de prueba debe responder");

        assert_eq!(
            resp.status().as_u16(),
            302,
            "el cliente siguió el redirect solo → la guarda SSRF solo vería la URL inicial"
        );
        assert_eq!(
            resp.headers().get("location").and_then(|v| v.to_str().ok()),
            Some("/destino")
        );
    }

    #[test]
    fn rechaza_el_metadata_server_de_gcp() {
        // El objetivo real del ataque: robar el token de la service account.
        assert!(!is_public_ip(&"169.254.169.254".parse().unwrap()));
    }

    #[test]
    fn rechaza_loopback_y_privadas() {
        for ip in ["127.0.0.1", "10.0.0.1", "192.168.1.1", "172.16.0.1", "0.0.0.0"] {
            assert!(!is_public_ip(&ip.parse().unwrap()), "{ip} debería rechazarse");
        }
    }

    #[test]
    fn rechaza_cgnat_y_metadata_ipv6_mapeada() {
        assert!(!is_public_ip(&"100.64.0.1".parse().unwrap()));
        // ::ffff:169.254.169.254 alcanza el metadata server igual que la v4.
        assert!(!is_public_ip(&"::ffff:169.254.169.254".parse().unwrap()));
    }

    #[test]
    fn rechaza_loopback_y_ula_ipv6() {
        assert!(!is_public_ip(&"::1".parse().unwrap()));
        assert!(!is_public_ip(&"fc00::1".parse().unwrap()));
        assert!(!is_public_ip(&"fe80::1".parse().unwrap()));
    }

    #[test]
    fn acepta_ips_publicas() {
        for ip in ["8.8.8.8", "1.1.1.1", "104.18.0.1"] {
            assert!(is_public_ip(&ip.parse().unwrap()), "{ip} debería aceptarse");
        }
    }

    // ── Resolución de redirects relativos (RFC 3986) ────────────────────
    // Fija las tres fallas de la concatenación cruda que había antes. Se
    // prueba `Url::join` directo porque es la operación que reemplazó al
    // `format!` y es donde vivía el bug.

    #[test]
    fn redirect_de_ruta_absoluta_reemplaza_el_path_completo() {
        // Antes: base + "/c" daba "https://x.com/a/b/c". Correcto: "/c".
        let base = reqwest::Url::parse("https://x.com/a/b").unwrap();
        assert_eq!(base.join("/c").unwrap().as_str(), "https://x.com/c");
    }

    #[test]
    fn redirect_protocolo_relativo_conserva_el_esquema() {
        // Antes: "//cdn.example.com/x" no empezaba con "http", así que se
        // pegaba al final de la base. Correcto: hereda el esquema.
        let base = reqwest::Url::parse("https://x.com/a").unwrap();
        assert_eq!(
            base.join("//cdn.example.com/x").unwrap().as_str(),
            "https://cdn.example.com/x"
        );
    }

    #[test]
    fn redirect_relativo_resuelve_contra_el_directorio_actual() {
        let base = reqwest::Url::parse("https://x.com/a/b").unwrap();
        assert_eq!(base.join("c").unwrap().as_str(), "https://x.com/a/c");
    }

    #[test]
    fn redirect_absoluto_gana_sobre_la_base() {
        let base = reqwest::Url::parse("https://x.com/a").unwrap();
        assert_eq!(
            base.join("https://otro.com/z").unwrap().as_str(),
            "https://otro.com/z"
        );
    }

    #[tokio::test]
    async fn rechaza_esquemas_no_http() {
        assert!(!is_public_destination("file:///etc/passwd").await);
        assert!(!is_public_destination("gopher://x").await);
        assert!(!is_public_destination("no-es-una-url").await);
    }

    #[tokio::test]
    async fn rechaza_ip_interna_literal_en_la_url() {
        assert!(!is_public_destination("http://169.254.169.254/computeMetadata/v1/").await);
        assert!(!is_public_destination("http://127.0.0.1:3000/").await);
    }
}
