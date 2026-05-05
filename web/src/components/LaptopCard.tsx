import React from 'react';
import { Laptop } from '@/types/laptop';
// Interfaz para mantener el contrato de datos alineado con POO
interface LaptopProps {
  laptop: Laptop;
  isNew?: boolean;
  name?: string;
  price?: number;
  aiScore?: number;
}

export default function LaptopCard({ name = "Laptop Cyber-Gamer Pro", price = 1499, aiScore = 98 }: LaptopProps) {
  return (
    <div className="relative overflow-hidden border border-neon-blue rounded-xl bg-gray-900 p-6 animate-glow transition-all hover:scale-105 cursor-pointer">
      {/* Línea de escaneo láser */}
      <div className="absolute inset-0 w-full h-[2px] bg-neon-blue shadow-[0_0_15px_#00f3ff] animate-scan pointer-events-none z-0"></div>
      
      {/* Contenido encapsulado */}
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-white tracking-wide">{name}</h3>
          <span className="bg-neon-purple text-white text-xs font-bold px-2 py-1 rounded shadow-[0_0_8px_#bc13fe]">
            AI Match: {aiScore}%
          </span>
        </div>
        
        <p className="text-gray-400 text-sm">Escaneando especificaciones óptimas...</p>
        
        <div className="mt-4 flex justify-between items-center border-t border-gray-800 pt-4">
          <span className="text-2xl font-bold text-neon-blue">${price}</span>
          <button className="bg-transparent border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black font-semibold py-1 px-4 rounded transition-colors">
            Ver Oferta
          </button>
        </div>
      </div>
    </div>
  );
}
