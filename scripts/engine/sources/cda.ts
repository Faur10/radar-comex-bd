import { RawNovedad } from '../types.js';

const CDA_BASE = 'https://www.cda.org.ar';
const CDA_URL  = `${CDA_BASE}/noticias.php`;

// El motor corre de lunes a viernes: 3 días de ventana cubre el fin de
// semana (el lunes hay que llegar hasta el viernes anterior).
const DIAS_VENTANA = 3;

function cutoffDate(dias: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  d.setUTCHours(0, 0, 0, 0);
  return d;
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

// ddmmyyyy -> ISO yyyy-mm-dd
function ddmmyyyyToIso(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

// Cada noticia del CDA es un bloque:
//   <div class="portfolio-meta">
//     <p><i>03/07/2026</i><p>
//     <a href="detalle_noticia.php?id=42619"><h3 class="portfolio-title"><B>Título</B></h3>
//     Descripción...</a><BR>
//     ...
//   </div><!-- End .portfolio-meta -->
const BLOCK_RE = /<div class="portfolio-meta">([\s\S]*?)<\/div><!-- End \.portfolio-meta -->/gi;

interface CdaItem {
  titulo: string;
  descripcion: string;
  url: string;
  fecha: string;
}

function parseCdaHTML(html: string): CdaItem[] {
  const items: CdaItem[] = [];

  for (const m of html.matchAll(BLOCK_RE)) {
    const block = m[1];

    const fechaMatch = block.match(/<i>(\d{2}\/\d{2}\/\d{4})<\/i>/);
    const hrefMatch  = block.match(/href="(detalle_noticia\.php\?id=\d+)"/);
    const tituloMatch = block.match(/<h3 class="portfolio-title"><B>([\s\S]*?)<\/B><\/h3>/i);
    if (!fechaMatch || !hrefMatch || !tituloMatch) continue;

    const descMatch = block.match(/<\/h3>\s*([\s\S]*?)<\/a>/i);

    items.push({
      titulo:      decodeEntities(tituloMatch[1]),
      descripcion: descMatch ? decodeEntities(descMatch[1]) : '',
      url:         `${CDA_BASE}/${hrefMatch[1]}`,
      fecha:       ddmmyyyyToIso(fechaMatch[1]),
    });
  }

  return items;
}

export async function fetchCDA(): Promise<RawNovedad[]> {
  const cutoff = cutoffDate(DIAS_VENTANA);

  let html: string;
  try {
    const res = await fetch(CDA_URL, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; RadarComexBot/1.0)',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }

  const items = parseCdaHTML(html).filter(
    it => new Date(`${it.fecha}T00:00:00Z`).getTime() >= cutoff.getTime()
  );

  return items.map(n => ({
    titulo:      n.titulo,
    sinopsis:    n.descripcion || n.titulo,
    organismo:   'CDA',
    fecha:       n.fecha,
    fuente: {
      nombre: 'Centro Despachantes de Aduana – Noticias',
      url:    n.url,
    },
    rawText: `${n.titulo} ${n.descripcion}`,
  }));
}
