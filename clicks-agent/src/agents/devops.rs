use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt; // Requerido para file.write_all()
use chrono::Utc;              // Requerido para la hora de la bitácora
use crate::providers::database::MongoClient;
use sqlx::PgPool;
use std::sync::Arc;
use mongodb::bson::{doc, DateTime as BsonDateTime}; // Importamos el DateTime nativo de BSON

pub struct SystemMetrics {
    #[allow(dead_code)] // Silenciamos el campo individual
    pub traffic_tps: u32,
    pub cpu_usage_percent: f32,
}

pub struct HealthStatus {
    pub postgres_ok: bool,
}

pub struct DevopsAgent {
    pub project_name: String,
    pub mongo: MongoClient,
    pub pg_pool: Arc<PgPool>,
}

impl DevopsAgent {
    // 1. CONSTRUCTOR
    pub fn new(name: &str, mongo: MongoClient, pg_pool: Arc<PgPool>) -> Self {
        Self { 
            project_name: name.to_string(), 
            mongo,
            pg_pool 
        }
    } // 👈 AQUÍ CERRAMOS EL CONSTRUCTOR CORRECTAMENTE

    // 2. NUEVA FUNCIÓN: Bitácora de Sistema (Polimorfismo para archivos)
    pub async fn update_project_docs(
        &self, 
        agent_name: &str, 
        file_name: &str, 
        action: &str
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        
        let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let log_entry = format!("📝 [{}] [{}]: {}\n", timestamp, agent_name, action);

        // Usamos "../" porque estamos ejecutando dentro de /clicks-agent/
        // y los txt están en la raíz /ClicksAndGo/
        let file_path = format!("../{}", file_name);

        // Abrimos el archivo en modo APPEND (agregar al final)
        // tokio::fs se encarga de manejar los bloqueos asíncronos para evitar conflictos
        let mut file = OpenOptions::new()
            .create(true) // Si el archivo no existe (o cambias el nombre), lo crea
            .append(true) // NUNCA sobreescribe, siempre agrega abajo
            .open(&file_path)
            .await?;
        
        file.write_all(log_entry.as_bytes()).await?;
        
        Ok(())
    }

    // 3. CHEQUEO DE SALUD
    pub async fn check_health(&self) -> HealthStatus {
        let pg_ok = sqlx::query("SELECT 1").execute(&*self.pg_pool).await.is_ok();
        HealthStatus { postgres_ok: pg_ok }
    }

    // 4. MÉTRICAS DEL SISTEMA
    pub async fn get_system_metrics(&self) -> SystemMetrics {
        SystemMetrics {
            traffic_tps: 150,
            cpu_usage_percent: 45.0,
        }
    }

    // 5. LOGGER DE DECISIONES (Persistencia NoSQL corregida)
    pub async fn log_decision(&self, action: &str, reason: &str) {
        let database = self.mongo.database("clicks_and_go_db");
        let collection = database.collection::<mongodb::bson::Document>("agent_logs");

        // Usamos BsonDateTime::now() para evitar el error de tipos
        let log_entry = doc! {
            "project": &self.project_name,
            "action": action,
            "reason": reason,
            "timestamp": BsonDateTime::now(), // 🔥 Solución al error E0277
            "environment": "production-cloud-shell"
        };

        match collection.insert_one(log_entry).await {
            Ok(_) => println!("✅ [DevOps] Decisión persistida en MongoDB: {}", action),
            Err(e) => eprintln!("⚠️ [DevOps] Error al persistir log en MongoDB: {}", e),
        }
    }
}