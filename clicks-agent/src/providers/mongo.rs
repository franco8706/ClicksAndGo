use async_trait::async_trait;
use mongodb::{Client, bson::doc};
use std::sync::Arc;
use std::error::Error;

use crate::models::Notebook;
use crate::traits::{RetailerProvider, NormalizadorDePrecios};

#[allow(dead_code)] // 👈 1. Silenciamos el aviso de "nunca construida" hasta que la instanciemos en main.rs
pub struct MongoLaptopProvider {
    db_client: Arc<Client>,
}

impl MongoLaptopProvider {
    #[allow(dead_code)] // 👈 2. Silenciamos el constructor que aún no se llama
    pub fn new(client: Arc<Client>) -> Self {
        Self { db_client: client }
    }
}

impl NormalizadorDePrecios for MongoLaptopProvider {
    // 👈 3. Agregamos el guion bajo a _origen_tienda para indicar que es un parámetro intencional pero no usado.
    fn estandarizar_a_usd(&self, precio_extraido: f64, _origen_tienda: &str, tipo_cambio_oficial: f64) -> f64 {
        if precio_extraido > 10000.0 {
            return precio_extraido / tipo_cambio_oficial;
        }
        precio_extraido
    }
}

#[async_trait]
impl RetailerProvider for MongoLaptopProvider {
    fn get_store_name(&self) -> &str {
        "MongoDB_Lenovo_Store"
    }

    async fn fetch_offers(&self) -> Result<Vec<Notebook>, Box<dyn Error + Send + Sync>> {
        let db = self.db_client.database("clicks_and_go");
        let collection = db.collection::<Notebook>("ofertas_lenovo");
        let tipo_cambio_actual = 1425.0;

        let mut ofertas_capturadas = vec![
            Notebook::new(
                "Lenovo".to_string(),
                "LEG-S7-2026".to_string(),
                "Lenovo".to_string(),
                "Legion Slim 7".to_string(), 
                1799.99, 
                "https://lenovo.com/legion-slim-7".to_string(),
                "USD".to_string()
            ),
        ];

        for notebook in &mut ofertas_capturadas {
            let precio_limpio = self.estandarizar_a_usd(notebook.precio_actual, "Mongo_Backup", tipo_cambio_actual);
            notebook.fijar_precio_final(precio_limpio);

            let filter = doc! { "modelo": &notebook.modelo, "marca": &notebook.marca };
            let update = doc! {
                "$set": {
                    "precio_actual": notebook.precio_actual,
                    "moneda": &notebook.moneda,
                    "fecha_actualizacion": chrono::Utc::now().to_rfc3339()
                }
            };
            
            collection.update_one(filter, update).upsert(true).await?;
        }

        Ok(ofertas_capturadas)
    }
}