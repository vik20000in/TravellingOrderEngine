/* ============================================================
   TRAVELLINGORDER ENGINE – app.js
   Vanilla JS · No frameworks · Production-ready
   ============================================================ */

// ─── CONFIGURATION ──────────────────────────────────────────

/** Replace with your deployed Google Apps Script Web App URL */
const API_URL = "PASTE_YOUR_APPS_SCRIPT_URL";

/** API key must match SECRET_KEY in the Apps Script backend */
const API_KEY = "PASTE_YOUR_SECRET_KEY";

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
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({ orders: rows }),
      mode: "no-cors" // Apps Script requires no-cors from browser
    });

    // With no-cors the response is opaque; we assume success if no error thrown.
    // If you deploy Apps Script with "Anyone" access you can switch to mode:"cors"
    // and read resp.json() for server-side validation feedback.

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
