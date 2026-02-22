/* ============================================================
   TRAVELLINGORDER ENGINE – app.js
   Vanilla JS · No frameworks · Production-ready
   ============================================================ */

// ─── CONFIGURATION ──────────────────────────────────────────

/** Replace with your deployed Google Apps Script Web App URL */
const API_URL = "https://script.google.com/macros/s/AKfycbwJ8B1pJQO8IMRrWS5azpGWAr4r_XTsv9PH8PqQmMZ9LaedpYK3gW5vUZsm-nIawvsS/exec";

/** API key must match SECRET_KEY in the Apps Script backend */
const API_KEY = "mySecretKey2026xyz";

/** LocalStorage key for draft persistence */
const DRAFT_KEY = "travellingorder_engine_draft";

/** Auto-save interval in milliseconds */
const AUTOSAVE_INTERVAL = 5000;

// ─── CATALOG DATA ───────────────────────────────────────────
// Dynamic catalogue – the entire UI renders from this structure.
// Sizes per variety are NOT fixed; the grid adapts automatically.

const catalog = [
  {
    item: "Kurti",
    varieties: [
      { name: "A", sizes: ["S", "M", "L", "XL"] },
      { name: "B", sizes: ["M", "L", "XL", "XXL", "3XL"] },
      { name: "C", sizes: ["Free"] }
    ]
  },
  {
    item: "Shirt",
    varieties: [
      { name: "Regular", sizes: ["S", "M", "L", "XL", "XXL"] },
      { name: "Slim",    sizes: ["S", "M", "L", "XL"] },
      { name: "Oversize", sizes: ["M", "L", "XL", "XXL", "3XL", "4XL"] }
    ]
  },
  {
    item: "Palazzo",
    varieties: [
      { name: "Cotton",  sizes: ["28", "30", "32", "34", "36", "38"] },
      { name: "Silk",    sizes: ["S", "M", "L", "XL"] },
      { name: "Printed", sizes: ["Free"] }
    ]
  }
];

/** Available color options for every variety dropdown */
const colorOptions = [
  "", "Red", "Blue", "Green", "Black", "White", "Yellow",
  "Pink", "Purple", "Orange", "Maroon", "Navy", "Grey",
  "Beige", "Brown", "Teal", "Multicolor"
];

// ─── STATE ──────────────────────────────────────────────────
let isSubmitting = false; // prevents duplicate submissions
let varietiesCache = [];  // cached varieties from backend
let itemsCache = [];      // cached items from backend
let customersCache = [];  // cached customers from backend
let currentPage = "orders"; // current active page

// ─── INITIALIZATION ─────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  setDefaultDate();
  renderCatalog();
  restoreDraft();
  startAutosave();
});

/** Set order date to today */
function setDefaultDate() {
  const dateInput = document.getElementById("orderDate");
  dateInput.value = new Date().toISOString().slice(0, 10);
}

// ─── RENDER CATALOG ─────────────────────────────────────────

/**
 * Dynamically builds the entire order grid from the catalog config.
 * Each item → card; each variety → collapsible panel inside card.
 */
function renderCatalog() {
  const container = document.getElementById("catalogContainer");
  container.innerHTML = "";

  catalog.forEach((item, iIdx) => {
    // Item card wrapper
    const card = el("div", "item-card");
    card.dataset.item = item.item;

    // Item header
    const header = el("div", "item-header");
    header.innerHTML = `
      ${item.item}
      <span class="item-qty-badge" id="itemBadge_${iIdx}">0</span>
    `;
    card.appendChild(header);

    // Varieties
    item.varieties.forEach((variety, vIdx) => {
      card.appendChild(buildVarietyPanel(item.item, variety, iIdx, vIdx));
    });

    container.appendChild(card);
  });
}

/**
 * Builds a single collapsible variety panel with color, sizes, comment.
 */
function buildVarietyPanel(itemName, variety, iIdx, vIdx) {
  const panel = el("div", "variety-panel");
  const uid = `${iIdx}_${vIdx}`; // unique id fragment

  // Toggle button
  const toggle = el("button", "variety-toggle");
  toggle.type = "button";
  toggle.innerHTML = `
    <span>
      Variety: ${variety.name}
      <span class="var-qty-badge" id="varBadge_${uid}">0</span>
    </span>
    <span class="arrow">&#9654;</span>
  `;
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("expanded");
    body.classList.toggle("open");
  });
  panel.appendChild(toggle);

  // Body
  const body = el("div", "variety-body");

  // Color dropdown
  body.appendChild(labelEl("Color"));
  const sel = document.createElement("select");
  sel.id = `color_${uid}`;
  colorOptions.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c || "— Select color —";
    sel.appendChild(o);
  });
  body.appendChild(sel);

  // Size grid
  body.appendChild(labelEl("Quantities"));
  const grid = el("div", "size-grid");
  variety.sizes.forEach(size => {
    const cell = el("div", "size-cell");

    const lbl = el("div", "size-label");
    lbl.textContent = size;
    cell.appendChild(lbl);

    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = "0";
    inp.step = "1";
    inp.value = "0";
    inp.inputMode = "numeric";
    inp.pattern = "[0-9]*";
    inp.id = `qty_${uid}_${size}`;
    inp.dataset.item = itemName;
    inp.dataset.variety = variety.name;
    inp.dataset.size = size;

    // Visual indicator + live summary
    inp.addEventListener("input", () => {
      sanitizeQty(inp);
      inp.classList.toggle("has-value", parseInt(inp.value, 10) > 0);
      updateBadges(iIdx, vIdx);
      updateSummaryBar();
    });

    // Select all on focus for quick overwrite
    inp.addEventListener("focus", () => inp.select());

    cell.appendChild(inp);
    grid.appendChild(cell);
  });
  body.appendChild(grid);

  // Comment
  const commentGap = el("div", "row-gap");
  body.appendChild(commentGap);
  body.appendChild(labelEl("Comment"));
  const ta = document.createElement("textarea");
  ta.id = `comment_${uid}`;
  ta.placeholder = "Optional notes…";
  ta.rows = 2;
  body.appendChild(ta);

  panel.appendChild(body);
  return panel;
}

