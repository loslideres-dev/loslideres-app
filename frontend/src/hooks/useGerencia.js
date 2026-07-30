import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ═══════════════════════════════════════════════════════════════════════════
// TIEMPOS OBJETIVO POR ETAPA
//
// Cuánto debería tardar un paquete en salir de cada estado. Un paquete que
// lleva más tiempo del objetivo es un cuello de botella: nadie se ha quejado
// todavía, pero es un cliente esperando.
//
// Por ahora están aquí en el código. En la fase G5 pasan a una tabla
// configurable desde la interfaz, junto con la medición formal de SLA.
// ═══════════════════════════════════════════════════════════════════════════
export const OBJETIVO_HORAS = {
  RECIBIDO:    48,   // el admin debería tarifarlo en dos días
  TARIFADO:    96,   // el conductor sale con él en el siguiente viaje
  EN_TRANSITO: 48,   // el cruce Maicao → Maracaibo
  EN_REPARTO:  24,   // una vez en la ciudad, se entrega el mismo día
}

// Estaciones del corredor, en orden de recorrido.
export const CORREDOR = [
  { estado: 'RECIBIDO',    etiqueta: 'En bodega',   lugar: 'Maicao'     },
  { estado: 'TARIFADO',    etiqueta: 'Tarifado',    lugar: 'Maicao'     },
  { estado: 'EN_TRANSITO', etiqueta: 'En ruta',     lugar: 'Frontera'   },
  { estado: 'EN_REPARTO',  etiqueta: 'Repartiendo', lugar: 'Maracaibo'  },
  { estado: 'ENTREGADO',   etiqueta: 'Entregado',   lugar: 'Maracaibo'  },
]

function horasDesde(fecha) {
  if (!fecha) return null
  return (Date.now() - new Date(fecha).getTime()) / 36e5
}

// La fecha desde la que se cuenta el tiempo en el estado actual.
// Para RECIBIDO es cuando llegó; para el resto, la última modificación.
function fechaDelEstado(p) {
  return p.estado === 'RECIBIDO'
    ? (p.fecha_recepcion ?? p.updated_at)
    : (p.updated_at ?? p.fecha_recepcion)
}

// ═══════════════════════════════════════════════════════════════════════════
// PANEL DE GERENCIA
//
// Una sola consulta a los paquetes en circulación (no entregados) más los
// entregados del periodo, y de ahí se derivan el corredor, los atascos y
// el pulso del negocio.
// ═══════════════════════════════════════════════════════════════════════════
export function usePanelGerencia() {
  return useQuery({
    queryKey: ['panel-gerencia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paquetes_con_cliente')
        .select(`
          id, codigo, tracking_externo, estado, tamanio,
          precio_final, monto_traslado, monto_cobrado_usd,
          fecha_recepcion, fecha_entrega, updated_at,
          cliente_nombre, conductor_id, bodeguero_id
        `)
      if (error) throw error

      const paquetes = data ?? []
      const enCirculacion = paquetes.filter(p => p.estado !== 'ENTREGADO')
      const entregados    = paquetes.filter(p => p.estado === 'ENTREGADO')

      // ── Corredor: cuántos hay en cada estación ──
      const conteo = {}
      for (const p of paquetes) conteo[p.estado] = (conteo[p.estado] ?? 0) + 1

      // ── Atascos: los que pasaron su tiempo objetivo ──
      const atascados = []
      for (const p of enCirculacion) {
        const objetivo = OBJETIVO_HORAS[p.estado]
        if (!objetivo) continue
        const horas = horasDesde(fechaDelEstado(p))
        if (horas != null && horas > objetivo) {
          atascados.push({
            ...p,
            horasEnEstado: Math.round(horas),
            objetivo,
            excesoHoras:   Math.round(horas - objetivo),
            // Más de tres veces el objetivo ya no es demora, es olvido
            critico: horas > objetivo * 3,
          })
        }
      }
      atascados.sort((a, b) => b.excesoHoras - a.excesoHoras)

      // Cuántos atascados por estación, para pintar la alerta en el corredor
      const atascoPorEstado = {}
      for (const p of atascados) {
        atascoPorEstado[p.estado] = (atascoPorEstado[p.estado] ?? 0) + 1
      }

      // ── Pulso del mes en curso ──
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)

      const entregadosMes = entregados.filter(
        p => p.fecha_entrega && new Date(p.fecha_entrega) >= inicioMes
      )
      const recibidosMes = paquetes.filter(
        p => p.fecha_recepcion && new Date(p.fecha_recepcion) >= inicioMes
      )

      const ingresosMes = entregadosMes
        .reduce((s, p) => s + (Number(p.precio_final) || 0), 0)
      const trasladosMes = entregadosMes
        .reduce((s, p) => s + (Number(p.monto_traslado) || 0), 0)

      // ── Tiempo de ciclo: de llegada a bodega hasta entrega ──
      const ciclos = entregadosMes
        .filter(p => p.fecha_recepcion && p.fecha_entrega)
        .map(p => (new Date(p.fecha_entrega) - new Date(p.fecha_recepcion)) / 36e5)
      const cicloPromedio = ciclos.length
        ? ciclos.reduce((a, b) => a + b, 0) / ciclos.length
        : null

      // ── Valor detenido: cuánto dinero hay parado en el corredor ──
      const valorEnCirculacion = enCirculacion
        .reduce((s, p) => s + (Number(p.precio_final) || 0), 0)

      return {
        conteo,
        atascados,
        atascoPorEstado,
        totalEnCirculacion: enCirculacion.length,
        valorEnCirculacion,
        entregadosMes: entregadosMes.length,
        recibidosMes:  recibidosMes.length,
        ingresosMes,
        trasladosMes,
        utilidadMes:   ingresosMes - trasladosMes,
        cicloPromedio,
        totalHistorico: paquetes.length,
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
