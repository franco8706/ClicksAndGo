use crate::traits::{RetailerProvider, NormalizadorDePrecios};
use crate::models::Notebook;
use async_trait::async_trait;
use scraper::{Html, Selector};
use std::error::Error;

pub struct LenovoHunter;
pub struct HPHunter;

// --- IMPLEMENTACIÓN DE LA LÓGICA DE NORMALIZACIÓN ---
// Aplicamos el redondeo absoluto para eliminar centavos y ajustamos el umbral.
impl NormalizadorDePrecios for LenovoHunter {
    fn estandarizar_a_usd(&self, precio_extraido: f64, _origen_tienda: &str, tipo_cambio_oficial: f64) -> f64 {
        // Si el precio supera los 5000, es imposible que sea USD (es ARS).
        let precio_normalizado = if precio_extraido > 5000.0 {
            precio_extraido / tipo_cambio_oficial
        } else {
            precio_extraido
        };

        // .round() elimina los centavos devolviendo el entero más cercano como f64.
        precio_normalizado.round()
    }
}

impl NormalizadorDePrecios for HPHunter {
    fn estandarizar_a_usd(&self, precio_extraido: f64, _origen_tienda: &str, tipo_cambio_oficial: f64) -> f64 {
        // HP Argentina siempre publica en ARS. Umbral de seguridad de 5000.
        let precio_normalizado = if precio_extraido > 5000.0 {
            precio_extraido / tipo_cambio_oficial
        } else {
            precio_extraido
        };

        precio_normalizado.round()
    }
}

#[async_trait]
impl RetailerProvider for LenovoHunter {
    fn get_store_name(&self) -> &str { "Lenovo_AR" }

    async fn fetch_offers(&self) -> Result<Vec<Notebook>, Box<dyn Error + Send + Sync>> {
        println!("🌐 [Cazador Lenovo] Iniciando captura...");
        let url = "https://www.lenovo.com/ar/es/laptops/subseries-results";
        let tipo_cambio_actual = 1425.0; 
        
        let client = reqwest::Client::builder().user_agent("Mozilla/5.0").build()?;
        let res = client.get(url).send().await?.text().await?;
        let document = Html::parse_document(&res);
        
        let card_selector = Selector::parse(".product-item").unwrap();
        let title_selector = Selector::parse(".product-item-title").unwrap();
        let price_selector = Selector::parse(".price-main").unwrap();

        let mut items = Vec::new();

        for (i, card) in document.select(&card_selector).enumerate() {
            let modelo = card.select(&title_selector).next()
                .map(|e| e.text().collect::<String>().trim().to_string())
                .unwrap_or_else(|| "Modelo no detectado".to_string());

            let precio_texto = card.select(&price_selector).next()
                .map(|e| e.text().collect::<String>())
                .unwrap_or_else(|| "0".to_string());

            // Limpieza: quitamos puntos de miles y usamos punto para decimales.
            let precio_crudo = precio_texto.replace('$', "").replace('.', "").replace(',', ".").trim().parse::<f64>().unwrap_or(0.0);

            if precio_crudo > 0.0 {
                let mut notebook = Notebook::new(
                    self.get_store_name().to_string(),
                    format!("LEN-{}", i),
                    "Lenovo".to_string(),
                    modelo,
                    precio_crudo,
                    url.to_string(),
                    "ARS".to_string() 
                );

                // Polimorfismo: el objeto usa su implementación de estandarizar_a_usd
                let precio_usd = self.estandarizar_a_usd(precio_crudo, self.get_store_name(), tipo_cambio_actual);
                
                // Encapsulamiento: fijamos el precio final redondeado
                notebook.fijar_precio_final(precio_usd);

                items.push(notebook);
            }
        }
        Ok(items)
    }
}

#[async_trait]
impl RetailerProvider for HPHunter {
    fn get_store_name(&self) -> &str { "HP_AR" }

    async fn fetch_offers(&self) -> Result<Vec<Notebook>, Box<dyn Error + Send + Sync>> {
        println!("🌐 [Cazador HP] Iniciando captura...");
        let url = "https://www.hp.com/ar-es/shop/laptops.html";
        let tipo_cambio_actual = 1425.0; 
        
        let client = reqwest::Client::builder().user_agent("Mozilla/5.0").build()?;
        let res = client.get(url).send().await?.text().await?;
        let document = Html::parse_document(&res);

        let item_selector = Selector::parse(".product-item-info").unwrap();
        let name_selector = Selector::parse(".product-item-link").unwrap();
        let price_selector = Selector::parse(".price-wrapper .price").unwrap();

        let mut items = Vec::new();

        for (i, item) in document.select(&item_selector).enumerate() {
            let nombre = item.select(&name_selector).next()
                .map(|e| e.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            let precio_str = item.select(&price_selector).next()
                .map(|e| e.text().collect::<String>())
                .unwrap_or_default();

            let precio_crudo = precio_str.replace('$', "").replace('.', "").replace(',', ".").trim().parse::<f64>().unwrap_or(0.0);

            if !nombre.is_empty() && precio_crudo > 0.0 {
                let mut notebook = Notebook::new(
                    self.get_store_name().to_string(),
                    format!("HP-{}", i),
                    "HP".to_string(),
                    nombre,
                    precio_crudo,
                    url.to_string(),
                    "ARS".to_string()
                );

                let precio_usd = self.estandarizar_a_usd(precio_crudo, self.get_store_name(), tipo_cambio_actual);
                notebook.fijar_precio_final(precio_usd);

                items.push(notebook);
            }
        }
        Ok(items)
    }
}