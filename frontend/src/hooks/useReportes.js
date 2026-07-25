import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

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
      // Tarifa configurable por paquete
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
