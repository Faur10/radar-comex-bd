# Motor de actualización – RADAR COMEX BD

Job diario de lunes a viernes (7:00 hs Argentina) en GitHub Actions que
obtiene novedades de BCRA, Boletín Oficial, ARCA, Aduana, SENASA, ANMAT,
CDA, INTI y Secretaría de Comercio Exterior de las **últimas 24-48hs**
(ventana de 3 días para cubrir el fin de semana), filtra las relevantes
para comercio exterior y las **mergea** con lo existente en
`data/alertas.json`, reteniendo una **ventana móvil de 14 días** (ver
`merge.ts`). El push automático dispara el redeploy en Netlify.

---

## Dependencias a instalar (en el proyecto Next.js)

Agregar al `package.json` del repo:

```json
{
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0"
  },
  "scripts": {
    "radar": "npx tsx scripts/engine/index.ts"
  }
}
```

Luego correr:

```bash
npm install
```

---

## 1. Crear la GEMINI_API_KEY gratis (cuenta del cliente)

1. Ir a **Google AI Studio**: https://aistudio.google.com/app/apikey
2. Iniciar sesión con la cuenta Google de BD Trading SRL.
3. Hacer clic en **"Create API Key"** → seleccionar "Create API key in new project".
4. Copiar la key generada (empieza con `AIza…`).
5. **No compartir ni commitear** esta key. Solo va como secret de GitHub.

> El free tier de Gemini incluye 1.500 requests/día con `gemini-3.1-flash-lite`, más que suficiente para el job diario. Google deprecó `gemini-2.0-flash-lite` (baja el 1/6/2026) y `gemini-2.5-flash-lite` dejó de estar disponible para keys nuevas — si en el futuro vuelve a aparecer `[AI] Error ... 404 ... no longer available`, hay que revisar qué modelo está vigente en [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models) y actualizar `MODEL` en `scripts/engine/ai/classify.ts`.

---

## 2. Cargar GEMINI_API_KEY como secret de GitHub

1. Ir al repositorio en GitHub.
2. **Settings → Secrets and variables → Actions**.
3. Clic en **"New repository secret"**.
4. Nombre: `GEMINI_API_KEY`
5. Valor: pegar la key copiada en el paso anterior.
6. Guardar.

> Si el secret no se carga, el motor corre igual usando el **fallback por reglas** — el sitio nunca queda sin actualizar.

---

## 3. Habilitar el workflow en GitHub Actions

1. En el repo, ir a la pestaña **Actions**.
2. Si GitHub pregunta si habilitar workflows, confirmar.
3. El job corre automáticamente a las **07:00 hora Argentina** (10:00 UTC) **de lunes a viernes**.
4. Para correr manualmente (por ejemplo, para forzar un refresco): Actions → "Radar COMEX BD" → **Run workflow**.

---

## 4. Cómo funciona el motor

```
fetchBCRA() ────────────┐
fetchBoletin() ─────────┤   (todas: últimos 3 días,
fetchCDA() ─────────────┼─→  cubre el fin de semana)
fetchArgentinaGobNoticias()   → filterComex() → classifyWithAI() [o fallback] → buildRollingAlertas() → writeAlertas()
  (ARCA, Aduana, SENASA, ─┘
   ANMAT, INTI, Sec. Comercio)
```

- Si **una fuente cae**, las demás continúan.
- **`filterComex.ts` no tiene whitelist de organismos**: toda novedad —
  venga de donde venga — tiene que matchear una keyword real de contenido
  comex (aduana, arancel, importación, exportación, VUCE, MULC, etc.). Esto
  evita que pasen gacetillas institucionales solo por venir de un organismo
  "de confianza".
- Si **Gemini falla o no hay key**, `fallback.ts` clasifica por palabras clave.
- Si **el job falla**, GitHub envía mail automático al dueño del repo.
- `data/alertas.json` se escribe atómicamente (temp → rename) para evitar corrupción.
- **Ventana móvil de 14 días** (`merge.ts`): como cada corrida diaria solo
  trae 24-48hs nuevas, el motor mergea con lo existente (dedup por hash de
  título/referencia normativa/URL) y descarta lo que ya tiene más de 14
  días. Así el sitio siempre muestra un panorama útil, no solo "lo de hoy".
- El **organismo** de cada alerta se normaliza (`organismoMap.ts`) a un
  código corto (ARCA, Aduana, SENASA, BCRA, ANMAT / INAL, CDA, INTI,
  Secretaría de Comercio, Min. Economía, Cancillería) para que el badge de
  institución en el frontend sea siempre consistente, aunque la fuente
  original publique el nombre largo oficial.
- **VUCE**: su sección de novedades (vuce.gob.ar/novedades) es una SPA React
  sin contenido en el HTML estático, así que no tiene scraper propio. El
  Boletín Oficial actúa como fuente indirecta: cualquier norma que
  mencione "VUCE" o "Ventanilla Única" ya matchea esas keywords en
  `filterComex.ts` y entra igual.
- **Impacto** (alto/medio/bajo) pensado para un despachante, no para
  prensa general: *alto* = bloquea una operación hoy (comunicaciones "A"
  del BCRA, caídas de VUCE/SIM/Malvina, retiros de mercado de ANMAT,
  suspensiones de registro de ARCA/Aduana); *medio* = cambia costos o
  procedimientos (aranceles, alícuotas, valores criterio, RG de
  ARCA/Aduana, reglamentos técnicos del INTI); *bajo* = informativo
  (noticias del CDA, capacitaciones, jurisprudencia, acuerdos comerciales
  de largo plazo).

---

## 5. Transferir el repo y el hosting a BD Trading

### GitHub
1. Ir al repo → **Settings → General → Danger Zone → Transfer ownership**.
2. Escribir el nombre del repo y el usuario/organización destino (cuenta de BD Trading).
3. El nuevo dueño acepta la transferencia desde su correo.

### Netlify
1. En Netlify → **Site settings → General → Danger zone → Transfer site**.
2. Seleccionar el equipo/cuenta destino.
3. Volver a cargar el secret `GEMINI_API_KEY` en el nuevo repo de GitHub (los secrets no se transfieren).
4. Verificar que la variable de entorno `GEMINI_API_KEY` NO esté en Netlify — solo debe estar en GitHub Actions.

### Google AI Studio
1. El cliente crea su propia key en su cuenta Google (paso 1 arriba).
2. Invalidar (borrar) la key de desarrollo una vez que la del cliente esté cargada como secret.

---

## 6. Notas de seguridad

- La `GEMINI_API_KEY` existe **solo como secret de GitHub Actions** — nunca en el código fuente ni en `data/alertas.json`.
- El JSON publicado no contiene información sensible: solo título, resumen, fuente y metadata de clasificación.
- El frontend consume `data/alertas.json` como archivo estático — no hay API expuesta.
