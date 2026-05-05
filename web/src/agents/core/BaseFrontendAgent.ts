import { AgentTask, AgentResponse } from '../types';

// Abstracción: La clase padre de la que heredarán UX y UI
export abstract class BaseFrontendAgent {
  protected nombre: string;
  protected especialidad: string;

  constructor(nombre: string, especialidad: string) {
    this.nombre = nombre;
    this.especialidad = especialidad;
  }

  // Polimorfismo: Cada agente hijo implementará esto a su manera
  abstract analizarYGenerar(tarea: AgentTask): Promise<AgentResponse>;

  protected logAccion(accion: string) {
    console.log(`[Agente ${this.nombre}]: ${accion}`);
  }
}
