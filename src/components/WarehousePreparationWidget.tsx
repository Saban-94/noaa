import React, { useMemo, useState } from 'react';
import { 
  Package, 
  Check, 
  Search, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Building2, 
  ClipboardList,
  Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../types';
import { parseItems, isKnownProduct } from '../lib/utils';

interface WarehousePreparationWidgetProps {
  orders: Order[];
}

interface ItemDemandSource {
  orderId: string;
  orderNumber: string;
  customerName: string;
  quantity: number;
  status: Order['status'];
  warehouse: string;
}

interface AggregatedItem {
  name: string;
  sku: string;
  totalQuantity: number;
  demands: ItemDemandSource[];
  isSpecificProduct: boolean;
}

const getItemEmoji = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('מלט') || n.includes('טיח') || n.includes('סיד') || n.includes('בי ג׳י')) return '🧱';
  if (n.includes('חול') || n.includes('סומסום') || n.includes('עדש')) return '⏳';
  if (n.includes('בלוק') || n.includes('איטונג')) return '🏢';
  if (n.includes('בידוד') || n.includes('קלקר')) return '🪵';
  if (n.includes('גבס') || n.includes('לוח')) return '📑';
  if (n.includes('דבק') || n.includes('סילר')) return '🧪';
  if (n.includes('ברזל') || n.includes('רשת') || n.includes('אלמנט')) return '⛓️';
  if (n.includes('כלי') || n.includes('פטיש') || n.includes('מברג')) return '🛠️';
  return '📦';
};

