"use client";

/**
 * Número que cuenta hacia arriba cuando entra en pantalla.
 *
 * Se usa en los contadores del catálogo y del escaparate de categorías: el
 * dato ya viene calculado del servidor (la Constitución prohíbe matemática de
 * negocio en el frontend), esto es **solo la presentación** de ese número.
 *
 * Reserva de espacio: el `<span>` fija su ancho con el valor FINAL desde el
 * primer render, así el contador no empuja el layout mientras sube — cero CLS.
 */

import React, { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Valor final. Ya calculado por el servidor. */
  readonly value: number;
  /** Duración de la cuenta en ms. */
  readonly durationMs?: number;
  readonly className?: string;
}

export default function CountUp({ value, durationMs = 900, className = "" }: CountUpProps) {
  // Arranca en el valor final: si JS no corre o el usuario pidió menos
  // movimiento, el número correcto ya está en pantalla.
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const yaCorrio = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || yaCorrio.current) return;

    // Con menos movimiento no se anima: `display` ya arranca en `value`, así
    // que no hace falta setearlo (hacerlo dispararía un render en cascada).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || yaCorrio.current) return;
        yaCorrio.current = true;
        observer.disconnect();

        const inicio = performance.now();
        let frame = 0;

        const paso = (ahora: number) => {
          const t = Math.min((ahora - inicio) / durationMs, 1);
          // easeOutExpo: arranca rápido y frena — se lee como un contador
          // que "aterriza" en su valor en vez de avanzar linealmente.
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setDisplay(Math.round(eased * value));
          if (t < 1) frame = requestAnimationFrame(paso);
        };

        setDisplay(0);
        frame = requestAnimationFrame(paso);
        return () => cancelAnimationFrame(frame);
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, durationMs]);

  /* Reserva de ancho SIN texto fantasma.
   *
   * La primera versión renderizaba un `<span>` oculto con el valor final para
   * fijar el ancho. Funcionaba visualmente, pero duplicaba el número en el
   * DOM: `textContent` devolvía "3030 productos" en vez de "30 productos" —
   * lo que rompe cualquier scraping, test o herramienta que lea el texto.
   *
   * En su lugar se reserva el espacio con `ch` (ancho del carácter "0") por
   * cada dígito del valor final, y `tabular-nums` fija el ancho de todos los
   * dígitos para que el número no "baile" mientras sube. Cero texto extra,
   * cero CLS. */
  const digitos = String(value).length;

  return (
    <span
      ref={ref}
      className={className}
      style={{
        display: "inline-block",
        minWidth: `${digitos}ch`,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {display}
    </span>
  );
}
