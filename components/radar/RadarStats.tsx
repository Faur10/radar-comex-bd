'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { Alerta } from '@/lib/radar/types';
import type { FilterKey } from './AlertFilters';

interface RadarStatsProps {
  alertas:  Alerta[];
  onSelect: (key: FilterKey) => void;
}

function useCountUp(target: number, enabled: boolean, duration = 1000): number {
  const [value, setValue] = useState(enabled ? target : 0);

  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    if (target === 0) return;
    const start  = performance.now();
    let raf: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, duration]);

  return value;
}

interface StatItem {
  label:    string;
  value:    number;
  suffix?:  string;
  accent:   string;
  filterKey: FilterKey;
}

function StatCard({ stat, animate, onSelect }: { stat: StatItem; animate: boolean; onSelect: (key: FilterKey) => void }) {
  const count = useCountUp(stat.value, animate);

  return (
    <button
      type="button"
      onClick={() => onSelect(stat.filterKey)}
      aria-label={`Ver alertas: ${stat.label}, ${stat.value}`}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-5 min-h-[104px] flex flex-col items-center justify-center text-center gap-1 transition-shadow hover:shadow-md hover:border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1 cursor-pointer"
    >
      <p className={`text-3xl font-bold leading-none ${stat.accent}`}>
        {count}{stat.suffix ?? ''}
      </p>
      <p className="text-xs sm:text-sm text-gray-text leading-snug">{stat.label}</p>
    </button>
  );
}

export function RadarStats({ alertas, onSelect }: RadarStatsProps) {
  const reduced = useReducedMotion();
  const ref     = useRef<HTMLElement>(null);
  const inView  = useInView(ref, { once: true, margin: '-80px' });
  const animate = inView && !reduced;

  const altos        = alertas.filter(a => a.impacto === 'alto').length;
  const informativas = alertas.filter(a => a.impacto === 'bajo').length;
  const organismos   = new Set(alertas.map(a => a.organismo)).size;

  const stats: StatItem[] = [
    { label: 'Alertas activas',   value: alertas.length, accent: 'text-navy',      filterKey: 'todos' },
    { label: 'Alto impacto',      value: altos,          accent: 'text-red-600',   filterKey: 'alto' },
    { label: 'Informativas',      value: informativas,   accent: 'text-slate-500', filterKey: 'informativas' },
    { label: 'Organismos',        value: organismos,     accent: 'text-gold',      filterKey: 'todos' },
  ];

  return (
    <section ref={ref} aria-label="Estadísticas del radar COMEX">
      <motion.div
        initial={reduced ? undefined : { opacity: 0 }}
        animate={inView ? { opacity: 1 } : undefined}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {stats.map(s => (
          <StatCard key={s.label} stat={s} animate={animate} onSelect={onSelect} />
        ))}
      </motion.div>
    </section>
  );
}
