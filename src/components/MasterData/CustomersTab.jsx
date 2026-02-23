import { useState, useCallback } from 'react'
import { useAppContext } from '../../context/AppContext'
import * as api from '../../api/api'

export default function CustomersTab() {
  const { customers, setCustomers, masterLoading: loading, loadMasterData, showToast } = useAppContext()
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [images, setImages] = useState(['', ''])
  const [uploadStatuses, setUploadStatuses] = useState([
    { fileName: 'No file chosen', status: '' },
    { fileName: 'No file chosen', status: '' },
  ])

  const openForm = (c = null) => {
    setUploadStatuses([
      { fileName: 'No file chosen', status: '' },
      { fileName: 'No file chosen', status: '' },
    ])
    if (c) {
      setEditing(c)
      setName(c.name || '')
      setPhone(c.phone || '')
      setAddress(c.address || '')
      setImages([c.images?.[0] || '', c.images?.[1] || ''])
    } else {
      setEditing({})
      setName('')
      setPhone('')
      setAddress('')
      setImages(['', ''])
    }
  }

  const closeForm = () => setEditing(null)

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
    if (!name.trim()) { showToast('Customer name is required.', 'error'); return }
    if (!phone.trim()) { showToast('Phone number is required.', 'error'); return }
    setSaving(true)

    try {
      await api.saveCustomer({
        id: editing?.id || null,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        images: images.filter(Boolean),
      })
      showToast(editing?.id ? 'Customer updated!' : 'Customer added!', 'success')
      closeForm()
      setTimeout(loadMasterData, 500)
    } catch (err) {
      console.error(err)
      showToast('Error saving customer.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, cName) => {
    if (!window.confirm(`Delete customer "${cName}"? This cannot be undone.`)) return
    try {
      await api.deleteCustomer(id)
      showToast('Customer deleted.', 'success')
      setTimeout(loadMasterData, 500)
    } catch (err) {
      console.error(err)
      showToast('Error deleting customer.', 'error')
    }
  }

  if (loading) return <div className="loading-msg">Loading customers…</div>

  return (
    <>
      <div className="master-header-row">
        <h2>Manage Customers</h2>
        <button className="btn-add" onClick={() => openForm()}>+ Add Customer</button>
      </div>

      {/* List */}
      <div className="variety-list">
        {customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>No customers found. Click "+ Add Customer" to get started.</p>
          </div>
        ) : customers.map(c => (
          <div className="variety-card" key={c.id}>
            <div className="variety-card-img">
              {c.images?.length > 0
                ? <img src={c.images[0]} alt={c.name} />
                : <div className="placeholder-icon">👤</div>}
            </div>
            <div className="variety-card-body">
              <div className="variety-card-name">{c.name}</div>
              {c.phone && <div className="customer-card-phone">{c.phone}</div>}
              {c.address && <div className="customer-card-address">{c.address}</div>}
            </div>
            <div className="variety-card-actions">
              <button className="btn-edit" onClick={() => openForm(c)}>Edit</button>
              <button className="btn-delete" onClick={() => handleDelete(c.id, c.name)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {editing !== null && (
        <div className="variety-form-panel">
          <h3>{editing.id ? 'Edit Customer' : 'Add New Customer'}</h3>

          <div className="form-group">
            <label>Customer Name <span className="req">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sharma Textiles" autoFocus />
          </div>

          <div className="form-group">
            <label>Phone Number <span className="req">*</span></label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional address…" rows={2} />
          </div>

          <div className="form-group">
            <label>Images <span className="hint">(optional, up to 2)</span></label>
            <div className="multi-upload-group">
              {[0, 1].map(slot => (
                <div className="upload-row" key={slot}>
                  <input
                    type="file"
                    id={`custImageFile${slot}`}
                    accept="image/*"
                    className="file-input"
                    onChange={e => handleImageUpload(e.target.files[0], slot)}
                  />
                  <label htmlFor={`custImageFile${slot}`} className="btn-upload">Image {slot + 1}</label>
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

          <div className="form-actions">
            <button className="btn-cancel" onClick={closeForm}>Cancel</button>
            <button className="btn-confirm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Customer'}
              {saving && <span className="spinner" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
