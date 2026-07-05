import { RawNovedad } from './types.js';

// Palabras clave que identifican novedades relevantes para COMEX. Es el
// ÚNICO criterio de relevancia — no hay whitelist de organismos que
// apruebe una novedad solo por quién la emite (ver nota más abajo).
const KEYWORD_RE = new RegExp(
  [
    'aduana', '\\bdga\\b',
    'importaci[oó]n', 'importar', 'importador',
    'exportaci[oó]n', 'exportar', 'exportador',
    '\\bncm\\b', 'posici[oó]n arancelaria', 'clasificaci[oó]n arancelaria',
    'arancel', 'alícuota', 'alicuota',
    'derechos de exportaci[oó]n', 'retenci[oó]n', 'reintegro',
    'valoraci[oó]n aduanera', 'valor criterio', 'valor\\s*cr[ií]ter',
    '\\bmalvina\\b', '\\bsim\\b', '\\bvuce\\b', '\\bsedi\\b', '\\bbopreal\\b',
    'ventanilla [uú]nica',
    'fitosanitario', 'zoosanitario',
    'centro de despachantes de aduana',
    'instituto nacional de tecnolog[ií]a industrial',
    'comunicaci[oó]n\\s*["“]?a["”]?\\b',
    '\\bmulc\\b', 'mercado [uú]nico.*cambio', 'r[eé]gimen cambiario',
    'operaci[oó]n de cambio', 'divisa', 'liquidaci[oó]n de divisas',
    '\\bcomex\\b', 'comercio exterior',
    'licencia de importaci[oó]n', 'licencia de exportaci[oó]n',
    'permiso de embarque', 'destinaci[oó]n aduanera',
    'despacho de importaci[oó]n', 'declaraci[oó]n jurada',
    '\\bdjve\\b',
    'plazo de pago', 'cruzamiento sist[eé]mico', 'garant[ií]a',
    'retiro del mercado', 'prohibici[oó]n de comercializaci[oó]n',
    // Alertas sanitarias reales de ANMAT/INAL (retiros, prohibiciones,
    // falsificaciones) no siempre usan la frase exacta de arriba — cubrimos
    // también el verbo y los términos de producto en infracción.
    'proh[ií]be', 'inhib', 'falsificad', 'il[eé]gitim', 'adulterad',
    'desv[ií]o de calidad',
    'mercader[ií]a', 'tributo aduanero',
    'despachante', 'agente de aduana',
    'acuerdo comercial', 'protocolo fitosanitario',
    'habilitaci[oó]n de establecimiento', 'certificado de origen',
  ].join('|'),
  'i'
);

// BORA identifica cada norma con un código "TIPO-AÑO-NÚMERO-ORGANISMO" (ej.
// "DI-2026-90-E-ARCA-ARCA", "RESOL-2026-18-E-ARCA-SDGOAI"). Muchas veces ese
// código sale pelado, sin ninguna bajada real después — no hay nada
// sustancioso que mostrarle al usuario, aunque el organismo emisor sea una
// Aduana real. Un título en prosa (noticias de ANMAT/CDA/SENASA/ARCA, BCRA,
// etc.) ya es informativo por sí solo y no necesita este chequeo.
const TITULO_CODIGO_BORA  = /^[A-ZÁÉÍÓÚÑ]{2,10}-\d{4}-/;
const TITULO_SIN_ETIQUETA = new Set(['aviso oficial', 'sin título', 'sin titulo']);

function tieneContenidoReal(n: RawNovedad): boolean {
  const titulo = n.titulo.trim();
  const esCodigoOEtiquetaGenerica =
    TITULO_CODIGO_BORA.test(titulo) || TITULO_SIN_ETIQUETA.has(titulo.toLowerCase());

  if (!esCodigoOEtiquetaGenerica) return true;

  // Código BORA o etiqueta genérica ("Aviso Oficial"): solo vale la pena
  // si trae descripción real después del código o una sinopsis propia.
  if (/ - .+/.test(titulo)) return true;
  const sinopsis = (n.sinopsis ?? '').trim();
  return sinopsis.length > 0 && sinopsis.toLowerCase() !== titulo.toLowerCase();
}

// No hay whitelist de organismos: antes se aprobaba automáticamente
// cualquier novedad de ARCA/SENASA/ANMAT/CDA/INTI/etc. solo por el emisor,
// pero eso dejaba pasar gacetillas de prensa sin contenido real de comex
// (ej. "Recaudación tributaria de mayo" de ARCA, o "Casas particulares:
// recibo de sueldo 100% digital"). Ahora TODA novedad — sin importar de
// dónde venga — tiene que matchear alguna keyword de contenido real.
export function filterComex(novedades: RawNovedad[]): RawNovedad[] {
  return novedades.filter(n => tieneContenidoReal(n) && KEYWORD_RE.test(n.rawText));
}
