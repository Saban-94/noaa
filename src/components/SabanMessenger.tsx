import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Image as ImageIcon, 
  FileText, 
  MoreVertical, 
  Shield, 
  ShieldAlert, 
  Check, 
  CheckCheck, 
  Paperclip,
  Truck,
  ArrowLeftRight,
  PlusCircle,
  Clock,
  Sparkles,
  Loader2,
  Trash2,
  Lock,
  Users,
  ListTodo,
  Video,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ChatMessage, InterBranchTransfer, Order } from '../types';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { processChatMessage, createTransfer, createOrder, predictOrderEta, createReminder } from '../services/auraService';
import { uploadFileToDrive } from '../services/driveService';
import { analyzePdfContent } from '../services/auraService'; // Need to export this

interface ActionSuggestion {
  intent: 'transfer' | 'order' | 'chat' | 'none';
  data: any;
  suggestion: string;
}

export const SabanMessenger = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestion, setSuggestion] = useState<ActionSuggestion | null>(null);
  const [visibility, setVisibility] = useState<'everyone' | 'managers'>('everyone');
  const [isUploading, setIsUploading] = useState(false);
  const [longPressingId, setLongPressingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const markReadDone = useRef<Set<string>>(new Set());

  // Mark as read logic
  useEffect(() => {
    if (!auth.currentUser || messages.length === 0) return;

    const unreadMsgs = messages.filter(m => 
      m.id && 
      m.senderId !== auth.currentUser?.uid && 
      (!m.readBy || !m.readBy.includes(auth.currentUser?.uid || '')) &&
      !markReadDone.current.has(m.id)
    );

    unreadMsgs.forEach(async (msg) => {
      if (!msg.id || !auth.currentUser) return;
      markReadDone.current.add(msg.id);
      try {
        const docRef = doc(db, 'messages', msg.id);
        const newReadBy = [...(msg.readBy || []), auth.currentUser.uid];
        await updateDoc(docRef, { readBy: newReadBy });
      } catch (err) {
        console.error("Error marking as read:", err);
      }
    });
  }, [messages, auth.currentUser]);

  // Auto-scan new file messages
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && (lastMsg.type === 'file' || lastMsg.type === 'image') && lastMsg.fileUrl && lastMsg.senderId !== 'system') {
      const scanFile = async () => {
        try {
          // Add dummy system message to show scanning
          const scanTask = await addDoc(collection(db, 'messages'), {
            text: `נועה: אחי, אני סורקת את הקובץ "${lastMsg.fileName}"...`,
            senderId: 'system',
            senderName: 'נועה',
            timestamp: serverTimestamp(),
            visibility: 'everyone',
            type: 'system'
          });

          // Perform analysis (assuming it works on images too or just PDF as requested)
          // For now, only PDF as per analyze_pdf_content tool name
          if (lastMsg.fileName?.toLowerCase().endsWith('.pdf')) {
            const analysis = await analyzePdfContent(lastMsg.fileUrl); // fileUrl is Drive ID here
            if (analysis) {
              await updateDoc(doc(db, 'messages', scanTask.id), {
                text: `נועה: סיימתי לסרוק אחי! זיהיתי שהקובץ הוא ${analysis.document_type || 'מסמך לוגיסטי'}. רוצה שאקים הזמנה?`
              });
              // Potentially set suggestion here too
            }
          }
        } catch (err) {
          console.error("Auto-scan error:", err);
        }
      };
      scanFile();
    }
  }, [messages.length]);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
      // Filter by visibility on client side as well for extra safety (though rules handle it)
      const isAdmin = auth.currentUser?.email === 'hsaban2025@gmail.com' || auth.currentUser?.email === 'itzik@saban.co.il';
      setMessages(msgs.filter(m => m.visibility === 'everyone' || isAdmin));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsProcessing(true);

    try {
      // 1. Save message to Firestore
      await addDoc(collection(db, 'messages'), {
        text: messageText,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'אחי',
        senderPhoto: auth.currentUser.photoURL,
        timestamp: serverTimestamp(),
        visibility: visibility,
        type: 'text'
      });

      // 2. Process with AI for Suggestions (only if it's a manager message or everyone)
      const aiResponse = await processChatMessage(messageText, auth.currentUser.displayName || 'אחי');
      
      if (aiResponse.answer) {
        await addDoc(collection(db, 'messages'), {
          text: aiResponse.answer,
          senderId: 'system',
          senderName: 'נועה',
          timestamp: serverTimestamp(),
          visibility: 'everyone',
          type: 'system'
        });
      }

      if (aiResponse.intent !== 'none' && aiResponse.intent !== 'chat') {
        setSuggestion(aiResponse);
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    try {
      const uploadResult = await uploadFileToDrive(file);
      if (uploadResult?.fileId) {
        let messageType: 'file' | 'image' | 'video' = 'file';
        if (file.type.startsWith('image/')) messageType = 'image';
        else if (file.type.startsWith('video/')) messageType = 'video';

        await addDoc(collection(db, 'messages'), {
          text: `העליתי קובץ: ${file.name}`,
          senderId: auth.currentUser.uid,
          senderName: auth.currentUser.displayName || 'אחי',
          senderPhoto: auth.currentUser.photoURL,
          timestamp: serverTimestamp(),
          visibility: visibility,
          type: messageType,
          fileUrl: uploadResult.fileId,
          fileName: file.name,
          fileType: file.type
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateTaskFromMessage = async (msg: ChatMessage) => {
    if (!auth.currentUser) return;
    setIsProcessing(true);
    try {
      await createReminder({
        title: `משימה מ${msg.senderName} (${format(new Date(), 'dd/MM')})`,
        description: `המקור: ${msg.text}`,
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        dueTime: format(new Date(), 'HH:mm'),
        isCompleted: false,
        userId: auth.currentUser.uid // We assign it to current user but system message says Rami's board
      });
      
      const successMsg = await addDoc(collection(db, 'messages'), {
        text: `נועה: שותף, הפכתי את ההודעה של ${msg.senderName} למשימה לביצוע. זה מחכה לראמי בלוח המשימות! ✅`,
        senderId: 'system',
        senderName: 'נועה',
        timestamp: serverTimestamp(),
        visibility: 'everyone',
        type: 'system'
      });
      
      setTimeout(() => {
        deleteDoc(doc(db, 'messages', successMsg.id));
      }, 5000);

      if (window.navigator?.vibrate) window.navigator.vibrate([10, 30, 10]);

    } catch (err) {
      console.error("Task error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!suggestion) return;
    setIsProcessing(true);
    try {
      if (suggestion.intent === 'transfer') {
        const { items, source, target } = suggestion.data;
        const transfer = await createTransfer({
          items,
          sourceBranch: source === 'החרש' ? 'החרש' : 'התלמיד',
          destinationBranch: target === 'התלמיד' ? 'התלמיד' : 'החרש',
          status: 'pending'
        });
        
        // Add system message
        await addDoc(collection(db, 'messages'), {
          text: `נועה: בקשת העברה בוצעה אחי. ${items} יוצא לדרך מ${source}.`,
          senderId: 'system',
          senderName: 'נועה',
          timestamp: serverTimestamp(),
          visibility: 'everyone',
          type: 'system',
          metadata: { transferId: transfer.id }
        });
      } else if (suggestion.intent === 'order') {
        const order = await createOrder({
          ...suggestion.data,
          source: 'chat',
          status: 'pending',
          date: format(new Date(), 'yyyy-MM-dd'),
          notes: `נוצר מהצ'אט על ידי ${messages.find(m => m.text.includes(suggestion.data.customerName))?.senderName || 'מישהו'}`
        });
        
        await addDoc(collection(db, 'messages'), {
          text: `נועה: שותף, ההזמנה של ${suggestion.data.customerName} הוזרקה לסידור העבודה. הכל בשליטה.`,
          senderId: 'system',
          senderName: 'נועה',
          timestamp: serverTimestamp(),
          visibility: 'everyone',
          type: 'system',
          metadata: { orderId: order.id }
        });
      }
      setSuggestion(null);
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Long press for task creation
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const startLongPress = (msg: ChatMessage) => {
    if (msg.senderId === 'system' || !msg.id) return;
    setLongPressingId(msg.id);
    longPressTimer.current = setTimeout(() => {
      handleCreateTaskFromMessage(msg);
      setLongPressingId(null);
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
    }, 1000);
  };
  const stopLongPress = () => {
    setLongPressingId(null);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] bg-gray-50/50 backdrop-blur-sm rounded-3xl overflow-hidden border border-sky-100 shadow-xl m-2 md:m-4">
      {/* Header */}
      <div className="p-4 bg-white border-b border-sky-50 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Users size={20} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-none mb-1">קבוצת עבודה - ח. סבן</h2>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">זמינה 24/7 • נועה הצטרפה לצ'אט</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setVisibility(v => v === 'everyone' ? 'managers' : 'everyone')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
              visibility === 'managers' 
                ? 'bg-amber-50 text-amber-600 border-amber-100' 
                : 'bg-sky-50 text-sky-600 border-sky-100'
            }`}
          >
            {visibility === 'managers' ? <Lock size={12} /> : <Shield size={12} />}
            {visibility === 'managers' ? 'מנהלים בלבד' : 'כולם'}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={{ backgroundImage: 'radial-gradient(#e0f2fe 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === auth.currentUser?.uid;
            const isSystem = msg.senderId === 'system';
            const showAvatar = idx === 0 || messages[idx-1].senderId !== msg.senderId;
            
            return (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 group mb-1`}
              >
                {!isMe && !isSystem && (
                  <div className={`w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 transition-opacity ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                    <img src={msg.senderPhoto || `https://picsum.photos/seed/${msg.senderId}/32/32`} alt="" referrerPolicy="no-referrer" />
                  </div>
                )}
                
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
                  {showAvatar && !isMe && !isSystem && (
                    <div className="flex items-center gap-1 mb-1 px-2">
                      <span className="text-[10px] font-bold text-gray-500">{msg.senderName}</span>
                      {msg.readBy && msg.readBy.length > 0 && (
                        <Eye size={10} className="text-sky-400" />
                      )}
                    </div>
                  )}
                  {isMe && (
                    <div className="flex items-center gap-1 mb-1 px-2">
                       {msg.readBy && msg.readBy.length > 0 ? (
                         <div className="flex items-center gap-1">
                           <span className="text-[9px] text-sky-400 font-bold">נצפה</span>
                           <Eye size={10} className="text-sky-400" />
                         </div>
                       ) : (
                         <div className="flex items-center gap-1">
                           <span className="text-[9px] text-gray-300">טרם נקרא</span>
                           <EyeOff size={10} className="text-gray-300" />
                         </div>
                       )}
                    </div>
                  )}
                  <div 
                    onPointerDown={() => startLongPress(msg)}
                    onPointerUp={stopLongPress}
                    onPointerLeave={stopLongPress}
                    className={`
                    relative px-4 py-3 rounded-2xl shadow-sm text-sm active:scale-95 transition-all select-none
                    ${isMe ? 'bg-sky-600 text-white rounded-tr-none' : isSystem ? 'bg-white border-2 border-sky-200 text-sky-800 italic text-center w-full shadow-sky-100' : 'bg-white text-gray-800 border border-sky-50 rounded-tl-none'}
                    ${longPressingId === msg.id ? 'ring-4 ring-sky-300 ring-offset-2 scale-105' : ''}
                  `}>
                    {longPressingId === msg.id && (
                      <div className="absolute inset-0 bg-sky-500/20 rounded-2xl flex items-center justify-center backdrop-blur-[1px] z-30">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-white p-2 rounded-full shadow-lg"
                        >
                          <PlusCircle className="text-sky-600 animate-pulse" size={24} />
                        </motion.div>
                      </div>
                    )}
                    {msg.visibility === 'managers' && (
                      <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-0.5 shadow-sm">
                        <Lock size={10} />
                      </div>
                    )}
                    <p dir="rtl" className="whitespace-pre-wrap break-words leading-relaxed font-medium">
                      {msg.text}
                    </p>
                    {msg.type === 'file' && (
                      <div className="mt-2 p-2 bg-white/10 rounded-xl flex items-center gap-2 border border-white/20">
                        <FileText size={20} />
                        <span className="text-[10px] font-bold truncate max-w-[150px]">{msg.fileName}</span>
                      </div>
                    )}
                    {msg.type === 'image' && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-white/20 shadow-inner group/msg">
                        {/* We use the public thumbnail if available, or just a placeholder for now as full Drive viewing requires auth/proxy */}
                        <div className="bg-gray-100 min-h-[120px] max-h-[240px] flex items-center justify-center text-gray-400 relative overflow-hidden">
                           <ImageIcon size={48} className="absolute opacity-20" />
                           <img 
                             src={`https://lh3.googleusercontent.com/u/0/d/${msg.fileUrl}=w800-h800`} 
                             alt={msg.fileName}
                             className="w-full h-full object-cover relative z-10"
                             onError={(e) => {
                               e.currentTarget.style.display = 'none';
                             }}
                             referrerPolicy="no-referrer"
                           />
                           <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/msg:opacity-100 transition-opacity z-20">
                             <a 
                               href={`https://drive.google.com/file/d/${msg.fileUrl}/view`} 
                               target="_blank" 
                               rel="noreferrer"
                               className="px-4 py-2 bg-white text-gray-900 rounded-full text-xs font-bold"
                             >
                               צפה בתמונה
                             </a>
                           </div>
                        </div>
                      </div>
                    )}
                    {msg.type === 'video' && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-white/20 shadow-inner group/msg">
                        <div className="bg-gray-900 aspect-video flex flex-col items-center justify-center text-white/50 relative">
                           <Video size={48} className="mb-2" />
                           <span className="text-[10px] font-bold">סרטון וידאו</span>
                           <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                             <a 
                               href={`https://drive.google.com/file/d/${msg.fileUrl}/view`} 
                               target="_blank" 
                               rel="noreferrer"
                               className="px-4 py-2 bg-white text-gray-900 rounded-full text-xs font-bold"
                             >
                               נגן סרטון
                             </a>
                           </div>
                        </div>
                      </div>
                    )}
                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end text-sky-100' : 'justify-start text-gray-400'} text-[9px]`}>
                       {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : 'שולח...'}
                       {isMe && (
                          <div className="flex items-center gap-0.5">
                            {!msg.timestamp ? (
                              <img 
                                src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndnZndnZndnZndnZndnZndnZndnZndnZndnZndnZndnZndmksZ3A9MSZ2PTE/3o7TKMGpxr9J5l5n9e/giphy.gif" 
                                alt="sending"
                                className="w-3 h-3 grayscale invert brightness-200"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <CheckCheck size={12} className="text-white/70" />
                            )}
                          </div>
                        )}
                    </div>

                    <button 
                      onClick={() => msg.id && handleDeleteMessage(msg.id)}
                      className="absolute -top-2 -left-2 p-1 bg-white border border-red-50 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-20"
                    >
                      <Trash2 size={10} />
                    </button>

                    {!isSystem && !isMe && (
                      <button 
                        onClick={() => handleCreateTaskFromMessage(msg)}
                        className="absolute -top-2 -right-8 p-1 bg-sky-50 text-sky-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-20 border border-sky-100"
                        title="הפוך למשימה לביצוע"
                      >
                        <ListTodo size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex items-center gap-2 text-sky-400 px-4"
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
            <span className="text-[10px] font-bold">נועה מנתחת אחי...</span>
          </motion.div>
        )}
      </div>

      {/* Suggestion Card */}
      <AnimatePresence>
        {suggestion && suggestion.intent !== 'chat' && suggestion.intent !== 'none' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="mx-4 mb-2 p-3 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-2xl flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl text-sky-600 shadow-sm border border-sky-100">
                {suggestion.intent === 'transfer' ? <ArrowLeftRight size={20} /> : <PlusCircle size={20} />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-sky-700 leading-none mb-1">הצעה לביצוע (נועה)</p>
                <p className="text-xs font-bold text-gray-800">{suggestion.suggestion}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSuggestion(null)}
                className="px-3 py-1.5 text-xs text-gray-500 font-bold hover:text-gray-700"
              >
                בטל
              </button>
              <button 
                onClick={handleExecuteAction}
                className="px-4 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                בצע כעת
                <Sparkles size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-sky-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative flex flex-col gap-2">
            <div className="flex items-center gap-2 px-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="application/pdf,image/*,video/*"
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
              >
                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
              </button>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
              >
                <ImageIcon size={20} />
              </button>
            </div>
            
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={visibility === 'managers' ? "כתוב הודעה למנהלים בלבד..." : "כתוב הודעה לכל הצוות..."}
              className={`w-full bg-gray-100/50 border-0 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500/20 focus:bg-white transition-all outline-none resize-none min-h-[44px] max-h-32 ${visibility === 'managers' ? 'text-amber-700 placeholder:text-amber-300' : 'text-gray-800'}`}
              dir="rtl"
            />
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || isProcessing}
            className={`p-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              visibility === 'managers' 
                ? 'bg-amber-500 text-white hover:bg-amber-600' 
                : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
          >
            {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
          </button>
        </form>
      </div>
    </div>
  );
};
