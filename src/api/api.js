/** API configuration – matches original app.js config */
const API_URL =
  'https://script.google.com/macros/s/AKfycbwJ8B1pJQO8IMRrWS5azpGWAr4r_XTsv9PH8PqQmMZ9LaedpYK3gW5vUZsm-nIawvsS/exec'
const API_KEY = 'mySecretKey2026xyz'

/**
 * All requests to the Google Apps Script backend are POST with text/plain
 * content type and JSON body (the CORS workaround pattern).
 */
async function apiPost(payload) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ api_key: API_KEY, ...payload }),
    mode: 'cors',
  })
  return resp.json()
}

// ─── Varieties ──────────────────────────────────────────────
export async function getVarieties() {
  const data = await apiPost({ action: 'getVarieties' })
  return data.status === 'success' ? data.varieties || [] : []
}

export async function saveVariety(variety) {
  return apiPost({ action: 'saveVariety', variety })
}

export async function deleteVariety(varietyId) {
  return apiPost({ action: 'deleteVariety', varietyId })
}

// ─── Items ──────────────────────────────────────────────────
export async function getItems() {
  const data = await apiPost({ action: 'getItems' })
  return data.status === 'success' ? data.items || [] : []
}

export async function saveItem(item) {
  return apiPost({ action: 'saveItem', item })
}

export async function deleteItem(itemId) {
  return apiPost({ action: 'deleteItem', itemId })
}

// ─── Colors ─────────────────────────────────────────────────
export async function getColors() {
  const data = await apiPost({ action: 'getColors' })
  return data.status === 'success' ? data.colors || [] : []
}

// ─── Customers ──────────────────────────────────────────────
export async function getCustomers() {
  const data = await apiPost({ action: 'getCustomers' })
  return data.status === 'success' ? data.customers || [] : []
}

export async function saveCustomer(customer) {
  return apiPost({ action: 'saveCustomer', customer })
}

export async function deleteCustomer(customerId) {
  return apiPost({ action: 'deleteCustomer', customerId })
}

// ─── Orders ─────────────────────────────────────────────────
export async function submitOrder(orders) {
  return apiPost({ action: 'submitOrder', orders })
}

// ─── Image Upload ───────────────────────────────────────────
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function uploadImage(file) {
  const base64 = await fileToBase64(file)
  const data = await apiPost({
    action: 'uploadImage',
    fileName: file.name,
    mimeType: file.type || 'image/jpeg',
    base64,
  })
  if (data.status === 'success' && data.url) return data.url
  throw new Error(data.error || 'Upload failed')
}
