// 1. Declaración de Módulos
mod models;
mod traits;
mod providers; 
mod agents;

// 2. Importaciones de Proveedores
use providers::database::DatabaseManager;
use providers::ai_evaluator::VertexAIProvider;
use crate::traits::AIEvaluator;

// 3. Importaciones de Agentes
use agents::backend::BackendAgent;
// CORRECCIÓN: Importamos los hunters específicos, ya no existe "MarketHunter" genérico
use crate::agents::market_hunter::{LenovoHunter, HPHunter};
use agents::devops::DevopsAgent;

// 4. Librerías del sistema
use dotenvy::dotenv;
use std::sync::Arc;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok(); 
    println!("🛸 Clicks & Go - Ecosistema Agéntico v2.0 Activo");

    // 1. Inicialización de Recursos y Memoria
    let db = DatabaseManager::new().await.map_err(|e| e)?;
    let db_pool = Arc::new(db.pool);
    let mongo_client = db.mongo;

    // 2. Detección Dinámica del Proyecto
    let project_id = env::var("GOOGLE_CLOUD_PROJECT")
        .unwrap_or_else(|_| "clicks-and-go-2026".to_string()); 
    
    // 3. Inicialización del Cerebro (Vertex AI)
    // Abstracción: Definimos la interfaz pero inyectamos la implementación concreta
    let ai_evaluator: Arc<dyn AIEvaluator + Send + Sync> = Arc::new(
        VertexAIProvider::new(&project_id, "us-central1")
    );

    // 4. Inyección de Dependencias en Agente DevOps
    let devops = DevopsAgent::new(
        "Clicks & go", 
        mongo_client, 
        Arc::clone(&db_pool)
    );

    // --- REGISTRO DE ARRANQUE EN BITÁCORA ---
    let _ = devops.update_project_docs(
        "Sistema", 
        "arquitectura_click_and_go.txt", 
        "Despliegue de núcleo agéntico: Conexión dinámica a Vertex AI establecida."
    ).await;

    let _ = devops.update_project_docs(
        "Sistema", 
        "contexto_total.txt", 
        &format!("Boot-up secuencial completado. Project ID: {}", project_id)
    ).await;

    // 5. Preparación del Agente Backend
    let mut backend = BackendAgent::new(
        Arc::clone(&db_pool),
        Arc::clone(&ai_evaluator) 
    );

    // 6. Registro de Cazadores (Hunters) - CORREGIDO
    // Aplicamos Polimorfismo: Registramos las clases especializadas
    backend.register_hunter(Arc::new(LenovoHunter));
    backend.register_hunter(Arc::new(HPHunter));

    // 7. Ejecución del Ciclo de Alta Precisión
    println!("🚀 Iniciando ciclo de control autónomo para Clicks & go...");
    
    if let Err(e) = backend.run_smart_cycle(&devops).await {
        eprintln!("❌ Fallo en el sistema: {}", e);
        let _ = devops.update_project_docs(
            "DevOps", 
            "contexto_total.txt", 
            &format!("CRITICAL_ERROR: {}", e)
        ).await;
    }

    println!("🏁 Operación finalizada.");
    Ok(())
}