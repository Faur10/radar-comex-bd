# Motor de actualización – RADAR COMEX BD

Job diario en GitHub Actions que obtiene novedades de BCRA y Boletín Oficial,
filtra las relevantes para comercio exterior y las publica en `data/alertas.json`.
El push automático dispara el redeploy en Netlify.

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

> El free tier de Gemini incluye 1.500 requests/día y 1M tokens/min con `gemini-2.0-flash-lite`, suficiente para el job diario.

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
3. El job corre automáticamente a las **08:00 hora Argentina** (11:00 UTC) todos los días.
4. Para correr manualmente: Actions → "Radar COMEX BD" → **Run workflow**.

---

## 4. Cómo funciona el motor

```
fetchBCRA() ─┐
             ├─→ filterComex() → classifyWithAI() [o fallback] → mergeAlertas() → writeAlertas()
fetchBoletin()─┘
```

- Si **una fuente cae**, las demás continúan.
- Si **Gemini falla o no hay key**, `fallback.ts` clasifica por palabras clave.
- Si **el job falla**, GitHub envía mail automático al dueño del repo.
- `data/alertas.json` se escribe atómicamente (temp → rename) para evitar corrupción.

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
