use chrono::NaiveDateTime;
use serde::{Serialize, Deserialize};
use serde_json::Value;
use uuid::Uuid;
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
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
    pub moneda: String, // 👈 CRÍTICO: Para asegurar la integridad (USD vs ARS)
    pub es_oferta_destacada: bool,
    pub url_afiliado: String,
    
    pub metadata_extra: Value,
    
    pub fecha_actualizacion: Option<NaiveDateTime>,
}

impl Notebook {
    /// Constructor (POO): Inicializa el objeto con los datos crudos del Hunter.
    pub fn new(
        retailer: String, 
        sku: String, 
        marca: String, 
        modelo: String, 
        precio: f64, 
        url: String,
        moneda_inicial: String // 👈 El Hunter nos dice qué moneda cree que es
    ) -> Self {
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
            moneda: moneda_inicial,
            es_oferta_destacada: false,
            url_afiliado: url,
            metadata_extra: serde_json::json!({}),
            fecha_actualizacion: Some(chrono::Utc::now().naive_utc()),
        }
    }

    /// Encapsulamiento: Método para actualizar el precio tras la normalización.
    pub fn fijar_precio_final(&mut self, precio_usd: f64) {
        self.precio_actual = precio_usd;
        self.moneda = String::from("USD"); // Forzamos que la fuente de verdad sea USD
    }
}