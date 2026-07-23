import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:       null,
      session:    null,
      roles:      [],
      activeRole: null,

      setAuth: (user, session) => {
        const roles = user?.user_metadata?.roles ?? ['cliente']
        set({
          user,
          session,
          roles,
          activeRole: get().activeRole ?? roles[0] ?? 'cliente',
        })
      },

      setActiveRole: (role) => set({ activeRole: role }),

      clearAuth: () => set({
        user: null, session: null, roles: [], activeRole: null,
      }),

      // Helpers
      isAdmin:     () => get().roles.includes('admin'),
      isBodeguero: () => get().roles.includes('bodeguero'),
      isCliente:   () => get().roles.includes('cliente'),
      hasMultipleRoles: () => get().roles.length > 1,

      getCodigo: () => get().user?.user_metadata?.codigo_casillero ?? '????',
      getNombre: () =>
        get().user?.user_metadata?.nombre ??
        get().user?.email?.split('@')[0] ??
        'Usuario',
    }),
    { name: 'll-auth', version: 1 }
  )
)
