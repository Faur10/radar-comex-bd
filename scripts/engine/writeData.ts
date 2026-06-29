import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Alerta } from './types.js';

const DATA_PATH = resolve(process.cwd(), 'data', 'alertas.json');
const TMP_PATH  = DATA_PATH + '.tmp';

export function readExistingAlertas(): Alerta[] {
  if (!existsSync(DATA_PATH)) return [];
  try {
    const raw    = readFileSync(DATA_PATH, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Alerta[]) : [];
  } catch (err) {
    console.warn('[writeData] No se pudo leer alertas.json existente:', (err as Error).message);
    return [];
  }
}

export function writeAlertas(alertas: Alerta[]): void {
  const dir = dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const json = JSON.stringify(alertas, null, 2) + '\n';

  // Escritura atómica: primero al .tmp, luego rename (evita corrupción si el proceso muere)
  writeFileSync(TMP_PATH, json, 'utf-8');
  renameSync(TMP_PATH, DATA_PATH);

  console.log(`[writeData] data/alertas.json actualizado — ${alertas.length} alertas`);
}
