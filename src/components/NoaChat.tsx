import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'noa';
  timestamp: Date;
}

export const NoaChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'היי ראמי! אני נעה, העוזרת הלוגיסטית שלך. איך אפשר לעזור היום עם הסידורים?',
      sender: 'noa',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    // סימולציה של תשובה מנעה - כאן תחבר את ה-API האמיתי שלך
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: 'מעדכנת את הנתונים במערכת. צפוי עדכון בלוח הבקרה תוך מספר שניות.',
          sender: 'noa',
          timestamp: new Date()
        }
      ]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
            <Sparkles size={20} className="text-blue-100" />
          </div>
          <div>
            <h2 className="font-bold text-lg tracking-wide">נעה (Noa AI)</h2>
            <p className="text-xs text-blue-100 opacity-90">מחוברת ל-SabanOS</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50" dir="rtl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`p-2 rounded-full shadow-sm flex-shrink-0 ${msg.sender === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            
            <div
              className={`max-w-[75%] px-5 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
              }`}
            >
              {msg.text}
              <div className={`text-[10px] mt-2 text-left ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 z-10">
        <form onSubmit={handleSend} className="relative flex items-center" dir="rtl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="איך אפשר לעזור..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-5 py-4 rounded-full pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute left-2 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-md"
          >
            <Send size={18} className="transform rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
