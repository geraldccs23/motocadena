import React, { useState } from 'react';
import { UserPlus, Settings, ClipboardList } from 'lucide-react';
import Button from '../ui/Button';

interface LoyaltyDashboardProps {
    onAddReferral: (name: string, phone: string) => void;
    purchaseCount: number;
    leadCount: number;
}

const LoyaltyDashboard: React.FC<LoyaltyDashboardProps> = ({ onAddReferral, purchaseCount, leadCount }) => {
    const [friendName, setFriendName] = useState('');
    const [friendPhone, setFriendPhone] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (friendName.trim() && friendPhone.trim()) {
            onAddReferral(friendName.trim(), friendPhone.trim());
            setFriendName('');
            setFriendPhone('');
        }
    };

    const technicalPoints = [
        "Engrase de ejes y rodamientos",
        "Mantenimiento de kit de arrastre",
        "Limpieza de filtro y carburador",
        "Ajuste general de tornillería",
        "Revisión de frenos y cableado",
        "Diagnóstico batería/eléctrico"
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Referral Form */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <UserPlus className="w-5 h-5 text-amber-500" />
                    <h4 className="text-xl font-bold text-white">Registrar Referido</h4>
                </div>
                <p className="text-sm text-zinc-400 mb-8">
                    Ingresa los datos de tu amigo. Si nos facilita su contacto ganas progreso para aceite, y si realiza su servicio, ¡ganas el mantenimiento gratis!
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Nombre completo..."
                                value={friendName}
                                onChange={(e) => setFriendName(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="tel"
                                placeholder="WhatsApp..."
                                value={friendPhone}
                                onChange={(e) => setFriendPhone(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full h-14 font-black tracking-widest uppercase">
                        REGISTRAR CONTACTO
                    </Button>
                </form>

                <div className="mt-10 pt-10 border-t border-zinc-800">
                    <div className="flex justify-between items-center mb-4">
                        <h5 className="text-xs font-black uppercase tracking-widest text-zinc-500">Metas Activas</h5>
                    </div>
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border transition-colors ${purchaseCount >= 5 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/40 border-zinc-800'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-bold ${purchaseCount >= 5 ? 'text-amber-500' : 'text-zinc-500'}`}>META 1: SERVICIO GRATIS</span>
                                <span className="text-[10px] font-black text-zinc-600">{purchaseCount}/5 COMPRAS</span>
                            </div>
                            <p className="text-[10px] text-zinc-500">5 amigos deben completar su mantenimiento de $25.</p>
                        </div>
                        <div className={`p-4 rounded-xl border transition-colors ${leadCount >= 10 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/40 border-zinc-800'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={`text-xs font-bold ${leadCount >= 10 ? 'text-blue-500' : 'text-zinc-500'}`}>META 2: CAMBIO DE ACEITE</span>
                                <span className="text-[10px] font-black text-zinc-600">{leadCount}/10 CONTACTOS</span>
                            </div>
                            <p className="text-[10px] text-zinc-500">Solo necesitamos el contacto para ofrecer el servicio.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Technical Transparency */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <Settings className="w-5 h-5 text-amber-500" />
                    <h4 className="text-xl font-bold text-white">Transparencia del Servicio</h4>
                </div>
                <p className="text-sm text-zinc-400 mb-8">
                    ¿Qué incluye tu mantenimiento de $25? En Motocadena trabajamos con estándares profesionales.
                </p>

                <div className="grid grid-cols-1 gap-3">
                    {technicalPoints.map((point, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-black border border-zinc-800/50 hover:border-amber-500/20 transition-all group">
                            <div className="w-2 h-2 rounded-full bg-amber-500 group-hover:scale-150 transition-transform"></div>
                            <span className="text-sm text-zinc-300 font-medium">{point}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-6 bg-red-600/5 border border-red-600/10 rounded-2xl">
                    <div className="flex gap-4 items-center">
                        <ClipboardList className="w-10 h-10 text-red-600" />
                        <div>
                            <p className="text-xs font-black text-red-600 uppercase tracking-tighter">Nota Técnica</p>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                Este servicio asegura que tu moto esté lista para rodar sin sorpresas mecánicas.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default LoyaltyDashboard;
