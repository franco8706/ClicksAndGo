use async_trait::async_trait;
use std::error::Error;
use crate::models::Notebook;

// 1. CONTRATO DE CAZA (Hunters)
// Este permite que el Backend trate a HP y Lenovo por igual (Polimorfismo).
#[async_trait]
pub trait RetailerProvider: Send + Sync {
    /// Cualquier tienda debe poder devolver una lista de ofertas en el modelo Notebook.
    async fn fetch_offers(&self) -> Result<Vec<Notebook>, Box<dyn Error + Send + Sync>>;
    
    /// Identificador de la tienda para logs y base de datos.
    fn get_store_name(&self) -> &str;
}

// 2. CONTRATO DE INTELIGENCIA (AI Brain)
// Aquí definimos cómo cualquier IA (Vertex AI, OpenAI, etc.) debe evaluar una oferta.
#[async_trait]
pub trait AIEvaluator: Send + Sync {
    /// Recibe un resumen técnico y devuelve un puntaje de "ganga" (0.0 a 10.0).
    async fn evaluate_deal(&self, specs: &str) -> Result<f32, Box<dyn Error + Send + Sync>>;
}

// 3. CONTRATO DE SUPERVISIÓN (DevOps)
// Define las capacidades de monitoreo para que el sistema sea resiliente.
#[async_trait]
// Agregá este atributo arriba del trait:
#[allow(dead_code)]
pub trait SystemMonitor: Send + Sync {
    /// Verifica si los servicios (Postgres, Mongo, APIs) están respondiendo.
    async fn check_health(&self) -> bool;
    
    /// Registra eventos de decisión del sistema en MongoDB.
    async fn log_event(&self, level: &str, message: &str) -> Result<(), Box<dyn Error + Send + Sync>>;
}

// 4. CONTRATO DE INTEGRIDAD DE DATOS (Data Normalization)
// Obliga a cualquier agente que procese precios a estandarizarlos a Dólares puros.
// Usamos Send + Sync para que sea seguro ejecutarlo en hilos concurrentes de Rust.
pub trait NormalizadorDePrecios: Send + Sync {
    /// Recibe el precio crudo, el nombre de la tienda y el tipo de cambio oficial.
    /// Devuelve SIEMPRE el precio convertido a dólares puros (f64).
    fn estandarizar_a_usd(&self, precio_extraido: f64, origen_tienda: &str, tipo_cambio_oficial: f64) -> f64;
}