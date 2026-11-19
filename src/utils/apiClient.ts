import type { AuditLogEntry, IssuedRecord } from '../types/documents.ts';

export interface DbHealthStatus {
  connected: boolean;
  database: 'postgresql' | 'local';
}

export async function fetchDbHealth(): Promise<DbHealthStatus> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return { connected: false, database: 'local' };
    const data = (await res.json()) as { connected?: boolean; database?: string };
    return {
      connected: Boolean(data.connected),
      database: data.connected && data.database === 'postgresql' ? 'postgresql' : 'local',
    };
  } catch {
    return { connected: false, database: 'local' };
  }
}

export async function fetchIssuedRecordsFromDb(): Promise<IssuedRecord[] | null> {
  try {
    const res = await fetch('/api/records');
    if (!res.ok) return null;
    const data = (await res.json()) as { records?: IssuedRecord[] };
    return Array.isArray(data.records) ? data.records : null;
  } catch {
    return null;
  }
}

export async function saveIssuedRecordToDb(record: IssuedRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearIssuedRecordsInDb(): Promise<boolean> {
  try {
    const res = await fetch('/api/records', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function bulkRestoreInDb(
  records: IssuedRecord[],
  auditLogs: AuditLogEntry[],
): Promise<boolean> {
  try {
    const res = await fetch('/api/records/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, auditLogs }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAuditLogsFromDb(): Promise<AuditLogEntry[] | null> {
  try {
    const res = await fetch('/api/audit');
    if (!res.ok) return null;
    const data = (await res.json()) as { logs?: AuditLogEntry[] };
    return Array.isArray(data.logs) ? data.logs : null;
  } catch {
    return null;
  }
}

export async function saveAuditLogToDb(entry: AuditLogEntry): Promise<boolean> {
  try {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearAuditLogsInDb(): Promise<boolean> {
  try {
    const res = await fetch('/api/audit', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
