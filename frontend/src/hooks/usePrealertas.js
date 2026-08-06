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
  PENDIENTE: { label: 'En camino', color: '#B45309', bg: '#FEF3C7' },
  RECIBIDA:  { label: 'Recibida',  color: '#1B7A3E', bg: '#E6F4EC' },
  CANCELADA: { label: 'Cancelada', color: '#64748B', bg: '#F1F5F9' },
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
