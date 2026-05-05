import React from 'react';
import { Laptop } from '@/types/laptop';

// POO: Contrato estricto. La tarjeta ahora exige el tipo de cambio.
interface LaptopProps {
  laptop: Laptop;
  isNew?: boolean;
  tipoCambio: number; 
}

export default function LaptopCard({ laptop, isNew, tipoCambio }: LaptopProps) {
  // Manejo de valores por defecto para evitar errores de renderizado
  const nombreMostrar = laptop.modelo || "Laptop sin modelo";
  const marcaMostrar = laptop.marca || "Desconocida";
  const retailerMostrar = laptop.retailer || "Tienda";
  
  // Aseguramos que el precio sea un número y aplicamos redondeo para eliminar centavos
  const precioUSD = Math.round(laptop.precio_actual || 0);
  const precioARS = Math.round(precioUSD * tipoCambio);

  // Formateador para Pesos Argentinos (Sin centavos)
  const formaterARS = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0 
  });

  // Formateador para Dólares (Sin centavos, como solicitaste)
  const formaterUSD = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0 // 👈 Corrección: Eliminamos centavos en la vista de USD
  });

  // Lógica de visualización de puntuación basada en el estado de la oferta
  const aiScore = laptop.es_oferta_destacada ? 99 : 92; 

  return (
    <div className="relative overflow-hidden border border-neon-blue rounded-xl bg-gray-900 p-6 animate-glow transition-all hover:scale-105 cursor-pointer flex flex-col justify-between">
      {/* Efecto visual de escaneo decorativo */}
      <div className="absolute inset-0 w-full h-[2px] bg-neon-blue shadow-[0_0_15px_#00f3ff] animate-scan pointer-events-none z-0"></div>
      
      <div className="relative z-10 flex flex-col gap-3 h-full">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-white tracking-wide truncate pr-2" title={nombreMostrar}>
              {nombreMostrar}
            </h3>
            <span className="bg-neon-purple text-white text-xs font-bold px-2 py-1 rounded shadow-[0_0_8px_#bc13fe] shrink-0">
              AI Match: {aiScore}%
            </span>
          </div>
          
          <p className="text-gray-400 text-sm mt-1">
            {marcaMostrar} • Detectado en <span className="font-semibold text-gray-300">{retailerMostrar}</span>
          </p>
        </div>
        
        {/* --- UI DE TRANSPARENCIA DISEÑADA POR EL AGENTE UI --- */}
        <div className="mt-auto pt-4 border-t border-gray-800 flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 mb-1">Precio Final (ARS)</span>
            
            {/* ARS Grande y en Neón: Refleja el precio normalizado */}
            <span className="text-2xl font-bold text-neon-blue">
              {formaterARS.format(precioARS)}
            </span>
            
            {/* USD Original: Sin centavos para una estética más limpia */}
            <span className="text-xs text-slate-400 mt-0.5 ml-1">
              Original: {formaterUSD.format(precioUSD)} USD
            </span>
          </div>
          
          <a 
            href={laptop.url_afiliado || "#"} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-transparent border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black font-semibold py-1.5 px-4 rounded transition-colors text-center text-sm"
          >
            Ver Oferta
          </a>
        </div>
      </div>
    </div>
  );
}