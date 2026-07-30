import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ═══════════════════════════════════════════════════════════════════════════
// PERIODO ACTUAL (lo que aún no se ha cobrado)
//
// Estos hooks devuelven solo lo pendiente de liquidar. Después de cada
// cierre el contador vuelve a cero automáticamente, porque los paquetes
// ya liquidados quedan marcados con su liquidacion_id.
// ═══════════════════════════════════════════════════════════════════════════

// ── Conductor: entregas pendientes de cobro ───────────────────────────────────
export function usePendienteConductor(conductorId) {
  return useQuery({
    queryKey: ['pendiente-conductor', conductorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paquetes')
        .select('id, codigo, tracking_externo, monto_traslado, fecha_entrega, tamanio')
        .eq('conductor_id', conductorId)
        .eq('estado', 'ENTREGADO')
        .is('liquidacion_conductor_id', null)
        .order('fecha_entrega', { ascending: false })
      if (error) throw error

      const paquetes = data ?? []
      return {
        paquetes,
        totalEntregados: paquetes.length,
        totalTraslados:  paquetes.reduce((s, p) => s + (Number(p.monto_traslado) || 0), 0),
        desde: paquetes.length
          ? paquetes[paquetes.length - 1].fecha_entrega
          : null,
      }
    },
    enabled: !!conductorId,
    staleTime: 15_000,
  })
}

// ── Bodeguero: recepciones pendientes de cobro ────────────────────────────────
export function usePendienteBodeguero(bodegueroId) {
  return useQuery({
    queryKey: ['pendiente-bodeguero', bodegueroId],
    queryFn: async () => {
      const { data: cfg } = await supabase
        .from('config_negocio')
        .select('valor')
        .eq('clave', 'tarifa_bodeguero_por_paquete')
        .single()
      const tarifaPorPaquete = Number(cfg?.valor ?? 10000)

      const { data, error } = await supabase
        .from('paquetes')
        .select(`id, codigo, tracking_externo, fecha_recepcion, tamanio,
                 cobro_destino, monto_cobro_destino, comprobante_cobro_url`)
        .eq('bodeguero_id', bodegueroId)
        .is('liquidacion_bodeguero_id', null)
        .order('fecha_recepcion', { ascending: false })
      if (error) throw error

      const paquetes = data ?? []
      const comision = paquetes.length * tarifaPorPaquete
      // Fletes de cobro a destino que el bodeguero pagó de su bolsillo
      const reembolsos = paquetes.reduce(
        (s, p) => s + (Number(p.monto_cobro_destino) || 0), 0)

      return {
        paquetes,
        totalRecibidos:  paquetes.length,
        comision,                          // COP por trabajo
        reembolsos,                        // COP a devolver
        totalGanado:     comision + reembolsos,
        paquetesConCobro: paquetes.filter(p => p.cobro_destino).length,
        tarifaPorPaquete,
        desde: paquetes.length
          ? paquetes[paquetes.length - 1].fecha_recepcion
          : null,
      }
    },
    enabled: !!bodegueroId,
    staleTime: 15_000,
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTÓRICO POR FECHAS (sin importar si está liquidado o no)
//
// Se conservan tal como estaban: sirven para consultar cualquier rango,
// independientemente de los cierres de pago.
// ═══════════════════════════════════════════════════════════════════════════

// ── Reporte del conductor: entregas en un rango de fechas ─────────────────────
export function useReporteConductor(conductorId, desde, hasta) {
  return useQuery({
    queryKey: ['reporte-conductor', conductorId, desde, hasta],
    queryFn: async () => {
      let q = supabase
        .from('paquetes')
        .select('id, codigo, precio_final, monto_traslado, fecha_entrega, estado')
        .eq('conductor_id', conductorId)
        .eq('estado', 'ENTREGADO')

      if (desde) q = q.gte('fecha_entrega', `${desde}T00:00:00`)
      if (hasta) q = q.lte('fecha_entrega', `${hasta}T23:59:59`)

      const { data, error } = await q.order('fecha_entrega', { ascending: false })
      if (error) throw error

      const totalEntregados = data.length
      const totalTraslados  = data.reduce((s, p) => s + (Number(p.monto_traslado) || 0), 0)
      const totalCobrado    = data.reduce((s, p) => s + (Number(p.precio_final) || 0), 0)

      return { paquetes: data, totalEntregados, totalTraslados, totalCobrado }
    },
    enabled: !!conductorId,
    staleTime: 30_000,
  })
}

// ── Reporte del bodeguero: paquetes recibidos + su comisión ───────────────────
export function useReporteBodeguero(bodegueroId, desde, hasta) {
  return useQuery({
    queryKey: ['reporte-bodeguero', bodegueroId, desde, hasta],
    queryFn: async () => {
      const { data: cfg } = await supabase
        .from('config_negocio')
        .select('valor')
        .eq('clave', 'tarifa_bodeguero_por_paquete')
        .single()
      const tarifaPorPaquete = Number(cfg?.valor ?? 10000)

      let q = supabase
        .from('paquetes')
        .select('id, codigo, fecha_recepcion, tamanio')
        .eq('bodeguero_id', bodegueroId)

      if (desde) q = q.gte('fecha_recepcion', `${desde}T00:00:00`)
      if (hasta) q = q.lte('fecha_recepcion', `${hasta}T23:59:59`)

      const { data, error } = await q.order('fecha_recepcion', { ascending: false })
      if (error) throw error

      const totalRecibidos = data.length
      const totalGanado    = totalRecibidos * tarifaPorPaquete   // en COP

      return { paquetes: data, totalRecibidos, totalGanado, tarifaPorPaquete }
    },
    enabled: !!bodegueroId,
    staleTime: 30_000,
  })
}
