import React, { useState } from 'react';
import { 
  CloudUpload, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Sparkles,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanAndParseComaxOrders, ParseResult, triggerManualEmailScan } from '../services/comaxParserService';

interface ComaxInboxScannerProps {
  onAddToast: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

export const ComaxInboxScanner: React.FC<ComaxInboxScannerProps> = ({ onAddToast }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanResults, setScanResults] = useState<ParseResult[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [successfullyProcessed, setSuccessfullyProcessed] = useState<number>(0);

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanResults([]);
    setHasScanned(false);
    setScanStep('בודק מיילים חדשים...');

    try {
      // Phase 1: Trigger Google Apps Script Web App manually
      onAddToast('סנכרון מייל קומקס', 'מפעיל סריקה מהירה של תיבת המייל אחי... 📧', 'info');
      await triggerManualEmailScan();

      // Phase 2: Wait 2.5 seconds for Google Drive file indexing/propagation
      setScanStep('מסתנכרן עם Drive...');
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Phase 3: Run existing Drive folder checking & Gemini parsing logic
      setScanStep('מנתח מסמכים עם AI...');
      onAddToast('סריקת קומקס', 'מתחילה לקרוא קבצי PDF חדשים ולפענח באמצעות Gemini! 🧠', 'info');
      
      const results = await scanAndParseComaxOrders();
      setScanResults(results);
      setHasScanned(true);

      const successCount = results.filter(r => r.status === 'success').length;
      if (successCount > 0) {
        setSuccessfullyProcessed(prev => prev + successCount);
      }
      const skippedCount = results.filter(r => r.status === 'skipped').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      if (successCount > 0) {
        onAddToast(
          'קליטת הזמנות הושלמה!', 
          `קלטתי בהצלחה ${successCount} הזמנות חדשות מהמייל לקבוצת pending! אש עליך אחי 🔥`, 
          'success'
        );
      } else if (failedCount > 0 && successCount === 0) {
        onAddToast(
          'סריקה הסתיימה עם שגיאות', 
          `לא הצלחתי לפענח ${failedCount} קבצים אחי. בדוק את דוח השגיאות למטה.`, 
          'warning'
        );
      } else if (skippedCount > 0) {
        onAddToast(
          'אין הזמנות חדשות', 
          `נסרק בהצלחה, אך כל ${skippedCount} הקבצים כבר יובאו בעבר אחי.`, 
          'info'
        );
      } else {
        onAddToast(
          'אין הזמנות חדשות', 
          'לא נמצאו קבצי PDF חדשים בתיקייה לסריקה אחי.', 
          'info'
        );
      }
    } catch (err: any) {
      console.error("Scanning process failed:", err);
      onAddToast(
        'שגיאה בסריקת המייל', 
        `לא הצלחתי לסיים את סריקת קומקס אחי: ${err?.message || String(err)}`, 
        'warning'
      );
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  return (
    <div 
      id="comax-scanner-card" 
      className="p-6 rounded-3xl border border-sky-100/30 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl shadow-xl space-y-6 text-right"
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100/10 dark:border-gray-800/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-100/40 dark:border-sky-900/40">
            <Inbox size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-tight">סנכרון תיבת קומקס (Comax ERP)</h3>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-1">
              פיענוח אוטומטי של אישורי הזמנה ומסמכי PDF באמצעות מנוע ה-AI של Gemini
            </p>
          </div>
        </div>
        
        {/* Premium Glassmorphic Scan Button */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <motion.button
            id="comax-scan-btn"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleScan}
            disabled={isScanning}
            className="relative overflow-hidden flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:from-sky-700 active:to-blue-700 text-white rounded-2xl font-black text-sm shadow-md shadow-sky-600/10 hover:shadow-sky-600/20 transition-all font-sans disabled:opacity-50 disabled:cursor-not-allowed border border-sky-500/20 backdrop-blur-sm min-w-[240px]"
          >
            {isScanning ? (
              <Loader2 className="animate-spin text-white animate-normal" size={18} />
            ) : (
              <CloudUpload size={18} />
            )}
            <span>{isScanning ? scanStep : 'סרוק הזמנות חדשות מהמייל'}</span>
            
            {successfullyProcessed > 0 && (
              <span className="absolute -top-1 -left-1 bg-green-500 text-white font-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-white shadow-sm shadow-green-500/30">
                {successfullyProcessed}
              </span>
            )}
          </motion.button>

          {successfullyProcessed > 0 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="hidden md:flex items-center gap-1 px-3 py-1 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 text-xs font-black rounded-xl"
            >
              <CheckCircle2 size={13} />
              <span>יובאו בסה״כ: {successfullyProcessed}</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Detailed Scan Progress / Summary */}
      <AnimatePresence>
        {hasScanned && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            id="scan-results-panel"
            className="space-y-3"
          >
            <div className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-950/35 px-4 py-2.5 rounded-xl border border-gray-100/10 dark:border-gray-800/30">
              <span className="text-xs font-black text-gray-500 dark:text-gray-400">סטטוס מסמכים שנסרקו:</span>
              <div className="flex gap-3 text-[11px] font-bold">
                <span className="text-green-600 dark:text-green-400">
                  {scanResults.filter(r => r.status === 'success').length} נקלטו
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  {scanResults.filter(r => r.status === 'skipped').length} דולגו
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {scanResults.filter(r => r.status === 'failed').length} נכשלו
                </span>
              </div>
            </div>

            {scanResults.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 font-bold">
                התיקייה ריקה אחי! ייצא הזמנה מקומקס למייל ותנסה שוב. 📁
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {scanResults.map((result, idx) => (
                  <motion.div
                    key={`${result.fileId}-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100/50 dark:border-gray-800/20 bg-white/40 dark:bg-gray-900/40 text-xs transition-all hover:bg-white/80 dark:hover:bg-gray-900/80"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        {result.status === 'success' && <CheckCircle2 className="text-green-500" size={16} />}
                        {result.status === 'skipped' && <AlertTriangle className="text-amber-500" size={16} />}
                        {result.status === 'failed' && <HelpCircle className="text-red-500" size={16} />}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800 dark:text-gray-200 line-clamp-1 max-w-xs">{result.fileName}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {result.status === 'success' && `שויך הזמנה לחשבון: ${result.customerName || 'לא ידוע'}`}
                          {result.status === 'skipped' && result.error}
                          {result.status === 'failed' && `שגיאה: ${result.error}`}
                        </p>
                      </div>
                    </div>

                    <div>
                      {result.status === 'success' && (
                        <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/30 rounded-lg text-[10px] font-black">
                          מס׳ {result.orderNumber || 'נקלט'}
                        </span>
                      )}
                      {result.status === 'skipped' && (
                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-lg text-[10px] font-black">
                          קיים
                        </span>
                      )}
                      {result.status === 'failed' && (
                        <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg text-[10px] font-black">
                          נכשל
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
