import { RawNovedad } from '../types.js';

const BASE = 'https://www.argentina.gob.ar';

// El motor corre de lunes a viernes: 3 días de ventana alcanza para cubrir
// el fin de semana (el lunes hay que llegar hasta el viernes anterior) sin
// traer de más. El dedup en merge.ts absorbe el solape entre corridas.
const DIAS_VENTANA = 3;
const MAX_PAGINAS  = 4;

export interface FuenteArgentinaGob {
  path:         string; // ej. '/arca/noticias'
  organismo:    string; // ej. 'ARCA'
  fuenteNombre: string; // ej. 'ARCA – Noticias'
}

interface NoticiaItem {
  titulo: string;
  descripcion: string;
  url: string;
  fecha: string; // ISO YYYY-MM-DD
}

function decodeEntities(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
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

function cutoffDate(dias: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Todos los micrositios de argentina.gob.ar (ARCA, Aduana, SENASA, ANMAT,
// INTI, Secretaría de Comercio Exterior) reutilizan el mismo componente
// Drupal de listado de noticias:
//   <a href="/noticias/slug" class="panel panel-default">
//     <div class="panel-body">
//       <time datetime='2026-07-03 13:35:45'>03 de julio de 2026</time>
//       <h3>Título</h3>
//       <p class="text-muted"><p>Descripción</p></p>   (opcional)
//     </div>
//   </a>
const ITEM_RE = /<a href="([^"]+)"\s+class="panel panel-default">([\s\S]*?)<\/a>/gi;

function parseNoticiasHTML(html: string): NoticiaItem[] {
  const items: NoticiaItem[] = [];

  for (const m of html.matchAll(ITEM_RE)) {
    const href  = m[1];
    const block = m[2];

    const fechaMatch = block.match(/<time datetime='([^']+)'/);
    const h3Match     = block.match(/<h3>([\s\S]*?)<\/h3>/i);
    if (!fechaMatch || !h3Match) continue;

    const descMatch = block.match(/<p class="text-muted">\s*<p>([\s\S]*?)<\/p>/i);

    items.push({
      titulo:      decodeEntities(h3Match[1]),
      descripcion: descMatch ? decodeEntities(descMatch[1]) : '',
      url:         href.startsWith('http') ? href : `${BASE}${href}`,
      fecha:       fechaMatch[1].split(' ')[0],
    });
  }

  return items;
}

async function fetchPagina(path: string, pagina: number): Promise<string | null> {
  const url = pagina === 0 ? `${BASE}${path}` : `${BASE}${path}?page=${pagina}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; RadarComexBot/1.0)',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchArgentinaGobNoticias(fuente: FuenteArgentinaGob): Promise<RawNovedad[]> {
  const cutoff = cutoffDate(DIAS_VENTANA);
  const items: NoticiaItem[] = [];
  const urlsVistas = new Set<string>();

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const html = await fetchPagina(fuente.path, pagina);
    if (!html) break;

    const pageItems = parseNoticiasHTML(html);
    if (!pageItems.length) break;

    // No todos los micrositios soportan ?page=N en esta vista — si la
    // página devuelve exactamente las mismas URLs que ya vimos, es que el
    // parámetro no tuvo efecto: cortamos para no duplicar ni loopear de más.
    const nuevos = pageItems.filter(it => !urlsVistas.has(it.url));
    if (!nuevos.length) break;

    let huboReciente = false;
    for (const it of nuevos) {
      urlsVistas.add(it.url);
      if (new Date(`${it.fecha}T00:00:00Z`).getTime() >= cutoff.getTime()) {
        items.push(it);
        huboReciente = true;
      }
    }

    // Están ordenadas de más nueva a más vieja: si ninguna de esta página
    // cae dentro de la ventana semanal, las siguientes tampoco.
    if (!huboReciente) break;
  }

  return items.map(n => ({
    titulo:      n.titulo,
    sinopsis:    n.descripcion || n.titulo,
    organismo:   fuente.organismo,
    fecha:       n.fecha,
    fuente: {
      nombre: fuente.fuenteNombre,
      url:    n.url,
    },
    rawText: `${n.titulo} ${n.descripcion}`,
  }));
}
