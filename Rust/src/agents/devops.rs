use mongodb::{bson::doc, Client as MongoClient};
use std::sync::Arc;

pub struct HealthStatus {
    pub mongo_ok: bool,
}

/// Guardián de telemetría — comparte el pool de conexiones vía Arc (cero copias)
pub struct DevopsAgent {
    name: String,
    mongo_client: Arc<MongoClient>,
}

impl DevopsAgent {
    pub fn new(name: &str, mongo_client: Arc<MongoClient>) -> Self {
        Self { name: name.to_string(), mongo_client }
    }

    pub async fn check_health(&self) -> HealthStatus {
        let mongo_ok = self
            .mongo_client
            .database("admin")
            .run_command(doc! { "ping": 1 })
            .await
            .is_ok();
        HealthStatus { mongo_ok }
    }

    /// Escribe un log en Mongo de forma fire-and-forget — nunca bloquea el caller
    pub fn write_system_log(&self, category: &str, message: &str) {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        println!("[{}] [{}] {} — {}", timestamp, self.name, category, message);

        let collection = self
            .mongo_client
            .database("clicks_and_go_db")
            .collection("agent_logs");

        let doc = doc! {
            "timestamp": &timestamp,
            "agent": &self.name,
            "category": category,
            "message": message,
        };

        // tokio::spawn fire-and-forget: no bloquea, error tolerado silenciosamente
        tokio::spawn(async move {
            let _ = collection.insert_one(doc).await;
        });
    }
}
