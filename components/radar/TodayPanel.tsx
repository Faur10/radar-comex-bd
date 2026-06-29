'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Alerta } from '@/lib/radar/types';

interface TodayPanelProps {
  alertas: Alerta[];
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TodayPanel({ alertas }: TodayPanelProps) {
  const reduced = useReducedMotion();
  const today   = getTodayIso();

  const hoy = useMemo(() => alertas.filter(a => a.fecha === today), [alertas, today]);

  const altos        = hoy.filter(a => a.impacto === 'alto').length;
  const oportunidades = hoy.filter(a => a.impacto === 'oportunidad').length;
  const organismos   = [...new Set(hoy.map(a => a.organismo))];

  if (hoy.length === 0) return null;

  const stats = [
    { label: 'Novedades hoy',   value: hoy.length,    color: 'text-navy' },
    { label: 'Alto impacto',    value: altos,          color: 'text-red-600' },
    { label: 'Oportunidades',   value: oportunidades,  color: 'text-emerald-600' },
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
      aria-label="Novedades de hoy en COMEX"
      className="bg-navy text-white rounded-2xl px-6 py-5 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
        </span>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gold">
          HOY EN COMEX
        </h2>
      </div>

      <motion.div
        variants={reduced ? undefined : container}
        initial={reduced ? undefined : 'hidden'}
        animate={reduced ? undefined : 'visible'}
        className="grid grid-cols-3 gap-4 mb-4"
      >
        {stats.map(s => (
          <motion.div
            key={s.label}
            variants={reduced ? undefined : item}
            className="text-center"
          >
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
          </motion.div>
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
