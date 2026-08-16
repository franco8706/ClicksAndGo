"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselArrowsProps {
  readonly onPrev: () => void;
  readonly onNext: () => void;
  /** Etiquetas accesibles — el carrusel no dice por sí solo qué desplaza. */
  readonly prevLabel?: string;
  readonly nextLabel?: string;
  /**
   * Dónde se apoyan las flechas.
   *
   * `inside` (por defecto) sirve para una tira de tarjetas: la flecha se monta
   * sobre el borde de la primera y la última, que es lo esperable.
   *
   * `straddle` las corre hacia afuera, a caballo del borde del contenedor.
   * Es lo que necesita una ficha con texto pegado al margen: adentro, la
   * flecha izquierda se montaba encima del precio y lo tapaba.
   */
  readonly edge?: "inside" | "straddle";
}

/**
 * Flechas de carrusel superpuestas, centradas a la ALTURA DE LAS IMÁGENES.
 *
 * Antes vivían arriba a la derecha, en la fila del título: quedaban lejos de
 * lo que mueven y, en pantallas anchas, a varios centímetros de la primera
 * tarjeta. Acá van flotando sobre los bordes de la tira, que es donde la mano
 * ya está.
 *
 * El contenedor padre necesita `relative`. `pointer-events-none` en el envoltorio
 * y `auto` en los botones deja pasar el clic y el arrastre al contenido de
 * abajo — sin eso, la banda invisible del envoltorio bloquearía justamente el
 * arrastre que habilita `useDragScroll`.
 */
export default function CarouselArrows({
  onPrev,
  onNext,
  prevLabel = "Anteriores",
  nextLabel = "Siguientes",
  edge = "inside",
}: CarouselArrowsProps) {
  const posicion =
    edge === "straddle" ? "-left-5 -right-5 px-0" : "left-0 right-0 px-1";

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 z-20 hidden sm:flex items-center justify-between ${posicion}`}
    >
      <button
        onClick={onPrev}
        aria-label={prevLabel}
        className="carousel-arrow-float pointer-events-auto"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={onNext}
        aria-label={nextLabel}
        className="carousel-arrow-float pointer-events-auto"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
