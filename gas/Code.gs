/* ============================================================
   GOOGLE APPS SCRIPT BACKEND – Code.gs
   TravellingOrder Engine
   ============================================================
   Deploy as Web App → Execute as: Me → Access: Anyone
   ============================================================ */

// ─── CONFIGURATION ──────────────────────────────────────────

/** Must match the API_KEY constant in your frontend app.js */
const SECRET_KEY = "PASTE_YOUR_SECRET_KEY";

/** Name of the Google Sheet tab that receives orders */
const SHEET_NAME = "Orders";

/** Name of the Google Sheet tab for Variety master data */
const VARIETY_SHEET = "Varieties";

// ─── doPost – MAIN ENTRY POINT ──────────────────────────────

/**
 * Handles incoming POST requests from the frontend.
 * Validates the API key, parses the JSON body, and appends
 * each order row to the "Orders" sheet.
 *
 * @param {Object} e - The event object from Apps Script
 * @returns {ContentService.TextOutput} JSON response
 */
function doPost(e) {
  try {
    var apiKey = "";
    if (e.parameter && e.parameter.api_key) {
      apiKey = e.parameter.api_key;
    }

    var payload = JSON.parse(e.postData.contents);

    if (payload.api_key) {
      apiKey = payload.api_key;
    }

    // Validate
    if (SECRET_KEY && apiKey && apiKey !== SECRET_KEY) {
      return jsonResponse(403, { error: "Unauthorized" });
    }

    // ── Route by action ─────────────────────────────────────
    var action = payload.action || "submitOrder";

    if (action === "saveVariety")   return saveVariety(payload);
    if (action === "deleteVariety") return deleteVariety(payload);

    // Default: submit orders
    return submitOrders(payload);

  } catch (err) {
    return jsonResponse(500, { error: err.toString() });
  }
}

// ─── SUBMIT ORDERS ──────────────────────────────────────────

function submitOrders(payload) {
    var orders = payload.orders;
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return jsonResponse(400, { error: "No order data received." });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "Timestamp", "Customer", "Date", "Market",
        "Item", "Variety", "Color", "Size", "Quantity", "Comment"
      ]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold");
    }

    var timestamp = new Date();
    var rows = orders.map(function (o) {
      return [
        timestamp,
        o.customer || "",
        o.date || "",
        o.market || "",
        o.item || "",
        o.variety || "",
        o.color || "",
        o.size || "",
        o.quantity || 0,
        o.comment || ""
      ];
    });

    sheet.getRange(
      sheet.getLastRow() + 1, 1,
      rows.length, rows[0].length
    ).setValues(rows);

    return jsonResponse(200, {
      status: "success",
      rowsAdded: rows.length
    });
}

// ─── doGet – HEALTH CHECK ───────────────────────────────────

/**
 * Optional GET handler — useful for quick health checks and data retrieval.
 */
function doGet(e) {
  var action = (e.parameter && e.parameter.action) ? e.parameter.action : "";

  if (action === "getVarieties") return getVarieties();

  return jsonResponse(200, {
    status: "ok",
    message: "TravellingOrder Engine API is running."
  });
}

// ─── HELPER: JSON RESPONSE ──────────────────────────────────

/**
 * Builds a JSON response with proper MIME type.
 */
function jsonResponse(code, body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── DAILY BACKUP ───────────────────────────────────────────

/**
 * Creates a backup copy of the Orders sheet with today's date.
 * Schedule this via: Triggers → Add Trigger → dailyBackup →
 *   Time-driven → Day timer → pick a time.
 */
function dailyBackup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName(SHEET_NAME);
  if (!source) return;

  var dateStr = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
  var backupName = "Backup_" + dateStr;

  // Remove old backup with same name if re-run same day
  var existing = ss.getSheetByName(backupName);
  if (existing) ss.deleteSheet(existing);

  // Copy
  var copy = source.copyTo(ss);
  copy.setName(backupName);
}

// ─── SETUP HELPER ───────────────────────────────────────────

/**
 * Run once to create the Orders sheet with headers.
 * Menu: Extensions → Apps Script → Run → setupSheet
 */
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) {
    SpreadsheetApp.getUi().alert("Sheet '" + SHEET_NAME + "' already exists.");
    return;
  }
  sheet = ss.insertSheet(SHEET_NAME);
  sheet.appendRow([
    "Timestamp", "Customer", "Date", "Market",
    "Item", "Variety", "Color", "Size", "Quantity", "Comment"
  ]);
  sheet.getRange(1, 1, 1, 10).setFontWeight("bold");
  sheet.setFrozenRows(1);
  SpreadsheetApp.getUi().alert("Sheet '" + SHEET_NAME + "' created.");
}

