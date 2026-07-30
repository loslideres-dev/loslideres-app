/**
 * entry-server.jsx
 * Entry point del lado del servidor para el prerender.
 * Exporta una función `render()` que devuelve el HTML
 * estático del componente Landing.
 *
 * Nota: no tiene acceso a window/document ni a Supabase
 * durante el render — solo genera el HTML inicial estático.
 * El rastreador de paquetes funciona en el cliente (JS).
 */
import { renderToString } from 'react-dom/server'
import Landing from './src/Landing.jsx'

export function render() {
  return renderToString(<Landing />)
}
