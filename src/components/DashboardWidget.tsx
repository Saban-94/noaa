import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  BarChart3,
  CalendarDays
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Order } from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid 
} from 'recharts';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error in DashboardWidget:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Custom Premium Glassmorphic Tooltip for Recharts
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div 
        id="chart-custom-tooltip"
        className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-sky-100/30 dark:border-slate-800/50 rounded-2xl shadow-xl text-right font-sans text-xs min-w-[150px]"
        dir="rtl"
      >
        <p className="font-black text-gray-800 dark:text-gray-100 mb-1.5">{data.name}</p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">מותקנים לביצוע:</span>
          <span className="font-extrabold text-sky-600 dark:text-sky-400 text-sm">
            {data.כמות} הזמנות
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardWidget: React.FC = () => {
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Firebase Optimization: Create a specific query filtered strictly by today's date
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const path = 'orders';
    
    const q = query(
      collection(db, path),
      where('date', '==', todayStr)
    );

    // 2. Real-time sub with onSnapshot
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList: Order[] = [];
      snapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() } as Order);
      });
      setTodayOrders(ordersList);
      setLoading(false);
      setErrorMessage(null);
    }, (error) => {
      setLoading(false);
      setErrorMessage("שגיאה בטעינת נתוני ביצועים");
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err: any) {
        console.error("Parsed Error stringified:", err.message);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Derived counts are carefully memoized via useMemo to prevent unnecessary re-renders
  const counts = useMemo(() => {
    let pending = 0;
    let preparing = 0;
    let ready = 0;
    let delivered = 0;
    let cancelled = 0;

    todayOrders.forEach(o => {
      switch (o.status) {
        case 'pending':
          pending++;
          break;
        case 'preparing':
          preparing++;
          break;
        case 'ready':
          ready++;
          break;
        case 'delivered':
          delivered++;
          break;
        case 'cancelled':
          cancelled++;
          break;
        default:
          pending++; // Fallback
          break;
      }
    });

    const activeTotal = pending + preparing + ready + delivered;
    const total = todayOrders.length;
    const completionRate = activeTotal > 0 ? Math.round((delivered / activeTotal) * 100) : 0;

    return { pending, preparing, ready, delivered, cancelled, total, completionRate };
  }, [todayOrders]);

  // Aggregate comparing data specifically formatted for the Recharts Bar Chart
  const chartData = useMemo(() => {
    return [
      {
        name: 'הזמנות ממתינות',
        שם: 'ממתין ⏳',
        כמות: counts.pending,
        fillColor: '#f59e0b', // amber-500
        glowClass: 'shadow-amber-500/20'
      },
      {
        name: 'נמסר ללקוח',
        שם: 'נמסר ✅',
        כמות: counts.delivered,
        fillColor: '#10b981', // emerald-500
        glowClass: 'shadow-emerald-500/20'
      }
    ];
  }, [counts.pending, counts.delivered]);

  if (errorMessage) {
    return (
      <div 
        id="dashboard-widget-error"
        className="p-4 bg-red-50/80 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-3xl text-red-600 dark:text-red-400 text-sm font-bold text-right shadow-sm"
        dir="rtl"
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      id="dashboard-widget-wrapper"
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-4"
      dir="rtl"
    >
      {/* 3-Column Premium Quick Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* delivered counter card */}
        <div 
          id="delivered-card"
          className="relative overflow-hidden p-5 rounded-3xl border border-emerald-100/30 dark:border-emerald-900/30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-lg flex items-center justify-between text-right transition-all hover:shadow-emerald-500/5"
        >
          <div className="space-y-1 z-10">
            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">הזמנות שנמסרו היום</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                {loading ? '...' : counts.delivered}
              </h3>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">משלוחים שהושלמו</span>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100/40 dark:border-emerald-900/40 z-10">
            <CheckCircle2 size={22} />
          </div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-xl" />
        </div>

        {/* pending counter card */}
        <div 
          id="pending-card"
          className="relative overflow-hidden p-5 rounded-3xl border border-amber-100/30 dark:border-amber-900/30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-lg flex items-center justify-between text-right transition-all hover:shadow-amber-500/5"
        >
          <div className="space-y-1 z-10">
            <p className="text-xs font-black text-amber-600 dark:text-amber-400">הזמנות ממתינות לקליטה</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                {loading ? '...' : counts.pending}
              </h3>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">ממתין לסנכרון מייל/קומקס</span>
            </div>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-955/40 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100/40 dark:border-amber-900/40 z-10">
            <Clock size={22} />
          </div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-xl" />
        </div>

        {/* cumulative tracking performance card */}
        <div 
          id="performance-rate-card"
          className="relative overflow-hidden p-5 rounded-3xl border border-sky-100/30 dark:border-gray-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-lg flex items-center justify-between text-right transition-all hover:shadow-sky-500/5"
        >
          <div className="space-y-1 w-full z-10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-sky-600 dark:text-sky-400">אחוז ביצוע יומי</p>
              <div className="flex items-center gap-1 text-[10px] font-bold text-sky-500">
                <TrendingUp size={12} />
                <span>{counts.total} הזמנות סה״כ</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                {loading ? '...' : `${counts.completionRate}%`}
              </h3>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">הושלמו מול פעיל</span>
            </div>
            
            {/* visual rate meter */}
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden mt-3">
              <motion.div 
                id="progress-bar-meter"
                initial={{ width: 0 }}
                animate={{ width: `${counts.completionRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full"
              />
            </div>
          </div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-xl" />
        </div>
      </div>

      {/* Recharts Analytics Panel */}
      <div 
        id="recharts-visual-panel"
        className="relative overflow-hidden p-5 rounded-3xl border border-sky-100/20 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-lg"
      >
        <div className="flex items-center justify-between mb-4 border-b border-gray-100/50 dark:border-slate-800/50 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl">
              <BarChart3 size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-800 dark:text-gray-200">גרף ביצועים יומי</h4>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">השוואה בזמן אמת - הזמנות קומקס חדשות מול משלוחים סופיים</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
            <CalendarDays size={13} className="text-gray-300" />
            <span>היום, {format(new Date(), 'dd/MM/yyyy')}</span>
          </div>
        </div>

        {/* Real-time Recharts Component wrapping with Right-to-Left context */}
        <div className="h-[210px] w-full mt-2 font-sans" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              layout="horizontal"
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="#e2e8f015"
              />
              <XAxis 
                dataKey="שם" 
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: '700' }}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(148, 163, 184, 0.04)', radius: 16 }}
              />
              <Bar 
                dataKey="כמות" 
                radius={[12, 12, 0, 0]} 
                barSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fillColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};
