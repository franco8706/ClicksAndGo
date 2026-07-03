-- =====================================================================
-- CLICKS & GO — Auth v1.0 Migration
-- Ejecutar sobre PostgreSQL (Cloud SQL) con permisos de ALTER TABLE.
-- Idempotente: usa IF NOT EXISTS y IF EXISTS en todos los cambios.
-- =====================================================================

-- 1. Columnas de perfil extendido en users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone    VARCHAR(25);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city     VARCHAR(100);

-- 2. Sessions — requerida por NextAuth (database strategy)
CREATE TABLE IF NOT EXISTS sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires       TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user  ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- 3. Verification tokens — magic links de Resend/email
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token      VARCHAR(255) NOT NULL,
    expires    TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (identifier, token)
);
CREATE INDEX IF NOT EXISTS idx_vtoken_token ON verification_tokens(token);