export const WarehousePreparationWidget: React.FC<WarehousePreparationWidgetProps> = ({ orders }) => {
  const [filterMode, setFilterMode] = useState<'open' | 'all'>('open');
  const [warehouseFilter, setWarehouseFilter] = useState<'all' | 'החרש' | 'התלמיד'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // 1. Group & Aggregate Items
  const aggregatedItems = useMemo(() => {
    const map: Record<string, AggregatedItem> = {};

    orders.forEach(order => {
      // Filter by status: open is 'pending' | 'preparing' | 'ready'
      if (filterMode === 'open' && (order.status === 'delivered' || order.status === 'cancelled')) {
        return;
      }

      // Filter by warehouse
      if (warehouseFilter !== 'all' && order.warehouse !== warehouseFilter) {
        return;
      }

      const parsed = parseItems(order.items || '');
      parsed.forEach(item => {
        const qtyNum = parseInt(item.quantity) || 1;
        // Clean and unify item name
        const cleanName = item.name.trim();
        if (!cleanName) return;

        const key = `${cleanName}_${item.sku}`;

        if (!map[key]) {
          map[key] = {
            name: cleanName,
            sku: item.sku,
            totalQuantity: 0,
            demands: [],
            isSpecificProduct: isKnownProduct(cleanName)
          };
        }

        map[key].totalQuantity += qtyNum;
        map[key].demands.push({
          orderId: order.id || '',
          orderNumber: order.orderNumber || 'ללא מספר',
          customerName: order.customerName || 'לקוח כללי',
          quantity: qtyNum,
          status: order.status,
          warehouse: order.warehouse || 'החרש'
        });
      });
    });

    // Convert map to array and apply search filter
    return Object.values(map)
      .filter(item => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) || 
          item.sku.includes(query) ||
          item.demands.some(d => d.customerName.toLowerCase().includes(query) || d.orderNumber.includes(query))
        );
      })
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [orders, filterMode, warehouseFilter, searchQuery]);

  // Status mapping for visual cues
  const statusConfig = {
    pending: { label: 'ממתין ⏳', bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
    preparing: { label: 'בהכנה 🔨', bg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' },
    ready: { label: 'מוכן למסירה 📦', bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400' },
    delivered: { label: 'נמסר ✅', bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
    cancelled: { label: 'בוטל ❌', bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' }
  };

  const toggleCheck = (name: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleResetChecks = () => {
    if (window.confirm('האם אתה בטוח שברצונך לאפס את רשימת הפריטים שהוכנו?')) {
      setCheckedItems({});
    }
  };

  const totalTypesCount = aggregatedItems.length;
  const checkedTypesCount = aggregatedItems.filter(item => checkedItems[item.name]).length;
  const progressPercent = totalTypesCount > 0 ? Math.round((checkedTypesCount / totalTypesCount) * 100) : 0;

  return (
    <motion.div
      id="warehouse-preparation-widget"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[2.5rem] border border-sky-100/30 dark:border-slate-800/40 shadow-xl text-right"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-sky-500 to-indigo-500 text-white rounded-2.5xl shadow-md min-w-[50px] flex items-center justify-center">
            <Layers size={22} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-base font-black text-gray-950 dark:text-gray-50 flex items-center gap-2">
              ריכוז פריטים לניפוק במחסן 🏭
            </h4>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              ניתוח פריטים מצטבר מכל ההזמנות כדי לעזור למחסנאים להעמיס ולהכין את הסחורה בהתאם למלאים
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
          {Object.keys(checkedItems).length > 0 && (
            <button
              onClick={handleResetChecks}
              className="p-2 text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 border border-rose-100/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title="איפוס פריטים שהוכנו"
            >
              <RotateCcw size={13} />
              <span>אפס סימונים</span>
            </button>
          )}

          {/* Status Segment */}
          <div className="flex bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-1 border border-gray-200/50 dark:border-gray-800">
            <button
              onClick={() => setFilterMode('open')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterMode === 'open' 
                  ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              רק פתוחות ⏳
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                filterMode === 'all' 
                  ? 'bg-white dark:bg-gray-700 text-sky-600 dark:text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              כל ההזמנות 📋
            </button>
          </div>

          {/* Warehouse Segment */}
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value as any)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-1.5 text-xs font-black text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"
          >
            <option value="all">כל המחסנים 🌎</option>
            <option value="החרש">סניף החרש 🏭</option>
            <option value="התלמיד">סניף התלמיד 🏗️</option>
          </select>
        </div>
      </div>

      {/* Instant Search Bar */}
      <div className="relative mb-5">
        <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
          <Search size={15} />
        </div>
        <input
          type="text"
          placeholder="חפש פריט, מק״ט, או שם לקוח בריכוז..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 dark:bg-gray-800/20 border border-slate-150 dark:border-gray-800/40 rounded-2xl pr-10 pl-4 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-gray-800/55 transition-all"
        />
      </div>

      {/* Progress Bar indicator */}
      {totalTypesCount > 0 && (
        <div className="mb-4 bg-sky-50/40 dark:bg-sky-950/10 border border-sky-100/10 rounded-2xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-sky-700 dark:text-sky-400">התקדמות הכנת סחורה לניפוק במחסן</span>
            <span className="font-bold text-gray-500">
              {checkedTypesCount} מתוך {totalTypesCount} פריטים הוכנו במלואם ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-850 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Items List Grid */}
      {aggregatedItems.length === 0 ? (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-100 dark:border-gray-800/40 rounded-3xl flex flex-col items-center justify-center gap-2">
          <Package size={32} className="opacity-40" />
          <span className="text-xs font-bold">לא נמצאו פריטים בריכוז לניפוק בהתאם לסינונים שבחרת</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AnimatePresence>
            {aggregatedItems.map((item) => {
              const key = `${item.name}_${item.sku}`;
              const isChecked = !!checkedItems[item.name];
              const isExpanded = expandedItem === key;

              return (
                <motion.div
                  key={key}
                  layout="position"
                  className={`border rounded-3xl transition-all ${
                    isChecked 
                      ? 'bg-slate-50/50 dark:bg-gray-900/10 border-emerald-100 dark:border-emerald-950/20 opacity-75' 
                      : isExpanded 
                        ? 'bg-blue-50/10 dark:bg-sky-950/5 border-sky-200 dark:border-gray-700' 
                        : 'bg-white dark:bg-gray-900/20 border-slate-100 dark:border-gray-850 hover:border-slate-200 dark:hover:border-gray-800 shadow-sm'
                  }`}
                >
                  {/* Master row */}
                  <div className="p-4 flex items-center justify-between gap-3 select-none">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* Checkbox handler */}
                      <button
                        onClick={() => toggleCheck(item.name)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                            : 'border-slate-250 dark:border-gray-700 hover:border-sky-500 dark:hover:border-sky-400 bg-white dark:bg-gray-800'
                        }`}
                      >
                        {isChecked && <Check size={14} strokeWidth={3} />}
                      </button>

                      {/* Item Emoji & Info */}
                      <span className="text-xl" role="img" aria-label="icon">
                        {getItemEmoji(item.name)}
                      </span>
                      <div className="flex flex-col text-right overflow-hidden">
                        <span className={`text-xs font-black truncate max-w-[180px] sm:max-w-[240px] ${
                          isChecked ? 'line-through text-gray-450 dark:text-gray-500' : 'text-gray-850 dark:text-gray-105'
                        }`}>
                          {item.name}
                        </span>
                        {item.sku && (
                          <span className="text-[9px] font-mono font-bold text-gray-400 dark:text-gray-500">
                            מק״ט: {item.sku}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Badge & Extender */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 ${
                        isChecked 
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        <span>{item.totalQuantity}</span>
                        <span>יחידה</span>
                      </div>

                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : key)}
                        className="p-1.5 hover:bg-gray-150 dark:hover:bg-gray-850 rounded-lg text-gray-455 transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Demand breakdown */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-slate-100 dark:border-gray-800/80 bg-slate-50/40 dark:bg-gray-900/10 px-4 pb-4 pt-3 rounded-b-3xl space-y-2.5 overflow-hidden"
                      >
                        <div className="flex items-center gap-1 text-[9px] font-black text-gray-450 uppercase tracking-widest mb-1">
                          <ClipboardList size={11} className="text-indigo-500" />
                          <span>פירוט הזמנות דורשות ({item.demands.length}):</span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                          {item.demands.map((demand, dIdx) => (
                            <div
                              key={`${demand.orderId}_${dIdx}`}
                              className="text-[11px] bg-white dark:bg-gray-850 border border-slate-100/50 dark:border-gray-800/55 p-2 rounded-2xl flex items-center justify-between gap-3 text-right"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="font-black text-sky-600 dark:text-sky-400 min-w-[32px] flex-shrink-0">
                                  #{demand.orderNumber}
                                </span>
                                <span className="text-gray-650 dark:text-gray-300 truncate font-bold" title={demand.customerName}>
                                  {demand.customerName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${statusConfig[demand.status]?.bg || 'bg-gray-50 text-gray-500'}`}>
                                  {statusConfig[demand.status]?.label || demand.status}
                                </span>
                                {warehouseFilter === 'all' && (
                                  <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-100/20 p-0.5 rounded">
                                    {demand.warehouse}
                                  </span>
                                )}
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                  {demand.quantity} יח׳
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};
