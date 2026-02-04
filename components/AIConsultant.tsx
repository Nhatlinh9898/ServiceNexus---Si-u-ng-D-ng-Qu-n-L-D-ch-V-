import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { getOperationalAdvice } from '../services/enhancedGeminiService';
import { ChatMessage } from '../types';

const AIConsultant: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: '**Xin chào!** Tôi là trợ lý vận hành ServiceNexus AI. Tôi có thể giúp gì cho công việc kinh doanh của bạn hôm nay? (Ví dụ: "Làm sao để tối ưu quy trình nhận phòng khách sạn?", "Cách xử lý khủng hoảng truyền thông nhà hàng?")',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseText = await getOperationalAdvice(input);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
          <Sparkles size={20} />
        </div>
        <div>
          <h2 className="font-bold text-gray-800">Trợ Lý Vận Hành AI</h2>
          <p className="text-xs text-gray-500">Powered by Gemini 2.5</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-slate-700 text-white' : 'bg-indigo-600 text-white'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-white text-gray-800 rounded-tr-none border border-gray-200' 
                  : 'bg-indigo-600 text-white rounded-tl-none'
              }`}>
                <div 
                  className="markdown-content" 
                  dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} 
                />
                <div className={`text-[10px] mt-2 opacity-70 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2 relative">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm"
            placeholder="Hỏi về cách tối ưu vận hành..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIConsultant;
