import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { notificarAdmins } from '../lib/notificar'

// Las tiendas que concentran la mayoría de las compras. "Otra" cubre el resto
// sin obligar a mantener un catálogo: si aparece una nueva recurrente, se
// agrega aquí y listo.
export const TIENDAS = [
  'Amazon', 'Shein', 'Temu', 'MercadoLibre', 'AliExpress', 'Otra',
]

export const ESTADO_PREALERTA = {
  PENDIENTE:  { label: 'En camino',  color: '#B45309', bg: '#FEF3C7' },
  RECIBIDA:   { label: 'Recibida',   color: '#1B7A3E', bg: '#E6F4EC' },
  CANCELADA:  { label: 'Cancelada',  color: '#64748B', bg: '#F1F5F9' },
  // La descarta la bodega tras días sin llegar. Estado propio y no CANCELADA
  // para que el cliente no crea que la canceló él.
  DESCARTADA: { label: 'No llegó',   color: '#991B1B', bg: '#FEE2E2' },
}

// A los 30 días sin llegar, una pre-alerta deja de ser una expectativa
// razonable: o la compra se cayó, o el paquete se fue por otro courier.
export const DIAS_SIN_LLEGAR = 30

export function diasAvisada(iso) {
  if (!iso) return 0
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

// ── Mis pre-alertas (cliente) ───────────────────────────────────────────────
export function useMisPrealertas(clienteId) {
  return useQuery({
    queryKey: ['prealertas', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prealertas')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!clienteId,
    staleTime: 15_000,
  })
}

// ── Crear pre-alerta ────────────────────────────────────────────────────────
export function useCrearPrealerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ clienteId, tienda, descripcion, tracking, nombre, codigo }) => {
      const { data, error } = await supabase
        .from('prealertas')
        .insert({
          cliente_id:  clienteId,
          tienda,
          descripcion: descripcion.trim(),
          tracking:    tracking?.trim() || null,
        })
        .select()
        .single()
      if (error) throw error

      // Avisar a la bodega qué viene en camino. Es el punto de toda la
      // función: que en Maicao sepan qué esperar antes de que llegue.
      // No bloquea el guardado si falla.
      try {
        await notificarAdmins({
          tipo:    'prealerta',
          titulo:  'Paquete en camino',
          mensaje: `${nombre ?? 'Un cliente'} (${codigo ?? '—'}) avisó un envío `
                 + `de ${tienda}: ${descripcion.trim()}`
                 + (tracking?.trim() ? ` · Guía ${tracking.trim()}` : ''),
        })
      } catch (e) {
        console.error('No se pudo notificar la pre-alerta:', e)
      }

      return data
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['prealertas', vars.clienteId] }),
  })
}

// ── Cancelar pre-alerta ─────────────────────────────────────────────────────
// El cliente solo puede pasar de PENDIENTE a CANCELADA; marcarla como
// recibida es potestad de la bodega y lo impide la política de RLS.
export function useCancelarPrealerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('prealertas')
        .update({ estado: 'CANCELADA' })
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['prealertas', vars.clienteId] }),
  })
}

// ── Pendientes en bodega (bodeguero / admin) ────────────────────────────────
// Se deja lista para la fase 2: enlazar la pre-alerta al paquete al recibirlo.
export function usePrealertasPendientes() {
  return useQuery({
    queryKey: ['prealertas-pendientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prealertas_con_cliente')
        .select('*')
        .eq('estado', 'PENDIENTE')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    staleTime: 30_000,
  })
}


// ── Gerencia: todas las pre-alertas con datos del cliente ───────────────────
export function usePrealertasGerencia() {
  return useQuery({
    queryKey: ['prealertas-gerencia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prealertas_con_cliente')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      const filas = (data ?? []).map(p => ({
        ...p,
        dias:      diasAvisada(p.created_at),
        atrasada:  p.estado === 'PENDIENTE'
                   && diasAvisada(p.created_at) > DIAS_SIN_LLEGAR,
      }))

      const pendientes = filas.filter(p => p.estado === 'PENDIENTE')
      const recibidas  = filas.filter(p => p.estado === 'RECIBIDA')
      const cerradas   = filas.filter(p => p.estado !== 'PENDIENTE')

      // Qué proporción de lo avisado termina llegando. Si baja mucho, o los
      // clientes avisan de más, o se están yendo por otro courier.
      const tasaLlegada = cerradas.length
        ? (recibidas.length / cerradas.length) * 100
        : null

      return {
        filas,
        totalPendientes: pendientes.length,
        atrasadas:       filas.filter(p => p.atrasada).length,
        recibidas:       recibidas.length,
        tasaLlegada,
      }
    },
    staleTime: 30_000,
  })
}

// ── Gerencia / bodega: descartar una pre-alerta que nunca llegó ────────────
export function useDescartarPrealerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('prealertas')
        .update({ estado: 'DESCARTADA' })
        .eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prealertas-gerencia'] })
      qc.invalidateQueries({ queryKey: ['prealertas-pendientes'] })
    },
  })
}


// ── Bodega: pre-alertas pendientes de UN cliente ───────────────────────────
// Se consulta al seleccionar el casillero en Recepción, para preguntarle al
// bodeguero si el paquete que tiene en la mano es alguno de los avisados.
export function usePrealertasDeCliente(clienteId) {
  return useQuery({
    queryKey: ['prealertas-cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prealertas')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('estado', 'PENDIENTE')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!clienteId,
    staleTime: 10_000,
  })
}

// ── Enlazar una pre-alerta con el paquete que acaba de entrar ──────────────
export function useEnlazarPrealerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ prealertaId, paqueteId }) => {
      const { error } = await supabase
        .from('prealertas')
        .update({ estado: 'RECIBIDA', paquete_id: paqueteId })
        .eq('id', prealertaId)
      if (error) throw error
      return prealertaId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prealertas-cliente'] })
      qc.invalidateQueries({ queryKey: ['prealertas-gerencia'] })
      qc.invalidateQueries({ queryKey: ['prealertas-pendientes'] })
    },
  })
}


// ── Buscar el dueño de una caja por su número de guía ──────────────────────
// El caso que motiva toda la pre-alerta: llega un paquete con la guía impresa
// en la etiqueta y sin el código de casillero visible. El bodeguero pega esa
// guía y aparece de quién es.
//
// Solo busca entre PENDIENTES: una guía ya recibida no ayuda a identificar
// la caja que está sobre la mesa.
export function useBuscarPorGuia(query) {
  const q = (query ?? '').trim()
  return useQuery({
    queryKey: ['buscar-guia', q],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prealertas_con_cliente')
        .select('*')
        .eq('estado', 'PENDIENTE')
        .ilike('tracking', `%${q}%`)
        .limit(5)
      if (error) throw error
      return data ?? []
    },
    enabled: q.length >= 3,
    staleTime: 5_000,
  })
}