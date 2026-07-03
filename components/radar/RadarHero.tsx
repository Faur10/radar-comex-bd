'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';

export function RadarHero() {
  const reduced = useReducedMotion();

  const fade = reduced
    ? {}
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

  return (
    <section
      className="relative bg-navy text-white overflow-hidden"
      aria-label="Encabezado RADAR COMEX BD"
    >
      {/* Textura sutil de fondo */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #C7A24A 0, #C7A24A 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 flex flex-col md:flex-row md:items-center gap-12">

        {/* Columna izquierda: textos */}
        <div className="flex-1 flex flex-col">
          {/* Volver al sitio principal */}
          <motion.div
            {...fade}
            transition={{ duration: 0.4 }}
          >
            <a
              href="https://www.bdtradingsrl.com.ar"
              className="inline-flex items-center gap-1.5 text-white/50 hover:text-gold text-sm font-medium mb-8 transition-colors focus:outline-none focus:underline"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Volver a BD Trading SRL
            </a>
          </motion.div>

          {/* Indicador en vivo */}
          <motion.div
            {...fade}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold" />
            </span>
            <span className="text-gold text-sm font-medium tracking-wide uppercase">
              Actualización automática diaria
            </span>
          </motion.div>

          {/* Título */}
          <motion.h1
            {...fade}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-4"
          >
            RADAR{' '}
            <span className="text-gold">COMEX</span> BD
          </motion.h1>

          {/* Subtítulo */}
          <motion.p
            {...fade}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl font-light text-white/80 mb-4 max-w-2xl"
          >
            Anticipamos los cambios que afectan sus operaciones.
          </motion.p>

          {/* Descripción */}
          <motion.p
            {...fade}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-white/60 mb-10 max-w-xl leading-relaxed"
          >
            Información oficial procesada por inteligencia comercial para
            importadores y exportadores.
          </motion.p>

          {/* CTA */}
          <motion.div
            {...fade}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <a
              href="#alertas"
              className="inline-flex items-center gap-2 bg-gold text-navy font-semibold px-7 py-3.5 rounded-xl hover:brightness-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-navy"
            >
              Ver últimas alertas
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </a>
          </motion.div>

          {/* Disclaimer */}
          <motion.p
            {...fade}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-10 text-white/35 text-xs max-w-lg leading-relaxed"
          >
            Resúmenes orientativos elaborados sobre fuentes oficiales. Consulte a
            su despachante para evaluar el impacto en su operación particular.
          </motion.p>
        </div>

        {/* Columna derecha: logo animado (solo desktop) */}
        <motion.div
          {...fade}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="hidden md:flex shrink-0 items-center justify-center"
        >
          <Image
            src="/logo-bd.gif"
            alt="BD Trading SRL"
            width={280}
            height={280}
            unoptimized
            priority
            className="drop-shadow-2xl"
          />
        </motion.div>

      </div>
    </section>
  );
}
