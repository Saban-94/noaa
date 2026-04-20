import React, { useState } from 'react';
import { User, Shield, Briefcase, MapPin, Save, Camera, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface UserProfileProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
}

export const UserProfileView: React.FC<UserProfileProps> = ({ profile, onUpdate }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  const [showSuccess, setShowSuccess] = useState(false);

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
