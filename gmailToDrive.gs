/**
 * SabanOS - Automated ERP (Comax) Document Pipeline
 * Standalone Google Apps Script (GAS) to sync Gmail ERP exports to Google Drive.
 * 
 * Instructions:
 * 1. Open Google Apps Script (https://script.google.com).
 * 2. Create a new project.
 * 3. Paste this code, save, and rename the project to "SabanOS Gmail Sync".
 * 4. Create a time-driven trigger to run 'gmailToDrive' every 5 or 10 minutes.
 * 
 * @authorhsaban2025@gmail.com
 */

const FOLDER_NAME = "SabanOS_New_Orders";
const GMAIL_SEARCH_QUERY = 'is:unread "שליחת מסמך בדוא\\"ל"';

function gmailToDrive() {
  Logger.log("SabanOS: Synchronizing Comax emails to Google Drive folder: " + FOLDER_NAME);
  
  // 1. Resolve or create top-level target folder
  let folder = getOrCreateFolder(FOLDER_NAME);
  
  // 2. Fetch unread threads matching the query
  let threads = GmailApp.search(GMAIL_SEARCH_QUERY);
  Logger.log("Found " + threads.length + " unread Threads matching standard Comax query.");
  
  let processedCount = 0;
  
  for (let i = 0; i < threads.length; i++) {
    let thread = threads[i];
    let messages = thread.getMessages();
    
    for (let j = 0; j < messages.length; j++) {
      let message = messages[j];
      
      // Process only unread messages
      if (message.isUnread()) {
        let attachments = message.getAttachments();
        let hasPdf = false;
        
        for (let k = 0; k < attachments.length; k++) {
          let attachment = attachments[k];
          let contentType = attachment.getContentType();
          
          // Filter only PDF attachments
          if (contentType === "application/pdf" || attachment.getName().toLowerCase().endsWith(".pdf")) {
            // Generate clean, timestamped file name to prevent collision
            let dateStr = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
            let sanitizedSubject = message.getSubject().replace(/[^a-zA-Z0-9א-ת]/g, "_").substring(0, 30);
            let originalName = attachment.getName();
            let newFileName = "comax_" + dateStr + "_" + sanitizedSubject + "_" + originalName;
            
            // Save the document to the drive folder
            let fileBlob = attachment.copyBlob();
            fileBlob.setName(newFileName);
            let driveFile = folder.createFile(fileBlob);
            
            Logger.log("Uploaded successfully: " + newFileName + " with ID: " + driveFile.getId());
            hasPdf = true;
          }
        }
        
        // Mark as read to avoid double-processing
        message.markRead();
        processedCount++;
      }
    }
    // Mark thread as read as well for UI sanity
    thread.markRead();
  }
  
  Logger.log("Sync finished. Processed messages: " + processedCount);
  return { status: "success", processedMessages: processedCount };
}

/**
 * Searches for a folder with a given name at the root of My Drive or creates it.
 */
function getOrCreateFolder(folderName) {
  let folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    Logger.log("Folder '" + folderName + "' not found. Creating a new one at the root of My Drive.");
    return DriveApp.createFolder(folderName);
  }
}
