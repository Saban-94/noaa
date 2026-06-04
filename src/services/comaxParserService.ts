import { db, auth } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { format } from 'date-fns';
import { getFileBase64, listDriveFiles } from './driveService';

// Google Apps Script Web App Endpoint URL that bridges Gmail and Drive folder sync
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyqvULuPQZM3y4lKVwlv4A4HqiSp9WrrIoaVtNsIAhU0gyzRJDfGvW3hcCm63w1XWq4QA/exec";

// Initialize the Gemini client using the secure client-side setup in Vite
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

export interface ParseResult {
  fileName: string;
  fileId: string;
  status: 'success' | 'failed' | 'skipped';
  orderId?: string;
  error?: string;
  customerName?: string;
  orderNumber?: string;
}

/**
 * Sends a trigger requests to Google Apps Script (GAS) to search and sync comax emails directly.
 * Due to standard GAS behavior, mode is set to 'no-cors'.
 */
export async function triggerManualEmailScan(): Promise<void> {
  console.log("Triggering Google Apps Script via Web App endpoint:", GAS_WEB_APP_URL);
  
  try {
    // We send with no-cors because Apps Script redirects don't satisfy CORS standards in browser environment
    await fetch(GAS_WEB_APP_URL, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    console.log("Successfully sent execution signal to GAS Web App (No-Cors).");
  } catch (error) {
    console.error("Failed to call GAS Web App trigger, checking fallback:", error);
    throw new Error("לא הצלחתי להפעיל את סנכרון המיילים בגוגל אחי");
  }
}

/**
 * Searches Google Drive to locate the "SabanOS_New_Orders" folder.
 * Uses a global search fallback to locate it in My Drive or nested under the project folder.
 */
export async function findSabanOSFolderId(): Promise<string | null> {
  const folderName = "SabanOS_New_Orders";
  const apiKey = import.meta.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
  const parentFolderId = import.meta.env.NEXT_PUBLIC_DRIVE_FOLDER_ID;

  if (!apiKey) {
    console.warn("Drive API Key is missing. Listing/Scanning documents won't work, but GAS is fineאחי.");
    return parentFolderId || null;
  }

  // 1. Try finding 'SabanOS_New_Orders' globally in user's Drive
  const queryGlobal = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const urlGlobal = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryGlobal)}&fields=files(id,name)&key=${apiKey}`;

  try {
    const response = await fetch(urlGlobal);
    if (response.ok) {
      const data = await response.json();
      if (data.files && data.files.length > 0) {
        console.log(`Successfully located global folder: ${folderName} -> ID: ${data.files[0].id}`);
        return data.files[0].id;
      }
    }
  } catch (error) {
    console.warn("Global folder lookup returned error, falling back:", error);
  }

  // 2. Try locating it nested inside the parent directory
  if (parentFolderId) {
    const queryNested = `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const urlNested = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryNested)}&fields=files(id,name)&key=${apiKey}`;
    try {
      const response = await fetch(urlNested);
      if (response.ok) {
        const data = await response.json();
        if (data.files && data.files.length > 0) {
          console.log(`Successfully located nested folder: ${folderName} -> ID: ${data.files[0].id}`);
          return data.files[0].id;
        }
      }
    } catch (error) {
      console.warn("Nested folder lookup returned error:", error);
    }
  }

  // 3. Fallback: Default to parentFolderId
  console.log(`Folder '${folderName}' not found. Defaulting to parent folder/root ID.`);
  return parentFolderId || null;
}

/**
 * Downloads PDF content from Comax folder, queries Gemini to extract order fields,
 * and saves parsed pending orders into Firestore while preventing double integration.
 */
export async function scanAndParseComaxOrders(): Promise<ParseResult[]> {
  const folderId = await findSabanOSFolderId();
  if (!folderId) {
    throw new Error("לא הוגדרה תיקיית Google Drive ראשית ב-SabanOS אחי.");
  }

  // 1. Retrieve files in Drive folder
  const files = await listDriveFiles(folderId);
  const pdfFiles = files.filter(f => 
    f.mimeType === "application/pdf" || 
    f.name.toLowerCase().endsWith(".pdf")
  );

  console.log(`Scan: Found ${pdfFiles.length} Comax ERP document(s) inside Drive folder.`);

  const results: ParseResult[] = [];

  for (const file of pdfFiles) {
    try {
      // 2. Prevent duplicate processing by querying existing Firestore documents
      const dupQuery = query(collection(db, 'orders'), where('sourcePdfId', '==', file.id));
      const dupSnap = await getDocs(dupQuery);

      if (!dupSnap.empty) {
        results.push({
          fileName: file.name,
          fileId: file.id,
          status: 'skipped',
          error: 'הזמנה זו כבר יובאה בעבר אחי ⚡'
        });
        continue;
      }

      // 3. Fetch base64 PDF content from Drive
      const base64Data = await getFileBase64(file.id);
      if (!base64Data || base64Data.length < 100) {
        throw new Error("קובץ ה-PDF ריק או שלא ניתן היה להוריד אותו מ-Drive");
      }

      // 4. Send document to Gemini with schema-guided extraction
      const docData = await parseComaxPdfWithGemini(base64Data);

      // 5. Convert items array to SabanOS's newline plain text line schema
      // Pattern required by SabanOS: "Quantity Product_Name SKU" or similar
      const formattedItems = docData.items
        .map(item => `${item.quantity || 1} ${item.name || ''} ${item.sku || ''}`.trim())
        .join('\n');

      // 6. Bulk append the pending order to Firebase Firestore
      const newOrderBody = {
        orderNumber: docData.orderNumber || `CM-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: docData.customerName || 'לקוח קומקס כללי',
        destination: docData.destination || 'נא לעדכן מיקום',
        items: formattedItems,
        warehouse: 'החרש', // Default warehouse according to guideline
        driverId: '', // Unassigned by default
        status: 'pending',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        orderFormId: file.id, // For inline preview inside SabanOS
        sourcePdfId: file.id, // For uniqueness check
        source: 'import',
        notes: `יובא אוטומטית מסריקת מייל Comax אחי. שם קובץ: ${file.name}`,
        createdBy: auth.currentUser?.uid || 'comax-sync-agent',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'orders'), newOrderBody);

      results.push({
        fileName: file.name,
        fileId: file.id,
        status: 'success',
        orderId: docRef.id,
        customerName: docData.customerName,
        orderNumber: docData.orderNumber
      });

    } catch (err: any) {
      console.error(`Comax sync pipeline failed for file ${file.name}:`, err);
      results.push({
        fileName: file.name,
        fileId: file.id,
        status: 'failed',
        error: err?.message || String(err)
      });
    }
  }

  return results;
}

