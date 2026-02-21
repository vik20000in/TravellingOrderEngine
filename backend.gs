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
    // ── API key validation ──────────────────────────────────
    // Note: When called with mode:"no-cors" from browser,
    // custom headers may not arrive. If you use no-cors on the
    // frontend, comment out this block or rely on the URL being
    // secret. For full header validation, the frontend must use
    // mode:"cors" and the script must be deployed with
    // "Anyone" access (no Google sign-in).
    //
    // To use header-based auth with cors, uncomment:
    // var apiKey = e.parameter["api_key"] || "";
    // We read from query param as a fallback for no-cors.
    // ────────────────────────────────────────────────────────

    var apiKey = "";
    if (e.parameter && e.parameter.api_key) {
      apiKey = e.parameter.api_key;
    }

    // Also try reading from the posted JSON (belt & suspenders)
    var payload = JSON.parse(e.postData.contents);

    if (payload.api_key) {
      apiKey = payload.api_key;
    }

    // Validate (skip if you're using URL-secret-only approach)
    if (SECRET_KEY && apiKey && apiKey !== SECRET_KEY) {
      return jsonResponse(403, { error: "Unauthorized" });
    }

    // ── Parse orders ────────────────────────────────────────
    var orders = payload.orders;
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return jsonResponse(400, { error: "No order data received." });
    }

    // ── Get or create sheet ─────────────────────────────────
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // Write header row
      sheet.appendRow([
        "Timestamp", "Customer", "Date", "Market",
        "Item", "Variety", "Color", "Size", "Quantity", "Comment"
      ]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold");
    }

    // ── Append rows ─────────────────────────────────────────
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

    // Bulk append for performance
    sheet.getRange(
      sheet.getLastRow() + 1, 1,
      rows.length, rows[0].length
    ).setValues(rows);

    // ── Success ─────────────────────────────────────────────
    return jsonResponse(200, {
      status: "success",
      rowsAdded: rows.length
    });

  } catch (err) {
    return jsonResponse(500, { error: err.toString() });
  }
}

// ─── doGet – HEALTH CHECK ───────────────────────────────────

/**
 * Optional GET handler — useful for quick health checks.
 */
function doGet(e) {
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
