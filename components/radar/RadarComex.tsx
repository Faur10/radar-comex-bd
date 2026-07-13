'use client';

import { useState, useMemo } from 'react';
import type { Alerta, Categoria } from '@/lib/radar/types';
import { RadarHero }    from './RadarHero';
import { AlertFilters, type FilterKey } from './AlertFilters';
import { AlertCard }    from './AlertCard';
import { TodayPanel }  from './TodayPanel';
import { RadarStats }  from './RadarStats';

interface RadarComexProps {
  alertas: Alerta[];
}

const CATEGORIA_KEYS = new Set<FilterKey>([
  'importacion', 'exportacion', 'normativa', 'logistica',
]);
const ORGANISMO_MAP: Partial<Record<FilterKey, string>> = {
  bcra:        'BCRA',
  senasa:      'SENASA',
  arca:        'ARCA',
  aduana:      'Aduana',
  cda:         'CDA',
  anmat:       'ANMAT / INAL',
  inti:        'INTI',
  minecon:     'Min. Economía',
  cancilleria: 'Cancillería',
};

function filterAlertas(alertas: Alerta[], active: FilterKey): Alerta[] {
  if (active === 'todos') return alertas;
  if (active === 'alto') return alertas.filter(a => a.impacto === 'alto');
  if (active === 'informativas') return alertas.filter(a => a.impacto === 'bajo');
  if (CATEGORIA_KEYS.has(active)) return alertas.filter(a => a.categoria === (active as Categoria));
  const org = ORGANISMO_MAP[active];
  if (org) return alertas.filter(a => a.organismo === org);
  return alertas;
}

function buildCounts(alertas: Alerta[]): Partial<Record<FilterKey, number>> {
  const counts: Partial<Record<FilterKey, number>> = {
    todos:        alertas.length,
    importacion:  alertas.filter(a => a.categoria === 'importacion').length,
    exportacion:  alertas.filter(a => a.categoria === 'exportacion').length,
    normativa:    alertas.filter(a => a.categoria === 'normativa').length,
    logistica:    alertas.filter(a => a.categoria === 'logistica').length,
    alto:         alertas.filter(a => a.impacto === 'alto').length,
    informativas: alertas.filter(a => a.impacto === 'bajo').length,
    bcra:   alertas.filter(a => a.organismo === 'BCRA').length,
    senasa: alertas.filter(a => a.organismo === 'SENASA').length,
    arca:   alertas.filter(a => a.organismo === 'ARCA').length,
    aduana: alertas.filter(a => a.organismo === 'Aduana').length,
    cda:    alertas.filter(a => a.organismo === 'CDA').length,
    anmat:       alertas.filter(a => a.organismo === 'ANMAT / INAL').length,
    inti:        alertas.filter(a => a.organismo === 'INTI').length,
    minecon:     alertas.filter(a => a.organismo === 'Min. Economía').length,
    cancilleria: alertas.filter(a => a.organismo === 'Cancillería').length,
  };
  // Omitir ceros salvo "todos"
  return Object.fromEntries(
    Object.entries(counts).filter(([k, v]) => k === 'todos' || (v ?? 0) > 0)
  ) as Partial<Record<FilterKey, number>>;
}

export function RadarComex({ alertas }: RadarComexProps) {
  const [active, setActive] = useState<FilterKey>('todos');

  const filtered = useMemo(() => filterAlertas(alertas, active), [alertas, active]);
  const counts   = useMemo(() => buildCounts(alertas), [alertas]);

  // Clickear una stat ("Alto impacto", "Informativas", "Organismos", etc.)
  // aplica ese filtro y lleva directo a la lista de alertas correspondiente.
  function goToFilter(key: FilterKey) {
    setActive(key);
    document.getElementById('alertas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <RadarHero />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 flex flex-col gap-12">

        {/* Panel de hoy + stats */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <TodayPanel alertas={alertas} onSelect={goToFilter} />
          <div className="w-full min-w-0 flex-1">
            <RadarStats alertas={alertas} onSelect={goToFilter} />
          </div>
        </div>

        {/* Sección de alertas */}
        <section id="alertas" aria-label="Alertas COMEX">
          <div className="flex flex-col gap-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="inline-block text-xl font-bold text-navy bg-gradient-to-r from-gold/15 via-gold/10 to-transparent border border-gold/40 rounded-xl px-4 py-2 shadow-[0_6px_24px_rgba(199,162,74,0.28)]">
                Últimas alertas analizadas con Inteligencia Artificial
              </h2>
              <p className="text-sm text-gray-text" aria-live="polite">
                {filtered.length} {filtered.length === 1 ? 'alerta' : 'alertas'}
              </p>
            </div>

            <AlertFilters active={active} onChange={setActive} counts={counts} />

            {filtered.length === 0 ? (
              <div
                className="text-center py-16 text-gray-text"
                role="status"
                aria-live="polite"
              >
                <p className="text-4xl mb-3" aria-hidden="true">📭</p>
                <p className="font-medium">No hay alertas en esta categoría.</p>
                <p className="text-sm mt-1">Probá con otro filtro.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((alerta, i) => (
                  <AlertCard key={alerta.id} alerta={alerta} index={i} />
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-text">
          <p>
            © {new Date().getFullYear()} <strong className="text-navy">BD Trading SRL</strong> — RADAR COMEX BD
          </p>
          <p className="text-center sm:text-right max-w-md">
            Información orientativa basada en fuentes oficiales. No constituye asesoramiento legal ni aduanero.
          </p>
        </div>
      </footer>
    </>
  );
}