// ─── HELPERS ────────────────────────────────────────────────

/** Shortcut to create an element with a class */
function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

/** Create a small label element */
function labelEl(text) {
  const l = document.createElement("label");
  l.className = "field-label";
  l.textContent = text;
  return l;
}

/** Sanitize quantity input: positive integer only */
function sanitizeQty(input) {
  let v = parseInt(input.value, 10);
  if (isNaN(v) || v < 0) v = 0;
  input.value = v;
}

// ─── BADGES & SUMMARY ──────────────────────────────────────

/** Update the quantity badges on variety toggle and item header */
function updateBadges(iIdx, vIdx) {
  const item = catalog[iIdx];
  let itemTotal = 0;

  item.varieties.forEach((variety, vi) => {
    let varTotal = 0;
    variety.sizes.forEach(size => {
      const inp = document.getElementById(`qty_${iIdx}_${vi}_${size}`);
      if (inp) varTotal += parseInt(inp.value, 10) || 0;
    });

    const varBadge = document.getElementById(`varBadge_${iIdx}_${vi}`);
    if (varBadge) {
      varBadge.textContent = varTotal;
      varBadge.classList.toggle("visible", varTotal > 0);
    }

    itemTotal += varTotal;
  });

  const itemBadge = document.getElementById(`itemBadge_${iIdx}`);
  if (itemBadge) {
    itemBadge.textContent = itemTotal;
    itemBadge.classList.toggle("visible", itemTotal > 0);
  }
}

/** Render a per-item quantity summary in the header bar */
function updateSummaryBar() {
  const bar = document.getElementById("summaryBar");
  const parts = [];

  catalog.forEach((item, iIdx) => {
    let total = 0;
    item.varieties.forEach((v, vi) => {
      v.sizes.forEach(s => {
        const inp = document.getElementById(`qty_${iIdx}_${vi}_${s}`);
        if (inp) total += parseInt(inp.value, 10) || 0;
      });
    });
    if (total > 0) parts.push(`${item.item}: ${total}`);
  });

  bar.textContent = parts.length ? "Total ─ " + parts.join("  |  ") : "";
}

// ─── COLLECT ORDER DATA ─────────────────────────────────────

/**
 * Walks the catalog and collects every size with qty > 0
 * into a flat normalized array of row objects.
 */
function collectOrderData() {
  const customer = document.getElementById("customerName").value.trim();
  const date     = document.getElementById("orderDate").value;
  const market   = document.getElementById("marketArea").value.trim();
  const rows = [];

  catalog.forEach((item, iIdx) => {
    item.varieties.forEach((variety, vIdx) => {
      const uid   = `${iIdx}_${vIdx}`;
      const color = document.getElementById(`color_${uid}`).value;
      const comment = document.getElementById(`comment_${uid}`).value.trim();

      variety.sizes.forEach(size => {
        const qty = parseInt(
          document.getElementById(`qty_${uid}_${size}`).value, 10
        ) || 0;

        if (qty > 0) {
          rows.push({
            customer,
            date,
            market,
            item:    item.item,
            variety: variety.name,
            color,
            size,
            quantity: qty,
            comment
          });
        }
      });
    });
  });

  return rows;
}

// ─── VALIDATE ORDER ─────────────────────────────────────────

/**
 * Returns an error message string or null if valid.
 */
function validateOrder(rows) {
  const customer = document.getElementById("customerName").value.trim();
  if (!customer) return "Customer name is required.";
  if (!rows || rows.length === 0) return "Please enter at least one quantity.";
  return null;
}

// ─── SUBMIT ORDER ───────────────────────────────────────────

/**
 * Entry point from Save button.
 * Validates, shows confirmation modal, then submits.
 */
function submitOrder() {
  if (isSubmitting) return;

  const rows = collectOrderData();
  const error = validateOrder(rows);

  if (error) {
    showToast(error, "error");
    return;
  }

  // Build summary for confirmation modal
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const items = [...new Set(rows.map(r => r.item))];
  document.getElementById("modalSummary").innerHTML =
    `Submit <strong>${totalQty}</strong> unit(s) across ` +
    `<strong>${items.join(", ")}</strong> for customer ` +
    `<strong>${rows[0].customer}</strong>?`;

  // Show modal
  document.getElementById("modalOverlay").classList.remove("hidden");
}

/** User confirmed submission from modal */
function confirmSubmit() {
  closeModal();
  doSubmit();
}

/** Close confirmation modal */
function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
}

/**
 * Actual POST request to backend.
 */
