import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Facebook from "next-auth/providers/facebook";
import Resend from "next-auth/providers/resend";
import { RailsAdapter } from "@/lib/authRailsAdapter";

/* ── TypeScript augmentation ─────────────────────────────────────── */
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

/* ── Adapter ──────────────────────────────────────────────────────────
   Antes acá vivía `ClicksAdapter`: 14 queries directas contra Postgres con
   un `Pool` propio de Next.js. Se movió a Rails (`authRailsAdapter.ts` +
   `Api::V1::AuthController`).

   El motivo no es purismo arquitectónico. `clicks-db2` es db-f1-micro:
   acepta 25 conexiones y quedan ~20 para la app. Con `maxScale: 50` y un
   pool por instancia, Next.js solo podía pedir hasta 150 — y como NextAuth
   corre con `strategy: "database"`, CADA request de un usuario logueado
   consultaba la base. Concentrarlo en Rails deja un único presupuesto
   acotado (maxScale 4 × 4 hilos = 16) en vez de dos servicios compitiendo.
──────────────────────────────────────────────────────────────────── */

/* ── NextAuth config ─────────────────────────────────────────────── */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: RailsAdapter(),

  // 🛡️ Requerido en self-hosted (fuera de Vercel). La defensa contra
  // host-header injection en los callbacks OAuth / magic-links viene de
  // fijar AUTH_URL en el entorno (ej. https://clicks-and-go.com) — el flujo
  // usa esa URL canónica en vez del Host header entrante.
  trustHost: true,

  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
      : []),
    ...(process.env.AUTH_MICROSOFT_ID && process.env.AUTH_MICROSOFT_SECRET
      ? [MicrosoftEntraID({ clientId: process.env.AUTH_MICROSOFT_ID, clientSecret: process.env.AUTH_MICROSOFT_SECRET })]
      : []),
    ...(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
      ? [Facebook({ clientId: process.env.AUTH_FACEBOOK_ID, clientSecret: process.env.AUTH_FACEBOOK_SECRET })]
      : []),
    ...(process.env.AUTH_RESEND_KEY
      ? [Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.AUTH_FROM_EMAIL ?? "noreply@clicks-and-go.com" })]
      : []),
  ],

  pages: {
    signIn:        "/login",
    error:         "/login",
    verifyRequest: "/login?verify=1",
  },

  callbacks: {
    session({ session, user }) {
      if (session.user && user) session.user.id = user.id;
      return session;
    },
  },

  session: { strategy: "database" },
});