/**
 * Invokes Gemini 3.5 Flash using strict JSON schema output mapping.
 */
async function parseComaxPdfWithGemini(base64Data: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in process.env secrets.");
  }

  const pdfPart = {
    inlineData: {
      mimeType: "application/pdf",
      data: base64Data
    }
  };

  const cleanPrompt = `
אנא נתח את מסמך ההזמנה של Comax PDF המצורף וחלץ את הפרטים המדויקים הבאים:
- שם לקוח (customerName) - שם לקוח כולל מספר לקוח, לדוגמה "612108( לירן/מוצקין") או שם לקוח משמעותי אחר בראש הדוח.
- מספר הזמנה (orderNumber) - מספר אישור ההזמנה של Comax.
- כתובת למשלוח / יעד (destination) - הכתובת הגיאוגרפית המלאה למשלוח הסחורה.
- פריטים (items) - רשימה המכילה כמות (quantity), שם פריט בעברית (name) וקוד פריט (sku) עם 5 ספרות (לדוגמה 11501).

חובה להחזיר אובייקט JSON נקי ומדויק בלבד המתאים בדיוק למבנה המבוקש. אל תכתוב שום מלל או פירוט נוסף מחוץ ל-JSON.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [pdfPart, cleanPrompt],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          customerName: { type: Type.STRING, description: "Hebrew customer name and optional 6-digit ERP customer code" },
          orderNumber: { type: Type.STRING, description: "Comax documentation or confirmation number" },
          destination: { type: Type.STRING, description: "Exact logistics delivery address" },
          items: {
            type: Type.ARRAY,
            description: "Extracted items from the invoice table",
            items: {
              type: Type.OBJECT,
              properties: {
                sku: { type: Type.STRING, description: "Exactly 5 digit item code" },
                name: { type: Type.STRING, description: "Hebrew item label" },
                quantity: { type: Type.STRING, description: "Quantity in numbers" }
              },
              required: ["sku", "name", "quantity"]
            }
          }
        },
        required: ["customerName", "orderNumber", "destination", "items"]
      }
    }
  });

  if (!response.text) {
    throw new Error("לא התקבל פיענוח תקין מנתח ה-AI של Gemini");
  }

  try {
    const rawText = response.text.trim();
    return JSON.parse(rawText) as {
      customerName: string;
      orderNumber: string;
      destination: string;
      items: Array<{ sku: string; name: string; quantity: string }>;
    };
  } catch (err: any) {
    console.error("Failed to parse Gemini model response text as JSON:", response.text);
    throw new Error("קובץ ה-PDF פוענח אך מבנה הנתונים שלו לא היה תקין.");
  }
}
