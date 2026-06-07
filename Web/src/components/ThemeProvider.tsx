"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// 🛡️ Extracción de tipos dinámicos por herencia de componente para evitar romper contratos en actualizaciones
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * 🌗 ThemeProvider - Orquestador del Entorno Tecnológico Oscuro Premium v3.6
 * Envoltura perimetral con tipado estricto que fuerza la inicialización inmutable del tema oscuro,
 * mitigando parpadeos de estilos claros (FOUC) y asegurando una hidratación fluida de latencia cero.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      // 🛡️ REGLA ZERO TRUST: Colocamos las props externas primero para evitar que 
      // configuraciones accidentales del Layout anulen el comportamiento forzado del ecosistema.
      {...props}
      attribute="class"            // Soporte nativo y optimizado para selectores de clase en Tailwind v4
      defaultTheme="dark"          // Forzado determinista a entorno oscuro por defecto (NVIDIA Style)
      enableSystem={false}         // Desactiva la lectura del sistema operativo para blindar la identidad de marca
      disableTransitionOnChange    // Elimina micro-transiciones parásitas en la GPU durante los cambios de ruta
    >
      {children}
    </NextThemesProvider>
  );
}