async function doSubmit() {
  const rows = collectOrderData();
  const btn     = document.getElementById("btnSave");
  const btnText = document.getElementById("btnText");
  const spinner = document.getElementById("btnSpinner");

  isSubmitting = true;
  btn.disabled = true;
  btnText.textContent = "Saving…";
  spinner.classList.remove("hidden");

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "submitOrder", api_key: API_KEY, orders: rows }),
      mode: "cors"
    });

    showToast("Order saved successfully!", "success");
    clearDraft();
    resetForm();
  } catch (err) {
    console.error("Submission error:", err);
    showToast("Network error. Draft saved locally.", "error");
    saveDraft(); // persist so data isn't lost
  } finally {
    isSubmitting = false;
    btn.disabled = false;
    btnText.textContent = "Save Order";
    spinner.classList.add("hidden");
  }
}

// ─── RESET FORM ─────────────────────────────────────────────

/**
 * Clears all quantity fields, color selects, and comments.
 * Preserves customer name & date for repeated entries.
 */
function resetForm() {
  catalog.forEach((item, iIdx) => {
    item.varieties.forEach((variety, vIdx) => {
      const uid = `${iIdx}_${vIdx}`;

      // Reset quantities
      variety.sizes.forEach(size => {
        const inp = document.getElementById(`qty_${uid}_${size}`);
        if (inp) {
          inp.value = 0;
          inp.classList.remove("has-value");
        }
      });

      // Reset color & comment
      const sel = document.getElementById(`color_${uid}`);
      if (sel) sel.value = "";

      const ta = document.getElementById(`comment_${uid}`);
      if (ta) ta.value = "";

      // Reset badges
      updateBadges(iIdx, vIdx);
    });
  });

  updateSummaryBar();
}

// ─── LOCALSTORAGE DRAFT ─────────────────────────────────────

/** Save current form state to localStorage */
function saveDraft() {
  try {
    const draft = {
      customer: document.getElementById("customerName").value,
      date:     document.getElementById("orderDate").value,
      market:   document.getElementById("marketArea").value,
      fields:   {}
    };

    catalog.forEach((item, iIdx) => {
      item.varieties.forEach((variety, vIdx) => {
        const uid = `${iIdx}_${vIdx}`;
        draft.fields[`color_${uid}`]   = document.getElementById(`color_${uid}`).value;
        draft.fields[`comment_${uid}`] = document.getElementById(`comment_${uid}`).value;

        variety.sizes.forEach(size => {
          const inp = document.getElementById(`qty_${uid}_${size}`);
          if (inp) draft.fields[inp.id] = inp.value;
        });
      });
    });

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    // Storage full or unavailable — silently ignore
  }
}

/** Restore form state from localStorage if a draft exists */
function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    const draft = JSON.parse(raw);

    if (draft.customer) document.getElementById("customerName").value = draft.customer;
    if (draft.date)     document.getElementById("orderDate").value    = draft.date;
    if (draft.market)   document.getElementById("marketArea").value   = draft.market;

    if (draft.fields) {
      Object.entries(draft.fields).forEach(([id, val]) => {
        const elem = document.getElementById(id);
        if (elem) {
          elem.value = val;
          // Re-apply visual indicator for qty fields
          if (id.startsWith("qty_") && parseInt(val, 10) > 0) {
            elem.classList.add("has-value");
          }
        }
      });
    }

    // Refresh all badges
    catalog.forEach((item, iIdx) => {
      item.varieties.forEach((_, vIdx) => updateBadges(iIdx, vIdx));
    });
    updateSummaryBar();

    showToast("Draft restored from local storage.", "info");
  } catch (e) {
    // Corrupt draft — clear it
    localStorage.removeItem(DRAFT_KEY);
  }
}

/** Remove saved draft */
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

/** Auto-save draft periodically */
function startAutosave() {
  setInterval(saveDraft, AUTOSAVE_INTERVAL);
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────

/**
 * Show a temporary toast message.
 * @param {string} msg  - Display text
 * @param {"success"|"error"|"info"} type
 */
function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");

  setTimeout(() => toast.classList.add("hidden"), 3500);
}

// ─── PAGE NAVIGATION ────────────────────────────────────────

/**
 * Switch between Orders and Master Data pages.
 */
function switchPage(page) {
  currentPage = page;

  // Toggle page visibility
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");

  // Toggle nav button active state
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add("active");

  // Load master data when switching to that page
  if (page === "master") {
    loadColorMaster();
    loadVarieties();
    loadItems();
  }
}

/**
 * Switch between master data sub-tabs.
 */
function switchMasterTab(tab) {
  document.querySelectorAll(".master-tab").forEach(t => t.classList.remove("active"));
  document.querySelector(`.master-tab[data-tab="${tab}"]`).classList.add("active");

  document.querySelectorAll(".master-tab-content").forEach(c => c.classList.remove("active"));
  document.getElementById(`masterTab-${tab}`).classList.add("active");

  // Load data for the active tab
  if (tab === "variety") loadVarieties();
  if (tab === "items") loadItems();
  if (tab === "customers") loadCustomers();
}

// ─── VARIETY MASTER DATA ────────────────────────────────────

/**
 * Fetch all varieties from the backend.
 */
async function loadVarieties() {
  const listEl = document.getElementById("varietyList");
  listEl.innerHTML = '<div class="loading-msg">Loading varieties…</div>';

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "getVarieties", api_key: API_KEY }),
      mode: "cors"
    });
    const data = await resp.json();

    if (data.status === "success" && data.varieties) {
      varietiesCache = data.varieties;
      renderVarietyList(data.varieties);
    } else {
      listEl.innerHTML = '<div class="loading-msg">Failed to load varieties.</div>';
    }
  } catch (err) {
    console.error("Load varieties error:", err);
    // Fallback: show locally cached or empty
    if (varietiesCache.length > 0) {
      renderVarietyList(varietiesCache);
      showToast("Showing cached data. Network error.", "error");
    } else {
      listEl.innerHTML = '<div class="loading-msg">Network error. Please check your connection.</div>';
    }
  }
}

