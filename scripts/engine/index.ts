import { randomUUID } from 'node:crypto';
import { fetchBCRA }              from './sources/bcra.js';
import { fetchBoletin }           from './sources/boletin.js';
import { fetchCDA }               from './sources/cda.js';
import { fetchArgentinaGobNoticias, FuenteArgentinaGob } from './sources/argentinaGob.js';
import { filterComex }          from './filterComex.js';
import { classifyWithAI }       from './ai/classify.js';
import { classifyWithFallback } from './ai/fallback.js';
import { buildRollingAlertas }   from './merge.js';
import { normalizeOrganismo }   from './organismoMap.js';
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
    organismo:    normalizeOrganismo(classified.organismo || raw.organismo),
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

// Micrositios de argentina.gob.ar que comparten la misma plantilla de
// "noticias" (ver sources/argentinaGob.ts). VUCE queda afuera: su sección de
// novedades es una SPA (React) que no expone contenido en el HTML estático.
const FUENTES_ARGENTINA_GOB: FuenteArgentinaGob[] = [
  { path: '/arca/noticias',                         organismo: 'ARCA',                   fuenteNombre: 'ARCA – Noticias' },
  { path: '/arca/aduana/noticias',                  organismo: 'Aduana',                  fuenteNombre: 'Aduana – Novedades' },
  { path: '/senasa/senasacomunica',                 organismo: 'SENASA',                  fuenteNombre: 'SENASA Comunica' },
  { path: '/anmat/alertas',                         organismo: 'ANMAT',                   fuenteNombre: 'ANMAT – Alertas' },
  { path: '/inti/noticias',                         organismo: 'INTI',                    fuenteNombre: 'INTI – Noticias' },
  { path: '/produccion/comercio-exterior/noticias', organismo: 'Secretaría de Comercio',  fuenteNombre: 'Secretaría de Comercio Exterior – Noticias' },
];

// ── Orquestador principal ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startTime = Date.now();
  const fechaAR = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

  console.log('\n══════════════════════════════════════════════════');
  console.log('  RADAR COMEX BD — Motor de actualización diaria (L-V)');
  console.log(`  Fecha : ${fechaAR}`);
  console.log(`  IA    : ${process.env.GEMINI_API_KEY ? '✓ Gemini habilitado' : '✗ Fallback por reglas (sin GEMINI_API_KEY)'}`);
  console.log('══════════════════════════════════════════════════\n');

  // ── Paso 1: Fetch de todas las fuentes en paralelo ──────────────────────────
  console.log('[1/5] Obteniendo fuentes…');

  const fuentes: Array<{ nombre: string; promesa: Promise<RawNovedad[]> }> = [
    { nombre: 'BCRA',            promesa: fetchBCRA() },
    { nombre: 'Boletín Oficial', promesa: fetchBoletin() },
    { nombre: 'CDA',             promesa: fetchCDA() },
    ...FUENTES_ARGENTINA_GOB.map(f => ({ nombre: f.organismo, promesa: fetchArgentinaGobNoticias(f) })),
  ];

  const resultados = await Promise.allSettled(fuentes.map(f => f.promesa));
  const rawAll: RawNovedad[] = [];

  resultados.forEach((r, i) => {
    const nombre = fuentes[i].nombre;
    if (r.status === 'fulfilled') {
      console.log(`  ✓ ${nombre}: ${r.value.length} novedades`);
      rawAll.push(...r.value);
    } else {
      console.warn(`  ✗ ${nombre} falló (el motor continúa):`, (r.reason as Error).message);
    }
  });

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

  // ── Paso 4: Mergear con lo existente (ventana móvil de 14 días) ─────────────
  console.log(`\n[4/5] Mergeando con la ventana móvil…`);
  const existentes = readExistingAlertas();
  const actualizado = buildRollingAlertas(existentes, nuevasAlertas);
  console.log(`  Existentes: ${existentes.length} | Nuevas candidatas: ${nuevasAlertas.length} | Total tras dedup y retención: ${actualizado.length}`);

  // ── Paso 5: Escribir JSON ────────────────────────────────────────────────────
  console.log(`\n[5/5] Escribiendo data/alertas.json…`);
  writeAlertas(actualizado);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Motor finalizado en ${elapsed}s — ${actualizado.length} alertas publicadas.\n`);
}

main().catch(err => {
  console.error('\n[FATAL] El motor falló de forma inesperada:', err);
  process.exit(1);
});
