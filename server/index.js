import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SCHEMA_PATH = path.join(ROOT_DIR, 'database', 'schema.sql');

const PORT = Number(process.env.PORT || 3001);
const DATABASE_URL = process.env.DATABASE_URL?.trim() || '';

let pool = null;
let dbReady = false;

async function initDatabase() {
  if (!DATABASE_URL) {
    console.log('[AutoDoc DB] DATABASE_URL no configurado. Operando en modo sin BD externa.');
    return;
  }

  const useSsl =
    DATABASE_URL.includes('.render.com') ||
    DATABASE_URL.includes('sslmode=require') ||
    process.env.PGSSL === 'true';

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    await pool.query(schemaSql);
    dbReady = true;
    console.log('[AutoDoc DB] Conectado a PostgreSQL y tablas verificadas.');
  } catch (err) {
    console.error('[AutoDoc DB] Error inicializando PostgreSQL:', err.message);
    dbReady = false;
  }
}

function mapDbRowToRecord(row) {
  return {
    id: row.id,
    codigo: row.codigo,
    tipo: row.tipo,
    beneficiario: row.beneficiario,
    dni: row.dni,
    carrera: row.carrera,
    fechaEmision: row.fecha_emision,
    creadoEn: row.creado_en,
    payload: row.payload ?? undefined,
  };
}

function mapDbRowToAudit(row) {
  return {
    id: row.id,
    fechaHora: row.fecha_hora,
    usuario: row.usuario,
    accion: row.accion,
    modulo: row.modulo,
    detalle: row.detalle,
  };
}

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', async (_req, res) => {
  if (!pool || !dbReady) {
    return res.json({ ok: true, database: 'local', connected: false });
  }
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true, database: 'postgresql', connected: true });
  } catch {
    return res.json({ ok: true, database: 'local', connected: false });
  }
});

app.get('/api/records', async (_req, res) => {
  if (!pool || !dbReady) {
    return res.status(503).json({ error: 'PostgreSQL no disponible' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM issued_records ORDER BY created_at DESC LIMIT 500',
    );
    return res.json({ records: rows.map(mapDbRowToRecord) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', async (req, res) => {
  if (!pool || !dbReady) {
    return res.status(503).json({ error: 'PostgreSQL no disponible' });
  }
  const r = req.body;
  if (!r?.id || !r?.codigo || !r?.beneficiario) {
    return res.status(400).json({ error: 'Datos de registro incompletos' });
  }
  try {
    await pool.query(
      `INSERT INTO issued_records
        (id, codigo, tipo, beneficiario, dni, carrera, fecha_emision, creado_en, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        r.id,
        r.codigo,
        r.tipo,
        r.beneficiario,
        r.dni ?? '—',
        r.carrera ?? '',
        r.fechaEmision ?? '',
        r.creadoEn ?? '',
        r.payload ? JSON.stringify(r.payload) : null,
      ],
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/records/bulk', async (req, res) => {
  if (!pool || !dbReady) {
    return res.status(503).json({ error: 'PostgreSQL no disponible' });
  }
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  const auditLogs = Array.isArray(req.body?.auditLogs) ? req.body.auditLogs : [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of records) {
      if (!r?.id || !r?.codigo) continue;
      await client.query(
        `INSERT INTO issued_records
          (id, codigo, tipo, beneficiario, dni, carrera, fecha_emision, creado_en, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          r.id,
          r.codigo,
          r.tipo,
          r.beneficiario ?? '',
          r.dni ?? '—',
          r.carrera ?? '',
          r.fechaEmision ?? '',
          r.creadoEn ?? '',
          r.payload ? JSON.stringify(r.payload) : null,
        ],
      );
    }
    for (const a of auditLogs) {
      if (!a?.id || !a?.accion) continue;
      await client.query(
        `INSERT INTO audit_logs (id, fecha_hora, usuario, accion, modulo, detalle)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.fechaHora ?? '', a.usuario ?? 'admin', a.accion, a.modulo ?? '', a.detalle ?? ''],
      );
    }
    await client.query('COMMIT');
    return res.json({ ok: true, importedRecords: records.length, importedAudit: auditLogs.length });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/records', async (_req, res) => {
  if (!pool || !dbReady) {
    return res.status(503).json({ error: 'PostgreSQL no disponible' });
  }
  try {
    await pool.query('DELETE FROM issued_records');
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit', async (_req, res) => {
  if (!pool || !dbReady) {
    return res.status(503).json({ error: 'PostgreSQL no disponible' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500',
    );
    return res.json({ logs: rows.map(mapDbRowToAudit) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit', async (req, res) => {
  if (!pool || !dbReady) {
    return res.status(503).json({ error: 'PostgreSQL no disponible' });
  }
  const a = req.body;
  if (!a?.id || !a?.accion) {
    return res.status(400).json({ error: 'Evento de auditoría inválido' });
  }
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, fecha_hora, usuario, accion, modulo, detalle)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.fechaHora ?? '', a.usuario ?? 'admin', a.accion, a.modulo ?? '', a.detalle ?? ''],
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/audit', async (_req, res) => {
  if (!pool || !dbReady) {
    return res.status(503).json({ error: 'PostgreSQL no disponible' });
  }
  try {
    await pool.query('DELETE FROM audit_logs');
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Servir frontend compilado de Vite en producción (Render Web Service)
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

await initDatabase();

app.listen(PORT, () => {
  console.log(`[AutoDoc Server] Escuchando en puerto ${PORT}`);
});
