import { randomUUID } from 'node:crypto';
import { fetchBCRA }            from './sources/bcra.js';
import { fetchBoletin }         from './sources/boletin.js';
import { filterComex }          from './filterComex.js';
import { classifyWithAI }       from './ai/classify.js';
import { classifyWithFallback } from './ai/fallback.js';
import { mergeAlertas }         from './merge.js';
import { readExistingAlertas, writeAlertas } from './writeData.js';
import { RawNovedad, Alerta, AIResult } from './types.js';

// ── Utilidades ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

// ── Construcción de Alerta ────────────────────────────────────────────────────

async function buildAlerta(raw: RawNovedad): Promise<Alerta> {
  const now = new Date().toISOString();

  // Intentar IA, caer en fallback si falla o no hay key
  const aiResult: AIResult | null = await classifyWithAI(raw).catch(err => {
    console.warn('  [AI] Excepción inesperada, usando fallback:', (err as Error).message);
    return null;
  });

  const classified = aiResult ?? classifyWithFallback(raw);
  const modo        = aiResult ? 'AI' : 'fallback';

  console.log(`  [${modo}] ${classified.impacto.toUpperCase()} | ${classified.categoria} | "${classified.titulo.slice(0, 55)}"`);

  const slug = slugify(classified.titulo) || slugify(raw.titulo) || randomUUID().slice(0, 8);
  const id   = `${isoToday()}-${slug}-${randomUUID().slice(0, 6)}`;

  return {
    id,
    slug,
    organismo:    classified.organismo || raw.organismo,
    fecha:        raw.fecha,
    impacto:      classified.impacto,
    categoria:    classified.categoria,
    tags:         classified.tags,
    titulo:       classified.titulo,
    resumen:      classified.resumen,
    queSignifica: classified.queSignifica,
    fuente:       raw.fuente,
    normativaRef: raw.normativaRef,
    publicadoEn:  now,
    actualizadoEn: now,
  };
}

// ── Orquestador principal ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startTime = Date.now();
  const fechaAR = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

  console.log('\n══════════════════════════════════════════════════');
  console.log('  RADAR COMEX BD — Motor de actualización diaria');
  console.log(`  Fecha : ${fechaAR}`);
  console.log(`  IA    : ${process.env.GEMINI_API_KEY ? '✓ Gemini habilitado' : '✗ Fallback por reglas (sin GEMINI_API_KEY)'}`);
  console.log('══════════════════════════════════════════════════\n');

  // ── Paso 1: Fetch de todas las fuentes en paralelo ──────────────────────────
  console.log('[1/5] Obteniendo fuentes…');
  const [bcraResult, boletinResult] = await Promise.allSettled([
    fetchBCRA(),
    fetchBoletin(),
  ]);

  const rawAll: RawNovedad[] = [];

  if (bcraResult.status === 'fulfilled') {
    console.log(`  ✓ BCRA: ${bcraResult.value.length} novedades`);
    rawAll.push(...bcraResult.value);
  } else {
    console.warn('  ✗ BCRA falló (el motor continúa):', (bcraResult.reason as Error).message);
  }

  if (boletinResult.status === 'fulfilled') {
    console.log(`  ✓ Boletín Oficial: ${boletinResult.value.length} novedades`);
    rawAll.push(...boletinResult.value);
  } else {
    console.warn('  ✗ Boletín Oficial falló (el motor continúa):', (boletinResult.reason as Error).message);
  }

  // ── Paso 2: Filtrar por relevancia COMEX ────────────────────────────────────
  console.log(`\n[2/5] Filtrando por relevancia COMEX…`);
  const filtradas = filterComex(rawAll);
  console.log(`  ${rawAll.length} novedades totales → ${filtradas.length} relevantes COMEX`);

  if (!filtradas.length) {
    console.log('\n  Sin novedades relevantes hoy. alertas.json no se modifica.');
    return;
  }

  // ── Paso 3: Clasificar con IA / fallback (secuencial para respetar rate limits) ──
  console.log(`\n[3/5] Clasificando ${filtradas.length} novedades…`);
  const nuevasAlertas: Alerta[] = [];

  for (const raw of filtradas) {
    try {
      const alerta = await buildAlerta(raw);
      nuevasAlertas.push(alerta);
    } catch (err) {
      console.warn(`  [!] No se pudo procesar "${raw.titulo.slice(0, 50)}":`, (err as Error).message);
    }
  }

  // ── Paso 4: Merge con alertas existentes ────────────────────────────────────
  console.log(`\n[4/5] Mergeando con datos existentes…`);
  const existentes = readExistingAlertas();
  console.log(`  Existentes: ${existentes.length} | Nuevas candidatas: ${nuevasAlertas.length}`);
  const merged = mergeAlertas(existentes, nuevasAlertas);
  console.log(`  Total tras dedup y limit-60: ${merged.length}`);

  // ── Paso 5: Escribir JSON ────────────────────────────────────────────────────
  console.log(`\n[5/5] Escribiendo data/alertas.json…`);
  writeAlertas(merged);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Motor finalizado en ${elapsed}s — ${merged.length} alertas publicadas.\n`);
}

main().catch(err => {
  console.error('\n[FATAL] El motor falló de forma inesperada:', err);
  process.exit(1);
});
