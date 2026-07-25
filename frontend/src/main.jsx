import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

// Quitar el splash con un fade suave una vez que React montó
requestAnimationFrame(() => {
  setTimeout(() => {
    const splash = document.getElementById('splash')
    if (splash) {
      splash.style.opacity = '0'
      setTimeout(() => splash.remove(), 400)
    }
  }, 600)
})
