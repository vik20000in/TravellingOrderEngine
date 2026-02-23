import { memo, useCallback, useRef } from 'react'
import './QtyInput.css'

function QtyInput({ value, onChange }) {
  const ref = useRef(null)

  const handleInput = useCallback(e => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    const v = parseInt(raw, 10)
    onChange(isNaN(v) || v < 0 ? 0 : v)
  }, [onChange])

  const handleKeyDown = useCallback(e => {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']
    if (allowed.includes(e.key)) return
    if (e.key >= '0' && e.key <= '9') return
    e.preventDefault()
  }, [])

  const handleWheel = useCallback(e => {
    e.preventDefault()
    const v = (value || 0) + (e.deltaY < 0 ? 1 : -1)
    onChange(v < 0 ? 0 : v)
  }, [value, onChange])

  const handleFocus = useCallback(() => {
    ref.current?.select()
  }, [])

  return (
    <input
      ref={ref}
      type="number"
      min="0"
      step="1"
      inputMode="numeric"
      pattern="[0-9]*"
      className={`qty-input${value > 0 ? ' has-value' : ''}`}
      value={value || ''}
      onChange={handleInput}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onFocus={handleFocus}
    />
  )
}

export default memo(QtyInput)
