use crate::traits::RetailerProvider;
use crate::agents::devops::DevopsAgent;
use crate::traits::AIEvaluator; 
use sqlx::PgPool;
use std::sync::Arc;
use std::error::Error;
use tokio::time::{sleep, Duration}; 

pub struct BackendAgent {
    pub db_pool: Arc<PgPool>,
    pub ai: Arc<dyn AIEvaluator + Send + Sync>,
    pub hunters: Vec<Arc<dyn RetailerProvider>>,
}

impl BackendAgent {
    pub fn new(db_pool: Arc<PgPool>, ai: Arc<dyn AIEvaluator + Send + Sync>) -> Self {
        Self { 
            db_pool, 
            ai,
            hunters: Vec::new() 
        }
    }

    pub fn register_hunter(&mut self, hunter: Arc<dyn RetailerProvider>) {
        self.hunters.push(hunter);
    }

    pub async fn run_smart_cycle(&self, devops: &DevopsAgent) -> Result<(), Box<dyn Error + Send + Sync>> {
        println!("🧠 [Agente Backend] Evaluando entorno operativo...");

        devops.update_project_docs("DevOps", "arquitectura_click_and_go.txt", "Validación de métricas pre-vuelo.").await?;

        let health = devops.check_health().await;
        if !health.postgres_ok {
            devops.log_decision("ABORT", "PostgreSQL offline").await;
            return Err("Base de datos no disponible".into());
        }

        let metrics = devops.get_system_metrics().await;
        
        if metrics.cpu_usage_percent > 80.0 {
            devops.log_decision("IDLE", "CPU saturado").await;
            return Ok(());
        }

        devops.log_decision("EXECUTE", "Condiciones óptimas: Iniciando ciclo agéntico").await;
        
        self.run_sync_cycle(devops).await?;

        Ok(())
    }

    pub async fn run_sync_cycle(&self, devops: &DevopsAgent) -> Result<(), Box<dyn Error + Send + Sync>> {
        
        devops.update_project_docs("Backend", "contexto_total.txt", "Iniciando cacería en Modo Sigilo.").await?;

        for (index, hunter) in self.hunters.iter().enumerate() {
            let store = hunter.get_store_name();

            // --- THROTTLING (Sigilo Fijo) ---
            if index > 0 {
                let wait_time = 5;
                let stealth_msg = format!("Pausa táctica de {}s para evitar detección en {}.", wait_time, store);
                
                println!("⏳ [Backend] {}", stealth_msg);
                devops.update_project_docs("Backend", "contexto_total.txt", &stealth_msg).await?;
                
                sleep(Duration::from_secs(wait_time)).await;
            }

            println!("📡 [Backend] Solicitando datos al cazador: {}", store);

            if let Ok(mut ofertas) = hunter.fetch_offers().await {
                for notebook in ofertas.iter_mut() {
                    
                    if let Some(gpu) = &notebook.tarjeta_video {
                        if gpu.contains("RTX") || gpu.contains("RX") {
                            notebook.rubro = Some("GAMER".to_string());
                        }
                    }

                    let specs_resumen = format!(
                        "Marca: {}, Modelo: {}, CPU: {}, RAM: {}GB, GPU: {}, Precio: ${}",
                        notebook.marca, 
                        notebook.modelo, 
                        notebook.procesador.as_deref().unwrap_or("Desconocido"), 
                        notebook.ram_gb.unwrap_or(0), 
                        notebook.tarjeta_video.as_deref().unwrap_or("Integrada"), 
                        notebook.precio_actual
                    );

                    if let Ok(score) = self.ai.evaluate_deal(&specs_resumen).await {
                        notebook.es_oferta_destacada = score > 8.0;
                        println!("🤖 IA Score para {}: {:.1}", notebook.modelo, score);
                        
                        let ia_log = format!("Análisis IA: {}. Score: {:.1}.", notebook.modelo, score);
                        devops.update_project_docs("Vertex AI", "contexto_total.txt", &ia_log).await?;
                    }

                    sqlx::query!(
                        "INSERT INTO notebooks_procesadas (
                            retailer, sku_original, marca, modelo, procesador, 
                            ram_gb, disco_gb, tarjeta_video, rubro, precio_actual, 
                            es_oferta_destacada, url_afiliado, metadata_extra
                        ) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::FLOAT8, $11, $12, $13)
                        ON CONFLICT (sku_original) DO UPDATE SET 
                            precio_actual = EXCLUDED.precio_actual, 
                            es_oferta_destacada = EXCLUDED.es_oferta_destacada,
                            fecha_actualizacion = CURRENT_TIMESTAMP",
                        notebook.retailer, notebook.sku_original, notebook.marca, 
                        notebook.modelo, notebook.procesador, notebook.ram_gb, 
                        notebook.disco_gb, notebook.tarjeta_video, notebook.rubro, 
                        notebook.precio_actual, notebook.es_oferta_destacada, 
                        notebook.url_afiliado, notebook.metadata_extra
                    )
                    .execute(&*self.db_pool)
                    .await?;
                }
                println!("✅ [Backend] {} sincronizado.", store);
            }
        }
        
        devops.update_project_docs("Backend", "contexto_total.txt", "Sincronización completada exitosamente.").await?;
        println!("🏁 [Agente Backend] Ciclo finalizado.");
        
        Ok(())
    }
}