/**
 * Render the variety list cards.
 */
function renderVarietyList(varieties) {
  const listEl = document.getElementById("varietyList");

  if (!varieties || varieties.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>No varieties found. Click "+ Add Variety" to get started.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = varieties.map(v => {
    const sizeTags = (v.sizes || [])
      .map(s => `<span>${s}</span>`)
      .join("");

    const imgHtml = v.imageURL
      ? `<img src="${v.imageURL}" alt="${v.name}" />`
      : `<div class="placeholder-icon">🖼</div>`;

    return `
      <div class="variety-card" data-id="${v.id}">
        <div class="variety-card-img">${imgHtml}</div>
        <div class="variety-card-body">
          <div class="variety-card-name">${v.name}</div>
          ${v.shortForm ? `<div class="variety-card-short">${v.shortForm}</div>` : ""}
          <div class="variety-card-sizes">${sizeTags || '<span style="color:#aaa">No sizes defined</span>'}</div>
        </div>
        <div class="variety-card-actions">
          <button class="btn-edit" onclick="editVariety('${v.id}')">Edit</button>
          <button class="btn-delete" onclick="confirmDeleteVariety('${v.id}', '${v.name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </div>`;
  }).join("");
}

/**
 * Open the variety form for adding a new entry.
 */
function openVarietyForm(variety = null) {
  const panel = document.getElementById("varietyFormPanel");
  const title = document.getElementById("varietyFormTitle");

  // Reset form
  document.getElementById("varietyId").value = "";
  document.getElementById("varietyName").value = "";
  document.getElementById("varietyShortForm").value = "";
  document.getElementById("varietyImageURL").value = "";
  document.getElementById("varietySizes").value = "";
  document.getElementById("varietyImagePreview").classList.add("hidden");

  // Reset file upload UI
  const vFileInput = document.getElementById("varietyImageFile");
  if (vFileInput) vFileInput.value = "";
  const vfnEl = document.getElementById("varietyFileName");
  if (vfnEl) vfnEl.textContent = "No file chosen";
  const vstEl = document.getElementById("varietyUploadStatus");
  if (vstEl) { vstEl.textContent = ""; vstEl.className = "upload-status"; }

  if (variety) {
    title.textContent = "Edit Variety";
    document.getElementById("varietyId").value = variety.id;
    document.getElementById("varietyName").value = variety.name || "";
    document.getElementById("varietyShortForm").value = variety.shortForm || "";
    document.getElementById("varietyImageURL").value = variety.imageURL || "";
    document.getElementById("varietySizes").value = (variety.sizes || []).join(", ");

    if (variety.imageURL) {
      document.getElementById("varietyPreviewImg").src = variety.imageURL;
      document.getElementById("varietyImagePreview").classList.remove("hidden");
    }
  } else {
    title.textContent = "Add New Variety";
  }

  panel.classList.remove("hidden");
  document.getElementById("varietyName").focus();

  // Set up image preview on URL change
  const imgInput = document.getElementById("varietyImageURL");
  imgInput.oninput = () => {
    const url = imgInput.value.trim();
    const preview = document.getElementById("varietyImagePreview");
    if (url) {
      document.getElementById("varietyPreviewImg").src = url;
      preview.classList.remove("hidden");
    } else {
      preview.classList.add("hidden");
    }
  };
}

/**
 * Close the variety form.
 */
function closeVarietyForm() {
  document.getElementById("varietyFormPanel").classList.add("hidden");
}

/**
 * Load a variety into the edit form.
 */
function editVariety(id) {
  const variety = varietiesCache.find(v => v.id == id);
  if (variety) openVarietyForm(variety);
}

/**
 * Save (add or update) a variety via backend POST.
 */
async function saveVariety() {
  const name = document.getElementById("varietyName").value.trim();
  if (!name) {
    showToast("Variety name is required.", "error");
    return;
  }

  const varietyData = {
    id:        document.getElementById("varietyId").value || null,
    name:      name,
    shortForm: document.getElementById("varietyShortForm").value.trim(),
    imageURL:  document.getElementById("varietyImageURL").value.trim(),
    sizes:     document.getElementById("varietySizes").value
                 .split(",")
                 .map(s => s.trim())
                 .filter(s => s.length > 0)
  };

  const btnText = document.getElementById("varietyBtnText");
  const spinner = document.getElementById("varietySpinner");

  btnText.textContent = "Saving…";
  spinner.classList.remove("hidden");

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "saveVariety",
        api_key: API_KEY,
        variety: varietyData
      }),
      mode: "cors"
    });

    showToast(varietyData.id ? "Variety updated!" : "Variety added!", "success");
    closeVarietyForm();

    // Reload list
    setTimeout(() => loadVarieties(), 500);
  } catch (err) {
    console.error("Save variety error:", err);
    showToast("Error saving variety. Try again.", "error");
  } finally {
    btnText.textContent = "Save Variety";
    spinner.classList.add("hidden");
  }
}

/**
 * Show a confirmation before deleting a variety.
 */
function confirmDeleteVariety(id, name) {
  if (confirm(`Delete variety "${name}"? This cannot be undone.`)) {
    deleteVariety(id);
  }
}

/**
 * Delete a variety via backend POST.
 */
