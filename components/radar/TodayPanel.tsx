'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { Alerta } from '@/lib/radar/types';
import type { FilterKey } from './AlertFilters';

interface TodayPanelProps {
  alertas:  Alerta[];
  onSelect: (key: FilterKey) => void;
}

export function TodayPanel({ alertas, onSelect }: TodayPanelProps) {
  const reduced = useReducedMotion();

  // El radar corre de lunes a viernes y mergea con lo existente reteniendo
  // una ventana móvil de 14 días (ver merge.ts) — "alertas" ya viene
  // recortada a esa ventana, no hace falta filtrar acá.
  const altos        = alertas.filter(a => a.impacto === 'alto').length;
  const informativas = alertas.filter(a => a.impacto === 'bajo').length;
  const organismos   = [...new Set(alertas.map(a => a.organismo))];

  if (alertas.length === 0) return null;

  const stats: Array<{ label: string; value: number; color: string; filterKey: FilterKey }> = [
    { label: 'Novedades (14 días)', value: alertas.length, color: 'text-navy',      filterKey: 'todos' },
    { label: 'Alto impacto',        value: altos,          color: 'text-red-600',  filterKey: 'alto' },
    { label: 'Informativas',        value: informativas,   color: 'text-slate-300', filterKey: 'informativas' },
  ];

  const container = {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.1 } },
  };
  const item = {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <section
      aria-label="Novedades COMEX de los últimos 14 días"
      className="bg-navy text-white rounded-2xl px-6 py-5 shadow-lg lg:w-[300px] lg:shrink-0"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
        </span>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gold">
          COMEX — ÚLTIMOS 14 DÍAS
        </h2>
      </div>

      <motion.div
        variants={reduced ? undefined : container}
        initial={reduced ? undefined : 'hidden'}
        animate={reduced ? undefined : 'visible'}
        className="grid grid-cols-3 gap-4 mb-4"
      >
        {stats.map(s => (
          <motion.button
            type="button"
            key={s.label}
            variants={reduced ? undefined : item}
            onClick={() => onSelect(s.filterKey)}
            aria-label={`Ver alertas: ${s.label}, ${s.value}`}
            className="text-center rounded-lg py-1 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-gold cursor-pointer"
          >
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
          </motion.button>
        ))}
      </motion.div>

      {organismos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
          <span className="text-xs text-white/40 self-center">Emiten:</span>
          {organismos.map(org => (
            <span
              key={org}
              className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-md"
            >
              {org}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
