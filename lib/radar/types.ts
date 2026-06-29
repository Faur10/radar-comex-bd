export type Impacto   = 'alto' | 'medio' | 'oportunidad';
export type Categoria = 'importacion' | 'exportacion' | 'normativa' | 'logistica';

export interface Alerta {
  id:           string;
  slug:         string;
  organismo:    string;
  fecha:        string;   // ISO YYYY-MM-DD
  impacto:      Impacto;
  categoria:    Categoria;
  tags:         string[];
  titulo:       string;
  resumen:      string;
  queSignifica: string;
  fuente:       { nombre: string; url: string };
  normativaRef?: string;
  publicadoEn:  string;  // ISO datetime
  actualizadoEn: string; // ISO datetime
}
