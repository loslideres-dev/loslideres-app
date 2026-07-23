import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user:    null,
      session: null,
      roles:   [],
      activeRole: null,

      setAuth: (user, session) => set({
        user,
        session,
        roles:      user?.user_metadata?.roles ?? [],
        activeRole: user?.user_metadata?.roles?.[0] ?? null,
      }),

      setActiveRole: (role) => set({ activeRole: role }),

      clearAuth: () => set({
        user: null, session: null, roles: [], activeRole: null
      }),
    }),
    { name: 'll-auth' }
  )
)