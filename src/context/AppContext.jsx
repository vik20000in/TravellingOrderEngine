import { createContext, useContext, useState, useCallback, useRef } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
  // ─── Master data caches ───────────────────────────────────
  const [varieties, setVarieties] = useState([])
  const [items, setItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [colors, setColors] = useState([])

  // ─── Toast ────────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'info' })
  const toastTimer = useRef(null)

  const showToast = useCallback((msg, type = 'info') => {
    clearTimeout(toastTimer.current)
    setToast({ visible: true, msg, type })
    toastTimer.current = setTimeout(
      () => setToast(t => ({ ...t, visible: false })),
      3500
    )
  }, [])

  // ─── Lightbox ─────────────────────────────────────────────
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const openLightbox = useCallback(src => setLightboxSrc(src), [])
  const closeLightbox = useCallback(() => setLightboxSrc(null), [])

  return (
    <AppContext.Provider
      value={{
        varieties, setVarieties,
        items, setItems,
        customers, setCustomers,
        colors, setColors,
        toast, showToast,
        lightboxSrc, openLightbox, closeLightbox,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  return useContext(AppContext)
}
