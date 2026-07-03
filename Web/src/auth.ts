import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Facebook from "next-auth/providers/facebook";
import Resend from "next-auth/providers/resend";
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";
import { pool } from "@/lib/db";

/* ── TypeScript augmentation ─────────────────────────────────────── */
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

/* ── Custom Adapter (snake_case schema) ───────────────────────────────
   @auth/pg-adapter usa camelCase con comillas ("emailVerified", "userId").
   Nuestro esquema usa snake_case estándar de PostgreSQL. Este adapter
   mapea manualmente entre las dos convenciones.
──────────────────────────────────────────────────────────────────── */
function ClicksAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const { rows } = await pool.query(
        `INSERT INTO users (id, name, email, email_verified, image)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         RETURNING id, name, email, email_verified AS "emailVerified", image`,
        [user.name ?? null, user.email, user.emailVerified ?? null, user.image ?? null]
      );
      return rows[0];
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const { rows } = await pool.query(
        `SELECT id, name, email, email_verified AS "emailVerified", image
         FROM users WHERE id = $1`,
        [id]
      );
      return rows[0] ?? null;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const { rows } = await pool.query(
        `SELECT id, name, email, email_verified AS "emailVerified", image
         FROM users WHERE email = $1`,
        [email]
      );
      return rows[0] ?? null;
    },

    async getUserByAccount({
      provider,
      providerAccountId,
    }: Pick<AdapterAccount, "provider" | "providerAccountId">): Promise<AdapterUser | null> {
      const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.email_verified AS "emailVerified", u.image
         FROM users u
         JOIN accounts a ON u.id = a.user_id
         WHERE a.provider = $1 AND a.provider_account_id = $2`,
        [provider, providerAccountId]
      );
      return rows[0] ?? null;
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      const { rows } = await pool.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             email_verified = COALESCE($3, email_verified),
             image = COALESCE($4, image)
         WHERE id = $5
         RETURNING id, name, email, email_verified AS "emailVerified", image`,
        [user.name ?? null, user.email ?? null, user.emailVerified ?? null, user.image ?? null, user.id]
      );
      return rows[0];
    },

    async deleteUser(userId: string): Promise<void> {
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount> {
      await pool.query(
        `INSERT INTO accounts
         (id, user_id, type, provider, provider_account_id,
          refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (provider, provider_account_id) DO UPDATE
         SET access_token = EXCLUDED.access_token,
             refresh_token = EXCLUDED.refresh_token,
             expires_at = EXCLUDED.expires_at`,
        [
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token ?? null,
          account.access_token ?? null,
          account.expires_at ?? null,
          account.token_type ?? null,
          account.scope ?? null,
          account.id_token ?? null,
          account.session_state ?? null,
        ]
      );
      return account;
    },

    async unlinkAccount({ provider, providerAccountId }: Pick<AdapterAccount, "provider" | "providerAccountId">): Promise<void> {
      await pool.query(
        `DELETE FROM accounts WHERE provider = $1 AND provider_account_id = $2`,
        [provider, providerAccountId]
      );
    },

    async createSession(session: { sessionToken: string; userId: string; expires: Date }): Promise<AdapterSession> {
      await pool.query(
        `INSERT INTO sessions (id, user_id, session_token, expires)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [session.userId, session.sessionToken, session.expires]
      );
      return { sessionToken: session.sessionToken, userId: session.userId, expires: session.expires };
    },

    async getSessionAndUser(
      sessionToken: string
    ): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const { rows } = await pool.query(
        `SELECT
           s.user_id AS "userId", s.session_token AS "sessionToken", s.expires,
           u.id AS uid, u.name, u.email, u.email_verified AS "emailVerified", u.image
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_token = $1`,
        [sessionToken]
      );
      if (!rows[0]) return null;
      const r = rows[0];
      return {
        session: { userId: r.userId, sessionToken: r.sessionToken, expires: r.expires },
        user: { id: r.uid, name: r.name, email: r.email, emailVerified: r.emailVerified, image: r.image },
      };
    },

    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ): Promise<AdapterSession | null> {
      const { rows } = await pool.query(
        `UPDATE sessions SET expires = $1 WHERE session_token = $2
         RETURNING user_id AS "userId", session_token AS "sessionToken", expires`,
        [session.expires, session.sessionToken]
      );
      return rows[0] ?? null;
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await pool.query(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken]);
    },

    async createVerificationToken(token: VerificationToken): Promise<VerificationToken> {
      const { rows } = await pool.query(
        `INSERT INTO verification_tokens (identifier, token, expires)
         VALUES ($1, $2, $3)
         RETURNING identifier, token, expires`,
        [token.identifier, token.token, token.expires]
      );
      return rows[0];
    },

    async useVerificationToken({
      identifier,
      token,
    }: {
      identifier: string;
      token: string;
    }): Promise<VerificationToken | null> {
      const { rows } = await pool.query(
        `DELETE FROM verification_tokens
         WHERE identifier = $1 AND token = $2
         RETURNING identifier, token, expires`,
        [identifier, token]
      );
      return rows[0] ?? null;
    },
  };
}

/* ── NextAuth config ─────────────────────────────────────────────── */
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: ClicksAdapter(),

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
      ? [Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.AUTH_FROM_EMAIL ?? "noreply@clicksandgo.com" })]
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
