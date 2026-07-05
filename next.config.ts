import path from 'node:path';

const nextConfig = {
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