async function deleteVariety(id) {
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "deleteVariety",
        api_key: API_KEY,
        varietyId: id
      }),
      mode: "cors"
    });

    showToast("Variety deleted.", "success");
    setTimeout(() => loadVarieties(), 500);
  } catch (err) {
    console.error("Delete variety error:", err);
    showToast("Error deleting variety. Try again.", "error");
  }
}

// ─── ITEM MASTER DATA ───────────────────────────────────────

/**
 * Fetch all items from the backend.
 */
async function loadItems() {
  const listEl = document.getElementById("itemList");
  if (!listEl) return;
  listEl.innerHTML = '<div class="loading-msg">Loading items…</div>';

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "getItems", api_key: API_KEY }),
      mode: "cors"
    });
    const data = await resp.json();

    if (data.status === "success" && data.items) {
      itemsCache = data.items;
      renderItemList(data.items);
    } else {
      listEl.innerHTML = '<div class="loading-msg">Failed to load items.</div>';
    }
  } catch (err) {
    console.error("Load items error:", err);
    if (itemsCache.length > 0) {
      renderItemList(itemsCache);
      showToast("Showing cached data. Network error.", "error");
    } else {
      listEl.innerHTML = '<div class="loading-msg">Network error. Please check your connection.</div>';
    }
  }
}

/**
 * Render item list cards.
 */
function renderItemList(items) {
  const listEl = document.getElementById("itemList");

  if (!items || items.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>No items found. Click "+ Add Item" to get started.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = items.map(item => {
    // Image thumbnails
    const imgsHtml = (item.images && item.images.length > 0)
      ? `<div class="item-card-images">${item.images.map(u => `<img src="${u}" alt="" />`).join("")}</div>`
      : `<div class="placeholder-icon">🖼</div>`;

    // Colors
    const colorsHtml = (item.colors && item.colors.length > 0)
      ? `<div class="item-card-colors">${item.colors.map(c => `<span>${c}</span>`).join("")}</div>`
      : "";

    // Sizes per variety summary
    let sizeSummary = "";
    if (item.sizes && Object.keys(item.sizes).length > 0) {
      sizeSummary = Object.entries(item.sizes).map(([vid, sizes]) => {
        const vName = varietiesCache.find(v => v.id === vid);
        const label = vName ? vName.shortForm || vName.name : vid;
        return `<span class="vs-label">${label}:</span> ${Array.isArray(sizes) ? sizes.join(", ") : sizes}`;
      }).join(" &nbsp;|&nbsp; ");
    }

    return `
      <div class="variety-card" data-id="${item.id}">
        <div class="variety-card-img">${imgsHtml}</div>
        <div class="variety-card-body">
          <div class="variety-card-name">${item.name}</div>
          ${item.shortForm ? `<div class="variety-card-short">${item.shortForm}</div>` : ""}
          ${colorsHtml}
          ${item.price !== "" && item.price !== undefined ? `<div class="item-card-price">₹ ${item.price}</div>` : ""}
          ${sizeSummary ? `<div class="item-card-variety-sizes">${sizeSummary}</div>` : ""}
          ${item.comment ? `<div class="item-card-comment">${item.comment}</div>` : ""}
        </div>
        <div class="variety-card-actions">
          <button class="btn-edit" onclick="editItem('${item.id}')">Edit</button>
          <button class="btn-delete" onclick="confirmDeleteItem('${item.id}', '${item.name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </div>`;
  }).join("");
}

/**
 * Build the sizes-per-variety input rows inside the item form.
 */
function buildSizesPerVarietyUI(existingSizes = {}, isNewItem = false) {
  const container = document.getElementById("itemSizesPerVariety");

  if (!varietiesCache || varietiesCache.length === 0) {
    container.innerHTML = '<div class="loading-msg">No varieties found. Add varieties first.</div>';
    return;
  }

  container.innerHTML = varietiesCache.map(v => {
    const existing = existingSizes[v.id];
    // For new items, default to all sizes from the variety
    let val;
    if (existing) {
      val = Array.isArray(existing) ? existing.join(", ") : existing;
    } else if (isNewItem && v.sizes && v.sizes.length > 0) {
      val = v.sizes.join(", ");
    } else {
      val = "";
    }
    const availableSizes = (v.sizes || []).join(", ");

    return `
      <div class="variety-size-row">
        <div class="variety-size-label">
          ${v.name} (${v.shortForm || v.id})
          <span class="variety-size-hint">Available: ${availableSizes || "none defined"}</span>
        </div>
        <input type="text" id="itemSizes_${v.id}" placeholder="e.g. ${availableSizes}" value="${val}" />
      </div>`;
  }).join("");
}

/**
 * Update image previews when URLs change.
 */
function updateItemImagePreviews() {
  const container = document.getElementById("itemImagePreviews");
  const urls = [
    document.getElementById("itemImage1").value.trim(),
    document.getElementById("itemImage2").value.trim(),
    document.getElementById("itemImage3").value.trim()
  ].filter(u => u);

  container.innerHTML = urls.map(u => `<img class="img-thumb" src="${u}" alt="Preview" />`).join("");
}

// ─── ITEM COLOR HELPERS ─────────────────────────────────────

/** Master color list loaded from the Colors sheet. */
let colorMasterList = [];

/** Current selected colors for the item being edited. */
window._itemColors = [];

/**
 * Load the master color list from backend.
 */
async function loadColorMaster() {
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "getColors", api_key: API_KEY }),
      mode: "cors"
    });
    const data = await resp.json();
    if (data.status === "success" && data.colors) {
      colorMasterList = data.colors;
    }
  } catch (err) {
    console.error("Load colors error:", err);
  }
}

