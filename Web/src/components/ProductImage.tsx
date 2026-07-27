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
 * Casos que se tratan como "sin imagen real":
 *  - URL vacía o inválida.
 *  - Foto de stock de Unsplash (las 22 sembradas en `seeds_products_multi`
 *    son decorativas, no del producto).
 *  - La CDN del fabricante falla (404/403 por hotlink protection) → onError.
 *
 * La solución definitiva es el pipeline: adaptador Amazon PAAPI + re-hospedar
 * las imágenes de los feeds de afiliados (ver Docs/redesign_plan.md).
 */

import React, { useState } from "react";
import Image from "next/image";
import {
  Laptop, Monitor, MonitorSmartphone, Keyboard, Mouse,
  Headphones, Webcam, Printer, Droplet, ImageOff,
} from "lucide-react";
import type { ProductType } from "@/types/product";

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

/** Hosts de fotos decorativas: nunca son la imagen real del producto. */
const STOCK_HOSTS = ["images.unsplash.com", "unsplash.com", "placehold.co", "via.placeholder.com"];

export function isRealProductImage(url?: string): boolean {
  if (!url || !url.startsWith("http")) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !STOCK_HOSTS.some((s) => host === s || host.endsWith(`.${s}`));
  } catch {
    return false;
  }
}

interface ProductImageProps {
  readonly src?: string;
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
