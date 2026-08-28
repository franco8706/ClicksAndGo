/**
 * =====================================================================
 * 🛡️ Serialización SEGURA de JSON-LD
 * =====================================================================
 *
 * `JSON.stringify` **no escapa** `<`, `>` ni `&`. Al inyectar el resultado
 * dentro de un `<script type="application/ld+json">` con
 * `dangerouslySetInnerHTML`, el navegador cierra la etiqueta en la primera
 * secuencia `</script` que aparezca DENTRO de una cadena JSON — y lo que
 * sigue se ejecuta como HTML.
 *
 * Por qué no es teórico acá: el `name` y la `brand` del producto llegan del
 * feed de afiliados. Newegg (vía Rakuten) es un marketplace donde el título
 * lo escribe un vendedor tercero, así que es entrada NO confiable que
 * atraviesa el pipeline y termina en esta etiqueta. Medido el 2026-08-24
 * sobre 100 productos reales de producción: 8 ya traen `<`, `>` o `&` en el
 * nombre (benignos — "Dual Bluetooth & 2.4 GHz"—, pero prueban que el canal
 * transporta esos caracteres sin filtrar hasta el HTML).
 *
 * Un título como `Mouse </script><img src=x onerror=...>` sería XSS
 * ALMACENADO: se sirve a todo visitante de esa ficha. Y la CSP del sitio
 * lleva `script-src 'unsafe-inline'`, así que no lo frenaría.
 *
 * El escape va sobre la cadena YA serializada y usa secuencias `\uXXXX`,
 * que son JSON válido: un parser (Google incluido) las lee idénticas al
 * carácter original, así que el marcado estructurado no pierde nada.
 *
 * U+2028 y U+2029 se escapan por un motivo distinto: son saltos de línea
 * legales en JSON pero ilegales dentro de un literal de JavaScript, y
 * rompen el parseo si el bloque se reutiliza en un contexto JS.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
