import { BaseFrontendAgent } from '../core/BaseFrontendAgent';
import { AgentTask, AgentResponse } from '../types';
import { VertexAI } from '@google-cloud/vertexai';

export class FrontendUXAgent extends BaseFrontendAgent {
  // Encapsulamiento: Propiedades privadas para proteger la configuración del LLM
  private vertexAi: VertexAI;
  private modeloActivo: string;

  constructor() {
    // Herencia: Llamamos al constructor de la clase Padre (BaseFrontendAgent)
    super("UX-Brain", "Lógica de estados, llamadas a API y manipulación de datos");
    
    // Encapsulamiento: Leemos el ID del proyecto desde el entorno seguro (.env.local)
    const projectId = process.env.GCP_PROJECT_ID || '';
    this.vertexAi = new VertexAI({ project: projectId, location: 'us-central1' });
    
    // Usamos Gemini 1.5 Pro, ideal para razonamiento complejo de código y arquitectura
    this.modeloActivo = 'gemini-1.5-pro-preview-0409';
  }

  // Polimorfismo: Implementación específica de la tarea para el especialista en UX/Lógica
  async analizarYGenerar(tarea: AgentTask): Promise<AgentResponse> {
    this.logAccion(`Iniciando análisis cognitivo para el componente: ${tarea.componenteTarget}...`);

    try {
      const modelo = this.vertexAi.preview.getGenerativeModel({ model: this.modeloActivo });

      // Diseñamos el Prompt Agéntico (El "cerebro" lógico del Agente)
      const prompt = `
        Eres un Arquitecto de Software UX Senior. 
        Analiza el siguiente requerimiento para el componente de Next.js: ${tarea.componenteTarget}.
        Requerimiento del usuario: "${tarea.requerimiento}"
        Contexto de Datos disponible: ${JSON.stringify(tarea.contextoDatos)}

        Instrucciones obligatorias:
        1. Aplica principios de Clean Code y buenas prácticas de React (Hooks).
        2. Devuelve un análisis estricto y el código lógico necesario en React/TypeScript.
        3. No modifiques estilos visuales ni clases de Tailwind, esa es tarea del Agente UI.
      `;

      const request = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
      
      this.logAccion("Consultando a Vertex AI (Gemini Pro)...");
      const result = await modelo.generateContent(request);
      const respuestaIA = result.response.candidates?.[0].content.parts[0].text || "";

      this.logAccion("Análisis completado exitosamente.");

      // Retornamos el contrato estricto definido en la interfaz AgentResponse
      return { 
        status: "SUCCESS", 
        codigoGenerado: respuestaIA,
        sugerenciasAnalisis: [
          "Revisar dependencias de useEffect en el componente", 
          "Validar tipado estricto de las interfaces"
        ] 
      };

    } catch (error) {
      console.error(`[Agente ${this.nombre}] Error crítico de IA:`, error);
      
      return { 
        status: "ERROR", 
        sugerenciasAnalisis: [
          "Fallo en la conexión con Vertex AI.",
          "Verifica que la variable GCP_PROJECT_ID esté correcta en .env.local.",
          "Verifica que GOOGLE_APPLICATION_CREDENTIALS apunte correctamente a gcp-vertex.json."
        ] 
      };
    }
  }
}