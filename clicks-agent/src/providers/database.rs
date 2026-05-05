// Agregamos 'pub' para que MongoClient sea accesible desde otros módulos (Fix E0603)
pub use mongodb::{Client as MongoClient, options::ClientOptions};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

/// **Abstracción y Encapsulamiento**: 
/// El DatabaseManager centraliza el acceso a datos para Clicks & go.
pub struct DatabaseManager {
    pub pool: PgPool,       // Conexión a PostgreSQL (Relacional)
    pub mongo: MongoClient, // Conexión a MongoDB Atlas (NoSQL / Auditoría)
}

impl DatabaseManager {
    /// **Patrón Factory**: Inicializa de forma segura el ecosistema de persistencia.
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // 1. Configuración de PostgreSQL
        let pg_uri = env::var("DATABASE_URL").expect("Falta DATABASE_URL en el .env");
        let pool = PgPoolOptions::new()
            .max_connections(5) // Eficiencia: Optimización de recursos en Google Cloud
            .connect(&pg_uri)
            .await?;
        
        // 2. Configuración de MongoDB
        let mongo_uri = env::var("MONGODB_URI").expect("Falta MONGODB_URI en el .env");
        let client_options = ClientOptions::parse(&mongo_uri).await?;
        let mongo = MongoClient::with_options(client_options)?;

        println!("🗄️ [Database] Capas de persistencia para Clicks & go sincronizadas.");
        Ok(Self { pool, mongo })
    }
}