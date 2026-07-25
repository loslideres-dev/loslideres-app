import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ── Mis notificaciones ────────────────────────────────────────────────────────
export function useNotificaciones(usuarioId) {
  return useQuery({
    queryKey: ['notificaciones', usuarioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
    enabled: !!usuarioId,
    refetchInterval: 20_000,   // revisa cada 20s por notificaciones nuevas
    staleTime: 10_000,
  })
}

// ── Marcar una como leída ─────────────────────────────────────────────────────
export function useMarcarLeida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })
}

// ── Marcar todas como leídas ──────────────────────────────────────────────────
export function useMarcarTodasLeidas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (usuarioId) => {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('usuario_id', usuarioId)
        .eq('leida', false)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })
}
