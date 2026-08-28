import "server-only"; // credenciales de Postgres: nunca al bundle del navegador
import { Pool } from "pg";
import fs from "fs";

/* ── SSL de PostgreSQL ────────────────────────────────────────────────
   En producción exigimos TLS. Si se provee el certificado CA de Cloud SQL
   (PG_SSL_CA = ruta al server-ca.pem, o PG_SSL_CA_CONTENT con el PEM),
   verificamos la cadena (rejectUnauthorized: true) — bloquea MITM.
   Sin CA disponible, seguimos exigiendo TLS pero sin verificar la cadena
   (mejor que texto plano; documentar que se cargue el CA en prod real).
──────────────────────────────────────────────────────────────────────── */
function buildSsl(): false | { rejectUnauthorized: boolean; ca?: string } {
  if (process.env.NODE_ENV !== "production") return false;

  // Cloud SQL vía socket unix (/cloudsql/…): el Auth Proxy ya cifra el tramo a
  // la instancia; el socket local es plano, así que SSL no aplica (y rompería).
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes("/cloudsql/") || /host=\/(?:cloudsql|var|tmp)/.test(url)) return false;

  const caContent = process.env.PG_SSL_CA_CONTENT;
  const caPath = process.env.PG_SSL_CA;
  const ca = caContent || (caPath && fs.existsSync(caPath) ? fs.readFileSync(caPath, "utf8") : undefined);

  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false };
}

/* ── ⚠️ PRESUPUESTO DE CONEXIONES — leer antes de subir `max` ──────────
   `clicks-db2` es db-f1-micro: `max_connections = 25`, de las cuales 3 son
   del superusuario y ~2 del agente de Cloud SQL. Quedan ~20 para TODA la
   plataforma, y Next.js las comparte con Rails.

   Este pool no es marginal: NextAuth corre con `session: { strategy:
   "database" }`, así que CADA request de un usuario logueado hace
   `getSessionAndUser` contra Postgres. Con `max: 10` y `maxScale: 50` en
   Cloud Run, el techo teórico eran 500 conexiones contra 20 disponibles —
   25× por encima. Con tráfico bajo no se nota; un pico de usuarios
   autenticados vacía el pool de Postgres y tumba el sitio ENTERO, no solo
   el login.

   `max: 3` acota el peor caso por instancia. Las consultas del adapter son
   lookups indexados por token (milisegundos), así que 3 conexiones cubren
   una concurrencia alta por instancia; `idleTimeoutMillis` las devuelve al
   resto de la flota a los 30s.

   El arreglo de fondo NO es este número: es subir el tier de Cloud SQL o
   dejar de pegarle a Postgres desde Next.js (sesiones JWT, o mover la
   sesión detrás de Rails, que es el dueño declarado de la base).
   ──────────────────────────────────────────────────────────────────── */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSsl(),
  max: 3,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 3_000,
});
