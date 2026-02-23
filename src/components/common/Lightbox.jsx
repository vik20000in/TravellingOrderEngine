import { useAppContext } from '../../context/AppContext'
import './Lightbox.css'

export default function Lightbox() {
  const { lightboxSrc, closeLightbox } = useAppContext()

  if (!lightboxSrc) return null

  return (
    <div className="lightbox-overlay" onClick={closeLightbox}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={closeLightbox}>&times;</button>
        <img src={lightboxSrc} alt="Preview" />
      </div>
    </div>
  )
}
