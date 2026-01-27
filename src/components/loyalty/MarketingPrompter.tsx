import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import Button from '../ui/Button';

const scriptSections = [
    {
        title: "INTRO: EL GANCHO",
        content: "¡Epa familia biker! ¿Tu moto se siente pesada o le falta ese toque de potencia? Escucha esto...",
        timing: "0:00 - 0:05"
    },
    {
        title: "SERVICIO: EL VALOR",
        content: "En Motocadena tenemos el mantenimiento completo por solo $25. Limpieza de filtros, ajuste de kit de arrastre y engrase profesional. ¡Queda sedita!",
        timing: "0:05 - 0:20"
    },
    {
        title: "RECOMPENSA: LEALTAD",
        content: "Y lo mejor: ¡Trae a tus panas! Por cada 5 amigos que vengan de tu parte, ¡tu próximo servicio va por la casa!",
        timing: "0:20 - 0:35"
    },
    {
        title: "CIERRE: UBICACIÓN",
        content: "Estamos en Guatire, Las Flores. ¡Sube tu nivel hoy mismo! Motocadena: pasión y rendimiento.",
        timing: "0:35 - 0:45"
    }
];

const MarketingPrompter: React.FC = () => {
    const [activeSection, setActiveSection] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                setActiveSection(prev => (prev + 1) % scriptSections.length);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    return (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-amber-500 flex items-center justify-between">
                <h4 className="text-xs font-black text-black uppercase tracking-widest">Teleprompter de Marketing</h4>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-black hover:bg-black/10"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-black hover:bg-black/10"
                        onClick={() => setActiveSection(0)}
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="p-8 h-[300px] flex flex-col justify-center items-center text-center relative">
                <div className="absolute top-4 left-4">
                    <Volume2 className="w-4 h-4 text-zinc-700" />
                </div>

                <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">
                        {scriptSections[activeSection].title}
                    </span>
                    <p className="text-2xl md:text-3xl font-bold text-white leading-tight max-w-lg">
                        "{scriptSections[activeSection].content}"
                    </p>
                    <span className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] text-zinc-500 font-bold">
                        TIEMPO SUGERIDO: {scriptSections[activeSection].timing}
                    </span>
                </div>

                {/* Progress Dots */}
                <div className="absolute bottom-8 flex gap-2">
                    {scriptSections.map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeSection ? 'w-6 bg-amber-500' : 'bg-zinc-800'}`}
                        ></div>
                    ))}
                </div>
            </div>

            <div className="p-4 border-t border-zinc-900 bg-zinc-900/30 flex items-center gap-4">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border border-black bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-zinc-400">
                            {i}
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                    Adaptado al lenguaje local de Guatire
                </p>
            </div>
        </div>
    );
};

export default MarketingPrompter;
