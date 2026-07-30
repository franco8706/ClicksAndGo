"use client";

/**
 * Barra de progreso de lectura, fija arriba de todo.
 *
 * Por qué aporta y no es adorno: el home es una página larga (hero →
 * confianza → categorías → 30 cards → banners → ofertas). Sin una señal de
 * avance, el visitante no sabe cuánto falta y abandona antes. Es la misma
 * función que cumple la barra de progreso del carrusel de ofertas, aplicada
 * al scroll.
 *
 * Se dibuja con `transform: scaleX` en vez de `width` para que la animación
 * corra en el compositor (sin recalcular layout en cada frame de scroll).
 */

import React, { useEffect, useRef } from "react";

export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // `prefers-reduced-motion` no la oculta: es un indicador de posición, no
    // una animación decorativa. Lo que se evita es el `transition`, para que
    // siga al scroll sin interpolar.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bar = barRef.current;
    if (bar && reduce) bar.style.transition = "none";

    let frame = 0;
    const update = () => {
      frame = 0;
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      // Página que no scrollea: barra en cero, sin dividir por cero.
      const ratio = scrollable > 0 ? Math.min(el.scrollTop / scrollable, 1) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`;
    };

    // rAF: el evento scroll dispara muchas veces por frame; sin esto se
    // escribiría en el DOM decenas de veces entre repintados.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none"
    >
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-gradient-to-r from-blue-600 to-blue-400"
        style={{ transform: "scaleX(0)", transition: "transform 0.1s linear" }}
      />
    </div>
  );
}
