'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import type { Alerta } from '@/lib/radar/types';

interface RadarStatsProps {
  alertas: Alerta[];
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
}

function StatCard({ stat, animate }: { stat: StatItem; animate: boolean }) {
  const count = useCountUp(stat.value, animate);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-5 min-h-[104px] flex flex-col items-center justify-center text-center gap-1">
      <p className={`text-3xl font-bold leading-none ${stat.accent}`}>
        {count}{stat.suffix ?? ''}
      </p>
      <p className="text-xs sm:text-sm text-gray-text leading-snug">{stat.label}</p>
    </div>
  );
}

export function RadarStats({ alertas }: RadarStatsProps) {
  const reduced = useReducedMotion();
  const ref     = useRef<HTMLElement>(null);
  const inView  = useInView(ref, { once: true, margin: '-80px' });
  const animate = inView && !reduced;

  const altos        = alertas.filter(a => a.impacto === 'alto').length;
  const oportunidades = alertas.filter(a => a.impacto === 'oportunidad').length;
  const organismos   = new Set(alertas.map(a => a.organismo)).size;

  const stats: StatItem[] = [
    { label: 'Alertas activas',   value: alertas.length, accent: 'text-navy' },
    { label: 'Alto impacto',      value: altos,          accent: 'text-red-600' },
    { label: 'Oportunidades',     value: oportunidades,  accent: 'text-emerald-600' },
    { label: 'Organismos',        value: organismos,     accent: 'text-gold' },
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
          <StatCard key={s.label} stat={s} animate={animate} />
        ))}
      </motion.div>
    </section>
  );
}
