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

const TYPE_ICON: Record<ProductType, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>> = {
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

  const showPhoto = isRealProductImage(normalized) && !failed;
  const Icon = TYPE_ICON[(productType || "laptop") as ProductType] || ImageOff;

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

  // Placeholder neutro: ícono de la categoría, sin simular el producto.
  return (
    <div
      className="absolute inset-0 flex items-center justify-center select-none"
      aria-label={alt}
      role="img"
    >
      <Icon size={iconSize} strokeWidth={1.25} className="text-[#c3c9d2]" />
    </div>
  );
}
