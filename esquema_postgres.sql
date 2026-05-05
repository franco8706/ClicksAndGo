-- ==========================================
-- ECOSISTEMA CLICKS & GO - SCHEMA POSTGRESQL
-- ==========================================

-- Habilitamos la extensión para usar UUIDs (Mejor práctica que IDs numéricos)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE notebooks_procesadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Encapsulamiento de Identidad
    retailer VARCHAR(50) NOT NULL, -- ej: 'Lenovo', 'Amazon'
    sku_original VARCHAR(100) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(150) NOT NULL,
    
    -- Especificaciones Core (Propiedades de la Clase)
    procesador VARCHAR(100),
    ram_gb INTEGER,
    disco_gb INTEGER,
    tarjeta_video VARCHAR(100),
    
    -- Inteligencia de Negocio
    rubro VARCHAR(50), -- 'GAMER', 'OFICINA', 'ESTUDIANTE' (Definido por el Agente Analista)
    precio_actual DECIMAL(10, 2) NOT NULL,
    es_oferta_destacada BOOLEAN DEFAULT false,
    url_afiliado TEXT NOT NULL,
    
    -- POLIMORFISMO DE DATOS: El campo mágico
    -- Aquí guardamos especificaciones extra (ej: "teclado rgb") sin romper la tabla
    metadata_extra JSONB DEFAULT '{}',
    
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para que tu web vuele al buscar
CREATE INDEX idx_rubro ON notebooks_procesadas(rubro);
CREATE INDEX idx_metadata ON notebooks_procesadas USING GIN (metadata_extra);