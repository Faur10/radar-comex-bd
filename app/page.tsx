import type { Metadata } from 'next';
import { getAlertas } from '@/lib/radar/getAlertas';
import { RadarComex } from '@/components/radar/RadarComex';

export const metadata: Metadata = {
  title: 'RADAR COMEX BD — Alertas de Comercio Exterior | BD Trading SRL',
  description:
    'Alertas diarias de comercio exterior en Argentina: BCRA, ARCA, Aduana, SENASA. Actualización automática con fuentes oficiales.',
  openGraph: {
    title: 'RADAR COMEX BD',
    description: 'Alertas de comercio exterior para importadores y exportadores argentinos.',
    type: 'website',
    locale: 'es_AR',
  },
};

export default async function Home() {
  const alertas = await getAlertas();

  return <RadarComex alertas={alertas} />;
}
