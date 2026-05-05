use crate::traits::RetailerProvider;
use crate::models::Notebook;
use async_trait::async_trait;
use scraper::{Html, Selector};
use std::error::Error;
use serde_json::json; // Necesario para metadata_extra

pub struct LenovoHunter;
pub struct HPHunter;

#[async_trait]
impl RetailerProvider for LenovoHunter {
    // CORRECCIÓN: Devolvemos &str para cumplir con el Trait
    fn get_store_name(&self) -> &str { "Lenovo" }

    async fn fetch_offers(&self) -> Result<Vec<Notebook>, Box<dyn Error + Send + Sync>> {
        println!("🌐 [Cazador Lenovo] Extrayendo datos...");
        let url = "https://www.lenovo.com/ar/es/laptops/subseries-results";
        
        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0")
            .build()?;

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

            let precio = precio_texto.replace('$', "").replace('.', "").replace(',', ".").trim().parse::<f64>().unwrap_or(0.0);

            if precio > 0.0 {
                items.push(Notebook {
                    id: None, // Placeholder para cumplimiento de struct
                    retailer: "Lenovo".to_string(),
                    sku_original: format!("LEN-{}", i),
                    marca: "Lenovo".to_string(),
                    modelo,
                    precio_actual: precio,
                    procesador: None,
                    ram_gb: None,
                    disco_gb: None,
                    tarjeta_video: None,
                    rubro: None,
                    es_oferta_destacada: false,
                    url_afiliado: url.to_string(),
                    metadata_extra: json!(null), // CORRECCIÓN: Usamos JsonValue
                    fecha_actualizacion: None, // O el timestamp si tu struct lo requiere
                });
            }
        }
        Ok(items)
    }
}

#[async_trait]
impl RetailerProvider for HPHunter {
    fn get_store_name(&self) -> &str { "HP" }

    async fn fetch_offers(&self) -> Result<Vec<Notebook>, Box<dyn Error + Send + Sync>> {
        println!("🌐 [Cazador HP] Extrayendo datos...");
        let url = "https://www.hp.com/ar-es/shop/laptops.html";
        
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

            let precio = precio_str.replace('$', "").replace('.', "").replace(',', ".").trim().parse::<f64>().unwrap_or(0.0);

            if !nombre.is_empty() && precio > 0.0 {
                items.push(Notebook {
                    id: 0,
                    retailer: "HP".to_string(),
                    sku_original: format!("HP-{}", i),
                    marca: "HP".to_string(),
                    modelo: nombre,
                    precio_actual: precio,
                    tarjeta_video: None,
                    procesador: None,
                    ram_gb: None,
                    disco_gb: None,
                    rubro: None,
                    es_oferta_destacada: false,
                    url_afiliado: url.to_string(),
                    metadata_extra: json!(null),
                    fecha_actualizacion: None,
                });
            }
        }
        Ok(items)
    }
}