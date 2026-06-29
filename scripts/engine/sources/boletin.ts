import { RawNovedad } from '../types.js';

const BORA_BASE = 'https://www.boletinoficial.gob.ar';

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

function todayYYYYMMDD(): string {
  return isoToday().replace(/-/g, '');
}

function todayDDMMYYYY(): string {
  const [y, m, d] = isoToday().split('-');
  return `${d}/${m}/${y}`;
}

interface BoraItem {
  titulo: string;
  organismo: string;
  tipo: string;
  numero: string;
  descripcion: string;
  url: string;
  normativaRef: string;
}

// Intento 1: endpoint JSON de búsqueda avanzada (AJAX interno de BORA)
async function fetchBoraSearchJSON(): Promise<BoraItem[]> {
  const body = new URLSearchParams({
    q: '',
    pageNum: '1',
    pageSize: '100',
    fechaDesde: todayDDMMYYYY(),
    fechaHasta: todayDDMMYYYY(),
  });

  const res = await fetch(`${BORA_BASE}/busquedaAvanzada/realizar.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (compatible; RadarComexBot/1.0)',
      Referer: `${BORA_BASE}/busquedaAvanzada/q`,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) throw new Error(`BORA search HTTP ${res.status}`);

  const data = await res.json();
  const normas: any[] = data.normas ?? data.results ?? data ?? [];

  return normas.map((n: any) => parseBoraItem(n));
}

// Intento 2: listado por sección y fecha
async function fetchBoraPorSeccion(): Promise<BoraItem[]> {
  const fecha = todayYYYYMMDD();
  const secciones = ['primera-seccion', 'segunda-seccion'];
  const items: BoraItem[] = [];

  for (const sec of secciones) {
    try {
      const res = await fetch(`${BORA_BASE}/norma/listado/${sec}/${fecha}`, {
        headers: {
          Accept: 'application/json, text/html, */*',
          'User-Agent': 'Mozilla/5.0 (compatible; RadarComexBot/1.0)',
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;

      const ct = res.headers.get('content-type') ?? '';

      if (ct.includes('json')) {
        const data = await res.json();
        const normas: any[] = data.normas ?? data.items ?? (Array.isArray(data) ? data : []);
        items.push(...normas.map(parseBoraItem));
      } else {
        // HTML: parsear tabla básica
        const html = await res.text();
        items.push(...parseBoraHTML(html));
      }
    } catch {
      // sección no disponible, continuar con la siguiente
    }
  }

  return items;
}

function parseBoraItem(n: any): BoraItem {
  const tipo   = (n.tipoNorma   ?? n.tipo    ?? '').trim();
  const numero = (n.nroNorma    ?? n.numero  ?? '').trim();
  const org    = (n.reparticion ?? n.organismo ?? '').trim();
  const idNorma = n.idNorma ?? n.id ?? '';
  const url    = n.urlTextoCompleto
    ?? (idNorma ? `${BORA_BASE}/norma/detalleNorma/${idNorma}` : BORA_BASE);

  return {
    titulo:       (n.titulo ?? `${tipo} ${numero}`).trim(),
    organismo:    org,
    tipo,
    numero,
    descripcion:  (n.descripcion ?? n.sinopsis ?? n.bajada ?? '').trim(),
    url:          url.startsWith('http') ? url : `${BORA_BASE}${url}`,
    normativaRef: tipo && numero ? `${tipo} ${numero}/${new Date().getFullYear()}` : '',
  };
}

function parseBoraHTML(html: string): BoraItem[] {
  const items: BoraItem[] = [];
  // Extrae filas de tabla que contengan info de normas
  const rowRe = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows  = html.match(rowRe) ?? [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
    const linkMatch = row.match(/href="([^"]+)"/i);

    if (cells.length < 2) continue;

    const url = linkMatch
      ? (linkMatch[1].startsWith('http') ? linkMatch[1] : `${BORA_BASE}${linkMatch[1]}`)
      : BORA_BASE;

    items.push({
      titulo:       cells[1] ?? cells[0],
      organismo:    cells[2] ?? '',
      tipo:         '',
      numero:       cells[0],
      descripcion:  cells[3] ?? '',
      url,
      normativaRef: cells[0],
    });
  }

  return items;
}

export async function fetchBoletin(): Promise<RawNovedad[]> {
  let items: BoraItem[] = [];

  // Intentar el endpoint JSON primero
  try {
    items = await fetchBoraSearchJSON();
    console.log(`  [Boletin] JSON endpoint: ${items.length} normas`);
  } catch (err) {
    console.warn('[Boletin] JSON endpoint falló, intentando listado por sección:', (err as Error).message);
  }

  // Si el JSON no devolvió nada, intentar por sección
  if (!items.length) {
    try {
      items = await fetchBoraPorSeccion();
      console.log(`  [Boletin] Por sección: ${items.length} normas`);
    } catch (err) {
      console.warn('[Boletin] Listado por sección también falló:', (err as Error).message);
    }
  }

  return items.map(n => ({
    titulo:      n.titulo,
    sinopsis:    n.descripcion || n.titulo,
    organismo:   n.organismo,
    fecha:       isoToday(),
    fuente: {
      nombre: 'Boletín Oficial de la República Argentina',
      url:    n.url,
    },
    normativaRef: n.normativaRef || undefined,
    rawText:     `${n.titulo} ${n.organismo} ${n.tipo} ${n.numero} ${n.descripcion}`,
  }));
}
