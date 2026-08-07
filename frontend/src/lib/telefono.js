/**
 * Utilidades de teléfono — compartidas.
 *
 * Viven aquí y no dentro de TelefonoInput.jsx porque un archivo que exporta
 * componentes y constantes a la vez rompe el fast refresh de Vite: cualquier
 * edición recarga la página entera en lugar de refrescar el componente.
 *
 * El formato de guardado es siempre E.164: +58XXXXXXXXXX. Los botones de
 * WhatsApp arman el enlace con los dígitos crudos, así que un número mal
 * formado abre un chat vacío y falla en silencio.
 */

// Venezuela primero: es de donde viene casi todo el tráfico.
export const PAISES = [
  { codigo: '+58', pais: 'VE', nombre: 'Venezuela',      digitos: 10, ejemplo: '4141234567' },
  { codigo: '+57', pais: 'CO', nombre: 'Colombia',       digitos: 10, ejemplo: '3001234567' },
  { codigo: '+1',  pais: 'US', nombre: 'EE.UU. / Canadá', digitos: 10, ejemplo: '3051234567' },
  { codigo: '+51', pais: 'PE', nombre: 'Perú',           digitos: 9,  ejemplo: '912345678' },
  { codigo: '+56', pais: 'CL', nombre: 'Chile',          digitos: 9,  ejemplo: '912345678' },
  { codigo: '+34', pais: 'ES', nombre: 'España',         digitos: 9,  ejemplo: '612345678' },
  { codigo: '+55', pais: 'BR', nombre: 'Brasil',         digitos: 11, ejemplo: '11912345678' },
  { codigo: '+52', pais: 'MX', nombre: 'México',         digitos: 10, ejemplo: '5512345678' },
]


/** Separa un número E.164 guardado en (código de país, resto). */
export function separarTelefono(valor) {
  if (!valor) return { codigo: '+58', numero: '' }
  const limpio = valor.replace(/[^0-9+]/g, '')

  // Los códigos largos se prueban primero: +58 antes que +5, si no "+58..."
  // se leería como Perú.
  const ordenados = [...PAISES].sort((a, b) => b.codigo.length - a.codigo.length)
  for (const p of ordenados) {
    if (limpio.startsWith(p.codigo)) {
      return { codigo: p.codigo, numero: limpio.slice(p.codigo.length) }
    }
  }

  // Sin código reconocible: se asume el número local tal cual, sin inventar país
  return { codigo: '+58', numero: limpio.replace(/^\+/, '') }
}