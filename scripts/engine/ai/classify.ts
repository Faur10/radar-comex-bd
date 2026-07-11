// @ts-nocheck
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { RawNovedad, AIResult, Impacto, Categoria } from '../types.js';

// gemini-2.0-flash-lite (dado de baja 1/6/2026) y gemini-2.5-flash-lite
// (ya no disponible para keys nuevas) fueron los intentos previos.
// Modelo vigente al 07/2026 dentro del tier gratuito:
const MODEL   = 'gemini-3.1-flash-lite';
const TIMEOUT = 30_000;

const VALID_IMPACTO  = new Set<Impacto>(['alto', 'medio', 'bajo']);
const VALID_CATEGORIA = new Set<Categoria>(['importacion', 'exportacion', 'normativa', 'logistica']);

function buildPrompt(n: RawNovedad): string {
  return `Sos un despachante de aduanas argentino experto en comercio exterior (COMEX). Analizá esta novedad normativa y devolvé SOLO un JSON válido, sin texto extra, sin bloques markdown.

TÍTULO: ${n.titulo}
SÍNTESIS: ${n.sinopsis}
ORGANISMO: ${n.organismo}

El JSON debe tener exactamente estas claves y valores permitidos:
{
  "organismo": "nombre oficial del organismo emisor (string)",
  "impacto": "alto" | "medio" | "bajo",
  "categoria": "importacion" | "exportacion" | "normativa" | "logistica",
  "tags": ["array de strings", "máximo 5 términos técnicos COMEX"],
  "titulo": "título reescrito en español claro, máximo 100 caracteres",
  "resumen": "1 o 2 frases objetivas sobre qué establece la norma",
  "queSignifica": "1 o 2 frases prácticas sobre qué debe verificar o hacer el importador/exportador. Sé prudente: sugerí revisar, nunca afirmes que algo no aplica."
}

Criterios de impacto (pensado para un despachante de aduanas, no para prensa general):
- "alto": bloquea o frena una operación en curso — comunicaciones "A" o MULC del BCRA, caídas/alertas de sistemas (VUCE, SIM, Malvina), retiros de mercado o prohibiciones de comercialización de ANMAT/INAL, suspensiones de registros o habilitaciones de ARCA/Aduana
- "medio": cambia costos o procedimientos pero no bloquea nada hoy — modificación de aranceles, alícuotas, valores criterio, derechos de exportación, resoluciones generales de ARCA/Aduana, reglamentos técnicos del INTI
- "bajo": informativo, no cambia nada operativo — noticias institucionales del CDA, capacitaciones, jurisprudencia, informes generales, acuerdos comerciales de largo plazo

Criterios de categoría:
- "importacion": afecta principalmente operaciones de importación
- "exportacion": principalmente exportaciones
- "normativa": marco regulatorio general (cambiario, impositivo, técnico)
- "logistica": transporte, almacenamiento, certificaciones, habilitaciones`;
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

function validate(obj: unknown): obj is AIResult {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.organismo     === 'string' &&
    VALID_IMPACTO.has(o.impacto  as Impacto) &&
    VALID_CATEGORIA.has(o.categoria as Categoria) &&
    Array.isArray(o.tags) &&
    typeof o.titulo        === 'string' && o.titulo.length > 0 &&
    typeof o.resumen       === 'string' && o.resumen.length > 0 &&
    typeof o.queSignifica  === 'string' && o.queSignifica.length > 0
  );
}

export async function classifyWithAI(novedad: RawNovedad): Promise<AIResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT,   threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,  threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const timer = AbortSignal.timeout(TIMEOUT);
      const result = await model.generateContent(buildPrompt(novedad));
      const text   = result.response.text();
      const parsed: unknown = JSON.parse(stripFences(text));

      if (!validate(parsed)) {
        console.warn(`[AI] JSON inválido (intento ${attempt}):`, JSON.stringify(parsed).slice(0, 150));
        continue;
      }

      // Sanitizar tags: solo strings, máximo 5
      parsed.tags = (parsed.tags as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .slice(0, 5);

      return parsed;
    } catch (err: any) {
      // Bug previo: la precedencia de ?? / === / ?: hacía que CUALQUIER
      // status truthy se reportara como "429", ocultando el error real.
      const status: number =
        err?.status ?? (err?.errorDetails?.[0]?.reason === 'RATE_LIMIT_EXCEEDED' ? 429 : 0);

      if (status === 429) {
        console.warn(`[AI] Rate limit (429) — esperando 8s antes de reintentar…`);
        await new Promise(r => setTimeout(r, 8_000));
        continue;
      }
      console.warn(`[AI] Error en intento ${attempt} (status ${status}):`, (err as Error).message ?? err);
      break;
    }
  }

  return null;
}
