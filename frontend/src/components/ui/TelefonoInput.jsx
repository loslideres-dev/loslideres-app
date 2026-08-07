import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { PAISES, separarTelefono } from '../../lib/telefono'

const PREFIJOS_MOVIL_VE = ['412', '414', '416', '424', '426']

/**
 * Entrada de teléfono con selector de país.
 *
 * POR QUÉ UN SELECTOR Y NO UN CAMPO LIBRE:
 * Escribiendo libre, la gente teclea "04149600944", "414 9600944" o
 * "+5804149600944", y todos terminaban guardados distinto. Los botones de
 * WhatsApp arman el enlace con los dígitos crudos, así que un formato malo
 * abre un chat vacío y falla en silencio.
 *
 * Con el prefijo fijo a la izquierda, el usuario solo escribe su número local
 * y la ambigüedad desaparece de raíz: nunca hay que adivinar el país.
 *
 * Guarda siempre en E.164: +58XXXXXXXXXX
 */

/** Quita el 0 inicial del formato local venezolano: 0414... → 414... */
function limpiarLocal(numero, codigo) {
  let n = numero.replace(/[^0-9]/g, '')
  if (codigo === '+58' && n.startsWith('0')) n = n.slice(1)
  return n
}

export default function TelefonoInput({
  value,
  onChange,
  error,
  label = 'Teléfono / WhatsApp',
  required = false,
  id = 'telefono',
}) {
  // COMPLETAMENTE CONTROLADO: el número se DERIVA de `value`, no se guarda en
  // estado interno.
  //
  // La primera versión hacía useState(separarTelefono(value).numero), que solo
  // lee el valor al montar. En Perfil los datos del cliente llegan después, de
  // forma asíncrona: el componente se montaba con value='' y cuando llegaba
  // el teléfono real lo ignoraba, mostrando el campo vacío para siempre.
  const partes = useMemo(() => separarTelefono(value), [value])
  const numero = partes.numero

  // El código de país sí necesita memoria propia, pero solo para cuando el
  // número está vacío: sin número no hay un `value` del cual deducirlo.
  const [codigoPreferido, setCodigoPreferido] = useState(partes.codigo)
  const codigo = value ? partes.codigo : codigoPreferido

  const pais = PAISES.find(p => p.codigo === codigo) ?? PAISES[0]

  const emitir = (nuevoCodigo, nuevoNumero) => {
    const limpio = limpiarLocal(nuevoNumero, nuevoCodigo)
    onChange(limpio ? `${nuevoCodigo}${limpio}` : '')
  }

  const cambiarPais = (nuevo) => {
    setCodigoPreferido(nuevo)
    emitir(nuevo, numero)
  }

  const cambiarNumero = (texto) => {
    emitir(codigo, texto)
  }

  // Aviso, no bloqueo: si el largo no cuadra se le dice, pero se guarda igual.
  // Perder un cliente por una regla que no contemplamos es peor que un
  // teléfono con formato raro, que siempre se puede corregir después.
  const digitos = limpiarLocal(numero, codigo).length
  const avisoLargo = digitos > 0 && digitos !== pais.digitos
    ? `Un número de ${pais.nombre} suele tener ${pais.digitos} dígitos`
    : null

  const avisoVE = codigo === '+58' && digitos === 10
    && !PREFIJOS_MOVIL_VE.includes(numero.slice(0, 3))
    ? 'Los móviles en Venezuela empiezan por 412, 414, 416, 424 o 426'
    : null

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}{required && ' *'}
        </label>
      )}

      <div className="flex gap-2">
        {/* Selector de país */}
        <div className="relative flex-shrink-0">
          <select
            value={codigo}
            onChange={e => cambiarPais(e.target.value)}
            aria-label="Código de país"
            className="appearance-none pl-3 pr-7 py-3 rounded-xl border border-slate-300
              bg-white text-base font-mono text-slate-800 outline-none
              focus:ring-2 focus:ring-blue-500 cursor-pointer">
            {PAISES.map(p => (
              <option key={p.codigo} value={p.codigo}>
                {p.pais} {p.codigo}
              </option>
            ))}
          </select>
          <ChevronDown size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500
              pointer-events-none" />
        </div>

        {/* Número local */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={numero}
          onChange={e => cambiarNumero(e.target.value)}
          placeholder={pais.ejemplo}
          className={`flex-1 min-w-0 px-4 py-3 rounded-xl border text-base font-mono
            text-slate-800 outline-none transition focus:ring-2 focus:ring-blue-500
            ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && (avisoLargo || avisoVE) && (
        <p className="mt-1 text-xs" style={{ color: '#B45309' }}>
          {avisoVE ?? avisoLargo}
        </p>
      )}
      {!error && !avisoLargo && !avisoVE && digitos > 0 && (
        <p className="mt-1 text-xs text-slate-500 font-mono">
          Se guardará como {codigo}{limpiarLocal(numero, codigo)}
        </p>
      )}
    </div>
  )
}
