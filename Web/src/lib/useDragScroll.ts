"use client";

import React from "react";

/**
 * Arrastrar con el mouse para desplazar una tira horizontal.
 *
 * En una tira con `overflow-x`, el visitante de escritorio solo podía moverse
 * con las flechas o con shift+rueda: agarrar y tirar —lo natural cuando el
 * cursor ya está sobre las tarjetas— no hacía nada. En táctil el navegador ya
 * lo resuelve solo; esto cubre el mouse.
 *
 * Devuelve las props para el elemento scrolleable y `dragging`, útil para
 * cambiar el cursor de "agarrable" a "agarrando".
 */
export function useDragScroll<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [dragging, setDragging] = React.useState(false);
  // En refs y no en estado: cambian en cada `mousemove` y no deben re-renderizar.
  const inicio = React.useRef({ x: 0, scroll: 0 });
  const arrastro = React.useRef(false);

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      // Solo botón principal: con el secundario se abre el menú contextual y
      // con el central se pega, y ninguno debería arrastrar.
      if (e.button !== 0 || !ref.current) return;
      setDragging(true);
      arrastro.current = false;
      inicio.current = { x: e.clientX, scroll: ref.current.scrollLeft };
    },
    [ref],
  );

  const onMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !ref.current) return;
      const delta = e.clientX - inicio.current.x;
      // Umbral de 4px: sin esto, el temblor de la mano al hacer clic contaba
      // como arrastre y el enlace de la tarjeta no se abría nunca.
      if (Math.abs(delta) > 4) arrastro.current = true;
      ref.current.scrollLeft = inicio.current.scroll - delta;
    },
    [dragging, ref],
  );

  const terminar = React.useCallback(() => setDragging(false), []);

  /**
   * Cancela el clic que sigue a un arrastre.
   *
   * Al soltar después de tirar, el navegador dispara `click` sobre la tarjeta
   * que quedó bajo el cursor: sin esto, desplazar la tira abría un producto al
   * azar. Va en la fase de captura para adelantarse al handler de la tarjeta.
   */
  const onClickCapture = React.useCallback((e: React.MouseEvent) => {
    if (arrastro.current) {
      e.preventDefault();
      e.stopPropagation();
      arrastro.current = false;
    }
  }, []);

  return {
    dragging,
    dragProps: {
      onMouseDown,
      onMouseMove,
      onMouseUp: terminar,
      onMouseLeave: terminar,
      onClickCapture,
    },
  };
}
