import { useState, useCallback, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import * as api from '../../api/api'

export default function ItemsTab() {
  const { varieties, items, setItems, colors, masterLoading: loading, loadMasterData, showToast } = useAppContext()
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [shortForm, setShortForm] = useState('')
  const [images, setImages] = useState(['', '', ''])
  const [price, setPrice] = useState('')
  const [comment, setComment] = useState('')
  const [selectedColors, setSelectedColors] = useState([])
  const [sizesPerVariety, setSizesPerVariety] = useState({})
  const [customColorInput, setCustomColorInput] = useState('')

  // Upload status per slot
  const [uploadStatuses, setUploadStatuses] = useState([
    { fileName: 'No file chosen', status: '' },
    { fileName: 'No file chosen', status: '' },
    { fileName: 'No file chosen', status: '' },
  ])

  const openForm = (item = null) => {
    setUploadStatuses([
      { fileName: 'No file chosen', status: '' },
      { fileName: 'No file chosen', status: '' },
      { fileName: 'No file chosen', status: '' },
    ])

    if (item) {
      setEditing(item)
      setName(item.name || '')
      setShortForm(item.shortForm || '')
      setImages([item.images?.[0] || '', item.images?.[1] || '', item.images?.[2] || ''])
      setPrice(item.price !== undefined && item.price !== '' ? String(item.price) : '')
      setComment(item.comment || '')
      setSelectedColors(item.colors || [])
      // Sizes per variety
      const spv = {}
      varieties.forEach(v => {
        const existing = item.sizes?.[v.id]
        spv[v.id] = existing ? (Array.isArray(existing) ? existing.join(', ') : existing) : ''
      })
      setSizesPerVariety(spv)
    } else {
      setEditing({})
      setName('')
      setShortForm('')
      setImages(['', '', ''])
      setPrice('')
      setComment('')
      setSelectedColors([...colors]) // Default: all colors selected
      // Default: all variety sizes pre-filled
      const spv = {}
      varieties.forEach(v => {
        spv[v.id] = (v.sizes || []).join(', ')
      })
      setSizesPerVariety(spv)
    }
  }

  const closeForm = () => setEditing(null)

  const toggleColor = (color) => {
    setSelectedColors(prev => {
      const idx = prev.findIndex(c => c.toLowerCase() === color.toLowerCase())
      if (idx >= 0) return prev.filter((_, i) => i !== idx)
      return [...prev, color]
    })
  }

  const addCustomColor = () => {
    const val = customColorInput.trim()
    if (!val) return
    if (selectedColors.some(c => c.toLowerCase() === val.toLowerCase())) {
      showToast('Color already selected.', 'error')
      setCustomColorInput('')
      return
    }
    setSelectedColors(prev => [...prev, val])
    setCustomColorInput('')
  }

  const handleImageUpload = async (file, slot) => {
    if (!file) return
    setUploadStatuses(prev => {
      const next = [...prev]
      next[slot] = { fileName: file.name, status: 'Uploading…' }
      return next
    })
    try {
      const url = await api.uploadImage(file)
      setImages(prev => {
        const next = [...prev]
        next[slot] = url
        return next
      })
      setUploadStatuses(prev => {
        const next = [...prev]
        next[slot] = { ...next[slot], status: '✓ Uploaded' }
        return next
      })
    } catch (err) {
      console.error(err)
      setUploadStatuses(prev => {
        const next = [...prev]
        next[slot] = { ...next[slot], status: '✗ Failed' }
        return next
      })
      showToast('Image upload failed.', 'error')
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { showToast('Item name is required.', 'error'); return }
    setSaving(true)

    const sizes = {}
    varieties.forEach(v => {
      const val = sizesPerVariety[v.id] || ''
      const arr = val.split(',').map(s => s.trim()).filter(Boolean)
      if (arr.length > 0) sizes[v.id] = arr
    })

    try {
      await api.saveItem({
        id: editing?.id || null,
        name: name.trim(),
        shortForm: shortForm.trim(),
        images: images.filter(Boolean),
        sizes,
        colors: selectedColors,
        price: price.trim(),
        comment: comment.trim(),
      })
      showToast(editing?.id ? 'Item updated!' : 'Item added!', 'success')
      closeForm()
      setTimeout(loadMasterData, 500)
    } catch (err) {
      console.error(err)
      showToast('Error saving item.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, itemName) => {
    if (!window.confirm(`Delete item "${itemName}"? This cannot be undone.`)) return
    try {
      await api.deleteItem(id)
      showToast('Item deleted.', 'success')
      setTimeout(loadMasterData, 500)
    } catch (err) {
      console.error(err)
      showToast('Error deleting item.', 'error')
    }
  }

  // All colors to show as chips (master + any custom ones)
  const allChipColors = [...colors]
  selectedColors.forEach(c => {
    if (!allChipColors.some(m => m.toLowerCase() === c.toLowerCase())) allChipColors.push(c)
  })

  if (loading) return <div className="loading-msg">Loading items…</div>

  return (
    <>
      <div className="master-header-row">
        <h2>Manage Items</h2>
        <button className="btn-add" onClick={() => openForm()}>+ Add Item</button>
      </div>

      {/* List */}
      <div className="variety-list">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>No items found. Click "+ Add Item" to get started.</p>
          </div>
        ) : items.map(item => {
          const imgsHtml = item.images?.length > 0
          const sizeSummary = item.sizes ? Object.entries(item.sizes).map(([vid, sz]) => {
            const v = varieties.find(vv => vv.id === vid)
            const label = v ? (v.shortForm || v.name) : vid
            return `${label}: ${Array.isArray(sz) ? sz.join(', ') : sz}`
          }).join(' | ') : ''

          return (
            <div className="variety-card" key={item.id}>
              <div className="variety-card-img">
                {imgsHtml
                  ? <div className="item-card-images">{item.images.map((u, i) => <img key={i} src={u} alt="" />)}</div>
                  : <div className="placeholder-icon">🖼</div>}
              </div>
              <div className="variety-card-body">
                <div className="variety-card-name">{item.name}</div>
                {item.shortForm && <div className="variety-card-short">{item.shortForm}</div>}
                {item.colors?.length > 0 && (
                  <div className="item-card-colors">{item.colors.map(c => <span key={c}>{c}</span>)}</div>
                )}
                {item.price !== '' && item.price !== undefined && <div className="item-card-price">₹ {item.price}</div>}
                {sizeSummary && <div className="item-card-variety-sizes" dangerouslySetInnerHTML={{ __html: sizeSummary }} />}
                {item.comment && <div className="item-card-comment">{item.comment}</div>}
              </div>
              <div className="variety-card-actions">
                <button className="btn-edit" onClick={() => openForm(item)}>Edit</button>
                <button className="btn-delete" onClick={() => handleDelete(item.id, item.name)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Form */}
      {editing !== null && (
        <div className="variety-form-panel">
          <h3>{editing.id ? 'Edit Item' : 'Add New Item'}</h3>

          <div className="form-group">
            <label>Item Name <span className="req">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kurti" autoFocus />
          </div>

          <div className="form-group">
            <label>Short Form</label>
            <input type="text" value={shortForm} onChange={e => setShortForm(e.target.value)} placeholder="e.g. KRT" maxLength={10} />
          </div>

          <div className="form-group">
            <label>Colors</label>
            <div className="colors-container">
              <div className="color-chips">
                {allChipColors.map(c => {
                  const isSelected = selectedColors.some(s => s.toLowerCase() === c.toLowerCase())
                  return (
                    <span key={c} className={`color-chip${isSelected ? ' selected' : ''}`} onClick={() => toggleColor(c)}>
                      {isSelected && <span className="chip-check">✓</span>}{c}
                    </span>
                  )
                })}
              </div>
              <div className="colors-input-row">
                <input
                  type="text"
                  value={customColorInput}
                  onChange={e => setCustomColorInput(e.target.value)}
                  placeholder="Add custom color…"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomColor() } }}
                />
                <button type="button" className="btn-add-color" onClick={addCustomColor}>+</button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Images <span className="hint">(optional, up to 3)</span></label>
            <div className="multi-upload-group">
              {[0, 1, 2].map(slot => (
                <div className="upload-row" key={slot}>
                  <input
                    type="file"
                    id={`itemImageFile${slot}`}
                    accept="image/*"
                    className="file-input"
                    onChange={e => handleImageUpload(e.target.files[0], slot)}
                  />
                  <label htmlFor={`itemImageFile${slot}`} className="btn-upload">Image {slot + 1}</label>
                  <span className="file-name">{uploadStatuses[slot].fileName}</span>
                  <span className={`upload-status${uploadStatuses[slot].status.includes('✓') ? ' done' : uploadStatuses[slot].status.includes('✗') ? ' error' : uploadStatuses[slot].status ? ' uploading' : ''}`}>
                    {uploadStatuses[slot].status}
                  </span>
                </div>
              ))}
            </div>
            <div className="item-image-previews">
              {images.filter(Boolean).map((u, i) => <img key={i} className="img-thumb" src={u} alt="Preview" />)}
            </div>
          </div>

          <div className="form-group">
            <label>Sizes per Variety</label>
            <div className="sizes-per-variety">
              {varieties.length === 0 ? (
                <div className="loading-msg">No varieties found. Add varieties first.</div>
              ) : varieties.map(v => {
                const availableSizes = (v.sizes || []).join(', ')
                return (
                  <div className="variety-size-row" key={v.id}>
                    <div className="variety-size-label">
                      {v.name} ({v.shortForm || v.id})
                      <span className="variety-size-hint">Available: {availableSizes || 'none defined'}</span>
                    </div>
                    <input
                      type="text"
                      value={sizesPerVariety[v.id] || ''}
                      onChange={e => setSizesPerVariety(prev => ({ ...prev, [v.id]: e.target.value }))}
                      placeholder={`e.g. ${availableSizes}`}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Price</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 250" min="0" step="any" />
          </div>

          <div className="form-group">
            <label>Comment</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Optional notes about this item…" rows={2} />
          </div>

          <div className="form-actions">
            <button className="btn-cancel" onClick={closeForm}>Cancel</button>
            <button className="btn-confirm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Item'}
              {saving && <span className="spinner" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
