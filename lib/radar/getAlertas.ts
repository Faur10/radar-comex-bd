import type { Alerta } from './types';
import mockData from '../../data/alertas.mock.json';

/**
 * Única capa de acceso a los datos de alertas.
 * Para cambiar a API real: reemplazá solo el interior de esta función.
 * Ningún componente toca los datos directamente.
 */
export async function getAlertas(): Promise<Alerta[]> {
  // TODO producción: return fetch('/api/alertas').then(r => r.json())
  // O bien: fs.readFileSync(path.join(process.cwd(), 'data/alertas.json'))
  return mockData as unknown as Alerta[];
}
