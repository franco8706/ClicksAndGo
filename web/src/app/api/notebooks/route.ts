import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// 1. Abstracción de la Conexión: Usamos un Pool para manejar múltiples peticiones eficientemente
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Descomentá la siguiente línea si tu base de datos en la nube (AWS/Google) requiere SSL
  // ssl: { rejectUnauthorized: false } 
});

export async function GET() {
  try {
    // 2. Solicitamos una conexión al Pool
    const client = await pool.connect();
    
    // 3. Ejecutamos la consulta a la misma tabla que alimenta tu motor Rust
    const result = await client.query(`
      SELECT 
        id, 
        retailer, 
        sku_original, 
        marca, 
        modelo, 
        precio_actual, 
        url_afiliado,
        es_oferta_destacada
      FROM notebooks_procesadas 
      ORDER BY fecha_actualizacion DESC 
      LIMIT 50
    `);
    
    // 4. Liberamos la conexión inmediatamente
    client.release();

    // 5. Encapsulamiento: Formateamos la respuesta para que coincida con el contrato del Frontend
    const laptops = result.rows.map(row => ({
      id: row.id?.toString() || row.sku_original, // Fallback al SKU si el ID es nulo
      retailer: row.retailer,
      marca: row.marca,
      modelo: row.modelo,
      precio_actual: parseFloat(row.precio_actual), // Aseguramos que sea numérico
      url_afiliado: row.url_afiliado,
      es_oferta_destacada: row.es_oferta_destacada,
      category: "all" // Podés agregar lógica para clasificar por "gaming", "workstation", etc.
    }));

    return NextResponse.json(laptops);

  } catch (error) {
    console.error("🚨 Error crítico en el puente de la BD:", error);
    return NextResponse.json(
      { error: "Error interno al conectar con la capa de persistencia" }, 
      { status: 500 }
    );
  }
}
