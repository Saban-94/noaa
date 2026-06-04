import { db, auth } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { format } from 'date-fns';

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

interface ComaxFile {
  id: string;
  name: string;
  base64: string;
}

/**
 * Sends a trigger request to Google Apps Script (GAS) to search and sync comax emails directly.
 * Due to standard GAS behavior on writing actions, mode is set to 'no-cors' to avoid pre-flight errors.
 */
export async function triggerManualEmailScan(): Promise<void> {
  console.log("Triggering Google Apps Script via Web App endpoint:", GAS_WEB_APP_URL);
  
  try {
    await fetch(GAS_WEB_APP_URL, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    console.log("Successfully sent execution signal to GAS Web App (No-Cors).");
  } catch (error) {
    console.error("Failed to call GAS Web App trigger:", error);
    throw new Error("לא הצלחתי להפעיל את סנכרון המיילים בגוגל אחי");
  }
}

/**
 * Fetches PDF files (metadata and Base64 content) directly from the GAS Web App,
 * queries Gemini to extract order fields, and saves parsed pending orders into Firestore.
 */
export async function scanAndParseComaxOrders(): Promise<ParseResult[]> {
  console.log("Fetching new synced Comax PDFs from GAS Web App:", GAS_WEB_APP_URL);
  
  let files: ComaxFile[] = [];
  
  try {
    // We send standard request with cors to fetch the JSON payload
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`שגיאה בקריאת הנתונים מהמייל אחי (${response.status})`);
    }
    
    const data = await response.json();
    
    // The structure returned by GAS is typically an array of files or wrapped in a data property
    if (Array.isArray(data)) {
      files = data;
    } else if (data && Array.isArray(data.files)) {
      files = data.files;
    } else {
      console.warn("GAS responded with unrecognized layout:", data);
    }
  } catch (error: any) {
    console.error("Failed to fetch documents from GAS:", error);
    throw new Error(`שגיאה בקבלת קבצים משרת גוגל: ${error?.message || String(error)}`);
  }

  console.log(`Scan: Retrieved ${files.length} Comax ERP document(s) from GAS Web App.`);

  const results: ParseResult[] = [];

  for (const file of files) {
    try {
      // 1. Prevent duplicate processing by querying existing Firestore documents
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

      // 2. Safeguard for missing Base64 content
      if (!file.base64 || file.base64.length < 100) {
        throw new Error("קובץ ה-PDF ריק או שלא הורד במלואו על ידי השרת אחי.");
      }

      // 3. Send document to Gemini with schema-guided extraction
      const docData = await parseComaxPdfWithGemini(file.base64);

      // 4. Convert items array to SabanOS's newline plain text line schema
      // Pattern required by SabanOS: "Quantity Product_Name SKU"
      const formattedItems = docData.items
        .map(item => `${item.quantity || 1} ${item.name || ''} ${item.sku || ''}`.trim())
        .join('\n');

      // 5. Append the pending order to Firebase Firestore
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
