/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order } from '../types';

const API_KEY = import.meta.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
const FOLDER_ID = import.meta.env.NEXT_PUBLIC_DRIVE_FOLDER_ID;

const GAS_URL = import.meta.env.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbwMBz1tnnL-twFuUm87hOkPO-BKU_Bq8DL3mRh0OPyQv094NI87uLAdQl62X0VBcf7D/exec';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
}

/**
 * List files in the specified Drive folder.
 */
export async function listDriveFiles(folderId: string = FOLDER_ID || ''): Promise<DriveFile[]> {
  if (!API_KEY) {
    console.warn("Drive API Key is missing. Listing/Scanning documents won't work, but uploading via GAS Bridge is fine אחי.");
    return [];
  }

  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime desc&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error listing Drive files:", error);
    throw error;
  }
}

/**
 * Get the content of a file as a base64 string.
 * Note: For PDFs, we need to download the file data.
 */
export async function getFileBase64(fileId: string): Promise<string> {
  // First, try utilizing the Google Apps Script (GAS) bridge to download/extract file base64 data.
  // The GAS script executed under the owner's context has full OAuth access to the files on Google Drive,
  // bypassing any client-side CORS issues, API Key limitations, or file-sharing/access restriction errors.
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getFile',
        fileId: fileId
      })
    });
    if (response.ok) {
      const resText = await response.text();
      try {
        const result = JSON.parse(resText);
        const base64 = result?.base64 || result?.data || result?.base64Data || result?.content;
        if (base64 && base64.length > 50) {
          console.log("Successfully fetched file base64 using GAS 'getFile' action.");
          return base64;
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn("GAS getFile attempt failed, trying alternative action:", err);
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getFileBase64',
        fileId: fileId
      })
    });
    if (response.ok) {
      const resText = await response.text();
      try {
        const result = JSON.parse(resText);
        const base64 = result?.base64 || result?.data || result?.base64Data || result?.content;
        if (base64 && base64.length > 50) {
          console.log("Successfully fetched file base64 using GAS 'getFileBase64' action.");
          return base64;
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn("GAS getFileBase64 attempt failed:", err);
  }

  if (!API_KEY) {
    throw new Error("Missing Drive API Key אחי. תגדיר אותו ב-Settings כדי שנועה תוכל לסרוק קבצים.");
  }

  // To download file content using an API key, we use the 'alt=media' parameter.
  // Note: This only works for files that are publicly accessible or shared with the API Key/Identity.
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`קובץ עם מזהה ${fileId} לא נמצא בדרייב. וודא שזה ה-ID הנכון אחי.`);
      }
      throw new Error(`שגיאה בהורדת הקובץ: ${response.statusText} (${response.status})`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error downloading file from Drive:", error);
    throw error;
  }
}

/**
 * Upload a file to the specified Drive folder.
 * Uses a Google Apps Script (GAS) bridge to bypass client-side CORS and API key restrictions.
 */
export async function uploadFileToDrive(file: File, folderId: string = FOLDER_ID || ''): Promise<any> {
  try {
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const payload = {
      name: file.name,           // Common key for GAS
      filename: file.name,       // Existing key
      fileName: file.name,       // CamelCase variation
      mimeType: file.type,
      base64Data: base64Content, // GAS script expects this specific key
      data: base64Content,       // Keep for backward compatibility
      folderId: folderId
    };

    // Using mode: 'cors' so we can read the response body. 
    // GAS bridge must return a JSON response with the fileId.
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // Standard practice for GAS POST
      },
      body: JSON.stringify(payload)
    });

    console.log("GAS Bridge Response Status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("GAS Bridge Error Response:", errorText);
      throw new Error(`Upload failed: ${response.statusText} (${response.status})`);
    }

    const result = await response.json();
    console.log("GAS Bridge Raw Result:", result);
    
    // Some GAS scripts might return 'id' or 'fileId'
    const finalId = result?.fileId || result?.id;
    if (finalId) {
      return { ...result, fileId: finalId };
    }
    
    return result; 
  } catch (error) {
    console.error("Error uploading file to GAS bridge:", error);
    throw error;
  }
}

/**
 * Find a subfolder by name within a parent folder.
 */
export async function findSubfolderByName(parentFolderId: string, name: string): Promise<string | null> {
  if (!API_KEY) return null;
  const query = `'${parentFolderId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error finding subfolder:", error);
    return null;
  }
}

/**
 * Automates the creation of a customer folder hierarchy in Google Drive.
 * 1. Main folder: [CustomerNumber] - [CustomerName]
 * 2. Subfolders: Orders, Delivery Notes, Accounting Documents
 * 3. Metadata: info.txt with contact details
 */
export async function createCustomerFolderHierarchy(
  customerNumber: string, 
  customerName: string, 
  contactInfo: { contactPerson: string, phoneNumber: string }
): Promise<any> {
  try {
    const payload = {
      action: 'createCustomerFolder',
      customerNumber,
      customerName,
      contactPerson: contactInfo.contactPerson,
      phoneNumber: contactInfo.phoneNumber
    };

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`GAS folder creation failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating customer folder hierarchy אחי:", error);
    throw error;
  }
}

/**
 * Helper to convert orders to a CSV string with Hebrew support (BOM).
 */
export function jsonToCsv(orders: Order[]): string {
  const headers = [
    'מזהה',
    'מספר הזמנה',
    'תאריך',
    'שעה',
    'שם לקוח',
    'יעד',
    'נהג',
    'סטטוס',
    'תכולה',
    'סניף מחסן',
    'הערות'
  ];

  const rows = orders.map(order => [
    order.id || '',
    order.orderNumber || '',
    order.date || '',
    order.time || '',
    order.customerName || '',
    order.destination || '',
    order.driverId || '',
    order.status || '',
    (order.items || '').replace(/"/g, '""'),
    order.warehouse || '',
    (order.notes || '').replace(/"/g, '""')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
  ].join('\n');

  // Prepend UTF-8 BOM to support Hebrew in Excel
  return '\uFEFF' + csvContent;
}

/**
 * Upload orders as a CSV Backup file to Google Drive.
 */
export async function uploadCsvBackupToDrive(orders: Order[], token: string): Promise<{ fileId: string; name: string }> {
  const todayStr = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
  const fileName = `גיבוי_הזמנות_${todayStr}.csv`;
  const csvData = jsonToCsv(orders);

  const metadata = {
    name: fileName,
    mimeType: 'text/csv'
  };

  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/csv; charset=UTF-8\r\n\r\n' +
    csvData +
    closeDelimiter;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to upload CSV backup to Google Drive:", errorText);
    throw new Error(`שגיאת דרייב: ${response.statusText} (${response.status})`);
  }

  const result = await response.json();
  return {
    fileId: result.id,
    name: result.name
  };
}
