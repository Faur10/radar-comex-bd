'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { Alerta, Impacto, Categoria } from '@/lib/radar/types';

// ── Helpers de presentación ──────────────────────────────────────────────────

const IMPACTO_CONFIG: Record<Impacto, { label: string; dot: string; badge: string }> = {
  alto:        { label: 'Alto impacto', dot: 'bg-red-500',   badge: 'bg-red-50 text-red-700 border-red-200' },
  medio:       { label: 'Medio',        dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  oportunidad: { label: 'Oportunidad',  dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const CATEGORIA_LABEL: Record<Categoria, string> = {
  importacion: 'Importación',
  exportacion: 'Exportación',
  normativa:   'Normativa',
  logistica:   'Logística',
};

const ORGANISMO_COLOR: Record<string, string> = {
  ARCA:   'bg-blue-50 text-blue-800 border-blue-200',
  Aduana: 'bg-slate-50 text-slate-700 border-slate-200',
  SENASA: 'bg-green-50 text-green-800 border-green-200',
  BCRA:   'bg-purple-50 text-purple-800 border-purple-200',
};

function formatFecha(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function buildJsonLd(alerta: Alerta): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline:      alerta.titulo,
    description:   alerta.resumen,
    datePublished: alerta.publicadoEn,
    dateModified:  alerta.actualizadoEn,
    author: { '@type': 'Organization', name: alerta.organismo },
    publisher: {
      '@type': 'Organization',
      name:    'BD Trading SRL',
      logo:    { '@type': 'ImageObject', url: 'https://radar-comex-bd.netlify.app/favicon.ico' },
    },
    url: alerta.fuente.url,
  });
}

// ── Componente ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  alerta: Alerta;
  index:  number;
}

export function AlertCard({ alerta, index }: AlertCardProps) {
  const reduced = useReducedMotion();

  const impacto  = IMPACTO_CONFIG[alerta.impacto];
  const orgColor = ORGANISMO_COLOR[alerta.organismo] ?? 'bg-gray-50 text-gray-700 border-gray-200';

  const variants = reduced
    ? {}
    : {
        hidden:  { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.07 } },
      };

  return (
    <>
      {/* JSON-LD para SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildJsonLd(alerta) }}
      />

      <motion.article
        variants={reduced ? undefined : variants}
        initial={reduced ? undefined : 'hidden'}
        whileInView={reduced ? undefined : 'visible'}
        viewport={{ once: true, margin: '-40px' }}
        whileHover={reduced ? undefined : { y: -3, boxShadow: '0 8px 30px rgba(11,31,58,0.10)' }}
        transition={{ duration: 0.2 }}
        aria-label={`Alerta: ${alerta.titulo}`}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 cursor-default"
      >
        {/* Cabecera: organismo + fecha + impacto */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${orgColor}`}>
              {alerta.organismo}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border ${impacto.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${impacto.dot}`} aria-hidden="true" />
              {impacto.label}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 font-medium border border-gray-200">
              {CATEGORIA_LABEL[alerta.categoria]}
            </span>
          </div>
          <time
            dateTime={alerta.fecha}
            className="text-xs text-gray-text shrink-0"
          >
            {formatFecha(alerta.fecha)}
          </time>
        </div>

        {/* Título */}
        <h2 className="text-base font-semibold text-navy leading-snug">
          {alerta.titulo}
        </h2>

        {/* Resumen */}
        <p className="text-sm text-gray-text leading-relaxed">
          {alerta.resumen}
        </p>

        {/* Bloque "¿Qué significa para su empresa?" */}
        <div
          className="border-l-4 border-gold bg-gray-light rounded-r-xl px-4 py-3"
          aria-label="Qué significa para su empresa"
        >
          <p className="text-xs font-semibold text-gold uppercase tracking-wide mb-1">
            ¿Qué significa para su empresa?
          </p>
          <p className="text-sm text-navy leading-relaxed">
            {alerta.queSignifica}
          </p>
        </div>

        {/* Tags */}
        {alerta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Etiquetas">
            {alerta.tags.map(tag => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-text border border-gray-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Pie: normativa + fuente */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-100">
          {alerta.normativaRef && (
            <span className="text-xs text-gray-text font-mono">
              {alerta.normativaRef}
            </span>
          )}
          <a
            href={alerta.fuente.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-navy/60 hover:text-gold transition-colors focus:outline-none focus:underline"
            aria-label={`Ver fuente oficial: ${alerta.fuente.nombre}`}
          >
            {alerta.fuente.nombre}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </a>
        </div>
      </motion.article>
    </>
  );
}
