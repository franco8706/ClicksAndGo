import "server-only";

import type {
  Adapter,
  AdapterUser,
  AdapterAccount,
  AdapterSession,
  VerificationToken,
} from "next-auth/adapters";
import { railsFetch } from "@/lib/railsApi";

/**
 * =====================================================================
 * 🔐 Adapter de NextAuth servido por Rails
 * =====================================================================
 *
 * Reemplaza al adapter que abría un `Pool` de Postgres propio dentro de
 * Next.js y hacía 14 queries directas.
 *
 * ## Por qué
 *
 * `clicks-db2` es db-f1-micro: acepta 25 conexiones en total y quedan ~20
 * para la app. Con `maxScale: 50` y un pool por instancia, Next.js solo podía
 * pedir hasta 150 — y NextAuth corre con `strategy: "database"`, o sea que
 * CADA request de un usuario logueado consultaba Postgres.
 *
 * Pasar por Rails no elimina esas conexiones: las CONCENTRA. En vez de dos
 * servicios compitiendo por 20, queda uno con presupuesto acotado
 * (maxScale 4 × 4 hilos = 16), que sí entra. Y de paso restituye la regla
 * central del proyecto: Rails es el único dueño de Postgres.
 *
 * ## ⚠️ Fechas: JSON no tiene tipo Date
 *
 * El driver de Postgres devolvía objetos `Date`. Al pasar por HTTP se
 * convierten en cadenas ISO, y NextAuth COMPARA `session.expires` como fecha
 * — con una cadena, la sesión se rompe de formas raras y silenciosas. Por eso
 * cada fecha se rehidrata explícitamente al volver de Rails. Es el detalle que
 * hace que esta migración funcione o falle sin ruido.
 *
 * ## Reintentos
 *
 * Las lecturas se reintentan (Rails corre con `minScale: 0` y un cold start no
 * puede desloguear a nadie). Las escrituras NO idempotentes —crear usuario,
 * crear sesión— van sin reintento: repetirlas chocaría contra una constraint
 * de unicidad. `updateSession` y los borrados sí se reintentan porque dejan el
 * mismo estado.
 */

const BASE = "/api/v1/auth";

/** `null` si Rails no devolvió nada útil; nunca lanza por un cuerpo vacío. */
async function leerJson<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  const texto = await res.text();
  if (!texto || texto === "null") return null;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}

async function post<T>(ruta: string, cuerpo: unknown, reintentar = false): Promise<T | null> {
  const res = await railsFetch(`${BASE}${ruta}`, {
    method: "POST",
    body: JSON.stringify(cuerpo),
    retryUnsafe: reintentar,
  });
  return leerJson<T>(res);
}

/* ── Rehidratación de fechas ───────────────────────────────────────────
   Rails las serializa como cadenas ISO. NextAuth espera `Date`. */

type UsuarioCrudo = Omit<AdapterUser, "emailVerified"> & { emailVerified: string | null };
type SesionCruda = Omit<AdapterSession, "expires"> & { expires: string };

function aUsuario(u: UsuarioCrudo | null): AdapterUser | null {
  if (!u) return null;
  return { ...u, emailVerified: u.emailVerified ? new Date(u.emailVerified) : null };
}

function aSesion(s: SesionCruda | null): AdapterSession | null {
  if (!s) return null;
  return { ...s, expires: new Date(s.expires) };
}

export function RailsAdapter(): Adapter {
  return {
    // ── Usuarios ──────────────────────────────────────────────────────

    async createUser(user) {
      const creado = await post<UsuarioCrudo>("/users", {
        name: user.name ?? null,
        email: user.email,
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      });
      // Un alta fallida NO puede degradar en silencio: sin usuario no hay
      // sesión, y devolver algo inventado dejaría al visitante en un limbo.
      if (!creado) throw new Error("Rails no pudo crear el usuario");
      return aUsuario(creado)!;
    },

    async getUser(id) {
      const res = await railsFetch(`${BASE}/users/${encodeURIComponent(id)}`);
      return aUsuario(await leerJson<UsuarioCrudo>(res));
    },

    async getUserByEmail(email) {
      // POST, no GET: el email es dato personal y una URL termina en los logs.
      return aUsuario(await post<UsuarioCrudo>("/users/lookup", { email }, true));
    },

    async getUserByAccount({ provider, providerAccountId }) {
      return aUsuario(
        await post<UsuarioCrudo>("/users/lookup", { provider, providerAccountId }, true)
      );
    },

    async updateUser(user) {
      const res = await railsFetch(`${BASE}/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
        }),
        retryUnsafe: true, // idempotente: el mismo PATCH deja el mismo estado
      });
      const actualizado = aUsuario(await leerJson<UsuarioCrudo>(res));
      if (!actualizado) throw new Error("Rails no pudo actualizar el usuario");
      return actualizado;
    },

    async deleteUser(userId) {
      await railsFetch(`${BASE}/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        retryUnsafe: true,
      });
    },

    // ── Cuentas OAuth ─────────────────────────────────────────────────

    async linkAccount(account) {
      // Rails hace upsert por (provider, providerAccountId), así que repetirlo
      // es seguro: reautenticarse refresca los tokens en vez de duplicar.
      await post("/accounts", account, true);
      return account as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await post("/accounts/unlink", { provider, providerAccountId }, true);
    },

    // ── Sesiones ──────────────────────────────────────────────────────

    async createSession(session) {
      // Sin reintento: `session_token` es único y repetir el POST tras una
      // respuesta perdida chocaría contra la constraint.
      const creada = await post<SesionCruda>("/sessions", {
        userId: session.userId,
        sessionToken: session.sessionToken,
        expires: session.expires,
      });
      if (!creada) throw new Error("Rails no pudo crear la sesión");
      return aSesion(creada)!;
    },

    async getSessionAndUser(sessionToken) {
      // 🔥 El camino más caliente: corre en CADA request de un usuario
      // logueado. Se reintenta porque Rails escala desde cero y un cold
      // start jamás puede traducirse en un cierre de sesión.
      const datos = await post<{ session: SesionCruda; user: UsuarioCrudo }>(
        "/sessions/lookup",
        { sessionToken },
        true
      );
      if (!datos?.session || !datos?.user) return null;
      return { session: aSesion(datos.session)!, user: aUsuario(datos.user)! };
    },

    async updateSession(session) {
      return aSesion(
        await post<SesionCruda>(
          "/sessions/update",
          { sessionToken: session.sessionToken, expires: session.expires },
          true
        )
      );
    },

    async deleteSession(sessionToken) {
      await post("/sessions/delete", { sessionToken }, true);
    },

    // ── Magic links ───────────────────────────────────────────────────

    async createVerificationToken(token) {
      const creado = await post<VerificationToken & { expires: string }>(
        "/verification_tokens",
        token
      );
      if (!creado) return null;
      return { ...creado, expires: new Date(creado.expires) };
    },

    async useVerificationToken({ identifier, token }) {
      // ⚠️ SIN reintento, a propósito. Consumir un magic link lo BORRA: si el
      // primer intento tuvo éxito y se perdió la respuesta, el reintento
      // devolvería null y el visitante vería un enlace "inválido" que en
      // realidad acababa de funcionar.
      const usado = await post<VerificationToken & { expires: string }>(
        "/verification_tokens/use",
        { identifier, token }
      );
      if (!usado) return null;
      return { ...usado, expires: new Date(usado.expires) };
    },
  };
}
