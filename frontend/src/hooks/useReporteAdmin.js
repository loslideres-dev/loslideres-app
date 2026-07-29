import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Devuelve el rango [desde, hasta] en ISO según el periodo elegido
export function rangoPeriodo(periodo) {
  const ahora = new Date()
  const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59)
  let inicio

  switch (periodo) {
    case 'hoy':
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0)
      break
    case 'semana': {
      const d = ahora.getDay() || 7            // lunes = 1
      inicio = new Date(ahora)
      inicio.setDate(ahora.getDate() - d + 1)
      inicio.setHours(0, 0, 0, 0)
      break
    }
    case 'mes':
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0)
      break
    case 'todo':
    default:
      inicio = new Date(2020, 0, 1)
      break
  }
  return { desde: inicio.toISOString(), hasta: fin.toISOString() }
}

export function useReporteAdmin(periodo = 'mes') {
  return useQuery({
    queryKey: ['reporte-admin', periodo],
    queryFn: async () => {
      const { desde, hasta } = rangoPeriodo(periodo)

      // Traer todos los paquetes del periodo (por fecha de recepción)
      const { data: paquetes, error } = await supabase
        .from('paquetes_con_cliente')
        .select('*')
        .gte('fecha_recepcion', desde)
        .lte('fecha_recepcion', hasta)
      if (error) throw error

      // Tarifa configurable del bodeguero
      const { data: cfg } = await supabase
        .from('config_negocio')
        .select('valor')
        .eq('clave', 'tarifa_bodeguero_por_paquete')
        .single()
      const tarifaBodeguero = Number(cfg?.valor ?? 10000)

      const entregados = paquetes.filter(p => p.estado === 'ENTREGADO')

      // ── Financiero ──
      const ingresos = entregados.reduce((s, p) => s + (Number(p.precio_final) || 0), 0)
      const pagoConductores = entregados.reduce((s, p) => s + (Number(p.monto_traslado) || 0), 0)
      const pagoBodegueros = paquetes.length * tarifaBodeguero  // COP
      // Ganancia en USD: ingresos - traslados (el pago bodeguero es COP, se muestra aparte)
      const ganancia = ingresos - pagoConductores
      const ticketPromedio = entregados.length
        ? ingresos / entregados.length : 0

      // ── Operativo ──
      const porEstado = {}
      for (const p of paquetes) porEstado[p.estado] = (porEstado[p.estado] || 0) + 1

      const porTamanio = { S: 0, M: 0, L: 0, XL: 0 }
      for (const p of paquetes) {
        if (p.tamanio && porTamanio[p.tamanio] != null) porTamanio[p.tamanio]++
      }

      // Tiempo promedio de entrega (horas) — de recepción a entrega
      const tiempos = entregados
        .filter(p => p.fecha_recepcion && p.fecha_entrega)
        .map(p => (new Date(p.fecha_entrega) - new Date(p.fecha_recepcion)) / 36e5)
      const tiempoPromedioHoras = tiempos.length
        ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : 0

      // ── Método de pago ──
      const porMetodo = {}
      for (const p of entregados) {
        const m = p.metodo_pago || 'Sin especificar'
        porMetodo[m] = (porMetodo[m] || 0) + 1
      }

      // ── Tendencia por día ──
      const porDia = {}
      for (const p of paquetes) {
        const dia = p.fecha_recepcion?.split('T')[0]
        if (dia) porDia[dia] = (porDia[dia] || 0) + 1
      }
      const tendencia = Object.entries(porDia)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, cantidad]) => ({
          fecha: new Date(fecha + 'T12:00:00').toLocaleDateString('es-VE',
            { day: 'numeric', month: 'short' }),
          cantidad,
        }))

      // ── Rankings ──
      const rankConductores = {}
      for (const p of entregados) {
        if (!p.conductor_id) continue
        rankConductores[p.conductor_id] = rankConductores[p.conductor_id] || { entregas: 0, monto: 0 }
        rankConductores[p.conductor_id].entregas++
        rankConductores[p.conductor_id].monto += Number(p.monto_traslado) || 0
      }
      const rankBodegueros = {}
      for (const p of paquetes) {
        if (!p.bodeguero_id) continue
        rankBodegueros[p.bodeguero_id] = (rankBodegueros[p.bodeguero_id] || 0) + 1
      }
      const rankClientes = {}
      for (const p of paquetes) {
        const nombre = p.cliente_nombre || 'Cliente'
        rankClientes[nombre] = (rankClientes[nombre] || 0) + 1
      }

      // Resolver nombres de conductores y bodegueros
      const ids = [
        ...Object.keys(rankConductores),
        ...Object.keys(rankBodegueros),
      ]
      let nombres = {}
      if (ids.length) {
        const { data: perfiles } = await supabase
          .from('perfiles')
          .select('id, nombre')
          .in('id', ids)
        nombres = Object.fromEntries((perfiles ?? []).map(p => [p.id, p.nombre]))
      }

      const topConductores = Object.entries(rankConductores)
        .map(([id, v]) => ({ nombre: nombres[id] ?? 'Conductor', ...v }))
        .sort((a, b) => b.entregas - a.entregas)
        .slice(0, 5)
      const topBodegueros = Object.entries(rankBodegueros)
        .map(([id, cantidad]) => ({ nombre: nombres[id] ?? 'Bodeguero', cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)
      const topClientes = Object.entries(rankClientes)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5)

      return {
        // financiero
        ingresos, pagoConductores, pagoBodegueros, ganancia, ticketPromedio, tarifaBodeguero,
        // operativo
        totalPaquetes: paquetes.length,
        entregados: entregados.length,
        pendientes: paquetes.length - entregados.length,
        tiempoPromedioHoras,
        porEstado, porTamanio, porMetodo,
        // tendencia
        tendencia,
        // rankings
        topConductores, topBodegueros, topClientes,
      }
    },
    staleTime: 30_000,
  })
}


