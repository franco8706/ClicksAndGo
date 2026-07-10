"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// 🛡️ Extracción de tipos dinámicos por herencia de componente para evitar romper contratos en actualizaciones
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * 🌗 ThemeProvider — Entorno claro (v5.0)
 * Fuerza el tema claro por defecto: fondo blanco, identidad consumer orientada
 * a la conversión de afiliados. El ADN estructural/animación es estilo NVIDIA,
 * pero sobre superficie clara (no el fondo oscuro anterior).
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"            // Selectores de clase para Tailwind v4
      defaultTheme="light"         // Fondo blanco por defecto
      enableSystem={false}         // Identidad de marca fija (no seguir al SO)
      disableTransitionOnChange    // Sin micro-transiciones parásitas al cambiar de ruta
    >
      {children}
    </NextThemesProvider>
  );
}