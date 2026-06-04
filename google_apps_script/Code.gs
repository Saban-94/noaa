/**
 * SabanOS - Comax Email Parser & ERP Hub
 * Google Apps Script (Code.gs)
 * 
 * This script runs in Google Apps Script and acts as the secure primary brain:
 * 1. Scans Gmail for unread emails with Comax ERP PDFs (Subject: "שליחת מסמך בדוא"ל")
 * 2. Processes PDF files into Base64 and calls Google Gemini AI API directly with a strict JSON Schema
 * 3. Appends the structured raw data to a Google Sheets audit log
 * 4. Returns clean, structured JSON to SabanOS React frontend for instant Firestore synchronization
 * 5. Marks processed emails as read to prevent duplicate ingestion
 */

// =========================================================================
// CONFIGURATION - PLEASE UPDATE THESE VARIABLES FOR YOUR ENVIRONMENT
// =========================================================================
var GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";
var SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
var SHEET_NAME = "Comax Ingest Log"; // Automatically created if it doesn't exist
// =========================================================================

/**
 * Handle GET requests from SabanOS React client.
 * Triggers Gmail scan, runs Gemini parsing, updates log sheet, and returns JSON payload.
 */
function doGet(e) {
  var output = {
    success: false,
    files: [],
    processedCount: 0,
    errors: [],
    scannedCount: 0
  };

  try {
    var results = runComaxPipeline();
    output.success = true;
    output.files = results.files;
    output.processedCount = results.processed;
    output.scannedCount = results.scanned;
    output.errors = results.errors;
  } catch (err) {
    Logger.log("Pipeline run failed completely: " + err.toString());
    output.success = false;
    output.error = err.toString();
  }

  // Return formatted JSON string with correct CORS permissions
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Handle OPTIONS requests for pre-flight safety (CORS)
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Orchestrates Gmail search, PDF parsing, Google Sheets logging, and email cleanup
 */
function runComaxPipeline() {
  var responsePayload = {
    files: [],
    scanned: 0,
    processed: 0,
    errors: []
  };

  // Ensure Sheet exists & initialized with correct headers
  var sheet = getOrCreateLogSheet();

  // Search parameters: Subject "שליחת מסמך בדוא"ל" and is currently UNREAD
  var searchQuery = 'subject:"שליחת מסמך בדוא\"ל" has:attachment is:unread';
  var threads = GmailApp.search(searchQuery, 0, 15); // Process in batches of 15 max
  
  responsePayload.scanned = threads.length;
  Logger.log("SabanOS Scanner: Detected " + threads.length + " unread thread matching query.");

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var messages = thread.getMessages();
    var lastMessage = messages[messages.length - 1]; // Pull actual active message
    var attachments = lastMessage.getAttachments();
    var emailId = lastMessage.getId();
    var timestamp = lastMessage.getDate();

    for (var j = 0; j < attachments.length; j++) {
      var attachment = attachments[j];
      
      // We only process PDF invoices or orders
      if (attachment.getContentType() === "application/pdf") {
        var base64Data = Utilities.base64Encode(attachment.getBytes());
        var fileName = attachment.getName();
        
        try {
          Logger.log("Processing PDF Attachment: " + fileName + " (" + emailId + ")");
          
          // Execute direct query to Gemini API to parse ERP values
          var parsedData = queryGeminiWithPdf(base64Data);
          
          // Verify we have a logical structure back from Gemini
          if (parsedData && parsedData.customerName) {
            
            // Format items into a readable string list for Google Sheets cell representation
            var itemsSummaryString = parsedData.items.map(function(it) {
              return (it.qty || it.quantity || 1) + "x " + (it.name || "פריט") + " [" + (it.sku || "N/A") + "]";
            }).join("\n");

            // Append row to Google Sheets audit log
            // Columns: Ingest Timestamp | Order Number | Customer | Destination | Items Detailed List | File Ingest ID | Status
            sheet.appendRow([
              new Date(),
              parsedData.orderNumber || "CM-UNKNOWN",
              parsedData.customerName,
              parsedData.destination || "נא לעדכן בהמשך",
              itemsSummaryString,
              emailId,
              "SUCCESS"
            ]);

            // Add to responsePayload array block for returning to React client setup
            responsePayload.files.push({
              id: emailId + "_" + j, // Structured file ID representing unique task key
              name: fileName,
              mimeType: "application/pdf",
              base64: base64Data, // Return Base64 in payload as fallback for inline visualization
              parsedResult: parsedData // Include structure so React client can verify/prefill instantly
            });

            responsePayload.processed++;
          } else {
            throw new Error("Gemini completed successfully but parsed payload came back empty.");
          }

        } catch (fileError) {
          var errorStr = fileError.toString();
          Logger.log("Error processing attachment (" + fileName + "): " + errorStr);
          
          responsePayload.errors.push({
            fileName: fileName,
            emailId: emailId,
            error: errorStr
          });

          // Log failure row on sheet for logging audit
          sheet.appendRow([
            new Date(),
            "ERROR",
            "N/A",
            "N/A",
            "Error: " + errorStr,
            emailId,
            "FAILED"
          ]);
        }
      }
    }

    // Pipeline Cleanup Requirement: Mark email as Read only if no total failure broke the sequence
    try {
      thread.markRead();
      Logger.log("Thread " + emailId + " marked as read.");
    } catch(markerError) {
      Logger.log("Failed to mark thread as read: " + markerError.toString());
    }
  }

  return responsePayload;
}

