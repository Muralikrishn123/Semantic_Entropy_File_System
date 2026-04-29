import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import { SEFSState } from '../lib/store';
import { api } from '../lib/apiService';

interface Props { state: SEFSState; onClose: () => void; }
interface Message { id: number; role: 'user' | 'assistant'; text: string; }

export function ChatAssistant({ state, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'assistant', text: 'Hello! I can help you explore your documents. Try:\n\n• "How many documents?"\n• "What categories?"\n• "Find docs about AI"\n• "Biggest cluster?"\n• "Summarize collection"' }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => { scrollRef.current && (scrollRef.current.scrollTop = scrollRef.current.scrollHeight); }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: nextId.current++, role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');

    try {
      const data = await api.chat(currentInput, state);
      setMessages(prev => [...prev, { id: nextId.current++, role: 'assistant', text: data.response }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { id: nextId.current++, role: 'assistant', text: 'Sorry, I couldn\'t connect to the backend assistant.' }]);
    }
  }, [input, state]); // Add state to dependencies

  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute bottom-5 left-5 w-[350px] h-[450px] bg-[#0a0c1a]/98 backdrop-blur-2xl rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/50 z-50 flex flex-col overflow-hidden">

      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/15 to-indigo-500/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-[12px]">SEFS Assistant</h3>
            <p className="text-white/15 text-[8px]">Ask about your documents</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-md text-white/20 hover:text-white/45 transition-all"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-indigo-500/10' : 'bg-violet-500/10'}`}>
              {msg.role === 'user' ? <User className="w-3 h-3 text-indigo-400" /> : <Bot className="w-3 h-3 text-violet-400" />}
            </div>
            <div className={`max-w-[82%] px-3 py-2 rounded-lg text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500/10 text-indigo-100 border border-indigo-500/10' : 'bg-white/[0.025] text-white/55 border border-white/[0.03]'
              }`}>
              {msg.text.split('\n').map((line, i) => (
                <span key={i}>
                  {line.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                    part.startsWith('**') && part.endsWith('**') ? <strong key={j} className="text-white/85 font-semibold">{part.slice(2, -2)}</strong> : <span key={j}>{part}</span>
                  )}
                  {i < msg.text.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-3 py-2.5 border-t border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your documents..."
            className="flex-1 bg-white/[0.025] border border-white/[0.04] rounded-lg px-3 py-2 text-[11px] text-white placeholder-white/12 focus:outline-none focus:border-violet-500/25 transition-all" />
          <button onClick={handleSend} disabled={!input.trim()}
            className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500/15 to-indigo-500/15 hover:from-violet-500/25 hover:to-indigo-500/25 flex items-center justify-center text-violet-300 transition-all disabled:opacity-15 border border-violet-500/10">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
