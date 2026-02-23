import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import * as api from '../api/api'

const AppContext = createContext()

export function AppProvider({ children }) {
  // ─── Master data caches ───────────────────────────────────
  const [varieties, setVarieties] = useState([])
  const [items, setItems] = useState([])
  const [customers, setCustomers] = useState([])
  const [colors, setColors] = useState([])
  const [masterLoading, setMasterLoading] = useState(true)

  // ─── Preload all master data on app start ─────────────────
  const loadMasterData = useCallback(async () => {
    setMasterLoading(true)
    try {
      const [vars, itms, cols, custs] = await Promise.all([
        api.getVarieties(),
        api.getItems(),
        api.getColors(),
        api.getCustomers(),
      ])
      setVarieties(vars)
      setItems(itms)
      setColors(cols)
      setCustomers(custs)
    } catch (err) {
      console.error('Failed to preload master data:', err)
    } finally {
      setMasterLoading(false)
    }
  }, [setVarieties, setItems, setColors, setCustomers])

  useEffect(() => { loadMasterData() }, [loadMasterData])

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
        masterLoading, loadMasterData,
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