/**
 * Makes direct Fetch call to Gemini API using base64 payload & strict JSON schemas
 */
function queryGeminiWithPdf(base64Payload) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error("אנא הגדר את מפתח ה-API של Gemini בגוגל סקריפט אחי");
  }

  var apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;

  var customInstructions = 
    "Analyze the attached Hebrew Comax business document (PDF format).\n" +
    "Extract and structure the following data properties with strict values in the specified JSON object format:\n" +
    "- customerName (string): Hebrew company name or customer name. Often found at the top grid beside customer ID code (e.g. '612089 (מוצקין').\n" +
    "- orderNumber (string): Document ID or confirmation number.\n" +
    "- destination (string): Geographical delivery address details.\n" +
    "- items (array): Complete inventory rows list containing:\n" +
    "  * sku (string): Usually 5-digit catalog barcode or code (e.g., '11453').\n" +
    "  * name (string): Hebrew item name/inventory item label.\n" +
    "  * qty (string): Item counts or quantity requested.\n\n" +
    "Return STRICT valid JSON only. Absolutely NO markdown block tags, notes, or explanations.";

  var requestBody = {
    "contents": [{
      "parts": [
        {
          "inlineData": {
            "mimeType": "application/pdf",
            "data": base64Payload
          }
        },
        {
          "text": customInstructions
        }
      ]
    }],
    "generationConfig": {
      "responseMimeType": "application/json",
      "responseSchema": {
        "type": "OBJECT",
        "properties": {
          "customerName": { "type": "STRING", "description": "Customer name in Hebrew" },
          "orderNumber": { "type": "STRING", "description": "Comax order ID number" },
          "destination": { "type": "STRING", "description": "Exact shipping location" },
          "items": {
            "type": "ARRAY",
            "items": {
              "type": "OBJECT",
              "properties": {
                "sku": { "type": "STRING", "description": "5-digit product catalog code" },
                "name": { "type": "STRING", "description": "Product name in Hebrew" },
                "qty": { "type": "STRING", "description": "Numeric item count" }
              },
              "required": ["sku", "name", "qty"]
            }
          }
        },
        "required": ["customerName", "orderNumber", "destination", "items"]
      }
    }
  };

  var fetchOptions = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(requestBody),
    "muteHttpExceptions": true
  };

  var response = UrlFetchApp.fetch(apiUrl, fetchOptions);
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode !== 200) {
    throw new Error("שגיאה בפנייה למודל Gemini: " + responseCode + " - " + responseText);
  }

  try {
    var rawJson = JSON.parse(responseText);
    var targetText = rawJson.candidates[0].content.parts[0].text;
    
    // Safety filter to trim possible markdown wrappers
    targetText = targetText.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    
    var finalResult = JSON.parse(targetText);
    return finalResult;
  } catch (parseError) {
    Logger.log("Failed parsing raw Gemini response text: " + responseText);
    throw new Error("קובץ ה-PDF פוענח בהצלחה על ידי המערכת, אך מבנה הנתונים שלו לא היה תקין: " + parseError.toString());
  }
}

/**
 * Connects to Google Sheet or creates the audit tab if it is missing
 */
function getOrCreateLogSheet() {
  if (!SHEET_ID || SHEET_ID === "YOUR_GOOGLE_SHEET_ID_HERE") {
    throw new Error("אנא הגדר מזהה Google Sheet תקין בסקריפט אחי כדי לתעד את הלוגים");
  }

  var spreadSheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadSheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadSheet.insertSheet(SHEET_NAME);
    // Write down professional audit log structure headers
    sheet.appendRow([
      "תאריך ייבוא",
      "מספר הזמנה",
      "שם לקוח",
      "כתובת יעד",
      "פירוט פריטים וכמויות",
      "מזהה קובץ / מייל",
      "סטטוס עיבוד"
    ]);
    
    // Format headers with elegant styling
    sheet.getRange("A1:G1").setFontWeight("bold");
    sheet.getRange("A1:G1").setBackground("#e0f2fe"); // sky-100 style matching SabanOS
    sheet.getRange("A1:G1").setFontColor("#0369a1"); // sky-700
    sheet.getRange("A1:G1").setHorizontalAlignment("right");
    sheet.setDirection(SpreadsheetApp.Direction.RIGHT_TO_LEFT);
  }

  return sheet;
}
