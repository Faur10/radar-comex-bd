import { createHash } from 'node:crypto';
import { Alerta } from './types.js';

// El radar corre de lunes a viernes y cada corrida trae solo la ventana de
// las últimas 24-48hs (ver sources/*.ts) — no la semana completa. Por eso
// ya no se puede reemplazar el archivo entero: se mergea con lo existente
// y se retiene una ventana móvil de DIAS_RETENCION días, para que el sitio
// siempre muestre un panorama útil y no solo "lo de hoy".
const DIAS_RETENCION = 14;

function titleHash(titulo: string): string {
  const normalized = titulo.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

function dedupKeys(a: Alerta): string[] {
  const keys: string[] = [`hash:${titleHash(a.titulo)}`];

  if (a.normativaRef) {
    keys.push(`ref:${a.normativaRef.toLowerCase().trim()}`);
  }
  // Excluir URLs genéricas (API base, BORA home) del dedup por URL
  if (
    a.fuente?.url &&
    !a.fuente.url.endsWith('boletinoficial.gob.ar') &&
    !a.fuente.url.endsWith('api.bcra.gob.ar')
  ) {
    keys.push(`url:${a.fuente.url.toLowerCase()}`);
  }

  return keys;
}

function dentroDeRetencion(a: Alerta, cutoff: Date): boolean {
  return new Date(`${a.fecha}T00:00:00Z`).getTime() >= cutoff.getTime();
}

export function buildRollingAlertas(existing: Alerta[], incoming: Alerta[]): Alerta[] {
  const now    = new Date().toISOString();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - DIAS_RETENCION);
  cutoff.setUTCHours(0, 0, 0, 0);

  const seen = new Set<string>();
  const out: Alerta[] = [];

  // Para preservar publicadoEn original si la alerta ya existía
  const existingByKey = new Map<string, Alerta>();
  for (const a of existing) {
    for (const k of dedupKeys(a)) existingByKey.set(k, a);
  }

  // Primero las incoming (más recientes)
  for (const a of incoming) {
    const keys = dedupKeys(a);
    if (keys.some(k => seen.has(k))) continue;

    const prev = keys.map(k => existingByKey.get(k)).find(Boolean);
    const publicadoEn = prev?.publicadoEn ?? a.publicadoEn ?? now;

    keys.forEach(k => seen.add(k));
    out.push({ ...a, publicadoEn, actualizadoEn: now });
  }

  // Luego las existing que no son duplicados y siguen dentro de la ventana
  for (const a of existing) {
    const keys = dedupKeys(a);
    if (keys.some(k => seen.has(k))) continue;
    keys.forEach(k => seen.add(k));
    out.push(a);
  }

  return out
    .filter(a => dentroDeRetencion(a, cutoff))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}
