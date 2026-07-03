import type { Alerta } from './types';
import alertasData from '../../data/alertas.json';

/**
 * Única capa de acceso a los datos de alertas.
 * Ningún componente toca los datos directamente.
 */
export async function getAlertas(): Promise<Alerta[]> {
  return alertasData as unknown as Alerta[];
}
