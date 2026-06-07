"use client";

import React from "react";

/**
 * 🦴 SkeletonCard - Estado de Carga Sincronizado con LaptopCard v3.6 (DISEÑO PREMIUM OSCURO)
 * Replica las dimensiones geométricas exactas del producto final para erradicar el CLS.
 */
export function SkeletonCard() {
  return (
    <div 
      className="relative flex flex-col glass-effect rounded-[2rem] border border-gray-800/60 overflow-hidden h-full w-full select-none"
      aria-hidden="true"
    >
      {/* Pill de Descuento Placeholder */}
      <div className="absolute top-5 left-5 z-20 h-7 w-20 rounded-full skeleton-shimmer" />

      {/* Contenedor del Asset Visual Placeholder (Sincronizado a aspect-video de la vitrina) */}
      <div className="relative aspect-video bg-gray-950/30 border-b border-gray-800/40 flex items-center justify-center p-8 overflow-hidden">
        <div className="w-16 h-16 rounded-xl border border-gray-800/40 skeleton-shimmer" />
      </div>

      {/* Cuerpo de la Tarjeta (Espejo de Padding p-6 del LaptopCard original) */}
      <div className="p-6 flex flex-col flex-1">
        
        {/* Header Metadata Line: Tienda + Marca + Región */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3 w-12 rounded skeleton-shimmer" />
          <div className="w-1 h-1 rounded-full bg-gray-800" />
          <div className="h-3 w-16 rounded skeleton-shimmer" />
          <div className="w-1 h-1 rounded-full bg-gray-800" />
          <div className="h-3 w-10 rounded skeleton-shimmer" />
        </div>

        {/* Título del Producto (Simula la doble línea con min-h-[3.5rem] y mb-5) */}
        <div className="min-h-[3.5rem] mb-5 space-y-2">
          <div className="h-4 w-full rounded-md skeleton-shimmer" />
          <div className="h-4 w-3/4 rounded-md skeleton-shimmer" />
        </div>

        {/* ⚙️ Hardware Specs Grid: Corregido a exactamente 2 items (Cápsulas de Servidor) */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="h-9 rounded-xl border border-gray-800/40 skeleton-shimmer" />
          <div className="h-9 rounded-xl border border-gray-800/40 skeleton-shimmer" />
        </div>

        {/* Indicador Cognitivo de IA Placeholder */}
        <div className="mb-6 h-9 w-full rounded-2xl border border-gray-800/40 skeleton-shimmer" />

        {/* Caja de Precio e Historial Cambiario */}
        <div className="mt-auto">
          <div className="flex flex-col mb-5 space-y-2">
            <div className="h-2.5 w-28 rounded skeleton-shimmer" />
            <div className="flex items-baseline gap-2.5">
              <div className="h-8 w-36 rounded-xl skeleton-shimmer" />
              <div className="h-4 w-14 rounded skeleton-shimmer" />
            </div>
          </div>

          {/* Botón de Compra / Redirección CTA */}
          <div className="h-14 w-full rounded-2xl skeleton-shimmer" />
          
          {/* Argumentación Footer de la Tarjeta */}
          <div className="mt-5 pt-4 border-t border-gray-800/60 flex justify-center">
            <div className="h-2.5 w-4/5 rounded-full skeleton-shimmer" />
          </div>
        </div>

      </div>
    </div>
  );
}

/**
 * 📈 SkeletonDealTicker - Sincronizado con AIDealsSection v3.6
 * Mantiene la alineación del flujo horizontal de ofertas calientes.
 */
export function SkeletonDealTicker() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl glass-effect border border-gray-800/60 shadow-lg w-full select-none" aria-hidden="true">
      {/* Contenedor del Icono de Tendencia */}
      <div className="h-12 w-12 rounded-xl border border-gray-800/80 shrink-0 skeleton-shimmer" />
      
      {/* Metadatos del Ticker */}
      <div className="flex-1 space-y-2.5 min-w-0">
        <div className="h-4 w-3/4 rounded-md skeleton-shimmer" />
        <div className="h-3 w-20 rounded skeleton-shimmer" />
      </div>

      {/* Bloque Financiero del Ahorro */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="h-2.5 w-10 rounded skeleton-shimmer" />
        <div className="h-6 w-24 rounded-xl skeleton-shimmer" />
      </div>
    </div>
  );
}

export default SkeletonCard;