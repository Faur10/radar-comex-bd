// Normaliza el nombre de organismo (texto libre del BORA o de la IA) a un
// código corto y consistente, usado tanto para el badge visual como para
// los filtros del frontend. Si nada matchea, se devuelve el texto original
// (el frontend lo pinta con un badge gris genérico).
const RULES: Array<[RegExp, string]> = [
  // ARCA absorbió a la ex-DGA (Aduana) y a la ex-AFIP: toda dependencia u
  // oficina regional de la agencia se agrupa bajo el mismo badge "ARCA".
  // El BORA suele publicar el nombre oficial completo, no la sigla — por
  // eso cada regla matchea también el nombre largo del organismo.
  [/agencia de recaudaci[oó]n y control aduanero|\barca\b|\bafip\b|administraci[oó]n federal de ingresos p[uú]blicos/i, 'ARCA'],
  [/direcci[oó]n general de aduanas|\bdga\b|\baduana\b/i,             'Aduana'],
  [/\bsenasa\b|servicio nacional de sanidad y calidad agroalimentaria/i, 'SENASA'],
  [/\bbcra\b|banco central/i,                                         'BCRA'],
  [/\banmat\b|\binal\b|administraci[oó]n nacional de medicamentos|instituto nacional de alimentos/i, 'ANMAT / INAL'],
  [/centro de despachantes de aduana|\bcda\b/i,                       'CDA'],
  [/instituto nacional de tecnolog[ií]a industrial|\binti\b/i,        'INTI'],
  // Secretaría de Comercio tiene badge propio — va antes de la regla genérica
  // de "Ministerio de Economía" porque el BORA suele publicarla como
  // "MINISTERIO DE ECONOMÍA - SECRETARÍA DE COMERCIO".
  [/secretar[ií]a de comercio/i,                                      'Secretaría de Comercio'],
  [/ministerio de econom[ií]a/i,                                      'Min. Economía'],
  [/canciller[ií]a|ministerio de relaciones exteriores/i,             'Cancillería'],
];

export function normalizeOrganismo(raw: string): string {
  const text = (raw ?? '').trim();
  if (!text) return 'Organismo oficial';

  for (const [re, canonical] of RULES) {
    if (re.test(text)) return canonical;
  }

  return text;
}
