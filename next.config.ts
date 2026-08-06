import path from 'node:path';

const nextConfig = {
  // Sitio 100% estático: no hay rutas de API ni nada que necesite un
  // servidor Node corriendo — se sirve como HTML/CSS/JS planos desde
  // cualquier hosting (cPanel, etc.), sin depender de Netlify/Vercel.
  output: 'export',
  images: {
    // La optimización de imágenes de Next necesita un servidor; en export
    // estático no hay uno, así que se sirven las imágenes tal cual.
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    // Hay un package-lock.json suelto en la carpeta padre que confunde a
    // Turbopack sobre cuál es la raíz del workspace. Fijarla acá evita el
    // warning y cualquier resolución de módulos ambigua.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
