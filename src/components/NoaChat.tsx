import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  ChevronRight,
  Volume2,
  VolumeX,
  Speaker,
  Settings,
  Waves
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Order } from '../types';
import { parseItems } from '../lib/utils';

interface NoaChatProps {
  chatHistory: any[];
  chatScrollRef: React.RefObject<HTMLDivElement>;
  onBack: () => void;
  onAction: (action: string) => void;
  orders: Order[];
}

export const NoaChat = ({ 
  chatHistory, 
  chatScrollRef, 
  onBack, 
  onAction,
  orders 
}: NoaChatProps) => {
  const [isAutoVoice, setIsAutoVoice] = useState(() => localStorage.getItem('noa_auto_voice') === 'true');
  const [currentlySpeaking, setCurrentlySpeaking] = useState<number | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(window.speechSynthesis);

  // Persistence of auto voice setting
  useEffect(() => {
    localStorage.setItem('noa_auto_voice', String(isAutoVoice));
  }, [isAutoVoice]);

  const cleanTextForSpeech = (text: string) => {
    // 1. Detect if it's an item list
    const items = parseItems(text);
    if (items.length > 0) {
      let speech = "הנה הפריטים שמצאתי בסריקה: ";
      items.forEach((item, index) => {
        speech += `פריט ${index + 1}: ${item.name}, כמות: ${item.quantity}. `;
      });
      return speech;
    }

    // 2. Regular cleaning
    return text
      .replace(/[*_#]/g, '') // remove markdown
      .replace(/[^\u0590-\u05FF0-9\s,.?!]/g, ' ') // keep hebrew, numbers, basic punctuation
      .trim();
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setCurrentlySpeaking(null);
    }
  };

  const speak = (text: string, index: number) => {
    if (!synthRef.current) return;

    // If already speaking this message, stop
    if (currentlySpeaking === index) {
      stopSpeaking();
      return;
    }

    // Stop anything else
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
    const voices = synthRef.current.getVoices();
    const hebrewVoice = voices.find(v => v.lang.includes('he')) || voices[0];
    
    utterance.voice = hebrewVoice;
    utterance.lang = 'he-IL';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setCurrentlySpeaking(index);
    utterance.onend = () => setCurrentlySpeaking(null);
    utterance.onerror = () => setCurrentlySpeaking(null);

    synthRef.current.speak(utterance);
  };

  // Auto-voice effect
  useEffect(() => {
    if (isAutoVoice && chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.role === 'model' || lastMessage.role === 'assistant') {
        speak(lastMessage.parts[0].text, chatHistory.length - 1);
      }
    }
  }, [chatHistory.length]);

  const dynamicSuggestions = [
    { label: 'דוח בוקר 📋', action: 'תכיני לי דוח בוקר 📋' },
    { label: 'סנכרון דרייב 📂', action: 'סרוק את תיקיית SabanOS ותחלץ נתונים מהקובץ האחרון' },
    { label: 'הזמנה חדשה ✍️', action: 'פתח הזמנה חדשה במערכת' },
    { label: 'סטטוס הפצה 📊', action: 'מה סטטוס ההפצה כרגע?' },
    { label: 'סטטוס נהגים 🚛', action: 'סטטוס נהגים 🚛' },
    { label: 'חריגות בטון/ריצופית ⚠️', action: 'חריגות בטון/ריצופית ⚠️' },
    { label: 'סיכום עמוסים 📈', action: 'סיכום עמוסים' },
    { label: 'תיעוד מסירה 📜', action: 'תיעוד מסירה' },
    ...orders.filter(o => o.status === 'preparing').slice(0, 2).map(o => ({
      label: `צפי ל${o.customerName.split(' ')[0]} ⏱️`,
      action: `מה ה-ETA של ${o.customerName}?`
    }))
  ];

  return (
    <div className="h-[100dvh] bg-white flex flex-col overflow-hidden w-full" dir="rtl">
      {/* WhatsApp-style Header (Full Width on desktop & mobile) */}
      <header className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-100 flex items-center justify-between bg-white/95 backdrop-blur-md z-30 shrink-0 shadow-sm w-full">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors shrink-0" title="חזרה">
            <ChevronRight size={22} className="text-gray-700" />
          </button>
          
          {/* WhatsApp style Avatar */}
          <div className="relative w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-black text-lg select-none border border-emerald-200">
            נ
            <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg text-gray-900 leading-none">נועה AI</h1>
              <span className="hidden sm:inline bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-black border border-emerald-100">עוזרת לוגיסטית</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">ONLINE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setIsAutoVoice(!isAutoVoice)}
            className={`p-2.5 rounded-2xl transition-all border flex items-center gap-2 text-xs font-bold ${
              isAutoVoice 
                ? 'bg-sky-50 text-sky-600 border-sky-100 font-extrabold shadow-sm' 
                : 'text-gray-400 bg-gray-50 border-gray-100 hover:text-gray-600'
            }`}
            title="הקראה קולית"
          >
            <Speaker size={18} className={isAutoVoice ? "animate-pulse text-sky-600" : "text-gray-400"} />
            <span className="hidden sm:inline">{isAutoVoice ? "הקראה קולית פעילה" : "חרישי"}</span>
          </button>
        </div>
      </header>

      {/* Message List - Full width, no max-w limits */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 w-full scroll-smooth"
      >
        {chatHistory.length === 0 && (
          <div className="text-center py-20 px-4">
            <div className="bg-sky-50 w-24 h-24 rounded-[3rem] flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse-subtle">
              <MessageSquare className="text-sky-600" size={48} />
            </div>
            <h2 className="text-2xl font-black mb-2 italic text-gray-900">בוקר טוב ראמי, כאן נועה</h2>
            <p className="text-sm font-bold text-gray-400 mb-8 max-w-[280px] mx-auto">"תכיני לי דוח בוקר לסידור העבודה"</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
              {dynamicSuggestions.slice(0, 6).map((suggestion, idx) => (
                <button 
                  key={idx}
                  onClick={() => onAction(suggestion.action)}
                  className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs font-bold text-gray-600 hover:bg-sky-50 hover:border-sky-100 transition-all text-right shadow-sm flex items-center justify-between group"
                >
                  <span>{suggestion.label}</span>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}
        
        {chatHistory.map((chat, idx) => {
          const timeStr = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
          const isUser = chat.role === 'user';
          
          return (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex w-full ${isUser ? 'justify-start' : 'justify-end'}`}
            >
              {/* Msg bubbles stretch further now to fill the full screen width elegantly */}
              <div className={`p-4 md:p-5 rounded-[1.5rem] text-sm md:text-base font-bold leading-relaxed shadow-sm relative group/msg max-w-[95%] ${
                isUser 
                  ? 'bg-[#DCF8C6] text-gray-900 rounded-tr-none border border-[#C5EBAB]' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              }`}>
                {/* WhatsApp contact header for Noa's messages */}
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-gray-50 text-xs text-green-700 font-extrabold select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span>נועה AI - ח. סבן לוגיסטיקה 🟢</span>
                  </div>
                )}

                {isUser ? (
                  <div className="text-right whitespace-pre-wrap">{chat.parts[0].text}</div>
                ) : (
                  <div className="markdown-body text-gray-800 leading-relaxed text-sm md:text-base font-medium space-y-2 select-text text-right" dir="rtl">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed font-bold text-gray-800">{children}</p>,
                        h1: ({ children }) => <h1 className="text-lg md:text-xl font-black mt-4 mb-2 text-green-950 flex items-center gap-1.5 border-b pb-1 border-green-100">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-md md:text-lg font-black mt-4 mb-2 text-green-900 border-r-4 border-green-500 pr-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm md:text-base font-black mt-3 mb-1.5 text-green-800 border-r-4 border-green-400 pr-2">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc pr-6 my-2 text-xs md:text-sm font-bold space-y-1.5 text-gray-700">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pr-6 my-2 text-xs md:text-sm font-bold space-y-1.5 text-gray-700">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed mb-0.5">{children}</li>,
                        strong: ({ children }) => <strong className="font-black text-green-950">{children}</strong>,
                        hr: () => <hr className="my-4 border-t border-gray-100" />,
                        em: ({ children }) => <em className="italic text-gray-500 font-medium">{children}</em>,
                        code: ({ children }) => <code className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-mono text-xs">{children}</code>
                      }}
                    >
                      {chat.parts[0].text.replace(/\r?\n/g, '  \n')}
                    </ReactMarkdown>
                  </div>
                )}
                
                {/* Footer with Timestamp and WhatsApp checkmarks receipt */}
                <div className="flex items-center justify-end gap-1 mt-2.5 pt-1 text-[10px] text-gray-400 select-none font-sans" dir="ltr">
                  <span className="text-sky-500 font-bold ml-1">✓✓</span>
                  <span>{timeStr}</span>
                </div>

                {/* Audio Controls for voice readout */}
                {!isUser && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                    <button 
                      onClick={() => speak(chat.parts[0].text, idx)}
                      className={`p-2 rounded-xl transition-all ${currentlySpeaking === idx ? 'bg-sky-50 text-sky-600' : 'hover:bg-gray-50 text-gray-400'}`}
                    >
                      {currentlySpeaking === idx ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    
                    {currentlySpeaking === idx && (
                      <div className="flex items-center gap-0.5 h-4">
                        {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: [4, h * 4, 4] }}
                            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                            className="w-0.5 bg-sky-400 rounded-full"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input Area - Full width, styled beautifully */}
      <div className="bg-gradient-to-t from-white via-white to-transparent pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-6 px-4 md:px-6 z-20 shrink-0 border-t border-gray-50/50 w-full animate-fade-in">
        <div className="w-full space-y-4">
          {/* Quick Actions Scrollable */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 scroll-smooth">
            {dynamicSuggestions.map((btn, i) => {
              const isMorningReport = btn.label.includes('דוח בוקר');
              return (
                <button 
                  key={i}
                  onClick={() => onAction(btn.action)}
                  className={`whitespace-nowrap text-[11px] font-black px-5 py-3 rounded-full transition-all active:scale-95 flex items-center gap-2 border shadow-md ${
                    isMorningReport 
                      ? 'bg-green-600 hover:bg-green-700 text-white border-green-700 hover:shadow-green-200 scale-105 ring-2 ring-green-100' 
                      : 'bg-white/95 backdrop-blur-md hover:bg-sky-600 hover:text-white text-sky-950 border-sky-100 shadow-md hover:shadow-sky-200'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('message') as HTMLInputElement;
              const val = input.value;
              if (!val) return;
              onAction(val);
              input.value = '';
            }}
            className="flex gap-3 items-center w-full"
          >
            <input 
              name="message"
              autoComplete="off"
              placeholder="הקלדי בקשה או שאלה (למשל: תכיני לי דוח בוקר)..."
              className="flex-1 bg-white/90 backdrop-blur-md border-[3px] border-sky-100 rounded-[2.5rem] px-5 md:px-8 py-3.5 md:py-4 text-sm md:text-base focus:border-sky-600 transition-all outline-none shadow-xl font-bold"
            />
            <button 
              type="submit"
              className="bg-gray-900 text-white p-3.5 md:p-4 rounded-full hover:bg-sky-600 transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center shrink-0"
            >
              <Send size={20} className="md:w-6 md:h-6" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
