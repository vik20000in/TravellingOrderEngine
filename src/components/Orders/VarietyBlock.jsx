import { memo, useMemo, useCallback } from 'react'
import { useAppContext } from '../../context/AppContext'
import QtyInput from './QtyInput'
import './VarietyBlock.css'

function VarietyBlock({ item, iIdx, variety, vid, sizes, quantities, notes, setQty, setNote }) {
  const { openLightbox } = useAppContext()
  const vLabel = variety.name + (variety.shortForm ? ` (${variety.shortForm})` : '')
  const thumbSrc = item.images?.[0]
  const noteKey = `${iIdx}_${vid}`
  const color = notes[noteKey]?.color || ''
  const comment = notes[noteKey]?.comment || ''

  // Row total for this variety
  const rowTotal = useMemo(() => {
    let total = 0
    sizes.forEach(size => {
      total += quantities[`${iIdx}_${vid}_${size}`] || 0
    })
    return total
  }, [quantities, iIdx, vid, sizes])

  const handleColorChange = useCallback(e => setNote(noteKey, 'color', e.target.value), [setNote, noteKey])
  const handleCommentChange = useCallback(e => setNote(noteKey, 'comment', e.target.value), [setNote, noteKey])

  return (
    <div className="order-variety-block">
      {/* Side image */}
      {thumbSrc && (
        <img
          className="variety-side-img"
          src={thumbSrc}
          alt={item.name}
          onError={e => { e.target.style.display = 'none' }}
          onClick={() => openLightbox(thumbSrc)}
        />
      )}

      <div className="variety-main-content">
        {/* Mobile label (visible only < 500px) */}
        <div className="variety-label-mobile">
          {vLabel}{item.price ? ` — ₹${item.price}` : ''}
        </div>

        <div className="order-table-wrap">
          <table className="order-table">
            <thead>
              <tr>
                <th className="th-variety">
                  {vLabel}
                  {item.price ? <span className="th-price"> ₹{item.price}</span> : null}
                </th>
                {sizes.map(s => (
                  <th key={s} className="th-size">{s}</th>
                ))}
                <th className="th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td-variety">{vLabel}</td>
                {sizes.map(size => {
                  const qtyKey = `${iIdx}_${vid}_${size}`
                  return (
                    <td key={size} className="td-qty">
                      <QtyInput
                        value={quantities[qtyKey] || 0}
                        onChange={val => setQty(qtyKey, val)}
                      />
                    </td>
                  )
                })}
                <td className={`td-row-total${rowTotal > 0 ? ' has-value' : ''}`}>
                  {rowTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Color & Comment notes */}
        <div className="order-variety-notes">
          <div className="variety-note-field">
            <label>Color:</label>
            <input
              type="text"
              placeholder="e.g. Red, Blue mix…"
              value={color}
              onChange={handleColorChange}
            />
          </div>
          <div className="variety-note-field">
            <label>Comment:</label>
            <input
              type="text"
              placeholder={`Notes for ${vLabel}…`}
              value={comment}
              onChange={handleCommentChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(VarietyBlock)