/**
 * Render selectable color chips in the item form.
 * All master colors shown as chips; selected ones are highlighted.
 * For new items, all colors are selected by default.
 */
function renderColorChips() {
  const container = document.getElementById("itemColorChips");
  if (!container) return;

  // Merge master list + any custom colors the item has that aren't in master
  const allColors = [...colorMasterList];
  (window._itemColors || []).forEach(c => {
    if (!allColors.some(m => m.toLowerCase() === c.toLowerCase())) {
      allColors.push(c);
    }
  });

  container.innerHTML = allColors.map(c => {
    const isSelected = (window._itemColors || []).some(s => s.toLowerCase() === c.toLowerCase());
    return `<span class="color-chip ${isSelected ? "selected" : ""}" onclick="toggleItemColor(this, '${c.replace(/'/g, "\\'")}')">${isSelected ? '<span class="chip-check">✓</span>' : ""}${c}</span>`;
  }).join("");
}

/**
 * Toggle a color chip on/off.
 */
function toggleItemColor(el, color) {
  const idx = window._itemColors.findIndex(c => c.toLowerCase() === color.toLowerCase());
  if (idx >= 0) {
    window._itemColors.splice(idx, 1);
  } else {
    window._itemColors.push(color);
  }
  renderColorChips();
}

/**
 * Add a custom color not in the master list.
 */
function addCustomItemColor() {
  const inp = document.getElementById("itemColorInput");
  const val = inp.value.trim();
  if (!val) return;
  // Avoid duplicates
  if (window._itemColors.some(c => c.toLowerCase() === val.toLowerCase())) {
    showToast("Color already selected.", "error");
    inp.value = "";
    inp.focus();
    return;
  }
  window._itemColors.push(val);
  renderColorChips();
  inp.value = "";
  inp.focus();
}

/**
 * Handle Enter key in color input.
 */
document.addEventListener("DOMContentLoaded", () => {
  const colorInput = document.getElementById("itemColorInput");
  if (colorInput) {
    colorInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCustomItemColor();
      }
    });
  }
});

/**
 * Open the item form for adding or editing.
 */
function openItemForm(item = null) {
  const panel = document.getElementById("itemFormPanel");
  const title = document.getElementById("itemFormTitle");

  // Reset form
  document.getElementById("itemId").value = "";
  document.getElementById("itemName").value = "";
  document.getElementById("itemShortForm").value = "";
  document.getElementById("itemImage1").value = "";
  document.getElementById("itemImage2").value = "";
  document.getElementById("itemImage3").value = "";
  document.getElementById("itemComment").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemImagePreviews").innerHTML = "";
  document.getElementById("itemColorInput").value = "";
  window._itemColors = [];

  // Reset file upload UI
  [1, 2, 3].forEach(n => {
    const fileInput = document.getElementById(`itemImageFile${n}`);
    if (fileInput) fileInput.value = "";
    const fnEl = document.getElementById(`itemFileName${n}`);
    if (fnEl) fnEl.textContent = "No file chosen";
    const stEl = document.getElementById(`itemUploadStatus${n}`);
    if (stEl) { stEl.textContent = ""; stEl.className = "upload-status"; }
  });

  if (item) {
    title.textContent = "Edit Item";
    document.getElementById("itemId").value = item.id;
    document.getElementById("itemName").value = item.name || "";
    document.getElementById("itemShortForm").value = item.shortForm || "";
    if (item.images && item.images[0]) document.getElementById("itemImage1").value = item.images[0];
    if (item.images && item.images[1]) document.getElementById("itemImage2").value = item.images[1];
    if (item.images && item.images[2]) document.getElementById("itemImage3").value = item.images[2];
    document.getElementById("itemComment").value = item.comment || "";
    document.getElementById("itemPrice").value = item.price !== undefined && item.price !== "" ? item.price : "";
    // Populate colors
    window._itemColors = item.colors || [];
    renderColorChips();
    buildSizesPerVarietyUI(item.sizes || {}, false);
    updateItemImagePreviews();
  } else {
    title.textContent = "Add New Item";
    // Default: select all master colors
    window._itemColors = [...colorMasterList];
    renderColorChips();
    buildSizesPerVarietyUI({}, true);
  }

  panel.classList.remove("hidden");
  document.getElementById("itemName").focus();
}

/**
 * Close the item form.
 */
function closeItemForm() {
  document.getElementById("itemFormPanel").classList.add("hidden");
}

/**
 * Load an item into the edit form.
 */
function editItem(id) {
  const item = itemsCache.find(i => i.id == id);
  if (item) openItemForm(item);
}

/**
 * Save (add or update) an item via backend POST.
 */
