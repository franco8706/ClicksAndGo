use chrono::NaiveDateTime;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use uuid::Uuid;
use sqlx::FromRow; // 👈 Esencial para la persistencia automática

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)] // 👈 Agregamos FromRow
pub struct Notebook {
    pub id: Option<Uuid>, 
    
    pub retailer: String,
    pub sku_original: String,
    pub marca: String,
    pub modelo: String,
    
    pub procesador: Option<String>,
    pub ram_gb: Option<i32>,
    pub disco_gb: Option<i32>,
    pub tarjeta_video: Option<String>,
    
    pub rubro: Option<String>,
    pub precio_actual: f64,
    pub es_oferta_destacada: bool,
    pub url_afiliado: String,
    
    pub metadata_extra: Value,
    
    pub fecha_actualizacion: Option<NaiveDateTime>,
}

impl Notebook {
    /// Constructor para facilitar la creación desde los Hunters (POO)
    pub fn new(retailer: String, sku: String, marca: String, modelo: String, precio: f64, url: String) -> Self {
        Self {
            id: None,
            retailer,
            sku_original: sku,
            marca,
            modelo,
            procesador: None,
            ram_gb: None,
            disco_gb: None,
            tarjeta_video: None,
            rubro: None,
            precio_actual: precio,
            es_oferta_destacada: false,
            url_afiliado: url,
            metadata_extra: serde_json::json!({}),
            fecha_actualizacion: Some(chrono::Utc::now().naive_utc()),
        }
    }
}