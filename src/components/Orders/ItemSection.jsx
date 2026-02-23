import { memo, useMemo } from 'react'
import { useAppContext } from '../../context/AppContext'
import VarietyBlock from './VarietyBlock'
import './ItemSection.css'

function ItemSection({ item, iIdx, varieties, quantities, notes, setQty, setNote }) {
  const { openLightbox } = useAppContext()

  const itemVarietyIds = item.sizes ? Object.keys(item.sizes) : []

  // Total badge count for this item
  const itemTotal = useMemo(() => {
    let total = 0
    itemVarietyIds.forEach(vid => {
      ;(item.sizes[vid] || []).forEach(size => {
        total += quantities[`${iIdx}_${vid}_${size}`] || 0
      })
    })
    return total
  }, [quantities, iIdx, item.sizes, itemVarietyIds])

  const thumbSrc = item.images?.[0]

  return (
    <div className="order-item-section">
      {/* Item header */}
      <div className="order-item-header">
        {thumbSrc && (
          <img
            className="order-item-thumb"
            src={thumbSrc}
            alt={item.name}
            onError={e => { e.target.style.display = 'none' }}
            onClick={() => openLightbox(thumbSrc)}
          />
        )}
        <span className="order-item-name">
          {item.name}
          {item.shortForm ? ` (${item.shortForm})` : ''}
          {item.price ? ` — ₹${item.price}` : ''}
        </span>
        <span className={`order-item-badge${itemTotal > 0 ? ' visible' : ''}`}>
          {itemTotal}
        </span>
      </div>

      {/* Variety blocks */}
      {itemVarietyIds.length === 0 ? (
        <div className="loading-msg">No sizes configured for this item.</div>
      ) : (
        itemVarietyIds.map(vid => {
          const variety = varieties.find(v => v.id === vid)
          if (!variety) return null
          const sizes = item.sizes[vid]
          if (!sizes || sizes.length === 0) return null

          return (
            <VarietyBlock
              key={vid}
              item={item}
              iIdx={iIdx}
              variety={variety}
              vid={vid}
              sizes={sizes}
              quantities={quantities}
              notes={notes}
              setQty={setQty}
              setNote={setNote}
            />
          )
        })
      )}
    </div>
  )
}

export default memo(ItemSection)