async function saveItem() {
  const name = document.getElementById("itemName").value.trim();
  if (!name) {
    showToast("Item name is required.", "error");
    return;
  }

  // Collect sizes per variety
  const sizes = {};
  varietiesCache.forEach(v => {
    const inp = document.getElementById(`itemSizes_${v.id}`);
    if (inp) {
      const sArr = inp.value.split(",").map(s => s.trim()).filter(s => s.length > 0);
      if (sArr.length > 0) sizes[v.id] = sArr;
    }
  });

  const images = [
    document.getElementById("itemImage1").value.trim(),
    document.getElementById("itemImage2").value.trim(),
    document.getElementById("itemImage3").value.trim()
  ].filter(u => u);

  const itemData = {
    id:        document.getElementById("itemId").value || null,
    name:      name,
    shortForm: document.getElementById("itemShortForm").value.trim(),
    images:    images,
    sizes:     sizes,
    colors:    window._itemColors || [],
    price:     document.getElementById("itemPrice").value.trim(),
    comment:   document.getElementById("itemComment").value.trim()
  };

  const btnText = document.getElementById("itemBtnText");
  const spinner = document.getElementById("itemSpinner");

  btnText.textContent = "Saving…";
  spinner.classList.remove("hidden");

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "saveItem",
        api_key: API_KEY,
        item: itemData
      }),
      mode: "cors"
    });

    showToast(itemData.id ? "Item updated!" : "Item added!", "success");
    closeItemForm();
    setTimeout(() => loadItems(), 500);
  } catch (err) {
    console.error("Save item error:", err);
    showToast("Error saving item. Try again.", "error");
  } finally {
    btnText.textContent = "Save Item";
    spinner.classList.add("hidden");
  }
}

/**
 * Confirm before deleting an item.
 */
function confirmDeleteItem(id, name) {
  if (confirm(`Delete item "${name}"? This cannot be undone.`)) {
    deleteItem(id);
  }
}

/**
 * Delete an item via backend POST.
 */
async function deleteItem(id) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "deleteItem",
        api_key: API_KEY,
        itemId: id
      }),
      mode: "cors"
    });

    showToast("Item deleted.", "success");
    setTimeout(() => loadItems(), 500);
  } catch (err) {
    console.error("Delete item error:", err);
    showToast("Error deleting item. Try again.", "error");
  }
}

// ─── CUSTOMER MASTER DATA ───────────────────────────────────

/**
 * Fetch all customers from the backend.
 */
async function loadCustomers() {
  const listEl = document.getElementById("customerList");
  if (!listEl) return;
  listEl.innerHTML = '<div class="loading-msg">Loading customers…</div>';

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "getCustomers", api_key: API_KEY }),
      mode: "cors"
    });
    const data = await resp.json();

    if (data.status === "success" && data.customers) {
      customersCache = data.customers;
      renderCustomerList(data.customers);
    } else {
      listEl.innerHTML = '<div class="loading-msg">Failed to load customers.</div>';
    }
  } catch (err) {
    console.error("Load customers error:", err);
    if (customersCache.length > 0) {
      renderCustomerList(customersCache);
      showToast("Showing cached data. Network error.", "error");
    } else {
      listEl.innerHTML = '<div class="loading-msg">Network error. Please check your connection.</div>';
    }
  }
}

/**
 * Render customer list cards.
 */
