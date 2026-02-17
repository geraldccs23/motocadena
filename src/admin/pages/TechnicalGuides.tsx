import React from 'react';
import { BookOpen } from 'lucide-react';

const TechnicalGuides: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black heading-racing text-white italic tracking-tight flex items-center gap-3">
                        <BookOpen className="text-amber-500" size={32} />
                        MANUALES <span className="text-amber-500">TÉCNICOS</span>
                    </h1>
                    <p className="text-zinc-500 font-medium italic mt-1">Biblioteca interna de procedimientos y valores de fábrica.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="glass-panel p-12 text-center rounded-[2.5rem] border border-white/5 bg-zinc-900/20">
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">No hay manuales disponibles en este momento.</p>
                </div>
            </div>
        </div>
    );
};

export default TechnicalGuides;