// ═══════════════════════════════════════════════════════════════════════════
// ESTADO DE CUENTA DEL NEGOCIO
//
// Ingresos vs egresos del periodo, más la deuda viva (lo que se debe ahora
// mismo y aún no se ha liquidado). USD y COP siempre separados.
// ═══════════════════════════════════════════════════════════════════════════
export function useEstadoCuenta(periodo = 'mes') {
  return useQuery({
    queryKey: ['estado-cuenta', periodo],
    queryFn: async () => {
      const { desde, hasta } = rangoPeriodo(periodo)

      // Tarifa vigente del bodeguero
      const { data: cfg } = await supabase
        .from('config_negocio')
        .select('valor')
        .eq('clave', 'tarifa_bodeguero_por_paquete')
        .single()
      const tarifaBodeguero = Number(cfg?.valor ?? 10000)

      // Paquetes del periodo
      const { data: paquetes, error } = await supabase
        .from('paquetes')
        .select('estado, precio_final, monto_traslado, fecha_recepcion, fecha_entrega, conductor_id, bodeguero_id')
        .gte('fecha_recepcion', desde)
        .lte('fecha_recepcion', hasta)
      if (error) throw error

      const entregados = (paquetes ?? []).filter(p => p.estado === 'ENTREGADO')

      // ── Ingresos (USD cobrado a clientes) ──
      const ingresos = entregados
        .reduce((s, p) => s + (Number(p.precio_final) || 0), 0)

      // ── Egresos ──
      const egresoConductoresUSD = entregados
        .reduce((s, p) => s + (Number(p.monto_traslado) || 0), 0)
      const egresoBodeguerosCOP = (paquetes ?? []).length * tarifaBodeguero

      // ── Resultado en USD (el COP se reporta aparte) ──
      const utilidadUSD = ingresos - egresoConductoresUSD
      const margenPct = ingresos > 0 ? (utilidadUSD / ingresos) * 100 : 0

      // ── Deuda viva: lo pendiente de liquidar ahora mismo ──
      const { data: pend } = await supabase
        .from('pendientes_liquidacion')
        .select('tipo, monto_usd, monto_cop, cantidad_paquetes')

      const filas = pend ?? []
      const deudaConductoresUSD = filas
        .filter(f => f.tipo === 'conductor')
        .reduce((s, f) => s + (Number(f.monto_usd) || 0), 0)
      const deudaBodeguerosCOP = filas
        .filter(f => f.tipo === 'bodeguero')
        .reduce((s, f) => s + (Number(f.monto_cop) || 0), 0)

      // ── Ya pagado (liquidaciones del periodo) ──
      const { data: liqs } = await supabase
        .from('liquidaciones')
        .select('tipo, total_usd, total_cop')
        .gte('fecha_cierre', desde)
        .lte('fecha_cierre', hasta)

      const pagadoConductoresUSD = (liqs ?? [])
        .filter(l => l.tipo === 'conductor')
        .reduce((s, l) => s + (Number(l.total_usd) || 0), 0)
      const pagadoBodeguerosCOP = (liqs ?? [])
        .filter(l => l.tipo === 'bodeguero')
        .reduce((s, l) => s + (Number(l.total_cop) || 0), 0)

      return {
        ingresos,
        egresoConductoresUSD,
        egresoBodeguerosCOP,
        utilidadUSD,
        margenPct,
        deudaConductoresUSD,
        deudaBodeguerosCOP,
        personasConSaldo: filas.length,
        pagadoConductoresUSD,
        pagadoBodeguerosCOP,
        tarifaBodeguero,
        totalPaquetes: (paquetes ?? []).length,
        entregados: entregados.length,
      }
    },
    staleTime: 30_000,
  })
}