function renderCustomerList(customers) {
  const listEl = document.getElementById("customerList");

  if (!customers || customers.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <p>No customers found. Click "+ Add Customer" to get started.</p>
      </div>`;
    return;
  }

  listEl.innerHTML = customers.map(c => {
    const imgHtml = (c.images && c.images.length > 0)
      ? `<img src="${c.images[0]}" alt="${c.name}" />`
      : `<div class="placeholder-icon">👤</div>`;

    return `
      <div class="variety-card" data-id="${c.id}">
        <div class="variety-card-img">${imgHtml}</div>
        <div class="variety-card-body">
          <div class="variety-card-name">${c.name}</div>
          ${c.phone ? `<div class="customer-card-phone">${c.phone}</div>` : ""}
          ${c.address ? `<div class="customer-card-address">${c.address}</div>` : ""}
        </div>
        <div class="variety-card-actions">
          <button class="btn-edit" onclick="editCustomer('${c.id}')">Edit</button>
          <button class="btn-delete" onclick="confirmDeleteCustomer('${c.id}', '${c.name.replace(/'/g, "\\'")}')">Delete</button>
        </div>
      </div>`;
  }).join("");
}

/**
 * Open the customer form for adding or editing.
 */
function openCustomerForm(customer = null) {
  const panel = document.getElementById("customerFormPanel");
  const title = document.getElementById("customerFormTitle");

  // Reset form
  document.getElementById("customerId").value = "";
  document.getElementById("customerName").value = "";
  document.getElementById("customerPhone").value = "";
  document.getElementById("customerAddress").value = "";
  document.getElementById("custImage1").value = "";
  document.getElementById("custImage2").value = "";
  document.getElementById("custImagePreviews").innerHTML = "";

  // Reset file upload UI
  [1, 2].forEach(n => {
    const fileInput = document.getElementById(`custImageFile${n}`);
    if (fileInput) fileInput.value = "";
    const fnEl = document.getElementById(`custFileName${n}`);
    if (fnEl) fnEl.textContent = "No file chosen";
    const stEl = document.getElementById(`custUploadStatus${n}`);
    if (stEl) { stEl.textContent = ""; stEl.className = "upload-status"; }
  });

  if (customer) {
    title.textContent = "Edit Customer";
    document.getElementById("customerId").value = customer.id;
    document.getElementById("customerName").value = customer.name || "";
    document.getElementById("customerPhone").value = customer.phone || "";
    document.getElementById("customerAddress").value = customer.address || "";
    if (customer.images && customer.images[0]) document.getElementById("custImage1").value = customer.images[0];
    if (customer.images && customer.images[1]) document.getElementById("custImage2").value = customer.images[1];
    updateCustImagePreviews();
  } else {
    title.textContent = "Add New Customer";
  }

  panel.classList.remove("hidden");
  document.getElementById("customerName").focus();
}

function closeCustomerForm() {
  document.getElementById("customerFormPanel").classList.add("hidden");
}

function editCustomer(id) {
  const customer = customersCache.find(c => c.id == id);
  if (customer) openCustomerForm(customer);
}

function updateCustImagePreviews() {
  const container = document.getElementById("custImagePreviews");
  const urls = [
    document.getElementById("custImage1").value.trim(),
    document.getElementById("custImage2").value.trim()
  ].filter(u => u);
  container.innerHTML = urls.map(u => `<img class="img-thumb" src="${u}" alt="Preview" />`).join("");
}

/**
 * Handle customer image file upload.
 */
async function handleCustImageUpload(input, index) {
  const file = input.files[0];
  if (!file) return;

  const fnEl = document.getElementById(`custFileName${index}`);
  const stEl = document.getElementById(`custUploadStatus${index}`);
  fnEl.textContent = file.name;
  stEl.textContent = "Uploading…";
  stEl.className = "upload-status uploading";

  try {
    const url = await uploadImageToBackend(file);
    document.getElementById(`custImage${index}`).value = url;
    stEl.textContent = "Done ✓";
    stEl.className = "upload-status done";
    updateCustImagePreviews();
  } catch (err) {
    console.error("Customer image upload error:", err);
    stEl.textContent = "Failed";
    stEl.className = "upload-status error";
  }
}

/**
 * Save (add or update) a customer.
 */
async function saveCustomer() {
  const name = document.getElementById("customerName").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();

  if (!name) { showToast("Customer name is required.", "error"); return; }
  if (!phone) { showToast("Phone number is required.", "error"); return; }

  const images = [
    document.getElementById("custImage1").value.trim(),
    document.getElementById("custImage2").value.trim()
  ].filter(u => u);

  const customerData = {
    id:      document.getElementById("customerId").value || null,
    name:    name,
    phone:   phone,
    address: document.getElementById("customerAddress").value.trim(),
    images:  images
  };

  const btnText = document.getElementById("customerBtnText");
  const spinner = document.getElementById("customerSpinner");
  btnText.textContent = "Saving…";
  spinner.classList.remove("hidden");

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "saveCustomer",
        api_key: API_KEY,
        customer: customerData
      }),
      mode: "cors"
    });

    showToast(customerData.id ? "Customer updated!" : "Customer added!", "success");
    closeCustomerForm();
    setTimeout(() => loadCustomers(), 500);
  } catch (err) {
    console.error("Save customer error:", err);
    showToast("Error saving customer. Try again.", "error");
  } finally {
    btnText.textContent = "Save Customer";
    spinner.classList.add("hidden");
  }
}

function confirmDeleteCustomer(id, name) {
  if (confirm(`Delete customer "${name}"? This cannot be undone.`)) {
    deleteCustomer(id);
  }
}

async function deleteCustomer(id) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "deleteCustomer",
        api_key: API_KEY,
        customerId: id
      }),
      mode: "cors"
    });

    showToast("Customer deleted.", "success");
    setTimeout(() => loadCustomers(), 500);
  } catch (err) {
    console.error("Delete customer error:", err);
    showToast("Error deleting customer. Try again.", "error");
  }
}

// ─── IMAGE UPLOAD HELPERS ──────────────────────────────────

/**
 * Convert a File to base64 string (without the data: prefix).
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove "data:image/jpeg;base64," prefix
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image file to Google Drive via the backend.
 * Returns the viewable URL.
 */
async function uploadImageToBackend(file) {
  const base64 = await fileToBase64(file);

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "uploadImage",
      api_key: API_KEY,
      fileName: file.name,
      mimeType: file.type || "image/jpeg",
      base64: base64
    }),
    mode: "cors"
  });

  const data = await resp.json();
  if (data.status === "success" && data.url) {
    return data.url;
  }
  throw new Error(data.error || "Upload failed");
}

/**
 * Handle variety image file upload.
 */
async function handleVarietyImageUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const fileNameEl = document.getElementById("varietyFileName");
  const statusEl = document.getElementById("varietyUploadStatus");

  fileNameEl.textContent = file.name;
  statusEl.textContent = "Uploading…";
  statusEl.className = "upload-status uploading";

  try {
    const url = await uploadImageToBackend(file);
    document.getElementById("varietyImageURL").value = url;
    document.getElementById("varietyPreviewImg").src = url;
    document.getElementById("varietyImagePreview").classList.remove("hidden");
    statusEl.textContent = "✓ Uploaded";
    statusEl.className = "upload-status done";
  } catch (err) {
    console.error("Variety image upload error:", err);
    statusEl.textContent = "✗ Failed";
    statusEl.className = "upload-status error";
    showToast("Image upload failed. Try again.", "error");
  }
}

/**
 * Handle item image file upload (slot 1, 2, or 3).
 */
async function handleItemImageUpload(input, slot) {
  const file = input.files[0];
  if (!file) return;

  const fileNameEl = document.getElementById(`itemFileName${slot}`);
  const statusEl = document.getElementById(`itemUploadStatus${slot}`);

  fileNameEl.textContent = file.name;
  statusEl.textContent = "Uploading…";
  statusEl.className = "upload-status uploading";

  try {
    const url = await uploadImageToBackend(file);
    document.getElementById(`itemImage${slot}`).value = url;
    statusEl.textContent = "✓ Uploaded";
    statusEl.className = "upload-status done";
    updateItemImagePreviews();
  } catch (err) {
    console.error(`Item image ${slot} upload error:`, err);
    statusEl.textContent = "✗ Failed";
    statusEl.className = "upload-status error";
    showToast("Image upload failed. Try again.", "error");
  }
}
