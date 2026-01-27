import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import Button from '../ui/Button';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const VirtualMechanic: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '¡Epa mano! Saludos de parte de Motocadena. Soy tu mecánico virtual. ¿Qué duda tienes sobre tu máquina o sobre el mantenimiento de $25? ¡Dale gas!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        // Simulated Gemini 1.5 Flash Response with Biker Personality
        // In a real app, this would call an API route that uses @google/generative-ai
        setTimeout(() => {
            let response = "";
            const lower = userMsg.toLowerCase();

            if (lower.includes('cadena')) {
                response = "Fino que preguntes, mano. A la cadena le damos con todo: limpieza profunda con desengrasante, ajuste de tensión perfecto y lubricación de alta gama. Queda sedita para que ruede suave.";
            } else if (lower.includes('25') || lower.includes('mantenimiento')) {
                response = "Ese combo de $25 es lo mejor de Guatire. Te hacemos: engrase de ejes, mantenimiento de kit de arrastre, limpieza de filtros, ajuste de tornillería, revisión de frenos y diagnóstico eléctrico. ¡Tu moto sale como nueva!";
            } else if (lower.includes('precio') || lower.includes('cuanto')) {
                response = "El mantenimiento completo son apenas $25, mano. Calidad profesional sin que te duela el bolsillo. ¡Actívate!";
            } else {
                response = "¡Epa! No te entendí bien esa, pero lo que sí te digo es que aquí en Motocadena cuidamos tu moto como si fuera nuestra. ¿Quieres saber del mantenimiento de $25 o de algún otro servicio? ¡Rodamos!";
            }

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col h-[500px] overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-black/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-black" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white">MECÁNICO VIRTUAL</h4>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Online - Modo Biker</span>
                        </div>
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-zinc-700' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                                {msg.role === 'user' ? <User className="w-4 h-4 text-zinc-300" /> : <Bot className="w-4 h-4 text-amber-500" />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-amber-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700'}`}>
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-zinc-700 flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 bg-black/40 border-t border-zinc-800">
                <div className="relative flex gap-2">
                    <input
                        type="text"
                        placeholder="Escribe tu duda técnica..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <Button size="icon" onClick={handleSend} disabled={loading} className="w-12 h-12 flex-shrink-0">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default VirtualMechanic;
