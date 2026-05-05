// Interfaces y contratos estrictos para los Agentes Frontend
export interface AgentTask {
  componenteTarget: string;
  requerimiento: string;
  contextoDatos?: any;
}

export interface AgentResponse {
  status: "SUCCESS" | "ERROR";
  codigoGenerado?: string;
  sugerenciasAnalisis?: string[];
}
