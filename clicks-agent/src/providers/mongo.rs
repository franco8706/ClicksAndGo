use async_trait::async_trait;
use mongodb::{Client, bson::doc};
use std::sync::Arc;
use std::error::Error;

// Inyectamos los modelos y traits estandarizados
use crate::models::Notebook;
use crate::traits::RetailerProvider;

pub struct MongoLaptopProvider {
    // Encapsulamiento: Uso de Arc para eficiencia en Google Cloud
    db_client: Arc<Client>,
}

impl MongoLaptopProvider {
    pub fn new(client: Arc<Client>) -> Self {
        Self { db_client: client }
    }
}

#[async_trait]
impl RetailerProvider for MongoLaptopProvider {
    
    // Implementación del método requerido por el Trait (Polimorfismo)
    fn get_store_name(&self) -> &str {
        "MongoDB_Lenovo_Store"
    }

    async fn fetch_offers(&self) -> Result<Vec<Notebook>, Box<dyn Error + Send + Sync>> {
        let db = self.db_client.database("clicks_and_go");
        let collection = db.collection::<Notebook>("ofertas_lenovo");

        // 1. Simulación de extracción (Adaptada al nuevo modelo Notebook)
        let ofertas_capturadas = vec![
            Notebook::new(
                "Lenovo".to_string(),
                "LEG-S7-2026".to_string(), // SKU
                "Lenovo".to_string(),      // Marca
                "Legion Slim 7".to_string(), 
                1799.99, 
                "https://lenovo.com/legion-slim-7".to_string()
            ),
            Notebook::new(
                "Lenovo".to_string(),
                "TP-X1-C12".to_string(),   // SKU
                "Lenovo".to_string(),      // Marca
                "ThinkPad X1 Carbon".to_string(), 
                2100.00, 
                "https://lenovo.com/x1-carbon".to_string()
            ),
        ];

        // 2. Lógica de Persistencia (Upsert inteligente con JSONB/BSON)
        for notebook in &ofertas_capturadas {
            let filter = doc! { 
                "modelo": &notebook.modelo, 
                "marca": &notebook.marca 
            };
            
            let update = doc! {
                "$set": {
                    "precio_actual": notebook.precio_actual,
                    "url_afiliado": &notebook.url_afiliado,
                    "sku_original": &notebook.sku_original,
                    "fecha_actualizacion": chrono::Utc::now().to_rfc3339()
                }
            };
            
            // Patrón Builder para máxima optimización
            collection.update_one(filter, update)
                .upsert(true)
                .await?;
        }

        println!("✅ [Agente Mongo] {} ofertas sincronizadas.", ofertas_capturadas.len());
        
        Ok(ofertas_capturadas)
    }
}