// ─── VARIETY MASTER DATA ────────────────────────────────────

/**
 * Ensures the Varieties sheet exists with proper headers.
 * Returns the sheet object.
 */
function getOrCreateVarietySheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(VARIETY_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(VARIETY_SHEET);
    sheet.appendRow(["ID", "Name", "ShortForm", "ImageURL", "Sizes"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * GET handler: Returns all varieties as JSON array.
 */
function getVarieties() {
  var sheet = getOrCreateVarietySheet();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return jsonResponse(200, { status: "success", varieties: [] });
  }

  var data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  var varieties = data.map(function(row) {
    return {
      id:        row[0],
      name:      row[1],
      shortForm: row[2],
      imageURL:  row[3],
      sizes:     row[4] ? row[4].toString().split(",").map(function(s){ return s.trim(); }) : []
    };
  });

  return jsonResponse(200, { status: "success", varieties: varieties });
}

/**
 * POST handler: Save (add or update) a variety.
 * Expects payload: { action: "saveVariety", variety: { id, name, shortForm, imageURL, sizes: [] } }
 */
function saveVariety(payload) {
  var v = payload.variety;
  if (!v || !v.name) {
    return jsonResponse(400, { error: "Variety name is required." });
  }

  var sheet = getOrCreateVarietySheet();
  var sizesStr = (v.sizes && Array.isArray(v.sizes)) ? v.sizes.join(", ") : (v.sizes || "");

  // If ID provided, find and update
  if (v.id) {
    var lastRow = sheet.getLastRow();
    for (var r = 2; r <= lastRow; r++) {
      if (sheet.getRange(r, 1).getValue() == v.id) {
        sheet.getRange(r, 2).setValue(v.name);
        sheet.getRange(r, 3).setValue(v.shortForm || "");
        sheet.getRange(r, 4).setValue(v.imageURL || "");
        sheet.getRange(r, 5).setValue(sizesStr);
        return jsonResponse(200, { status: "success", message: "Variety updated.", id: v.id });
      }
    }
  }

  // New entry – generate unique ID
  var newId = "V" + new Date().getTime();
  sheet.appendRow([newId, v.name, v.shortForm || "", v.imageURL || "", sizesStr]);

  return jsonResponse(200, { status: "success", message: "Variety added.", id: newId });
}

/**
 * POST handler: Delete a variety by ID.
 * Expects payload: { action: "deleteVariety", varietyId: "V..." }
 */
function deleteVariety(payload) {
  var id = payload.varietyId;
  if (!id) {
    return jsonResponse(400, { error: "Variety ID is required." });
  }

  var sheet = getOrCreateVarietySheet();
  var lastRow = sheet.getLastRow();

  for (var r = 2; r <= lastRow; r++) {
    if (sheet.getRange(r, 1).getValue() == id) {
      sheet.deleteRow(r);
      return jsonResponse(200, { status: "success", message: "Variety deleted." });
    }
  }

  return jsonResponse(404, { error: "Variety not found." });
}

/**
 * Run once to seed the Varieties sheet with default data.
 * Menu: Extensions → Apps Script → Run → setupVarieties
 */
function setupVarieties() {
  var sheet = getOrCreateVarietySheet();

  // Only seed if empty (header only)
  if (sheet.getLastRow() > 1) {
    SpreadsheetApp.getUi().alert("Varieties sheet already has data. Skipping seed.");
    return;
  }

  var defaults = [
    ["V1", "Ganesh Lakshmi", "GL", "", "6 Inch, 9 Inch, 12 Inch, 15 Inch, 18 Inch"],
    ["V2", "Ladu Gopal",     "LG", "", "3 Inch, 5 Inch, 7 Inch, 9 Inch, 12 Inch"],
    ["V3", "Radhakrishnan",  "RK", "", "9 Inch, 12 Inch, 15 Inch, 18 Inch, 24 Inch"]
  ];

  sheet.getRange(2, 1, defaults.length, 5).setValues(defaults);
  SpreadsheetApp.getUi().alert("Seeded " + defaults.length + " default varieties.");
}
