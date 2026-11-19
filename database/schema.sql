-- Esquema oficial de base de datos PostgreSQL para AutoDoc La Salle
-- Se ejecuta automáticamente al iniciar el servidor (server/index.js)

CREATE TABLE IF NOT EXISTS issued_records (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  beneficiario TEXT NOT NULL,
  dni TEXT NOT NULL,
  carrera TEXT NOT NULL,
  fecha_emision TEXT NOT NULL,
  creado_en TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issued_records_created_at
  ON issued_records (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issued_records_dni
  ON issued_records (dni);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  fecha_hora TEXT NOT NULL,
  usuario TEXT NOT NULL,
  accion TEXT NOT NULL,
  modulo TEXT NOT NULL,
  detalle TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);
