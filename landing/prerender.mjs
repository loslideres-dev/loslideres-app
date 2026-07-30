/**
 * prerender.mjs
 * Genera el HTML estático de la landing en tiempo de build.
 * Se ejecuta DESPUÉS de `vite build` y reemplaza el index.html
 * vacío por uno con el contenido real de la página.
 *
 * Así Google recibe HTML completo en el primer byte, sin esperar
 * al JS — mejora LCP, FCP y la indexación del contenido.
 *
 * El JS sigue cargando después para hacer la página interactiva
 * (rastreador de paquetes, animaciones, menú). Esto se llama
 * "hydration" y es transparente para el usuario.
 */

import fs   from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir   = path.resolve(__dirname, 'dist')

// El server entry que Vite generó al hacer el build SSR
const { render } = await import(
  path.resolve(distDir, 'server', 'entry-server.js')
)

// Leer el template HTML que generó Vite
const template = fs.readFileSync(
  path.resolve(distDir, 'index.html'), 'utf-8'
)

// Renderizar el componente a HTML
const appHtml = render()

// Inyectar el HTML en el div#root
const html = template.replace(
  '<div id="root"></div>',
  `<div id="root">${appHtml}</div>`
)

// Sobreescribir el index.html con el HTML pre-renderizado
fs.writeFileSync(path.resolve(distDir, 'index.html'), html)

console.log('✅ Prerender completado → dist/index.html')
