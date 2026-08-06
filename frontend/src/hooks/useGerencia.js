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

// ═══════════════════════════════════════════════════════════════════════════
// CARTERA DE CLIENTES
//
// El negocio no vive de paquetes sueltos: vive de gente que compra en Amazon
// y Shein todos los meses. El activo real es la base de clientes recurrentes,
// y hasta ahora era invisible para la gerencia.
//
// Se agrega en el navegador y no en Postgres a propósito: con el volumen
// actual (cientos de paquetes) traer la tabla y agrupar en JS es instantáneo
// y no exige migración ni RPC nuevo. Cuando `paquetes` pase de unas pocas
// miles de filas, esto debe mudarse a una vista materializada o un RPC.
// ═══════════════════════════════════════════════════════════════════════════

// Cuántos días sin enviar antes de considerar que un cliente se enfría.
// Un cliente de courier compra online cada 4 a 8 semanas, así que a los 45
// días todavía es normal; a los 90 ya se fue con otro y no lo sabemos.
export const DIAS_ACTIVO   = 45
export const DIAS_EN_RIESGO = 90

export const ESTADO_CLIENTE = {
  activo:   { label: 'Activo',      color: '#1B7A3E', bg: '#E6F4EC' },
  riesgo:   { label: 'En riesgo',   color: '#B45309', bg: '#FEF3C7' },
  dormido:  { label: 'Dormido',     color: '#991B1B', bg: '#FEE2E2' },
  sinEnvios:{ label: 'Sin envíos',  color: '#64748B', bg: '#F1F5F9' },
}

function clasificarCliente(diasDesdeUltimo, totalPaquetes) {
  if (totalPaquetes === 0)                return 'sinEnvios'
  if (diasDesdeUltimo <= DIAS_ACTIVO)     return 'activo'
  if (diasDesdeUltimo <= DIAS_EN_RIESGO)  return 'riesgo'
  return 'dormido'
}

export function useClientesGerencia() {
  return useQuery({
    queryKey: ['clientes-gerencia'],
    queryFn: async () => {
      // Dos consultas en paralelo: los clientes registrados y sus paquetes.
      // Los perfiles se traen aparte para no perder a quien se registró y
      // nunca envió nada — que es justamente un dato que interesa.
      const [resPerfiles, resPaquetes] = await Promise.all([
        supabase
          .from('perfiles')
          .select('id, nombre, codigo_casillero, telefono, created_at')
          .contains('roles', ['cliente'])
          .order('created_at', { ascending: false }),
        supabase
          .from('paquetes_con_cliente')
          .select(`
            id, cliente_id, estado, tamanio,
            precio_final, monto_cobrado_usd,
            fecha_recepcion, fecha_entrega
          `),
      ])

      if (resPerfiles.error) throw resPerfiles.error
      if (resPaquetes.error) throw resPaquetes.error

      const perfiles = resPerfiles.data ?? []
      const paquetes = resPaquetes.data ?? []

      // ── Agrupar paquetes por cliente ──
      const porCliente = new Map()
      for (const p of paquetes) {
        if (!p.cliente_id) continue
        if (!porCliente.has(p.cliente_id)) porCliente.set(p.cliente_id, [])
        porCliente.get(p.cliente_id).push(p)
      }

      const ahora = Date.now()

      const clientes = perfiles.map(perfil => {
        const suyos = porCliente.get(perfil.id) ?? []
        const entregados = suyos.filter(p => p.estado === 'ENTREGADO')
        const enCurso    = suyos.filter(p => p.estado !== 'ENTREGADO')

        // Facturado = dinero efectivamente cobrado, no precios asignados.
        // Un paquete tarifado pero no entregado todavía no es ingreso.
        const facturado = entregados
          .reduce((s, p) => s + (Number(p.monto_cobrado_usd) || 0), 0)

        // Valor en curso: lo que ese cliente tiene en el corredor ahora.
        const enCursoValor = enCurso
          .reduce((s, p) => s + (Number(p.precio_final) || 0), 0)

        const fechas = suyos
          .map(p => p.fecha_recepcion)
          .filter(Boolean)
          .map(f => new Date(f).getTime())
          .sort((a, b) => a - b)

        const primerEnvio  = fechas.length ? new Date(fechas[0]).toISOString() : null
        const ultimoEnvio  = fechas.length ? new Date(fechas.at(-1)).toISOString() : null
        const diasDesde    = ultimoEnvio
          ? Math.floor((ahora - new Date(ultimoEnvio).getTime()) / 86400000)
          : null

        return {
          id:               perfil.id,
          nombre:           perfil.nombre,
          codigo_casillero: perfil.codigo_casillero,
          telefono:         perfil.telefono,
          registrado:       perfil.created_at,
          totalPaquetes:    suyos.length,
          entregados:       entregados.length,
          enCurso:          enCurso.length,
          enCursoValor,
          facturado,
          ticketPromedio:   entregados.length ? facturado / entregados.length : 0,
          primerEnvio,
          ultimoEnvio,
          diasDesdeUltimo:  diasDesde,
          estado:           clasificarCliente(diasDesde ?? Infinity, suyos.length),
        }
      })

      clientes.sort((a, b) => b.facturado - a.facturado)

      // ── Métricas de cartera ──
      const conEnvios      = clientes.filter(c => c.totalPaquetes > 0)
      const activos        = clientes.filter(c => c.estado === 'activo')
      const enRiesgo       = clientes.filter(c => c.estado === 'riesgo')
      const dormidos       = clientes.filter(c => c.estado === 'dormido')
      const facturacionTotal = clientes.reduce((s, c) => s + c.facturado, 0)

      // Concentración: qué porcentaje del ingreso depende del top 5.
      // Si un puñado de clientes pesa demasiado, perder uno duele de verdad.
      const top5 = clientes.slice(0, 5).reduce((s, c) => s + c.facturado, 0)
      const concentracionTop5 = facturacionTotal > 0
        ? (top5 / facturacionTotal) * 100
        : 0

      // Clientes nuevos del mes: los que hicieron su PRIMER envío este mes.
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)
      const nuevosMes = conEnvios.filter(
        c => c.primerEnvio && new Date(c.primerEnvio) >= inicioMes
      ).length

      return {
        clientes,
        totalRegistrados:  clientes.length,
        conEnvios:         conEnvios.length,
        sinEnvios:         clientes.length - conEnvios.length,
        activos:           activos.length,
        enRiesgo:          enRiesgo.length,
        dormidos:          dormidos.length,
        facturacionTotal,
        concentracionTop5,
        nuevosMes,
        ticketPromedioGeneral: conEnvios.length
          ? facturacionTotal / conEnvios.reduce((s, c) => s + c.entregados, 0) || 0
          : 0,
      }
    },
    staleTime: 60_000,
  })
}
