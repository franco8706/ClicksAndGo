"use client";

/**
 * Imagen de producto con degradación honesta.
 *
 * ⚖️ Por qué NO hay foto de stock genérica: mostrar la foto de OTRO
 * producto (o una foto decorativa) como si fuera el artículo listado es
 * una representación engañosa — el mismo vicio que se corrigió en el
 * copy (FTC §5, Directiva 2005/29/CE de prácticas desleales, Ley 24.240
 * art. 4). Si no hay imagen real del producto, se muestra un
 * **placeholder neutro con el ícono de su categoría**, que no simula
 * ser el producto.
 *
 * Última de las cuatro capas de la guarda de imágenes reales:
 *   1. Ingesta — `clean_image_url` (data_normalizer.py) verifica por HTTP
 *      que la URL devuelva 200 + Content-Type image/* antes de persistir.
 *   2. Postgres — CHECK `chk_laptops_no_stock_image` (migration_real_images_v6).
 *   3. Rails — `Laptop#real_image_url`: el DTO nunca emite un host de stock.
 *   4. Acá — se renderiza el ícono si la URL igual no es real, y `onError`
 *      cubre el caso vivo de una CDN que empieza a fallar (403/404 por
 *      hotlink protection) después de haber sido verificada.
 *
 * Las imágenes reales entran por el pipeline, nunca por seeds: feeds de
 * afiliados (Awin/CJ/Impact) y Amazon PA-API (ver Docs/redesign_plan.md).
 */

import React, { useState } from "react";
import Image from "next/image";
import {
  Laptop, Monitor, MonitorSmartphone, Keyboard, Mouse,
  Headphones, Webcam, Printer, Droplet, ImageOff,
} from "lucide-react";
import type { ProductType } from "@/types/product";
import { isRealProductImage } from "@/lib/productImage";
import { isRenderableImageHost } from "@/lib/imageHosts";

const TYPE_ICON: Partial<Record<ProductType, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>>> = {
  laptop: Laptop,
  desktop: Monitor,
  monitor: MonitorSmartphone,
  keyboard: Keyboard,
  mouse: Mouse,
  headphones: Headphones,
  webcam: Webcam,
  printer: Printer,
  supplies: Droplet,
};

interface ProductImageProps {
  /** `null` cuando Rails no tiene foto real del producto (el caso normal). */
  readonly src?: string | null;
  readonly alt: string;
  readonly productType?: string;
  /** `sizes` de next/image (responsive). */
  readonly sizes: string;
  /** Clases del <Image> cuando hay foto real. */
  readonly imageClassName?: string;
  /** Tamaño del ícono del placeholder. */
  readonly iconSize?: number;
  readonly quality?: number;
}

export default function ProductImage({
  src, alt, productType, sizes, imageClassName = "", iconSize = 44, quality = 90,
}: ProductImageProps) {
  const normalized = src?.replace(/^http:\/\//, "https://");
  const [failed, setFailed] = useState(false);

  /* Dos preguntas distintas, y hay que hacer las dos:
   *   · `isRealProductImage`  — ¿se PUEDE mostrar? (legal: no es foto de stock)
   *   · `isRenderableImageHost` — ¿se VA A poder servir? (técnico: el host está
   *     en `remotePatterns`, si no `next/image` responde 400 y la foto no llega)
   * Preguntar solo la primera fue el bug del 2026-08-10: la Web renderizaba un
   * <Image> condenado al 400, y el `onError` de abajo lo tapaba con el ícono de
   * categoría — el catálogo se veía genérico teniendo las fotos en la DB. */
  const isReal = isRealProductImage(normalized);
  const isRenderable = isRenderableImageHost(normalized);
  const showPhoto = isReal && isRenderable && !failed;
  const Icon = TYPE_ICON[(productType || "laptop") as ProductType] || ImageOff;

  /* Una foto real que se descarta solo por configuración es un fallo de
   * despliegue, no una degradación honesta: hay que verlo en desarrollo en vez
   * de descubrirlo mirando el sitio meses después. En producción se calla —
   * `npm run check:image-hosts` lo audita contra el catálogo en vivo. */
  if (process.env.NODE_ENV !== "production" && isReal && !isRenderable) {
    console.warn(
      `[ProductImage] "${normalized}" es una foto real pero su host no está en ` +
        `PRODUCT_IMAGE_HOSTS (src/lib/imageHosts.ts): next/image la rechazaría ` +
        `con 400. Se muestra el ícono de categoría. Agregá el host a la lista.`,
    );
  }

  if (showPhoto) {
    return (
      <Image
        src={normalized!}
        alt={alt}
        fill
        quality={quality}
        sizes={sizes}
        className={imageClassName}
        onError={() => setFailed(true)}
      />
    );
  }

  /* Placeholder de categoría — sin simular el producto.
   *
   * Fue el estado del 97% del catálogo hasta que Rakuten trajo las fotos
   * reales (hoy 2557 de 2625 productos tienen una). Sigue siendo el destino
   * de los que no la tienen, así que no puede ser una caja gris con un ícono
   * diminuto. Se compone de tres capas:
   *   1. `product-canvas` — malla de gradientes en el azul del sistema.
   *   2. Aro concéntrico que enmarca el ícono y le da escala.
   *   3. Ícono grande flotando, que reacciona al hover de la card.
   * Todo con los mismos tokens de color; nada de esto insinúa ser el
   * producto, que es la línea que no se cruza (ver nota legal arriba). */
  return (
    <div
      className="absolute inset-0 product-canvas flex items-center justify-center select-none overflow-hidden"
      aria-label={alt}
      role="img"
    >
      {/* Aros concéntricos: dan profundidad y centran la mirada. Escalan
          con el hover de la card padre (`group` en LaptopCard). */}
      <div
        aria-hidden
        className="absolute rounded-full border border-[#2563eb]/10 transition-transform duration-500 ease-out group-hover:scale-110"
        style={{ width: iconSize * 3.4, height: iconSize * 3.4 }}
      />
      <div
        aria-hidden
        className="absolute rounded-full border border-[#2563eb]/[0.07] transition-transform duration-700 ease-out group-hover:scale-125"
        style={{ width: iconSize * 5, height: iconSize * 5 }}
      />

      <Icon
        size={iconSize * 1.55}
        strokeWidth={1}
        className="relative text-[#8b95a5] float-soft transition-all duration-300 ease-out group-hover:text-[#2563eb] group-hover:scale-105"
      />
    </div>
  );
}
