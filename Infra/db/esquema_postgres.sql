-- ==========================================
-- ECOSISTEMA CLICKS & GO - ARQUITECTURA DISTRIBUIDA INTERNACIONAL v3.6
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --- LIMPIEZA PREVENTIVA DE ENUMS Y TRIGGERS ---
DROP TRIGGER IF EXISTS trg_update_laptops_timestamp ON laptops;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- --- ENUMS DEL SISTEMA (Garantía de Integridad Zero Trust) ---
DO $$ BEGIN
    CREATE TYPE currency_type AS ENUM ('USD', 'ARS', 'EUR', 'MXN', 'COP', 'CLP', 'BRL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE impact_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------
-- LIMPIEZA SOBERANA DE TABLAS (Evita colisiones de esquema)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS hardware_news CASCADE;
DROP TABLE IF EXISTS price_alerts CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS price_histories CASCADE;
DROP TABLE IF EXISTS laptops CASCADE;
DROP TABLE IF EXISTS retailers CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------
-- MÓDULO 1: IDENTIDAD (Compatible con NextAuth.js)
-- ---------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified TIMESTAMPTZ,
    image TEXT,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type VARCHAR(255),
    scope VARCHAR(255),
    id_token TEXT,
    session_state VARCHAR(255),
    UNIQUE (provider, provider_account_id)
);

-- ---------------------------------------------------------
-- MÓDULO 2: ORÍGENES DE DATOS (Cazadores Internacionales)
-- ---------------------------------------------------------
CREATE TABLE retailers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    base_url TEXT NOT NULL,
    affiliate_tag VARCHAR(100), 
    country_code CHAR(2) NOT NULL DEFAULT 'AR',
    is_active BOOLEAN DEFAULT true,
    last_successful_scan TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_retailer_slug_country UNIQUE (slug, country_code),
    CONSTRAINT uq_retailer_name_country UNIQUE (name, country_code)
);

-- ---------------------------------------------------------
-- MÓDULO 3: CATÁLOGO Y MOTOR DE IA MULTI-REGIÓN
-- ---------------------------------------------------------
CREATE TABLE laptops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID NOT NULL REFERENCES retailers(id) ON DELETE RESTRICT,
    sku_original VARCHAR(100) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(150) NOT NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'AR',
    
    procesador VARCHAR(100),
    ram_gb INTEGER,
    disco_gb INTEGER,
    tarjeta_video VARCHAR(100),
    display_inches DECIMAL(4, 1),
    metadata_extra JSONB DEFAULT '{}',
    
    deal_score DECIMAL(3, 1),
    ai_reasoning TEXT,
    
    url_afiliado TEXT NOT NULL, 
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_retailer_sku UNIQUE (retailer_id, sku_original)
);

-- Historial de Precios (nombre en plural: convención ActiveRecord de Rails)
CREATE TABLE price_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    laptop_id UUID NOT NULL REFERENCES laptops(id) ON DELETE CASCADE,
    precio_actual DECIMAL(12, 2) NOT NULL,
    precio_original DECIMAL(12, 2), 
    moneda currency_type DEFAULT 'USD',
    tipo_cambio_aplicado DECIMAL(10, 2),
    es_oferta_destacada BOOLEAN DEFAULT false,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- MÓDULO 4: INTERACCIÓN DE USUARIO GLOBAL
-- ---------------------------------------------------------
CREATE TABLE user_favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    laptop_id UUID REFERENCES laptops(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, laptop_id)
);

CREATE TABLE price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    laptop_id UUID REFERENCES laptops(id) ON DELETE CASCADE,
    target_price DECIMAL(12, 2) NOT NULL, 
    moneda currency_type DEFAULT 'USD',  
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- MÓDULO 5: RADAR AGÉNTICO DE NOTICIAS (Escaneo cada 24hs)
-- ---------------------------------------------------------
CREATE TABLE hardware_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    impact_score impact_level DEFAULT 'MEDIUM',
    country_code CHAR(2),
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- TRIGGERS E ÍNDICES DE RENDIMIENTO PRO
-- ---------------------------------------------------------
CREATE INDEX idx_laptops_retailer ON laptops(retailer_id);
CREATE INDEX idx_laptops_country ON laptops(country_code); 
CREATE INDEX idx_price_history_laptop ON price_histories(laptop_id, recorded_at DESC);
CREATE INDEX idx_laptops_metadata ON laptops USING GIN (metadata_extra);
CREATE INDEX idx_hardware_news_recorded ON hardware_news(recorded_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_update_laptops_timestamp
    BEFORE UPDATE ON laptops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();