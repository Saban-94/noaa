import { db, auth } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';

// Production Google Apps Script Web App URL acting as the primary brain
const GAS_URL = "https://script.google.com/macros/s/AKfycbz1kuzVNcvNgmocdHz30lQnVlV-jXzZ7ibXjqyW899WQ7tPN8Ph4M1rCjiRTotICm59/exec?api=true";

export interface ParseResult {
  fileName: string;
  fileId: string;
  status: 'success' | 'failed' | 'skipped';
  orderId?: string;
  error?: string;
  customerName?: string;
  orderNumber?: string;
}

interface ComaxParsedItem {
  sku: string;
  name: string;
  qty?: string;
  quantity?: string;
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
    items: ComaxParsedItem[];
  };
}

/**
 * Triggers manual email scan/sync. Since the script execution is now consolidated
 * into a single unified fetch within scanAndParseComaxOrders, this function acts
 * as a fast-resolving helper to maintain compatibility with the UI phases.
 */
export async function triggerManualEmailScan(): Promise<void> {
  console.log('🚀 SabanOS: triggerManualEmailScan invoked. Consolidated workflow will trigger the GAS Script inside scanAndParseComaxOrders.');
  return Promise.resolve();
}

/**
 * Fetches pre-parsed Comax orders directly from the production GAS Web App,
 * deduplicates them against current Firestore order history, and injects them
 * into the Firestore database in real-time. All client-side heavy lifting is removed.
 *
 * Configured with { redirect: 'follow' } to handle Google Apps Script 302 redirects properly without CORS blocking.
 */
export async function scanAndParseComaxOrders(): Promise<ParseResult[]> {
  console.log('🚀 SabanOS: Initiating connection to Comax GAS Backend...');
  
  let files: ComaxFile[] = [];
  
  try {
    const response = await fetch(GAS_URL, { redirect: 'follow' });
    
    if (!response.ok) {
      throw new Error(`שגיאה בחיבור לשרת Apps Script המרכזי: ${response.status}`);
    }
    
    // Awaiting the response and parsing res.json() directly as requested
    const data = await response.json();
    
    // Telemetry requirements logging
    console.log('📡 SabanOS: Raw response received:', data);
    console.log('✅ SabanOS: Successfully received parsed orders:', data);
    
    if (data && data.success && Array.isArray(data.files)) {
      files = data.files;
    } else if (Array.isArray(data)) {
      files = data;
    } else if (data && Array.isArray(data.files)) {
      files = data.files;
    } else {
      console.warn("GAS responded with unexpected payload structure:", data);
    }
  } catch (error: any) {
    console.error('❌ SabanOS Sync Error:', error);
    throw new Error(`שגיאה בקבלת קבצים לאנליזה משרת גוגל: ${error?.message || String(error)}`);
  }

  const results: ParseResult[] = [];

  for (const file of files) {
    try {
      if (!file || !file.id) {
        console.warn("Skipping file record in GAS response: record or ID is missing", file);
        continue;
      }

      // 1. Prevent duplicate processing by querying existing Firestore documents matching file's unique ID
      const dupQuery = query(collection(db, 'orders'), where('sourcePdfId', '==', file.id));
      const dupSnap = await getDocs(dupQuery);

      if (!dupSnap.empty) {
        results.push({
          fileName: file.name || 'קובץ ללא שם',
          fileId: file.id,
          status: 'skipped',
          error: 'הזמנה זו כבר יובאה בעבר אחי ⚡'
        });
        continue;
      }

      // 2. Resolve document pre-parsed details with rich flexible fallbacks (handles any GAS schema generations)
      const docData = file.parsedResult || (file as any).orderData || file;
      if (!docData) {
        throw new Error("לא נמצאו נתוני פיענוח תקינים עבור קובץ זה בשרת המרכזי אחי.");
      }

      const customerName = docData.customerName || (file as any).customer || 'לקוח קומקס כללי';
      const orderNumber = docData.orderNumber || (file as any).orderId || (file as any).number || `CM-${Math.floor(1000 + Math.random() * 9000)}`;
      const destination = docData.destination || (file as any).address || 'נא לעדכן מיקום';

      // 3. Convert items array to SabanOS's newline plain text line schema
      // Pattern format: "Quantity Product_Name SKU"
      const itemsList = docData.items || (file as any).items || [];
      const formattedItems = itemsList
        .map((item: any) => `${item.qty || item.quantity || 1} ${item.name || item.itemName || ''} ${item.sku || item.itemCode || ''}`.trim())
        .join('\n');

      // 4. Ingest the pending order to Firebase Firestore status 'Pending'
      const newOrderBody = {
        orderNumber: orderNumber,
        customerName: customerName,
        destination: destination,
        items: formattedItems,
        warehouse: 'החרש', // Default warehouse according to logistics guidelines
        driverId: '', // Unassigned defaults
        status: 'pending', // Ingested as Pending
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        orderFormId: file.id, // Direct connection key for logistics audit
        sourcePdfId: file.id, // For duplicate safety constraints
        source: 'import',
        notes: `יובא אוטומטית מסריקת קומקס (מופעל ע"י Google Apps Script). שם קובץ: ${file.name || 'pdf_document'}`,
        createdBy: auth.currentUser?.uid || 'comax-sync-agent',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'orders'), newOrderBody);

      results.push({
        fileName: file.name || 'מסמך PDF',
        fileId: file.id,
        status: 'success',
        orderId: docRef.id,
        customerName: customerName,
        orderNumber: orderNumber
      });

    } catch (err: any) {
      console.error('❌ SabanOS Sync Error inside file ingestion loop:', err);
      results.push({
        fileName: file.name || 'מסמך PDF שגיאה',
        fileId: file.id,
        status: 'failed',
        error: err?.message || String(err)
      });
    }
  }

  return results;
}
