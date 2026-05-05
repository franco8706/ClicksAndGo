import type { Metadata } from "next";
// 1. Eliminamos las importaciones de 'next/font/google'
import "./globals.css";

export const metadata: Metadata = {
  title: "Clicks & go | AI Laptop Deals",
  description: "Sistema agéntico para recomendaciones de laptops",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* 2. Usamos fuentes del sistema temporales (sans-serif) para destrabar el build */}
      <body className="antialiased bg-gray-950 text-gray-100 font-sans">
        {children}
      </body>
    </html>
  );
}