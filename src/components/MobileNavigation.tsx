import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  X, 
  LayoutGrid, 
  MessageSquare, 
  LayoutList, 
  Users, 
  Truck, 
  FileText, 
  User, 
  Moon, 
  Sun,
  FileDown,
  ChevronLeft
} from 'lucide-react';

interface MobileNavigationProps {
  currentView: string;
  onViewChange: (view: any) => void;
  user: any;
  unreadMessagesCount?: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout?: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  onViewChange,
  user,
  unreadMessagesCount = 0,
  isDarkMode,
  onToggleDarkMode,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // תפריט הגדרות וניווט מהיר
  const navItems = [
    { id: 'list', label: 'סידור עבודה', icon: LayoutList, desc: 'רשימת משימות ומשלוחים יומיים' },
    { id: 'kanban', label: 'קנבן לוגיסטי', icon: LayoutGrid, desc: 'מעקב סטטוסים ויזואלי מהיר' },
    { id: 'chat', label: 'נועה AI', icon: MessageSquare, desc: 'מוקד סיוע חכם וניתוח מסמכים' },
    { id: 'messenger', label: 'קבוצה מבצעית', icon: Users, desc: 'צ\'אט קבוצתי ועדכוני שטח', showBadge: unreadMessagesCount > 0 },
    { id: 'drivers', label: 'מצב נהגים', icon: Truck, desc: 'בקרת מיקומים וכרטיסי נהג' },
    { id: 'reports', label: 'פקודת בוקר', icon: FileText, desc: 'סיכום יומי ודוחות לוגיסטיקה' },
    { id: 'import', label: 'ייבוא קובץ', icon: FileDown, desc: 'טעינת הזמנות מאקסל או PDF' },
  ];

  // הגדרת האנימציות למגירה של Framer Motion
  const drawerVariants = {
    closed: {
      x: '100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
        staggerChildren: 0.05,
        staggerDirection: -1
      }
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    closed: { opacity: 0, x: 20, scale: 0.95 },
    open: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }
  };

  return (
    <>
      {/* כפתור הפעלה צף עם עיצוב Glassmorphism מהמם */}
      <motion.button
        id="mobile-nav-trigger"
        onClick={() => setIsOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 left-6 z-[60] flex items-center justify-center w-14 h-14 rounded-full bg-sky-600/90 hover:bg-sky-600 dark:bg-sky-500/95 dark:hover:bg-sky-500 text-white backdrop-blur-md shadow-[0_8px_32px_rgba(14,165,233,0.3)] border border-white/20 active:scale-95"
      >
        <Menu size={24} />
      </motion.button>

      {/* מסך ניווט מלא ומגירה נשלפת עם מחוות גרירה לסגירה */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] h-screen w-screen overflow-hidden pointer-events-auto" dir="rtl">
            
            {/* רקע שחור שקוף ומטושטש */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-gray-950/40 dark:bg-black/60 backdrop-blur-sm"
            />

            {/* מגירה נשלפת מימין לשמאל */}
            <motion.div
              variants={drawerVariants}
              initial="closed"
              animate="open"
              exit="closed"
              drag="x"
              dragConstraints={{ left: 0, right: 300 }}
              dragElastic={{ right: 0.1, left: 0.6 }}
              onDragEnd={(e, info) => {
                // סגירה במחווה מהירה ימינה (מעל 100 פיקסלים)
                if (info.offset.x > 100) {
                  setIsOpen(false);
                }
              }}
              className="absolute top-0 right-0 h-full w-[85vw] max-w-[360px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-l border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col justify-between pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] px-6 overflow-hidden select-none"
            >
              {/* כותרת התפריט וכפתור סגירה */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">SabanOS Menu</h2>
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">תפריט שליטה מהיר ומבצעי</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center border border-gray-100 dark:border-gray-700/50 active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>

              {/* פרטי משתמש קומפקטיים */}
              <motion.div 
                variants={itemVariants} 
                className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100/50 dark:border-gray-800 rounded-2xl mb-4"
              >
                <img 
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=0EA5E9&color=fff`}
                  className="w-11 h-11 rounded-xl object-cover ring-2 ring-white dark:ring-gray-700 shadow-sm"
                  referrerPolicy="no-referrer"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">{user?.displayName || 'אורח'}</h4>
                  <p className="text-[10px] font-semibold text-gray-400 truncate">{user?.email}</p>
                </div>
              </motion.div>

              {/* רשימת הניווט הסטגרמית */}
              <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-2.5 scrollbar-thin">
                {navItems.map((item) => {
                  const isActive = currentView === item.id;
                  const Icon = item.icon;

                  return (
                    <motion.button
                      key={item.id}
                      variants={itemVariants}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-right transition-all group relative overflow-hidden active:scale-98 ${
                        isActive 
                          ? 'bg-sky-600 dark:bg-sky-500 text-white shadow-lg shadow-sky-600/10' 
                          : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 transition-all ${
                        isActive ? 'bg-white/15 text-white' : 'bg-gray-50 dark:bg-gray-800 text-sky-600 dark:text-sky-400 group-hover:bg-sky-50 dark:group-hover:bg-sky-950/40'
                      }`}>
                        <Icon size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 justify-start">
                          <span className={`text-sm font-black tracking-tight ${isActive ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                            {item.label}
                          </span>
                          {item.showBadge && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse border border-white dark:border-gray-900" />
                          )}
                        </div>
                        <p className={`text-[10px] font-semibold truncate ${isActive ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                          {item.desc}
                        </p>
                      </div>

                      <ChevronLeft size={16} className={`shrink-0 transition-transform ${
                        isActive ? 'text-white translate-x-1' : 'text-gray-400 group-hover:translate-x-0.5'
                      }`} />
                    </motion.button>
                  );
                })}
              </div>

              {/* הגדרות תחתית: מצב כהה והתנתקות */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4 space-y-2">
                
                {/* מתג מצב לילה */}
                <motion.button
                  variants={itemVariants}
                  onClick={onToggleDarkMode}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-98 text-gray-700 dark:text-gray-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-amber-500 dark:text-sky-400">
                      {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                    </div>
                    <span className="text-xs font-black">מצב {isDarkMode ? 'יום' : 'לילה'}</span>
                  </div>
                  <div className={`w-8 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${isDarkMode ? 'bg-sky-500' : 'bg-gray-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${isDarkMode ? '-translate-x-3' : 'translate-x-0'}`} />
                  </div>
                </motion.button>

                {/* כפתור התנתקות */}
                {onLogout && (
                  <motion.button
                    variants={itemVariants}
                    onClick={() => {
                      onLogout();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-50 dark:border-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 dark:text-red-400 font-black text-xs transition-colors active:scale-98"
                  >
                    להתנתק מהמערכת
                  </motion.button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
