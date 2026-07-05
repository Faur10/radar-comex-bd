export interface RawNovedad {
  titulo: string;
  sinopsis: string;
  organismo: string;
  fecha: string;        // YYYY-MM-DD
  fuente: { nombre: string; url: string };
  normativaRef?: string;
  rawText: string;      // texto completo para filtrado por keywords
}

export type Impacto = 'alto' | 'medio' | 'bajo';
export type Categoria = 'importacion' | 'exportacion' | 'normativa' | 'logistica';

export interface Alerta {
  id: string;
  slug: string;
  organismo: string;
  fecha: string;        // ISO
  impacto: Impacto;
  categoria: Categoria;
  tags: string[];
  titulo: string;
  resumen: string;
  queSignifica: string;
  fuente: { nombre: string; url: string };
  normativaRef?: string;
  publicadoEn: string;  // ISO — fecha de primera publicación
  actualizadoEn: string; // ISO — se actualiza en cada run
}

export interface AIResult {
  organismo: string;
  impacto: Impacto;
  categoria: Categoria;
  tags: string[];
  titulo: string;
  resumen: string;
  queSignifica: string;
}
