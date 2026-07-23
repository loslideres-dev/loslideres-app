import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Buscar cliente por código LID o nombre (para bodeguero)
export function useBuscarCliente(query) {
  return useQuery({
    queryKey: ['buscar-cliente', query],
    queryFn: async () => {
      if (!query || query.length < 2) return []
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre, codigo_casillero, telefono, direccion_entrega')
        .or(`codigo_casillero.ilike.%${query}%,nombre.ilike.%${query}%`)
        .eq('activo', true)
        .contains('roles', ['cliente'])
        .limit(10)
      if (error) throw error
      return data
    },
    enabled: !!query && query.length >= 2,
    staleTime: 5_000,
  })
}

// Mi perfil (cliente)
export function useMiPerfil(userId) {
  return useQuery({
    queryKey: ['perfil', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

// Actualizar perfil
export function useActualizarPerfil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, nombre, telefono, direccion_entrega }) => {
      const { data, error } = await supabase
        .from('perfiles')
        .update({ nombre, telefono, direccion_entrega })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['perfil', vars.id] }),
  })
}

// Todos los usuarios (admin)
export function useUsuarios(rol = null) {
  return useQuery({
    queryKey: ['usuarios', rol],
    queryFn: async () => {
      let q = supabase
        .from('perfiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (rol) q = q.contains('roles', [rol])
      const { data, error } = await q
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })
}
