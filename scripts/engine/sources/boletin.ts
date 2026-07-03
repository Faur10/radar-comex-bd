import { RawNovedad } from '../types.js';

const BORA_BASE = 'https://www.boletinoficial.gob.ar';

function isoToday(): string {
  return new Date().toISOString().split('T')[0];
}

function todayYYYYMMDD(): string {
  return isoToday().replace(/-/g, '');
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

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Divide "Decreto 571/2026" en tipo="Decreto" y numero="571/2026"
function splitTipoNumero(text: string): { tipo: string; numero: string } {
  const m = text.match(/^(.*?)\s+(\S*\d\S*)$/);
  return m ? { tipo: m[1].trim(), numero: m[2].trim() } : { tipo: text.trim(), numero: '' };
}

// Listado por sección del día: BORA renderiza el HTML server-side en /seccion/{nombre}/{fecha}
async function fetchBoraPorSeccion(): Promise<BoraItem[]> {
  const fecha = todayYYYYMMDD();
  const secciones = ['primera', 'segunda'];
  const items: BoraItem[] = [];

  for (const sec of secciones) {
    try {
      const res = await fetch(`${BORA_BASE}/seccion/${sec}/${fecha}`, {
        headers: {
          Accept: 'text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; RadarComexBot/1.0)',
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) continue;

      const html = await res.text();
      items.push(...parseBoraSeccionHTML(html));
    } catch {
      // sección no disponible, continuar con la siguiente
    }
  }

  return items;
}

// Parsea el HTML real de /seccion/{primera|segunda}/{fecha}:
// cada aviso es un <a href="/detalleAviso/..."><div class="linea-aviso">
//   <p class="item">ORGANISMO</p>
//   <p class="item-detalle"><small>Tipo Numero/Año</small></p>
//   <p class="item-detalle"><small>Referencia - Descripción</small></p>
// </div></a>
function parseBoraSeccionHTML(html: string): BoraItem[] {
  const items: BoraItem[] = [];
  const avisoRe = /<a href="([^"]+)"[^>]*>\s*<div class="linea-aviso">([\s\S]*?)<\/div>\s*<\/a>/gi;

  for (const avisoMatch of html.matchAll(avisoRe)) {
    const href = avisoMatch[1];
    const block = avisoMatch[2];

    const detalles = [...block.matchAll(/<small>([\s\S]*?)<\/small>/gi)]
      .map(m => decodeEntities(m[1].replace(/<[^>]+>/g, '')));
    const organismoMatch = block.match(/class="item"\s*>([\s\S]*?)<\/p>/i);
    const organismo = organismoMatch ? decodeEntities(organismoMatch[1].replace(/<[^>]+>/g, '')) : '';

    if (!detalles.length) continue;

    const { tipo, numero } = splitTipoNumero(detalles[0]);
    const descripcion = detalles[1] ?? '';
    const url = href.startsWith('http') ? href : `${BORA_BASE}${href}`;

    items.push({
      titulo: descripcion || detalles[0],
      organismo,
      tipo,
      numero,
      descripcion,
      url,
      normativaRef: tipo && numero ? `${tipo} ${numero}` : '',
    });
  }

  return items;
}

export async function fetchBoletin(): Promise<RawNovedad[]> {
  let items: BoraItem[] = [];

  try {
    items = await fetchBoraPorSeccion();
    console.log(`  [Boletin] Por sección: ${items.length} normas`);
  } catch (err) {
    console.warn('[Boletin] Listado por sección falló:', (err as Error).message);
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
