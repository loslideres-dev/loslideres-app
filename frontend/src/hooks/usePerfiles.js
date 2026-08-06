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

// Mi perfil
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

// Todos los usuarios (admin y gerencia)
//
// Usa la RPC `usuarios_admin()` en lugar de leer `perfiles` directo porque
// `email` y `last_sign_in_at` viven en el esquema `auth`, al que la anon key
// no tiene acceso. La función hace el join del lado del servidor y valida que
// quien llama sea admin o gerente antes de devolver nada.
//
// El filtro por rol se aplica en el cliente: la lista completa de usuarios es
// pequeña y ya se descarga entera, así que un round-trip por cada pestaña
// de filtro no aporta.
export function useUsuarios(rol = null) {
  return useQuery({
    queryKey: ['usuarios', rol],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('usuarios_admin')

      if (error) {
        // Respaldo: si la migración 12 todavía no se ejecutó, la pantalla
        // sigue funcionando sin email ni último acceso, en vez de quedar
        // en blanco con un error.
        console.warn('usuarios_admin() no disponible, leyendo perfiles:', error.message)
        let q = supabase
          .from('perfiles')
          .select('*')
          .order('created_at', { ascending: false })
        if (rol) q = q.contains('roles', [rol])
        const { data: respaldo, error: errorRespaldo } = await q
        if (errorRespaldo) throw errorRespaldo
        return respaldo
      }

      return rol
        ? (data ?? []).filter(u => (u.roles ?? []).includes(rol))
        : (data ?? [])
    },
    staleTime: 30_000,
  })
}

// Conductores disponibles (rol conductor o admin) para asignar entregas
export function useConductores() {
  return useQuery({
    queryKey: ['conductores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre, roles')
        .or('roles.cs.{conductor},roles.cs.{admin}')
        .eq('activo', true)
        .order('nombre')
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}