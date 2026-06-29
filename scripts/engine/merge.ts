import { createHash } from 'node:crypto';
import { Alerta } from './types.js';

const MAX_ALERTAS = 60;

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

export function mergeAlertas(existing: Alerta[], incoming: Alerta[]): Alerta[] {
  const now  = new Date().toISOString();
  const seen = new Set<string>();
  const out: Alerta[] = [];

  // Primero los incoming (más recientes); preservar publicadoEn si ya existía
  const existingByKey = new Map<string, Alerta>();
  for (const a of existing) {
    for (const k of dedupKeys(a)) existingByKey.set(k, a);
  }

  for (const a of incoming) {
    const keys = dedupKeys(a);
    if (keys.some(k => seen.has(k))) continue;

    // Recuperar publicadoEn original si es una alerta conocida
    const prev = keys.map(k => existingByKey.get(k)).find(Boolean);
    const publicadoEn = prev?.publicadoEn ?? a.publicadoEn ?? now;

    keys.forEach(k => seen.add(k));
    out.push({ ...a, publicadoEn, actualizadoEn: now });
  }

  // Luego los existing que no son duplicados de los incoming
  for (const a of existing) {
    const keys = dedupKeys(a);
    if (keys.some(k => seen.has(k))) continue;
    keys.forEach(k => seen.add(k));
    out.push({ ...a, actualizadoEn: now });
  }

  // Ordenar por fecha desc (fecha ISO lexicográfica funciona directo)
  out.sort((a, b) => b.fecha.localeCompare(a.fecha));

  return out.slice(0, MAX_ALERTAS);
}
