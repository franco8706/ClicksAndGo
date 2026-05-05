import { NextResponse } from 'next/server';
import { FrontendUXAgent } from '@/agents/ux/FrontendUXAgent';

export async function GET() {
  try {
    // Instanciamos el objeto basándonos en nuestra Clase
    const agenteUX = new FrontendUXAgent();
    
    // Le asignamos una tarea específica simulando un requerimiento de Clicks & go
    const tarea = {
      componenteTarget: "FilterBar",
      requerimiento: "Necesito implementar un estado global o localStorage para recordar la última categoría (Gaming, Trabajo, etc.) que el usuario seleccionó, para que al recargar la página siga activa.",
      contextoDatos: { 
        categoriasDisponibles: ["all", "gaming", "business", "ultrabook", "creator", "workstation", "budget"] 
      }
    };

    const resultado = await agenteUX.analizarYGenerar(tarea);
    
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: "Fallo al ejecutar el Agente UX" }, { status: 500 });
  }
}
