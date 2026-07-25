import { useState, useEffect } from 'react'

// Lee public/version.json (generado en cada build con versión + build + commit)
export function useVersion() {
  const [info, setInfo] = useState({
    version: import.meta.env.VITE_APP_VERSION ?? '0.0.0',
    build:   '—',
    commit:  '',
  })

  useEffect(() => {
    fetch('/version.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setInfo(data) })
      .catch(() => {})
  }, [])

  return info
}
