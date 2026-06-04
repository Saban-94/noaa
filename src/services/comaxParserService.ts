import { db, auth } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { format } from 'date-fns';

// Direct Apps Script API deployment URL
const GAS_URL = "https://script.google.com/macros/s/AKfycbyqvULuPQZM3y4lKVwlv4A4HqiSp9WrrIoaVtNsIAhU0gyzRJDfGvW3hcCm63w1XWq4QA/exec";

// Initialize the secure server-authenticated Gemini client (as a reliable fallback)
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
  mimeType: string;
  base64?: string;
  parsedResult?: {
    customerName: string;
    orderNumber: string;
    destination: string;
    items: Array<{ sku: string; name: string; qty?: string; quantity?: string }>;
  };
}

/**
 * Triggers a manual sync on Google Apps Script (GAS) Web App before scanning.
 */
export async function triggerManualEmailScan(): Promise<void> {
  console.log("Triggering manual Gmail scanner on GAS URL:", GAS_URL);
  
  try {
    await fetch(GAS_URL, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    console.log("Trigger request dispatched successfully.");
  } catch (error) {
    console.error("Failed to call GAS manual scan trigger:", error);
    throw new Error("לא הצלחתי להפעיל את סנכרון המיילים בגוגל אחי");
  }
}

/**
 * Main parser entry point: fetches parsed records directly from our custom GAS Apps Script brain,
 * saves parsed pending orders into Firestore, and supports localized failovers.
 */
export async function scanAndParseComaxOrders(): Promise<ParseResult[]> {
  console.log("Requesting documents payload from Apps Script brain:", GAS_URL);
  
  let files: ComaxFile[] = [];
  
  try {
    const response = await fetch(GAS_URL, {
      method: "GET",
      cache: "no-cache"
    });
    
    if (!response.ok) {
      throw new Error(`שגיאה בתקשורת עם שרת Google: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.success && Array.isArray(data.files)) {
      files = data.files;
    } else if (Array.isArray(data)) {
      files = data;
    } else if (data && Array.isArray(data.files)) {
      files = data.files;
    } else {
      console.warn("GAS responded with unexpected structure:", data);
    }
  } catch (error: any) {
    console.error("Failed to fetch documents from GAS:", error);
    throw new Error(`שגיאה בקבלת קבצים משרת גוגל: ${error?.message || String(error)}`);
  }

  console.log(`Scan: Retrieved ${files.length} document(s) from Apps Script.`);

  const results: ParseResult[] = [];

  for (const file of files) {
    try {
      // 1. Prevent duplicate processing by checking for existing orders by unique source PDF/Email ID
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

      // 2. Resolve document data: Prefer pre-parsed structured result from GAS brain, otherwise fall back to client AI
      let docData;
      if (file.parsedResult && file.parsedResult.customerName) {
        console.log("Using pre-parsed structured data from GAS brain for:", file.name);
        docData = file.parsedResult;
      } else {
        if (!file.base64 || file.base64.length < 50) {
          throw new Error("קובץ ה-PDF ריק ואין ברשותנו נתונים מפוענחים קודמים אחי.");
        }
        console.log("GAS data had no pre-parsed fields. Enacting front-end Gemini fallback parser for:", file.name);
        docData = await parseComaxPdfWithGemini(file.base64, file.mimeType);
      }

      // 3. Clean and format table entries logically for SabanOS compatibility
      const itemsList = docData.items || [];
      const formattedItems = itemsList
        .map(item => `${item.qty || item.quantity || 1} ${item.name || ''} ${item.sku || ''}`.trim())
        .join('\n');

      // 4. Structure & write document directly to Firebase Firestore
      const newOrderBody = {
        orderNumber: docData.orderNumber || `CM-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: docData.customerName || 'לקוח קומקס כללי',
        destination: docData.destination || 'נא לעדכן מיקום',
        items: formattedItems,
        warehouse: 'החרש', // Default SabanOS warehouse
        driverId: '',
        status: 'pending',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        orderFormId: file.id,
        sourcePdfId: file.id,
        source: 'import',
        notes: `יובא אוטומטית מסריקת מייל קומקס (מופעל ע"י Google Apps Script). קובץ: ${file.name}`,
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
 * Gemini extraction pipeline fallback, utilizing strict Type structure validation schemas.
 */
async function parseComaxPdfWithGemini(base64Data: string, mimeType: string = "application/pdf") {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY in process.env secrets.");
  }

  const pdfPart = {
    inlineData: {
      mimeType: mimeType || "application/pdf",
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
    const parsed = JSON.parse(rawText) as {
      customerName: string;
      orderNumber: string;
      destination: string;
      items: Array<{ sku: string; name: string; quantity: string }>;
    };
    
    // Map 'quantity' back to our 'qty' schema for seamless downstream operations
    return {
      customerName: parsed.customerName,
      orderNumber: parsed.orderNumber,
      destination: parsed.destination,
      items: parsed.items.map(item => ({
        sku: item.sku,
        name: item.name,
        qty: item.quantity
      }))
    };
  } catch (err: any) {
    console.error("Failed to parse Gemini model response text as JSON:", response.text);
    throw new Error("קובץ ה-PDF פוענח אך מבנה הנתונים שלו לא היה תקין.");
  }
}
