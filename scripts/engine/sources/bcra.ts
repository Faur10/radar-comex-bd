import { RawNovedad } from '../types.js';

// Nueva API pública del BCRA (estadisticascambiarias v1.0)
const BASE_CAMBIARIAS = 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0';
const BASE_SITE       = 'https://www.bcra.gob.ar';

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

async function fetchVariables(): Promise<RawNovedad[]> {
  const res = await fetch(`${BASE_CAMBIARIAS}/Cotizaciones`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`BCRA cotizaciones HTTP ${res.status}`);

  const data: { results?: { fecha?: string; detalle?: any[] } } = await res.json();
  const detalle = data.results?.detalle ?? [];
  const fecha   = data.results?.fecha ?? isoToday();

  // Buscar USD (dólar mayorista MULC)
  const usd = detalle.find((d: any) =>
    d.codigoMoneda === 'USD' || /ESTADOS UNIDOS|DOLAR\b/i.test(d.descripcion ?? '')
  );

  if (!usd) return [];

  const tc = usd.tipoCotizacion ?? usd.tipoPase ?? 0;
  const resumen = `Tipo de Cambio MULC ($ por USD): ${tc.toFixed(2)} — al ${fecha}`;

  return [
    {
      titulo: 'BCRA – Tipo de Cambio MULC del día',
      sinopsis: resumen,
      organismo: 'BCRA',
      fecha: isoToday(),
      fuente: {
        nombre: 'BCRA – Estadísticas Cambiarias',
        url: 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Tipos_de_cambio_repo.asp',
      },
      normativaRef: undefined,
      rawText: `BCRA tipo de cambio MULC régimen cambiario comunicación divisas ${resumen}`,
    },
  ];
}

async function fetchComunicaciones(): Promise<RawNovedad[]> {
  const url = `${BASE_SITE}/SistemasFinancierosYdePagos/sf020501Circulares.asp`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadarComexBot/1.0)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return [];

  const html = await res.text();
  const novedades: RawNovedad[] = [];

  const [yyyy, mm, dd] = isoToday().split('-');
  const fechaHoy = `${dd}/${mm}/${yyyy}`;

  // Busca filas de tabla con Comunicaciones A
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  const rows  = html.match(rowRe) ?? [];

  for (const row of rows) {
    const fechaMatch = row.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!fechaMatch || fechaMatch[1] !== fechaHoy) continue;

    const numMatch  = row.match(/Com(?:unicaci[oó]n)?\s*A\s*"?(\d+)/i);
    const linkMatch = row.match(/href="([^"]+)"/i);
    const textMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);

    if (!numMatch && !linkMatch) continue;

    const num   = numMatch?.[1] ?? '';
    const href  = linkMatch?.[1] ?? '';
    const texto = (textMatch ?? [])
      .map(td => td.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean)
      .join(' — ');

    novedades.push({
      titulo: `BCRA – Comunicación "A" ${num}`,
      sinopsis: texto || `Comunicación "A" ${num} del BCRA`,
      organismo: 'BCRA',
      fecha: isoToday(),
      fuente: {
        nombre: 'BCRA – Comunicaciones',
        url: href.startsWith('http') ? href : `${BASE_SITE}${href}`,
      },
      normativaRef: num ? `Com. "A" ${num}` : undefined,
      rawText: `BCRA comunicación A ${num} MULC régimen cambiario divisas ${texto}`,
    });
  }

  return novedades;
}

export async function fetchBCRA(): Promise<RawNovedad[]> {
  const [varsResult, comsResult] = await Promise.allSettled([
    fetchVariables(),
    fetchComunicaciones(),
  ]);

  const out: RawNovedad[] = [];
  if (varsResult.status === 'fulfilled') out.push(...varsResult.value);
  else console.warn('[BCRA] Variables fallaron:', varsResult.reason);
  if (comsResult.status === 'fulfilled') out.push(...comsResult.value);
  else console.warn('[BCRA] Comunicaciones fallaron:', comsResult.reason);

  return out;
}