// ═══════════════════════════════════════════════════════════════════════════
// REPORTE POR PERSONA (conductor o bodeguero) — vista del admin
// ═══════════════════════════════════════════════════════════════════════════
export function useReportePorPersona(periodo = 'mes') {
  return useQuery({
    queryKey: ['reporte-por-persona', periodo],
    queryFn: async () => {
      const { desde, hasta } = rangoPeriodo(periodo)

      const { data: cfg } = await supabase
        .from('config_negocio')
        .select('valor')
        .eq('clave', 'tarifa_bodeguero_por_paquete')
        .single()
      const tarifaBodeguero = Number(cfg?.valor ?? 10000)

      const { data: paquetes, error } = await supabase
        .from('paquetes')
        .select('estado, precio_final, monto_traslado, fecha_recepcion, conductor_id, bodeguero_id')
        .gte('fecha_recepcion', desde)
        .lte('fecha_recepcion', hasta)
      if (error) throw error

      const lista = paquetes ?? []
      const entregados = lista.filter(p => p.estado === 'ENTREGADO')

      // Agrupar por conductor
      const porConductor = {}
      for (const p of entregados) {
        if (!p.conductor_id) continue
        const k = p.conductor_id
        porConductor[k] = porConductor[k] ?? { entregas: 0, traslados: 0, ingresos: 0 }
        porConductor[k].entregas++
        porConductor[k].traslados += Number(p.monto_traslado) || 0
        porConductor[k].ingresos  += Number(p.precio_final)   || 0
      }

      // Agrupar por bodeguero
      const porBodeguero = {}
      for (const p of lista) {
        if (!p.bodeguero_id) continue
        const k = p.bodeguero_id
        porBodeguero[k] = porBodeguero[k] ?? { recibidos: 0 }
        porBodeguero[k].recibidos++
      }

      // Resolver nombres
      const ids = [...new Set([
        ...Object.keys(porConductor),
        ...Object.keys(porBodeguero),
      ])]
      let nombres = {}
      if (ids.length) {
        const { data: perfiles } = await supabase
          .from('perfiles')
          .select('id, nombre, roles')
          .in('id', ids)
        nombres = Object.fromEntries(
          (perfiles ?? []).map(p => [p.id, { nombre: p.nombre, roles: p.roles ?? [] }])
        )
      }

      const conductores = Object.entries(porConductor)
        .map(([id, v]) => ({
          id,
          nombre:  nombres[id]?.nombre ?? 'Conductor',
          esAdmin: (nombres[id]?.roles ?? []).includes('admin'),
          ...v,
        }))
        .sort((a, b) => b.entregas - a.entregas)

      const bodegueros = Object.entries(porBodeguero)
        .map(([id, v]) => ({
          id,
          nombre: nombres[id]?.nombre ?? 'Bodeguero',
          comisionCOP: v.recibidos * tarifaBodeguero,
          ...v,
        }))
        .sort((a, b) => b.recibidos - a.recibidos)

      return { conductores, bodegueros, tarifaBodeguero }
    },
    staleTime: 30_000,
  })
}
