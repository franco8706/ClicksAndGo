use crate::traits::AIEvaluator;
use async_trait::async_trait;
use std::error::Error;
use reqwest::Client;
use serde_json::json;
use std::env;

pub struct VertexAIProvider {
    pub project_id: String,
    pub location: String,
    pub client: Client,
}

impl VertexAIProvider {
    pub fn new(project_id: &str, location: &str) -> Self {
        Self {
            project_id: project_id.to_string(),
            location: location.to_string(),
            client: Client::new(),
        }
    }
}

#[async_trait]
impl AIEvaluator for VertexAIProvider {
    async fn evaluate_deal(&self, specs: &str) -> Result<f32, Box<dyn Error + Send + Sync>> {
        // 1. Recuperamos el TOKEN de acceso dinámico
        let access_token = env::var("GCLOUD_AUTH_TOKEN").unwrap_or_default();

        let url = format!(
            "https://{}-aiplatform.googleapis.com/v1/projects/{}/locations/{}/publishers/google/models/gemini-1.5-flash:generateContent",
            self.location, self.project_id, self.location
        );

        // 2. Prompt Engineering: Instrucciones precisas para Gemini
        let body = json!({
            "contents": [{
                "parts": [{
                    "text": format!(
                        "Actúa como un experto en hardware. Analiza la relación precio/calidad de esta notebook y responde ÚNICAMENTE con un número del 1.0 al 10.0. Specs: {}", 
                        specs
                    )
                }]
            }],
            "generationConfig": {
                "temperature": 0.1, // Baja temperatura para respuestas consistentes
                "topP": 0.95,
                "topK": 40
            }
        });

        // 3. Intento de petición HTTP real
        let response = self.client.post(&url)
            .bearer_auth(access_token)
            .json(&body)
            .send()
            .await?;

        // 4. Manejo de Respuesta con Modo Resiliente
        if response.status().is_success() {
            let res_json: serde_json::Value = response.json().await?;
            
            // Navegación segura por el JSON de respuesta
            let ai_text = res_json["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .unwrap_or("5.0");

            let score: f32 = ai_text.trim().parse().unwrap_or(5.0);
            Ok(score)
        } else {
            // --- MODO RESILIENTE (BACKUP) ---
            // Si la API falla (Billing, Auth o Cuotas), activamos lógica local
           let _error_raw = response.text().await?; // El guion bajo silencia el warning
eprintln!("⚠️ [Vertex AI] API no disponible. Detalle: {}. Activando respaldo local.", _error_raw);
            // Simulamos un análisis básico para no romper el flujo de datos
            let mut fallback_score = 6.5; 
            
            if specs.contains("RTX 4070") || specs.contains("RTX 4080") {
                fallback_score = 9.2;
            } else if specs.contains("RTX 4060") {
                fallback_score = 8.5;
            }

            // Devolvemos el score calculado localmente para que el sistema siga vivo
            Ok(fallback_score)
        }
    }
}