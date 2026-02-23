import { useState, useCallback, useMemo } from 'react'
import { useAppContext } from '../../context/AppContext'
import * as api from '../../api/api'
import OrderGrid from './OrderGrid'
import Modal from '../common/Modal'
import './OrderPage.css'

export default function OrderPage() {
  const { varieties, items, customers, colors, masterLoading: loading, showToast } = useAppContext()

  const [customer, setCustomer] = useState('')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [market, setMarket] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // quantities: { `${itemIdx}_${varietyId}_${size}`: qty }
  const [quantities, setQuantities] = useState({})
  // perVariety notes: { `${itemIdx}_${varietyId}`: { color, comment } }
  const [notes, setNotes] = useState({})

  // ─── Quantity change handler ──────────────────────────────
  const setQty = useCallback((key, value) => {
    setQuantities(prev => {
      const next = { ...prev }
      if (value > 0) next[key] = value
      else delete next[key]
      return next
    })
  }, [])

  // ─── Note change handler ─────────────────────────────────
  const setNote = useCallback((key, field, value) => {
    setNotes(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }, [])

  // ─── Summary per item ─────────────────────────────────────
  const summaryParts = useMemo(() => {
    const parts = []
    items.forEach((item, iIdx) => {
      const varIds = item.sizes ? Object.keys(item.sizes) : []
      let total = 0
      varIds.forEach(vid => {
        ;(item.sizes[vid] || []).forEach(size => {
          total += quantities[`${iIdx}_${vid}_${size}`] || 0
        })
      })
      if (total > 0) parts.push(`${item.name}: ${total}`)
    })
    return parts
  }, [items, quantities])

  // ─── Collect order rows ───────────────────────────────────
  const collectRows = useCallback(() => {
    const rows = []
    items.forEach((item, iIdx) => {
      const varIds = item.sizes ? Object.keys(item.sizes) : []
      varIds.forEach(vid => {
        const variety = varieties.find(v => v.id === vid)
        if (!variety) return
        const sizes = item.sizes[vid] || []
        const noteKey = `${iIdx}_${vid}`
        const color = notes[noteKey]?.color || ''
        const comment = notes[noteKey]?.comment || ''

        sizes.forEach(size => {
          const qty = quantities[`${iIdx}_${vid}_${size}`] || 0
          if (qty > 0) {
            rows.push({
              customer,
              date: orderDate,
              market,
              item: item.name,
              variety: variety.name,
              color: color.trim(),
              size,
              quantity: qty,
              comment: comment.trim(),
            })
          }
        })
      })
    })
    return rows
  }, [items, varieties, quantities, notes, customer, orderDate, market])

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = () => {
    if (isSubmitting) return
    if (!customer.trim()) {
      showToast('Customer name is required.', 'error')
      return
    }
    const rows = collectRows()
    if (rows.length === 0) {
      showToast('Please enter at least one quantity.', 'error')
      return
    }
    setShowModal(true)
  }

  const confirmSubmit = async () => {
    setShowModal(false)
    setIsSubmitting(true)

    try {
      await api.submitOrder(collectRows())
      showToast('Order saved successfully!', 'success')
      // Reset form
      setQuantities({})
      setNotes({})
    } catch (err) {
      console.error('Submission error:', err)
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Modal summary text ───────────────────────────────────
  const modalSummary = useMemo(() => {
    const rows = collectRows()
    if (rows.length === 0) return ''
    const totalQty = rows.reduce((s, r) => s + r.quantity, 0)
    const itemNames = [...new Set(rows.map(r => r.item))]
    return `Submit <strong>${totalQty}</strong> unit(s) across <strong>${itemNames.join(', ')}</strong> for customer <strong>${customer}</strong>?`
  }, [collectRows, customer])

  return (
    <div id="page-orders" className="page active">
      {/* Sticky header */}
      <header id="header">
        <div className="header-fields">
          <div className="field">
            <label htmlFor="customerName">Customer Name <span className="req">*</span></label>
            <input
              type="text"
              id="customerName"
              placeholder="Enter customer name"
              autoComplete="off"
              list="customerSuggestions"
              value={customer}
              onChange={e => setCustomer(e.target.value)}
            />
            <datalist id="customerSuggestions">
              {customers.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="orderDate">Order Date</label>
            <input type="date" id="orderDate" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="marketArea">Market / Area</label>
            <input type="text" id="marketArea" placeholder="Optional" autoComplete="off" value={market} onChange={e => setMarket(e.target.value)} />
          </div>
          <div className="field field-btn">
            <button id="btnSave" disabled={isSubmitting} onClick={handleSubmit}>
              <span>{isSubmitting ? 'Saving…' : 'Save Order'}</span>
              {isSubmitting && <span className="spinner" />}
            </button>
          </div>
        </div>
        <div className="summary-bar">
          {summaryParts.length > 0 ? `Total ─ ${summaryParts.join('  |  ')}` : ''}
        </div>
      </header>

      {/* Order Grid */}
      <main id="orderGridContainer">
        {loading ? (
          <div className="loading-msg">Loading order form…</div>
        ) : items.length === 0 ? (
          <div className="loading-msg">No items found. Please add items in Master Data first.</div>
        ) : (
          <OrderGrid
            items={items}
            varieties={varieties}
            quantities={quantities}
            notes={notes}
            setQty={setQty}
            setNote={setNote}
          />
        )}
      </main>

      {/* Confirmation Modal */}
      <Modal
        visible={showModal}
        title="Confirm Submission"
        onCancel={() => setShowModal(false)}
        onConfirm={confirmSubmit}
      >
        <p dangerouslySetInnerHTML={{ __html: modalSummary }} />
      </Modal>
    </div>
  )
}
