import { useState, useCallback } from 'react'
import { useAppContext } from '../../context/AppContext'
import * as api from '../../api/api'

export default function VarietiesTab() {
  const { varieties, setVarieties, masterLoading: loading, loadMasterData, showToast } = useAppContext()
  const [editing, setEditing] = useState(null) // null = hidden, {} = new, {...} = edit
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [shortForm, setShortForm] = useState('')
  const [imageURL, setImageURL] = useState('')
  const [sizes, setSizes] = useState('')

  // Upload state
  const [uploadStatus, setUploadStatus] = useState('')
  const [fileName, setFileName] = useState('No file chosen')

  const openForm = (v = null) => {
    if (v) {
      setEditing(v)
      setName(v.name || '')
      setShortForm(v.shortForm || '')
      setImageURL(v.imageURL || '')
      setSizes((v.sizes || []).join(', '))
    } else {
      setEditing({})
      setName('')
      setShortForm('')
      setImageURL('')
      setSizes('')
    }
    setFileName('No file chosen')
    setUploadStatus('')
  }

  const closeForm = () => setEditing(null)

  const handleSave = async () => {
    if (!name.trim()) { showToast('Variety name is required.', 'error'); return }
    setSaving(true)
    try {
      await api.saveVariety({
        id: editing?.id || null,
        name: name.trim(),
        shortForm: shortForm.trim(),
        imageURL: imageURL.trim(),
        sizes: sizes.split(',').map(s => s.trim()).filter(Boolean),
      })
      showToast(editing?.id ? 'Variety updated!' : 'Variety added!', 'success')
      closeForm()
      setTimeout(loadMasterData, 500)
    } catch (err) {
      console.error(err)
      showToast('Error saving variety.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, vName) => {
    if (!window.confirm(`Delete variety "${vName}"? This cannot be undone.`)) return
    try {
      await api.deleteVariety(id)
      showToast('Variety deleted.', 'success')
      setTimeout(loadMasterData, 500)
    } catch (err) {
      console.error(err)
      showToast('Error deleting variety.', 'error')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setUploadStatus('Uploading…')
    try {
      const url = await api.uploadImage(file)
      setImageURL(url)
      setUploadStatus('✓ Uploaded')
    } catch (err) {
      console.error(err)
      setUploadStatus('✗ Failed')
      showToast('Image upload failed.', 'error')
    }
  }

  if (loading) return <div className="loading-msg">Loading varieties…</div>

  return (
    <>
      <div className="master-header-row">
        <h2>Manage Varieties</h2>
        <button className="btn-add" onClick={() => openForm()}>+ Add Variety</button>
      </div>

      {/* List */}
      <div className="variety-list">
        {varieties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>No varieties found. Click "+ Add Variety" to get started.</p>
          </div>
        ) : varieties.map(v => (
          <div className="variety-card" key={v.id}>
            <div className="variety-card-img">
              {v.imageURL
                ? <img src={v.imageURL} alt={v.name} />
                : <div className="placeholder-icon">🖼</div>}
            </div>
            <div className="variety-card-body">
              <div className="variety-card-name">{v.name}</div>
              {v.shortForm && <div className="variety-card-short">{v.shortForm}</div>}
              <div className="variety-card-sizes">
                {(v.sizes || []).length > 0
                  ? v.sizes.map(s => <span key={s}>{s}</span>)
                  : <span style={{ color: '#aaa' }}>No sizes defined</span>}
              </div>
            </div>
            <div className="variety-card-actions">
              <button className="btn-edit" onClick={() => openForm(v)}>Edit</button>
              <button className="btn-delete" onClick={() => handleDelete(v.id, v.name)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {editing !== null && (
        <div className="variety-form-panel">
          <h3>{editing.id ? 'Edit Variety' : 'Add New Variety'}</h3>

          <div className="form-group">
            <label>Variety Name <span className="req">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ganesh Lakshmi" autoFocus />
          </div>

          <div className="form-group">
            <label>Short Form</label>
            <input type="text" value={shortForm} onChange={e => setShortForm(e.target.value)} placeholder="e.g. GL" maxLength={10} />
          </div>

          <div className="form-group">
            <label>Image URL</label>
            <input type="url" value={imageURL} onChange={e => setImageURL(e.target.value)} placeholder="https://example.com/image.jpg" />
            <div className="upload-row" style={{ marginTop: '0.4rem' }}>
              <input type="file" id="varietyImageFile" accept="image/*" className="file-input" onChange={handleFileUpload} />
              <label htmlFor="varietyImageFile" className="btn-upload">Upload Image</label>
              <span className="file-name">{fileName}</span>
              <span className={`upload-status${uploadStatus.includes('✓') ? ' done' : uploadStatus.includes('✗') ? ' error' : uploadStatus ? ' uploading' : ''}`}>{uploadStatus}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Sizes <span className="hint">(comma-separated)</span></label>
            <input type="text" value={sizes} onChange={e => setSizes(e.target.value)} placeholder="e.g. 6 Inch, 9 Inch, 12 Inch" />
          </div>

          {imageURL && (
            <div className="image-preview">
              <img src={imageURL} alt="Preview" />
            </div>
          )}

          <div className="form-actions">
            <button className="btn-cancel" onClick={closeForm}>Cancel</button>
            <button className="btn-confirm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Variety'}
              {saving && <span className="spinner" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
