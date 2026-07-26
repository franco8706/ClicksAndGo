"use client";

/**
 * Reveal-on-scroll: la sección entra con fade+lift la primera vez que
 * asoma al viewport (IntersectionObserver, one-shot). Presentacional
 * puro — envuelve children ya renderizados por el server (SSR intacto:
 * el contenido está en el HTML desde el primer byte; solo se anima).
 * `prefers-reduced-motion` lo desactiva vía CSS (ver reveal-init).
 */

import React, { useEffect, useRef, useState } from "react";

interface RevealProps {
  readonly children: React.ReactNode;
  /** Retardo opcional en ms (escalonar secciones hermanas). */
  readonly delayMs?: number;
  readonly className?: string;
}

export default function Reveal({ children, delayMs = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sin soporte de IO (bots/navegadores viejos): mostrar directo.
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fallback one-shot sin IO; no cascada (corre una sola vez)
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    // 🛡️ Red de seguridad: si a los 3s el IO no disparó (viewport atípico,
    // crawler, herramienta de captura), el contenido se muestra igual.
    // La animación es un realce — nunca una condición para ver el sitio.
    const failsafe = setTimeout(() => {
      setShown(true);
      io.disconnect();
    }, 3000);
    return () => {
      io.disconnect();
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-init ${shown ? "reveal-in" : ""} ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
