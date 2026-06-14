import React, { useState, useEffect } from 'react';
import { User, Shield, Briefcase, MapPin, Save, Camera, Check, Cloud, Clock, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface UserProfileProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
  onManualBackup?: () => Promise<void>;
  isBackingUp?: boolean;
}

export const UserProfileView: React.FC<UserProfileProps> = ({ profile, onUpdate, onManualBackup, isBackingUp }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(localProfile);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const roles = [
    { id: 'admin', label: 'מנהל על (ראמי)' },
    { id: 'manager_harash', label: 'מנהל סניף החרש' },
    { id: 'manager_talmid', label: 'מנהל סניף התלמיד' },
    { id: 'office', label: 'משרד / ניהול הזמנות' },
    { id: 'driver', label: 'נהג' }
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8" dir="rtl">
      <div className="bg-white rounded-[32px] shadow-xl border border-sky-100 overflow-hidden">
        {/* Header/Cover */}
        <div className="h-32 bg-gradient-to-r from-sky-600 to-indigo-600 relative">
          <div className="absolute -bottom-12 right-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                {profile.photoURL ? (
                  <img 
                    src={profile.photoURL} 
                    alt={profile.displayName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-sky-100 text-sky-600 text-2xl font-black">
                    {getInitials(profile.displayName)}
                  </div>
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-sky-600 text-white rounded-full shadow-md hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-16 p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900">{profile.displayName}</h2>
              <p className="text-gray-500 font-bold">{profile.email}</p>
            </div>
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Check size={14} /> נשמר בהצלחה!
              </motion.div>
            )}
          </div>

          <div className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                <Shield size={14} className="text-sky-600" /> תפקיד בארגון
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setLocalProfile(prev => ({ ...prev, role: role.id as any }))}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-right ${
                      localProfile.role === role.id 
                        ? 'bg-sky-50 border-sky-600 border-2 text-sky-700 shadow-md' 
                        : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-sky-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${localProfile.role === role.id ? 'border-sky-600' : 'border-gray-300'}`}>
                      {localProfile.role === role.id && <div className="w-2 h-2 rounded-full bg-sky-600" />}
                    </div>
                    <span className="font-bold text-sm">{role.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Branch Preference */}
            <div>
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                <MapPin size={14} className="text-sky-600" /> סניף מועדף
              </label>
              <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                {['החרש', 'התלמיד', 'both'].map((branch) => (
                  <button
                    key={branch}
                    onClick={() => setLocalProfile(prev => ({ 
                      ...prev, 
                      preferences: { ...prev.preferences!, branch: branch as any } 
                    }))}
                    className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                      localProfile.preferences?.branch === branch 
                        ? 'bg-white text-sky-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {branch === 'both' ? 'שניהם' : branch}
                  </button>
                ))}
              </div>
            </div>

            {/* Google Drive Backup Settings */}
            <div className="border-t border-slate-100 pt-6">
              <label className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                <Cloud size={14} className="text-sky-600" /> גיבוי אוטומטי ל-Google Drive
              </label>
              <div className="bg-slate-50 dark:bg-gray-800/20 rounded-3xl p-5 border border-slate-100 dark:border-gray-800/40">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-200 block">הפעל גיבוי אוטומטי בסוף היום</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">גיבוי מלא של כל ההזמנות במערכת לקובץ אקסל (CSV) בהתאם לשעה המוגדרת</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalProfile(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences!,
                        backupEnabled: !prev.preferences?.backupEnabled
                      }
                    }))}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center ${
                      localProfile.preferences?.backupEnabled ? 'bg-sky-600 justify-end' : 'bg-gray-300 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                {localProfile.preferences?.backupEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-3 border-t border-slate-200/50 dark:border-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-gray-400 dark:text-gray-500" />
                      <span className="text-xs font-bold text-gray-650 dark:text-gray-300">שעת גיבוי יומית:</span>
                      <input
                        type="time"
                        value={localProfile.preferences?.backupTime || '17:00'}
                        onChange={(e) => setLocalProfile(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences!,
                            backupTime: e.target.value
                          }
                        }))}
                        className="bg-white dark:bg-gray-805 border border-slate-200 dark:border-gray-750 rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 text-sm font-black text-gray-800 dark:text-gray-150"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Last Backup Status */}
                {profile.preferences?.lastBackupTime && (
                  <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-gray-700/50 flex items-center justify-between text-xs">
                    <span className="text-gray-450 dark:text-gray-400">סטטוס גיבוי אחרון:</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      {profile.preferences.lastBackupStatus === 'success' ? (
                        <span className="text-emerald-600 dark:text-emerald-450 flex items-center gap-1">
                          <CheckCircle size={12} /> בוצע בהצלחה
                        </span>
                      ) : (
                        <span className="text-rose-500 dark:text-rose-455 flex items-center gap-1">
                          <AlertCircle size={12} /> נכשל
                        </span>
                      )}
                      <span className="text-gray-500">
                        ({new Date(profile.preferences.lastBackupTime).toLocaleString('he-IL', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })})
                      </span>
                    </div>
                  </div>
                )}

                {/* Instant Manual Backup trigger */}
                <div className="mt-4 pt-4 border-t border-slate-250 dark:border-gray-700/50 flex justify-end">
                  <button
                    type="button"
                    onClick={onManualBackup}
                    disabled={isBackingUp}
                    className="bg-white dark:bg-gray-800 hover:bg-sky-50 dark:hover:bg-sky-950/20 text-sky-600 dark:text-sky-450 border border-sky-100 dark:border-gray-700 hover:border-sky-200 dark:hover:border-gray-600 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isBackingUp ? (
                      <RefreshCw size={13} className="animate-spin text-sky-500" />
                    ) : (
                      <RefreshCw size={13} />
                    )}
                    <span>גבה את כל ההזמנות כעת אחי</span>
                  </button>
                </div>

                {/* Backup History Logs */}
                {profile.preferences?.backupHistory && profile.preferences.backupHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700/50 text-right">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2.5">היסטוריית גיבויים אחרונים 📊</span>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {profile.preferences.backupHistory.map((entry, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-gray-900/40 border border-slate-100 dark:border-gray-850 p-2.5 rounded-2xl"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {entry.status === 'success' ? (
                              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                            ) : (
                              <AlertCircle size={14} className="text-rose-500 flex-shrink-0" />
                            )}
                            <div className="flex flex-col text-right overflow-hidden">
                              <span className="font-bold text-gray-700 dark:text-gray-200">
                                {entry.status === 'success' ? 'גיבוי הושלם בהצלחה' : 'גיבוי נכשל'}
                              </span>
                              {entry.status === 'success' && entry.fileName && (
                                <span className="text-[10px] text-gray-400 truncate max-w-[150px] sm:max-w-[200px]" title={entry.fileName}>
                                  {entry.fileName}
                                </span>
                              )}
                              {entry.status === 'failed' && entry.errorMessage && (
                                <span className="text-[10px] text-rose-500 truncate max-w-[150px] sm:max-w-[200px]" title={entry.errorMessage}>
                                  {entry.errorMessage}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-450 dark:text-gray-500 font-mono flex-shrink-0">
                            {new Date(entry.timestamp).toLocaleString('he-IL', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 h-14 bg-sky-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-sky-600/20 hover:bg-sky-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={20} /> שמור שינויים
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-sky-50 rounded-[32px] border border-sky-100">
        <h4 className="font-black text-sky-800 flex items-center gap-2 mb-2 italic">
          <Briefcase size={18} /> הטיפ של נועה אחי
        </h4>
        <p className="text-sm text-sky-700 leading-relaxed font-medium">
          הגדרת התפקיד שלך עוזרת לי להיות יותר חדה. אם אתה מנהל החרש, אני אדע להציף לך קודם כל את מה שקורה אצלך בסניף. הכל בשליטה נשמה!
        </p>
      </div>
    </div>
  );
};
