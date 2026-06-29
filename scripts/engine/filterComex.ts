import { RawNovedad } from './types.js';

// Palabras clave que identifican novedades relevantes para COMEX
const KEYWORD_RE = new RegExp(
  [
    'aduana', 'dga',
    'importaci[oó]n', 'importar', 'importador',
    'exportaci[oó]n', 'exportar', 'exportador',
    '\\bncm\\b', 'posici[oó]n arancelaria', 'clasificaci[oó]n arancelaria',
    'arancel', 'alícuota', 'alicuota',
    'derechos de exportaci[oó]n', 'retenci[oó]n', 'reintegro',
    'valoraci[oó]n aduanera', 'valor criterio', 'valor\\s*cr[ií]ter',
    '\\bmalvina\\b', '\\bsim\\b', '\\bvuce\\b',
    'senasa', 'fitosanitario', 'zoosanitario',
    '\\binal\\b', '\\banmat\\b',
    '\\barca\\b', '\\bafip\\b',
    'comunicaci[oó]n\\s*["“]?a["”]?\\b',
    '\\bmulc\\b', 'mercado [uú]nico.*cambio', 'r[eé]gimen cambiario',
    'operaci[oó]n de cambio', 'divisa', 'liquidaci[oó]n de divisas',
    '\\bcomex\\b', 'comercio exterior',
    'licencia de importaci[oó]n', 'licencia de exportaci[oó]n',
    'permiso de embarque', 'destinaci[oó]n aduanera',
    'despacho de importaci[oó]n', 'declaraci[oó]n jurada',
    '\\bdjve\\b', '\\bsira\\b',
    'mercader[ií]a', 'tributo aduanero',
    'despachante', 'agente de aduana',
    'acuerdo comercial', 'protocolo fitosanitario',
    'habilitaci[oó]n de establecimiento', 'certificado de origen',
  ].join('|'),
  'i'
);

// Organismos cuya salida siempre es relevante para COMEX
const ORGANISMOS_COMEX = [
  'aduana', 'dga', 'senasa', 'inal', 'anmat', 'arca', 'afip', 'bcra',
  'secretaría de comercio', 'secretaria de comercio',
  'secretaría de industria', 'secretaria de industria',
  'ministerio de economía', 'ministerio de economia',
  'cancillería', 'cancilleria',
  'secretaría de agricultura', 'secretaria de agricultura',
];

function matchesOrganismo(org: string): boolean {
  const lc = org.toLowerCase();
  return ORGANISMOS_COMEX.some(o => lc.includes(o));
}

export function filterComex(novedades: RawNovedad[]): RawNovedad[] {
  return novedades.filter(
    n => KEYWORD_RE.test(n.rawText) || matchesOrganismo(n.organismo)
  );
}
