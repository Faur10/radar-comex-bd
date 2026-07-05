'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { Categoria, Impacto } from '@/lib/radar/types';

export type FilterKey =
  | 'todos'
  | Categoria
  | 'alto'
  | 'informativas'
  | 'bcra'
  | 'senasa'
  | 'arca'
  | 'aduana'
  | 'cda'
  | 'anmat'
  | 'inti'
  | 'minecon'
  | 'cancilleria';

interface FilterOption {
  key:   FilterKey;
  label: string;
}

const FILTERS: FilterOption[] = [
  { key: 'todos',        label: 'Todos' },
  { key: 'importacion',  label: 'Importación' },
  { key: 'exportacion',  label: 'Exportación' },
  { key: 'normativa',    label: 'Normativa' },
  { key: 'logistica',    label: 'Logística' },
  { key: 'alto',         label: 'Alto impacto' },
  { key: 'informativas', label: 'Informativas' },
  { key: 'bcra',         label: 'BCRA' },
  { key: 'senasa',       label: 'SENASA' },
  { key: 'arca',         label: 'ARCA' },
  { key: 'aduana',       label: 'Aduana' },
  { key: 'cda',          label: 'CDA' },
  { key: 'anmat',        label: 'ANMAT / INAL' },
  { key: 'inti',         label: 'INTI' },
  { key: 'minecon',      label: 'Min. Economía' },
  { key: 'cancilleria',  label: 'Cancillería' },
];

interface AlertFiltersProps {
  active:   FilterKey;
  onChange: (key: FilterKey) => void;
  counts:   Partial<Record<FilterKey, number>>;
}

export function AlertFilters({ active, onChange, counts }: AlertFiltersProps) {
  const reduced = useReducedMotion();

  return (
    <nav
      aria-label="Filtros de alertas COMEX"
      className="flex flex-wrap gap-2"
    >
      {FILTERS.map((f) => {
        const count = counts[f.key];

        // Solo "Todos" se muestra siempre. El resto de los chips son
        // data-driven: si no hay ninguna alerta de esa categoría/organismo
        // en este momento, no ensucia el menú con una opción vacía.
        if (f.key !== 'todos' && count === undefined) return null;

        const isActive = active === f.key;

        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            role="tab"
            aria-pressed={isActive}
            aria-label={`Filtrar por ${f.label}${count !== undefined ? `, ${count} alertas` : ''}`}
            className={[
              'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-1',
              isActive
                ? 'text-navy bg-gold'
                : 'text-gray-text bg-white border border-gray-200 hover:border-gold hover:text-navy',
            ].join(' ')}
          >
            {/* Subrayado deslizante (solo si no hay motion reducido) */}
            {isActive && !reduced && (
              <motion.span
                layoutId="filter-indicator"
                className="absolute inset-0 rounded-lg bg-gold -z-10"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            {f.label}
            {count !== undefined && (
              <span
                className={[
                  'ml-1.5 text-xs font-bold',
                  isActive ? 'text-navy/70' : 'text-gray-text/60',
                ].join(' ')}
                aria-hidden="true"
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
