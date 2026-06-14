import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Truck, 
  Info, 
  Clock, 
  CheckCircle2, 
  CheckCircle, 
  Sparkles, 
  Send, 
  User,
  LogOut,
  Pencil,
  AlertCircle,
  Trash2,
  Share2,
  RotateCcw,
  Eye,
  FileText,
  FileUp,
  Loader2,
  Paperclip,
  Package,
  X,
  ExternalLink,
  ChevronLeft,
  MapPin,
  Copy,
  Check,
  Navigation
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { predictOrderEta } from '../services/auraService';
import { Order, Driver } from '../types';
import { highlightText, parseItems, isKnownProduct, cn } from '../lib/utils';

export const StatusBadge = ({ status }: { status: Order['status'] }) => {
  const configs = {
    pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'ממתין' },
    preparing: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Truck, label: 'בהכנה' },
    ready: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: 'מוכן' },
    delivered: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, label: 'סופק' },
    cancelled: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle, label: 'בוטל' },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${config.color} shadow-sm uppercase tracking-tight`}>
      <Icon size={12} strokeWidth={3} />
      {config.label}
    </span>
  );
};

export const getTimeRangeLabel = (timeStr?: string) => {
  if (!timeStr) return null;
  const [hourStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  if (!isNaN(hour)) {
    if (hour >= 6 && hour < 12) return { label: 'בוקר', emoji: '🌅', color: 'bg-amber-50/80 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100/50' };
    if (hour >= 12 && hour < 16) return { label: 'צהריים', emoji: '☀️', color: 'bg-orange-50/80 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border-orange-100/50' };
    if (hour >= 16 || hour < 6) return { label: 'אחה"צ', emoji: '🌇', color: 'bg-indigo-50/80 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100/50' };
  }
  return null;
};

interface OrderCardProps {
  order: Order;
  drivers: Driver[];
  onEdit: (o: Order) => void;
  onUpdateStatus: (id: string, s: any) => void;
  onUpdateEta: (id: string, eta: string) => void;
  onDelete: (id: string) => void;
  onRepeat: (o: Order) => void;
  onAddToast: (title: string, msg: string, type?: any) => void;
  allOrders: Order[];
  searchQuery?: string;
  onUploadDoc?: (file: File, orderId?: string, docType?: any) => Promise<void>;
  isCompact?: boolean;
  key?: React.Key;
}

const ItemsModal = ({ 
  order, 
  onClose 
}: { 
  order: Order, 
  onClose: () => void 
}) => {
  const parsedItems = parseItems(order.items);
  
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
      >
        <div className="flex items-center justify-between p-6 bg-gray-900 text-white">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-sky-500 rounded-2xl shadow-lg ring-4 ring-sky-500/20">
               <Package size={20} />
             </div>
             <div>
               <h2 className="text-xl font-black leading-tight">פירוט פריטי הזמנה</h2>
               <p className="text-[10px] font-bold text-sky-200 uppercase tracking-widest leading-none mt-1">
                 {order.customerName} | #{order.orderNumber || order.id?.slice(-4).toUpperCase()}
               </p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-12 text-center">כמות</th>
                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">תיאור פריט</th>
                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-24 text-left">מק"ט</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {parsedItems.map((item, idx) => (
                <tr key={idx} className="group hover:bg-sky-50/50 transition-colors">
                  <td className="py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-black shadow-sm group-hover:bg-sky-600 transition-colors">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <p className={cn(
                      "text-sm font-black leading-tight",
                      isKnownProduct(item.name) ? "text-sky-600" : "text-gray-900"
                    )}>
                      {item.name}
                    </p>
                  </td>
                  <td className="py-4 text-left">
                    {item.sku ? (
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                        {item.sku}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 italic">לא צוין</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {parsedItems.length === 0 && (
            <div className="py-12 text-center">
              <Package size={48} className="mx-auto text-gray-100 mb-4" />
              <p className="text-gray-400 font-bold">אין פריטים להצגה אחי</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-widest">סה"כ {parsedItems.length} שורות פריטים</p>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all shadow-sm"
          >
            סיימתי לצפות אחי
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const DocumentSheet = ({ 
  order, 
  onClose, 
  onUpload 
}: { 
  order: Order, 
  onClose: () => void,
  onUpload?: (file: File, type: 'orderForm' | 'deliveryNote') => Promise<void>
}) => {
  const [isUploading, setIsUploading] = useState<'orderForm' | 'deliveryNote' | null>(null);
  const getDriveUrl = (id: string) => id === 'PENDING_SCAN' ? '#' : `https://drive.google.com/file/d/${id}/view`;
  const isPending = (id?: string) => id === 'PENDING_SCAN';
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'orderForm' | 'deliveryNote') => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      setIsUploading(type);
      try {
        await onUpload(file, type);
      } finally {
        setIsUploading(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex overflow-hidden" dir="rtl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
      />
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-sm bg-white shadow-2xl flex flex-col h-full ml-auto"
      >
        <div className="flex items-center justify-between p-6 border-bottom border-gray-100 bg-sky-50/30">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-sky-600 text-white rounded-2xl shadow-lg ring-4 ring-sky-50">
               <FileText size={20} />
             </div>
             <div>
               <h2 className="text-xl font-black text-gray-900 leading-tight">ניהול מסמכים</h2>
               <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest">הזמנה #{order.orderNumber || order.id?.slice(-4).toUpperCase()}</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Order Details Summary */}
          <div className="p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100 flex flex-col gap-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">לקוח</span>
            <p className="text-base font-black text-gray-900">{order.customerName}</p>
            <p className="text-xs font-bold text-gray-500">{order.destination}</p>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Paperclip size={16} className="text-sky-500" />
              קבצים מצורפים
            </h3>

            {/* Document Types */}
            {[
              { id: order.orderFormId, type: 'orderForm', label: 'טופס הזמנה', themeColor: 'sky' },
              { id: order.deliveryNoteId, type: 'deliveryNote', label: 'תעודת משלוח', themeColor: 'emerald' }
            ].map((doc) => (
              <div key={doc.type} className="group relative">
                <div className={`p-5 rounded-[2rem] border transition-all duration-300 ${
                  doc.id ? 
                  `bg-white border-${doc.themeColor}-100 shadow-md` : 
                  'bg-gray-50 border-dashed border-gray-200 opacity-80'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl ${
                        doc.id ? `bg-${doc.themeColor}-100 text-${doc.themeColor}-600` : 'bg-gray-200 text-gray-400'
                      }`}>
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900">{doc.label}</h4>
                        <p className="text-[10px] font-bold text-gray-400">PDF Document</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {doc.id ? (
                      isPending(doc.id) ? (
                        <div className={`flex items-center gap-3 p-3 bg-${doc.themeColor}-50/50 rounded-2xl border border-${doc.themeColor}-100 animate-pulse`}>
                          <Loader2 size={16} className="animate-spin text-sky-600" />
                          <span className={`text-xs font-bold text-${doc.themeColor}-700`}>מעבד את המסמך אחי...</span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <a 
                            href={getDriveUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex-1 flex items-center justify-center gap-2 py-3 bg-${doc.themeColor}-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-${doc.themeColor}-600/20 hover:scale-[1.02] active:scale-95 transition-all`}
                          >
                            <ExternalLink size={14} /> צפייה בקובץ
                          </a>
                        </div>
                      )
                    ) : (
                      <p className="text-[11px] font-bold text-gray-400 italic bg-gray-100/50 p-3 rounded-xl border border-gray-200">אין מסמך מצורף להזמנה זו</p>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest decoration-sky-500 decoration-2 underline-offset-4 decoration-dotted">עדכון קובץ</span>
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer shadow-sm ${
                        isUploading === doc.type ? 
                        `bg-${doc.themeColor}-50 border-${doc.themeColor}-200` : 
                        'bg-white border-gray-100 hover:border-sky-300 hover:bg-sky-50 text-sky-600'
                      }`}>
                        {isUploading === doc.type ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <FileUp size={14} />
                            <span className="text-[10px] font-black">העלה חדש</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="application/pdf" 
                          className="hidden" 
                          disabled={!!isUploading}
                          onChange={(e) => handleFileChange(e, doc.type as any)} 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
           <button 
             onClick={onClose}
             className="w-full py-4 bg-white border border-gray-200 text-gray-600 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-100 transition-all hover:shadow-md"
           >
             סגור תצוגה
           </button>
        </div>
      </motion.div>
    </div>
  );
};

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'ממתין', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  preparing: { label: 'בהכנה', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ready: { label: 'מוכן', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  delivered: { label: 'סופק', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/30' },
  cancelled: { label: 'בוטל', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
};

const formatHistoryTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
};

export const OrderCard = ({ 
  order, 
  drivers,
  onEdit, 
  onUpdateStatus, 
  onUpdateEta,
  onDelete,
  onRepeat,
  onAddToast,
  allOrders,
  searchQuery = '',
  onUploadDoc,
  isCompact = false
}: OrderCardProps) => {
  const [isPredicting, setIsPredicting] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [isLocalUploading, setIsLocalUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showNavOptions, setShowNavOptions] = useState(false);
  const [isStatusPulsing, setIsStatusPulsing] = useState(false);
  const [pulseColor, setPulseColor] = useState<'emerald' | 'sky' | 'amber' | 'rose' | 'gray'>('gray');
  const prevStatusRef = useRef(order.status);

  useEffect(() => {
    if (prevStatusRef.current !== order.status) {
      let color: 'emerald' | 'sky' | 'amber' | 'rose' | 'gray' = 'gray';
      if (order.status === 'ready') color = 'emerald';
      else if (order.status === 'delivered') color = 'sky';
      else if (order.status === 'preparing') color = 'amber';
      else if (order.status === 'cancelled') color = 'rose';

      setPulseColor(color);
      setIsStatusPulsing(true);
      const timer = setTimeout(() => {
        setIsStatusPulsing(false);
      }, 2500);
      prevStatusRef.current = order.status;
      return () => clearTimeout(timer);
    }
  }, [order.status]);

  const parsedItems = parseItems(order.items);
  const parsedItemsCount = parsedItems.length;
  const totalItemsQty = parsedItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0);

  const isOverdue = (() => {
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return false;
    }
    try {
      if (!order.date) return false;
      const [year, month, day] = order.date.split('-').map(Number);
      const [hour, min] = (order.time || '23:59').split(':').map(Number);
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const targetDate = new Date(year, month - 1, day, isNaN(hour) ? 23 : hour, isNaN(min) ? 59 : min);
        const now = new Date();
        return targetDate < now;
      }
    } catch (err) {
      console.error("Error calculating overdue status:", err);
    }
    return false;
  })();

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadDoc) {
      setIsLocalUploading(true);
      try {
        await onUploadDoc(file, order.id, 'orderForm');
      } finally {
        setIsLocalUploading(false);
      }
    }
  };

  const handleSmartPredict = async () => {
    setIsPredicting(true);
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(() => {});
      }
      const historicalOrders = allOrders.filter(o => o.status === 'delivered');
      const predictedEta = await predictOrderEta(order, historicalOrders);
      if (predictedEta) {
        onUpdateEta(order.id!, predictedEta);
        onAddToast('חיזוי ETA חכם', `נמצא זמן הגעה משוער: ${predictedEta} על סמך תנועה אחי`, 'success');
      } else {
        onAddToast('שגיאה בחיזוי', 'לא הצלחתי לחשב זמן הגעה, תנסה שוב שותף', 'warning');
      }
    } catch (error) {
      console.error(error);
      onAddToast('שגיאה', 'משהו השתבש בחיבור ל-AI', 'warning');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleShare = () => {
    const driver = drivers.find(d => d.id === order.driverId);
    const driverName = driver?.name || order.driverId;
    const statusHebrew: Record<string, string> = {
      pending: 'ממתין',
      preparing: 'בהכנה',
      ready: 'מוכן',
      delivered: 'סופק',
      cancelled: 'בוטל'
    };
    const text = `📦 *הזמנה #${order.orderNumber || order.id?.slice(-4).toUpperCase()}*\n👤 לקוח: ${order.customerName}\n📍 יעד: ${order.destination}\n🚛 נהג: ${driverName}\n⏰ שעה: ${order.time}\n📊 סטטוס: ${statusHebrew[order.status] || order.status}`;
    
    if (navigator.share) {
      navigator.share({ title: 'שיתוף הזמנה', text }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      onAddToast('הועתק', 'פרטי ההזמנה הועתקו ללוח אחי', 'success');
    }
  };

  const driver = drivers.find(d => d.id === order.driverId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="relative overflow-hidden rounded-[2rem] w-full"
    >
      {/* Swipe action background indicators */}
      <div className="absolute inset-0 flex items-center justify-between rounded-[2rem] pointer-events-none px-6 bg-slate-100 dark:bg-gray-950/40 border border-slate-200/50 dark:border-gray-800/80">
        {/* Left Indicator - Revealed when swiping right (drag: x > 0) */}
        <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-500/5 px-4 py-3 rounded-2xl text-emerald-600 dark:text-emerald-400 font-extrabold text-xs border border-emerald-500/20">
          <CheckCircle2 size={16} className="animate-bounce" />
          <span>סמן כסופק אחי ✓</span>
        </div>

        {/* Right Indicator - Revealed when swiping left (drag: x < 0) */}
        <div className="flex items-center gap-2 bg-rose-500/10 dark:bg-rose-500/5 px-4 py-3 rounded-2xl text-rose-600 dark:text-rose-400 font-extrabold text-xs border border-rose-500/20">
          <span>מחיקת הזמנה ✗</span>
          <Trash2 size={16} className="animate-pulse" />
        </div>
      </div>

      {/* Draggable main card content */}
      <motion.div 
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -160, right: 160 }}
        dragElastic={0.2}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 25 }}
        onDragEnd={(_event, info) => {
          const swipeThreshold = 130; // Threshold in pixels for activating swipe actions
          if (info.offset.x > swipeThreshold) {
            // Swipe Right to Complete (Status: Delivered)
            if (order.status !== 'delivered') {
              onUpdateStatus(order.id!, 'delivered');
              onAddToast('הושלם בהצלחה אחי', `${order.customerName} - ההזמנה סומנה כסופקה!`, 'success');
            } else {
              onAddToast('כבר סופק', 'ההזמנה הזו כבר סופקה אחי!', 'info');
            }
          } else if (info.offset.x < -swipeThreshold) {
            // Swipe Left to Delete (Delete order)
            if (window.confirm(`האם אתה בטוח שברצונך למחוק את ההזמנה של ${order.customerName} אחי?`)) {
              onDelete(order.id!);
              onAddToast('נמחק', 'ההזמנה נמחקה בהצלחה', 'info');
            }
          }
        }}
        whileHover={{ 
          scale: 1.018, 
          y: -4,
          transition: { type: 'spring', stiffness: 400, damping: 22 }
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button, label, input, a, select')) {
            return;
          }
          setIsExpanded(!isExpanded);
        }}
        className={cn(
          "order-card backdrop-blur-sm rounded-[2rem] border shadow-md transition-all duration-300 relative group cursor-pointer bg-white dark:bg-gray-900",
          isStatusPulsing
            ? {
                emerald: "ring-4 ring-emerald-500/60 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-[0_0_25px_rgba(16,185,129,0.5)] scale-[1.01] animate-pulse",
                sky: "ring-4 ring-sky-500/60 border-sky-500 bg-sky-50/30 dark:bg-sky-950/20 shadow-[0_0_25px_rgba(14,165,233,0.5)] scale-[1.01] animate-pulse",
                amber: "ring-4 ring-amber-500/60 border-amber-500 bg-amber-50/30 dark:bg-amber-950/20 shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-[1.01] animate-pulse",
                rose: "ring-4 ring-rose-500/60 border-rose-500 bg-rose-50/30 dark:bg-rose-950/20 shadow-[0_0_25px_rgba(244,63,94,0.5)] scale-[1.01] animate-pulse",
                gray: "ring-4 ring-slate-500/60 border-slate-500 bg-slate-50/20 dark:bg-slate-950/20 shadow-[0_0_25px_rgba(100,116,139,0.4)] scale-[1.01] animate-pulse",
              }[pulseColor]
            : isOverdue 
              ? "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:shadow-[0_22px_45px_rgba(244,63,94,0.22)] dark:hover:shadow-[0_22px_45px_rgba(244,63,94,0.12)] hover:border-rose-300 dark:hover:border-rose-500/50" 
              : "bg-white/95 dark:bg-gray-900/90 border-sky-100 dark:border-gray-800 hover:shadow-[0_22px_45px_rgba(14,165,233,0.22)] dark:hover:shadow-[0_22px_45px_rgba(56,189,248,0.12)] hover:border-sky-300 dark:hover:border-sky-500/50",
          isCompact ? "p-4" : "p-5"
        )}
      >
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute bg-gray-900 text-white px-3 py-1 rounded-full text-[10px] font-black z-10 shadow-lg",
              isCompact ? "top-2 left-2" : "top-4 left-4"
            )}
          >
            #{order.orderNumber || order.id?.slice(-4).toUpperCase()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Status Badge Top Right */}
      <div className={cn(
        "absolute z-10 flex items-center gap-2",
        isCompact ? "top-2 right-2" : "top-4 right-4"
      )}>
        {isOverdue && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="flex items-center justify-center p-1.5 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400 rounded-full shadow-sm"
            title="עבר זמן היעד של ההזמנה אחי!"
          >
            <AlertCircle size={14} className="animate-pulse flex-shrink-0" />
          </motion.div>
        )}
        <StatusBadge status={order.status} />
      </div>

      {!isCompact && (
        <div className="absolute top-4 left-24 z-10 flex gap-2">
          {onUploadDoc && (
            <div className="flex items-center gap-2">
              {(order.orderFormId || order.deliveryNoteId) ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDocs(!showDocs);
                  }}
                  disabled={order.orderFormId === 'PENDING_SCAN' || order.deliveryNoteId === 'PENDING_SCAN'}
                  className={`p-1.5 rounded-full shadow-lg border transition-all ${
                    showDocs ? 'bg-sky-600 text-white border-sky-600' : 
                    (order.orderFormId === 'PENDING_SCAN' || order.deliveryNoteId === 'PENDING_SCAN') ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed' :
                    'bg-white text-sky-600 border-sky-100 hover:bg-sky-50'
                  }`}
                  title={order.orderFormId === 'PENDING_SCAN' || order.deliveryNoteId === 'PENDING_SCAN' ? "מעבד מסמכים..." : "צפה במסמכים"}
                >
                  {order.orderFormId === 'PENDING_SCAN' || order.deliveryNoteId === 'PENDING_SCAN' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Eye size={14} strokeWidth={3} />
                  )}
                </button>
              ) : (
                <label 
                  className={`p-1.5 rounded-full shadow-lg border transition-all cursor-pointer ${
                    isLocalUploading ? 'bg-sky-50 border-sky-200 text-sky-400' : 'bg-white text-sky-600 border-sky-100 hover:bg-sky-50'
                  }`}
                  title="העלאת מסמך מהיר"
                >
                  {isLocalUploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileUp size={14} strokeWidth={3} />
                  )}
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    className="hidden" 
                    disabled={isLocalUploading}
                    onChange={handleQuickUpload}
                  />
                </label>
              )}
            </div>
          )}

          <AnimatePresence>
            {showDocs && (
              <DocumentSheet 
                order={order} 
                onClose={() => setShowDocs(false)} 
                onUpload={(file, type) => onUploadDoc ? onUploadDoc(file, order.id, type) : Promise.resolve()}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Top spacing to offset elements absolute layout */}
      <div className={cn("w-full", isCompact ? "h-6 mb-2" : "h-9 mb-3")} />

      {/* Internal Details 2-Column Grid Layout */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-right">
        {/* Column 1: Client & Destination */}
        <div className="bg-sky-50/25 dark:bg-sky-950/15 p-3 rounded-2xl border border-sky-100/30 dark:border-sky-950/30 flex flex-col justify-between min-w-0 shadow-[inset_0_1px_3px_rgba(14,165,233,0.01)]">
          <div className="mb-1 min-w-0">
            <div className="flex items-center justify-between mb-1" dir="rtl">
              <span className="text-[9px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider block">לקוח ויעד</span>
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-sky-500"
              >
                <ChevronLeft size={12} className="-rotate-90" />
              </motion.div>
            </div>
            <h3 className={cn(
              "font-black text-gray-900 dark:text-gray-100 leading-tight truncate",
              isCompact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
            )}>
              {highlightText(order.customerName, searchQuery)}
            </h3>
          </div>
          
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 mt-2 border-t border-sky-100/10 pt-1.5 overflow-hidden">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1 truncate min-w-0">
                     <MapPin size={11} className="text-sky-500 flex-shrink-0" /> 
                     <span className="truncate">{highlightText(order.destination, searchQuery)}</span>
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Navigation Dropdown Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNavOptions(!showNavOptions);
                        }}
                        className="p-1 hover:bg-sky-100/50 dark:hover:bg-sky-950/40 rounded transition-all text-sky-600 dark:text-sky-400 flex-shrink-0 flex items-center justify-center"
                        title="ניווט ליעד אחי"
                      >
                        <Navigation size={11} className={showNavOptions ? "text-sky-500 scale-110 rotate-45" : ""} />
                      </button>

                      <AnimatePresence>
                        {showNavOptions && (
                          <>
                            {/* Click-away backdrop */}
                            <div 
                              className="fixed inset-0 z-40 cursor-default" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowNavOptions(false);
                              }} 
                            />
                            {/* Floating Dropdown */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 5 }}
                              transition={{ duration: 0.15 }}
                              className="absolute bottom-full left-0 mb-1.5 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 shadow-xl rounded-xl p-1 z-50 flex flex-col gap-0.5 min-w-[130px] text-right"
                              dir="rtl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a
                                href={`https://waze.com/ul?q=${encodeURIComponent(order.destination)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setShowNavOptions(false)}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition-colors text-[10px] font-black text-gray-750 dark:text-gray-200"
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0" />
                                <span>ניווט ב-Waze אחי</span>
                              </a>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.destination)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setShowNavOptions(false)}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition-colors text-[10px] font-black text-gray-750 dark:text-gray-200 border-t border-slate-100/50 dark:border-gray-700/30"
                              >
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                <span>Google Maps</span>
                              </a>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(order.destination);
                        setIsCopied(true);
                        onAddToast('הועתק ללוח אחי', 'כתובת היעד הועתקה ללוח 📋', 'success');
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className="p-1 hover:bg-sky-100/50 dark:hover:bg-sky-950/40 rounded transition-colors text-sky-600 dark:text-sky-400 flex-shrink-0"
                      title="העתק כתובת אחי"
                    >
                      {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Column 2: Driver & Logistics */}
        <div className="bg-sky-50/25 dark:bg-sky-950/15 p-3 rounded-2xl border border-sky-100/30 dark:border-sky-950/30 flex flex-col justify-between min-w-0 shadow-[inset_0_1px_3px_rgba(14,165,233,0.01)]">
          <div className="mb-2 min-w-0">
            <span className="text-[9px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider block mb-1">מוביל ולוגיסטיקה</span>
            {order.driverId === 'self' ? (
              <span className={cn("font-black text-gray-900 dark:text-gray-100 block truncate", isCompact ? "text-xs" : "text-sm")}>איסוף עצמי</span>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                {driver?.avatar ? (
                  <img 
                    src={driver.avatar} 
                    alt={driver.name} 
                    className="w-5.5 h-5.5 rounded-full object-cover border border-white dark:border-gray-800 shadow-sm flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5.5 h-5.5 rounded-full bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center border border-white dark:border-gray-800 shadow-sm text-sky-600 dark:text-sky-400 flex-shrink-0">
                    <User size={10} />
                  </div>
                )}
                <span className={cn("font-black text-gray-900 dark:text-gray-100 leading-tight truncate", isCompact ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm")}>
                  {driver?.name.split(' ')[0]}
                </span>
                {driver?.vehicleType === 'crane' && (
                  <span className="bg-amber-105 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[8px] px-1 py-0.5 rounded font-black flex-shrink-0">מנוף</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 font-bold min-w-0">
            <span className={cn(
              "flex items-center gap-1 truncate transition-colors duration-300",
              isOverdue ? "text-rose-600 dark:text-rose-400 font-extrabold" : ""
            )}>
              {isOverdue ? (
                <AlertCircle size={11} className="text-rose-600 dark:text-rose-400 animate-pulse flex-shrink-0" />
              ) : (
                <Clock size={11} className="text-sky-500 flex-shrink-0" />
              )}
              <span>{order.time}</span>
              {(() => {
                const tr = getTimeRangeLabel(order.time);
                if (!tr) return null;
                return (
                  <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg border text-[8px] font-black leading-none ml-1", tr.color)}>
                    <span>{tr.emoji}</span>
                    <span>{tr.label}</span>
                  </span>
                );
              })()}
            </span>
            {isPredicting ? (
              <span className="text-[9px] text-sky-600 dark:text-sky-400 animate-pulse flex-shrink-0">מחשב...</span>
            ) : order.eta && (
              <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 animate-pulse flex items-center gap-0.5 flex-shrink-0">
                <Sparkles size={9} />
                צפי: {order.eta}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Items Preview and Total Qty Counter - At a glance */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setShowItems(true);
        }}
        className="bg-slate-50/60 dark:bg-gray-800/20 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 px-3.5 py-2.5 rounded-[1.5rem] border border-slate-100/70 dark:border-gray-800/40 flex items-center justify-between gap-3 mb-4 transition-all duration-200 group/items-preview cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
        dir="rtl"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm border border-slate-105 dark:border-gray-700/85 group-hover/items-preview:scale-105 transition-transform flex-shrink-0">
            <Package size={14} className="text-sky-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[8px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest block leading-none mb-1">תכולת הזמנה</span>
            <p className="text-xs font-bold text-gray-750 dark:text-gray-300 truncate leading-none">
              {parsedItems.map((item, idx) => (
                <span key={idx}>
                  {idx > 0 && <span className="text-gray-300 dark:text-gray-700 mx-1.5 leading-none">|</span>}
                  <span className="text-gray-950 dark:text-white font-black">{item.quantity}x</span>{' '}
                  <span className="text-[11px] font-medium">{item.name}</span>
                </span>
              ))}
              {parsedItems.length === 0 && <span className="text-gray-400 dark:text-gray-500 italic">אין פריטים רשומים אחי</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-1 bg-gradient-to-l from-sky-500 to-sky-600 text-white font-black text-[10px] tracking-wide px-3 py-1.5 rounded-xl shadow-md transition-all group-hover/items-preview:shadow-sky-500/20 flex-shrink-0">
          <span>סה״כ פריטים:</span>
          <span className="text-xs font-black leading-none">{totalItemsQty}</span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden space-y-4 pt-1"
          >
            {!isCompact ? (
              <div className="bg-sky-50/30 p-4 rounded-[1.5rem] border border-sky-100/50 flex items-center justify-between group/items">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-sky-100 transition-transform group-hover/items:scale-110">
                      <Package size={20} className="text-sky-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-sky-700/60 uppercase tracking-widest block leading-none mb-1">תכולת משלוח</span>
                      <p className="text-xs font-black text-gray-700 leading-none">
                        תכולה: {parsedItemsCount} שורות פריטים (סה״כ {totalItemsQty} יחידות אחי)
                      </p>
                    </div>
                </div>
                
                <button 
                  onClick={() => setShowItems(true)}
                  className="px-4 py-2 bg-white text-sky-600 border border-sky-200 rounded-xl font-black text-[11px] shadow-sm hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-all active:scale-95"
                >
                  צפייה בפריטים
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowItems(true)}
                className="w-full flex items-center justify-between p-3 bg-sky-50/30 hover:bg-sky-100/50 rounded-xl border border-sky-100/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-sky-600" />
                  <span className="text-[11px] font-black text-gray-700">{parsedItemsCount} פריטים (סה״כ {totalItemsQty} יח׳)</span>
                </div>
                <ChevronLeft size={14} className="text-sky-400" />
              </button>
            )}

            {/* Status History Timeline */}
            <div className="bg-slate-50/50 dark:bg-gray-800/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-3" dir="rtl">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Clock size={14} className="text-sky-500" />
                <span className="text-[11px] font-black tracking-wide">קצב התקדמות והיסטוריה</span>
              </div>
              
              {order.statusHistory && order.statusHistory.length > 0 ? (
                <div className="relative border-r-2 border-dashed border-sky-100 dark:border-sky-900/40 pr-3 mr-1.5 space-y-3 pt-1">
                  {order.statusHistory.map((entry, index) => {
                    const meta = statusMeta[entry.status] || { label: entry.status, color: 'text-gray-600', bg: 'bg-gray-100' };
                    const timeStr = formatHistoryTime(entry.timestamp);
                    return (
                      <div key={index} className="relative flex items-center justify-between group/history">
                        {/* Dot indicator */}
                        <span className={cn(
                          "absolute right-[-17px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-900",
                          entry.status === order.status ? "bg-sky-500 scale-125 ring-4 ring-sky-500/15" : "bg-gray-300 dark:bg-gray-700"
                        )} />
                        
                        <div className="flex items-center gap-2">
                          <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider leading-none", meta.bg, meta.color)}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                            ע"י {entry.userName || 'מערכת'}
                          </span>
                        </div>
                        
                        <span className="text-[10px] font-mono leading-none text-gray-400 dark:text-gray-500 font-bold">
                          {timeStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 text-center py-1">
                  אין היסטוריית סטטוס זמינה להזמנה זו אחי.
                </div>
              )}
            </div>

            <div className={cn(
              "flex items-center gap-2 pt-2 border-t border-gray-100",
              isCompact ? "flex-wrap justify-end" : ""
            )}>
              <button 
                onClick={() => {
                  const nextStatusMap: Record<string, string> = {
                    pending: 'preparing',
                    preparing: 'ready',
                    ready: 'delivered'
                  };
                  onUpdateStatus(order.id!, nextStatusMap[order.status] || order.status);
                }}
                className={cn(
                  "bg-sky-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 active:scale-95 transition-all min-h-[44px]",
                  isCompact ? "px-4 py-2" : "flex-1 py-4"
                )}
              >
                <CheckCircle2 size={isCompact ? 16 : 18} /> 
                {isCompact ? "קדם" : "עדכן סטטוס"}
              </button>
              
              {isCompact ? (
                 <div className="flex items-center gap-1">
                   <button onClick={() => onEdit(order)} className="p-3 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center">
                     <Pencil size={16} />
                   </button>
                   <button onClick={handleShare} className="p-3 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center">
                     <Share2 size={16} />
                   </button>
                   <button 
                    onClick={() => {
                      if (window.confirm('למחוק אחי?')) onDelete(order.id!);
                    }}
                    className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
              ) : (
                <>
                  <button 
                    onClick={handleSmartPredict}
                    disabled={isPredicting}
                    className="bg-gray-900 text-white p-3.5 rounded-2xl hover:bg-sky-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-900/10 active:scale-95 disabled:opacity-50 min-h-[44px]"
                  >
                    {isPredicting ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    <span className="hidden sm:inline text-xs font-bold">AI ETA</span>
                  </button>

                  <button 
                    onClick={handleShare}
                    title="שתף הזמנה"
                    className="bg-white border-2 border-gray-100 text-gray-600 p-3.5 rounded-2xl hover:bg-sky-50 hover:text-sky-600 hover:border-sky-100 transition-all active:scale-95 shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Share2 size={18} />
                  </button>

                  <button 
                    onClick={() => onEdit(order)}
                    title="ערוך הזמנה"
                    className="p-3.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-2xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Pencil size={18} />
                  </button>

                  <button 
                    onClick={() => onRepeat(order)}
                    title="הזמנה חוזרת (שכפול)"
                    className="p-3.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <RotateCcw size={18} />
                  </button>

                  <button 
                    onClick={() => {
                      if (window.confirm('בטוח שאתה רוצה למחוק את ההזמנה לצמיתות אחי?')) {
                        onDelete(order.id!);
                      }
                    }}
                    className="p-3.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showItems && (
          <ItemsModal order={order} onClose={() => setShowItems(false)} />
        )}
      </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
