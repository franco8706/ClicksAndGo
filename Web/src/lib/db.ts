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

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSsl(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 3_000,
});
