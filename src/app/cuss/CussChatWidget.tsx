'use client';
import { useState, useRef, useEffect } from 'react';
import { useTracking } from './trackingContext';

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  text: string;
};

export default function CussChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTooltipDismissed, setIsTooltipDismissed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', text: `Halo Kak, 👋\nada yang bisa dibantu?` }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  
  const trackingContext = useTracking();
  const selectedSurat = trackingContext?.selectedSurat;

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsTooltipDismissed(true);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputVal.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputVal.trim()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputVal('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          history: messages.slice(1).map(m => ({ role: m.role, text: m.text })),
          contextData: selectedSurat ? { selectedSurat: selectedSurat } : null
        }),
      });

      const data = await response.json();
      
      if (data.text) {
        setMessages((prev) => [
          ...prev, 
          { id: Date.now().toString() + 'ai', role: 'ai', text: data.text }
        ]);
      } else {
         setMessages((prev) => [
          ...prev, 
          { id: Date.now().toString() + 'err', role: 'ai', text: data.error || "Maaf, sistem AI sedang offline." }
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev, 
        { id: Date.now().toString() + 'err', role: 'ai', text: "Gagal terhubung dengan asisten." }
      ]);
    }

    setIsLoading(false);
  };

  return (
    <div ref={widgetRef} className="fixed bottom-8 right-8 z-[9999] flex items-end justify-end font-sans">
      
      {/* Tooltip Greeting Popup */}
      {!isOpen && !isTooltipDismissed && (
        <div 
          onClick={() => {
            setIsOpen(true);
            setIsTooltipDismissed(true);
          }}
          className="absolute bottom-[75px] right-2 w-max min-w-[200px] bg-white text-gray-800 rounded-[18px] rounded-br-[4px] p-4 pr-10 shadow-[0_10px_25px_rgba(0,0,0,0.1)] origin-bottom-right animate-in fade-in zoom-in duration-500 border border-gray-100 cursor-pointer hover:scale-[1.02] transition-transform"
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsTooltipDismissed(true);
            }} 
            className="absolute top-2.5 right-2.5 p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
            suppressHydrationWarning
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          
          <p className="text-[14px] text-gray-700 leading-relaxed font-medium whitespace-pre-wrap font-sans">{messages[0]?.text}</p>
        </div>
      )}

      {/* Floating Button Container with Subtle Radar */}
      <div className={`relative flex items-center justify-center ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'} transition-all duration-300`}>
        {/* Radar Effect - Slower, smaller spread */}
        {!isOpen && (
          <div className="absolute -inset-1.5 bg-emerald-400 rounded-full animate-[ping_2s_ease-out_infinite] opacity-20 pointer-events-none"></div>
        )}
        
        <button 
          onClick={() => setIsOpen(true)}
          className="relative w-[56px] h-[56px] bg-[#23C16B] text-white rounded-full shadow-[0_10px_20px_rgba(35,193,107,0.3)] flex items-center justify-center hover:bg-[#1EAB5E] transition-colors z-50 border-2 border-white"
          suppressHydrationWarning
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
        </button>
      </div>

      {/* Backdrop Overlay (Similar to Timeline Modal) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9990] animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Window Container */}
      <div className={`fixed sm:absolute bottom-[90px] sm:bottom-0 left-4 right-4 sm:left-auto sm:right-0 w-auto sm:w-[380px] h-[calc(100dvh-150px)] sm:h-[550px] bg-[#EFEAE2] backdrop-blur-2xl border border-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] rounded-3xl flex flex-col overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.23,1,0.32,1)] z-[9999] transform origin-bottom sm:origin-bottom-right ${isOpen ? 'scale-100 opacity-100 sm:mb-2 sm:mr-2' : 'scale-50 opacity-0 pointer-events-none'}`}>
        
        {/* Header */}
        <div className="bg-[#23C16B] p-4 text-white relative flex-shrink-0 shadow-sm z-20">
          <div className="flex justify-between items-center relative z-10">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
               <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
              </div>
              <div>
                <h3 className="font-bold text-[15px] leading-tight tracking-tight">CUSS Assistant</h3>
                <p className="text-[11px] font-medium text-emerald-50 opacity-90 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            {/* Close Button */}
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors" suppressHydrationWarning>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Area (WA Style BG) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EFEAE2] relative" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')", backgroundSize: 'cover', backgroundBlendMode: 'soft-light' }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm whitespace-pre-wrap font-sans ${
                msg.role === 'user' 
                  ? 'bg-[#DCF8C6] text-gray-800 rounded-[12px] rounded-tr-[2px]' 
                  : 'bg-white text-gray-800 rounded-[12px] rounded-tl-[2px]'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white text-gray-800 rounded-[12px] rounded-tl-[2px] px-4 py-3 shadow-sm flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                 <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                 <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
               </div>
            </div>
          )}
          <div ref={chatEndRef} className="h-1" />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-[#F0F2F5] flex-shrink-0 z-20">
          <form onSubmit={handleSend} className="relative flex items-end gap-2">
            <textarea 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ketikan pesan..."
              rows={1}
              className="w-full bg-white text-gray-800 text-[14px] rounded-[20px] px-4 py-3 focus:outline-none focus:ring-0 shadow-sm resize-none min-h-[44px] max-h-[120px] custom-scrollbar"
              disabled={isLoading}
              suppressHydrationWarning
            />
            <button 
              type="submit" 
              disabled={!inputVal.trim() || isLoading}
              className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                !inputVal.trim() || isLoading ? 'text-gray-400 bg-transparent' : 'bg-[#23C16B] text-white hover:bg-[#1EAB5E] shadow-sm transform active:scale-95'
              }`}
              suppressHydrationWarning
            >
              <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
