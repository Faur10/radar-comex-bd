import { RawNovedad, AIResult, Impacto, Categoria } from '../types.js';

// ── Detección de impacto ──────────────────────────────────────────────────────

const IMPACTO_ALTO: RegExp[] = [
  /proh[ií]be?/i, /suspende?/i, /veda/i, /bloquea?/i,
  /nuevo\s+requisito/i, /obligatorio/i, /alícuota/i, /alicuota/i,
  /derechos\s+de\s+exportaci[oó]n/i, /retenci[oó]n/i,
  /incremento/i, /aumento\s+de\s+(tasa|arancel)/i,
  /cierre.*importaci[oó]n/i,
];

const IMPACTO_OPORTUNIDAD: RegExp[] = [
  /simplifica/i, /flexibili/i, /reducci[oó]n/i, /rebaja/i,
  /exenci[oó]n/i, /beneficio/i, /programa\s+de/i, /promoci[oó]n/i,
  /reintegro/i, /recupero/i, /incentivo/i, /facilita/i,
];

function detectImpacto(text: string): Impacto {
  if (IMPACTO_ALTO.some(re => re.test(text)))         return 'alto';
  if (IMPACTO_OPORTUNIDAD.some(re => re.test(text)))  return 'oportunidad';
  return 'medio';
}

// ── Detección de categoría ────────────────────────────────────────────────────

const ORG_CATEGORIA: Array<[RegExp, Categoria]> = [
  [/aduana|dga/i,                       'importacion'],
  [/senasa|inal|anmat/i,                'logistica'],
  [/bcra/i,                             'normativa'],
  [/arca|afip/i,                        'normativa'],
  [/secretar[ií]a\s+de\s+comercio/i,   'importacion'],
];

function detectCategoria(n: RawNovedad): Categoria {
  const texto = `${n.organismo} ${n.rawText}`;

  for (const [re, cat] of ORG_CATEGORIA) {
    if (re.test(texto)) return cat;
  }

  if (/exportaci[oó]n|exportador|reintegro|derecho.{1,20}exporta/i.test(texto)) return 'exportacion';
  if (/importaci[oó]n|importador|\bsira\b|licencia.{1,20}importa/i.test(texto)) return 'importacion';
  if (/log[ií]stic|transport|almac[eé]n|certif|fitosanit|zoosanit/i.test(texto)) return 'logistica';

  return 'normativa';
}

// ── Extracción de tags ────────────────────────────────────────────────────────

const TAG_MAP: Array<[RegExp, string]> = [
  [/\bncm\b/i,               'NCM'],
  [/arancel/i,               'arancel'],
  [/\bvuce\b/i,              'VUCE'],
  [/\bsim\b/i,               'SIM'],
  [/\bsira\b/i,              'SIRA'],
  [/senasa/i,                'SENASA'],
  [/fitosanit/i,             'fitosanitario'],
  [/zoosanit/i,              'zoosanitario'],
  [/\binal\b/i,              'INAL'],
  [/\banmat\b/i,             'ANMAT'],
  [/\barca\b/i,              'ARCA'],
  [/\bmulc\b/i,              'MULC'],
  [/comunicaci[oó]n.{0,5}a\b/i, 'Com. A'],
  [/tipo\s+de\s+cambio/i,   'tipo de cambio'],
  [/exportaci[oó]n/i,        'exportación'],
  [/importaci[oó]n/i,        'importación'],
  [/certificado\s+de\s+origen/i, 'cert. origen'],
  [/posici[oó]n arancelaria/i, 'posición arancelaria'],
  [/valor.{1,10}criterio/i,  'valor criterio'],
  [/derechos\s+de\s+exporta/i, 'derechos de exportación'],
];

function extractTags(text: string): string[] {
  const tags: string[] = [];
  for (const [re, tag] of TAG_MAP) {
    if (re.test(text)) tags.push(tag);
    if (tags.length >= 5) break;
  }
  return tags;
}

// ── Plantillas de queSignifica por categoría ──────────────────────────────────

const QUE_SIGNIFICA: Record<Categoria, string> = {
  importacion:
    'Revisá si esta normativa afecta las importaciones en curso o las próximas operaciones. ' +
    'Consultá con tu despachante para evaluar el impacto en la destinación aduanera.',
  exportacion:
    'Verificá si esta norma modifica requisitos, alícuotas o reintegros para exportaciones. ' +
    'Se recomienda revisar los despachos en trámite con el despachante.',
  normativa:
    'Esta disposición puede modificar el marco regulatorio de las operaciones de comercio exterior. ' +
    'Se recomienda revisar su aplicación con el asesor de COMEX.',
  logistica:
    'Consultá si esta normativa exige nuevas certificaciones, registros o modifica los plazos ' +
    'logísticos en la cadena de importación/exportación.',
};

// ── Clasificación por reglas ──────────────────────────────────────────────────

export function classifyWithFallback(novedad: RawNovedad): AIResult {
  const categoria = detectCategoria(novedad);
  const impacto   = detectImpacto(novedad.rawText);
  const tags       = extractTags(novedad.rawText);
  const resumen    =
    novedad.sinopsis.length > 280
      ? novedad.sinopsis.slice(0, 280) + '…'
      : novedad.sinopsis || novedad.titulo;

  return {
    organismo:    novedad.organismo || 'Organismo oficial',
    impacto,
    categoria,
    tags,
    titulo:       novedad.titulo.slice(0, 100),
    resumen,
    queSignifica: QUE_SIGNIFICA[categoria],
  };
}
