import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtenemos la ruta exacta de tu proyecto
const __dirname = dirname(fileURLToPath(import.meta.url));

// Le decimos a Vite que busque todos los archivos que terminen en .html
const entradas = {};
fs.readdirSync(__dirname).filter(archivo => archivo.endsWith('.html')).forEach(archivo => {
  const nombre = archivo.replace('.html', '');
  entradas[nombre] = resolve(__dirname, archivo);
});

export default defineConfig({
  build: {
    rollupOptions: {
      // Le pasamos la lista automática a la trituradora
      input: entradas
    }
  }
});