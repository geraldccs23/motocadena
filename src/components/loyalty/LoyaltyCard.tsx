import React, { useEffect, useState } from 'react';
import { Check, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LoyaltyCardProps {
    purchaseCount: number;
    leadCount: number;
    maxPurchases?: number;
    maxLeads?: number;
}

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({
    purchaseCount,
    leadCount,
    maxPurchases = 5,
    maxLeads = 10
}) => {
    const [celebratedPurchase, setCelebratedPurchase] = useState(false);
    const [celebratedLead, setCelebratedLead] = useState(false);

    useEffect(() => {
        if (purchaseCount >= maxPurchases && !celebratedPurchase) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#f59e0b', '#dc2626', '#ffffff']
            });
            setCelebratedPurchase(true);
        } else if (purchaseCount < maxPurchases) {
            setCelebratedPurchase(false);
        }
    }, [purchaseCount, maxPurchases, celebratedPurchase]);

    useEffect(() => {
        if (leadCount >= maxLeads && !celebratedLead) {
            confetti({
                particleCount: 100,
                spread: 50,
                origin: { y: 0.8 },
                colors: ['#3b82f6', '#10b981', '#ffffff']
            });
            setCelebratedLead(true);
        } else if (leadCount < maxLeads) {
            setCelebratedLead(false);
        }
    }, [leadCount, maxLeads, celebratedLead]);

    const leadProgress = (leadCount / maxLeads) * 100;

    return (
        <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-red-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-zinc-900 border border-zinc-800 p-8 rounded-2xl overflow-hidden shadow-2xl">
                {/* Card Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-white italic heading-racing tracking-tight">GIFT CARD DIGITAL</h3>
                        <p className="text-[10px] text-amber-500 font-bold tracking-widest uppercase mb-1">Motocadena Rewards</p>
                    </div>
                    <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        <Trophy className="w-6 h-6 text-amber-500" />
                    </div>
                </div>

                {/* META 1: SERVICE (Purchases) */}
                <div className="mb-10">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Meta 1: Servicio Gratis (5 Compras)</span>
                        <span className="text-[10px] font-bold text-amber-500">{purchaseCount} / {maxPurchases}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                        {[...Array(maxPurchases)].map((_, i) => (
                            <div
                                key={i}
                                className={`
                                    relative w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500
                                    ${i < purchaseCount
                                        ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                                        : 'border-zinc-800 bg-zinc-950'}
                                `}
                            >
                                {i < purchaseCount ? (
                                    <Check className="w-6 h-6 text-amber-500 animate-in zoom-in duration-300" />
                                ) : (
                                    <span className="text-zinc-800 font-black text-lg">{i + 1}</span>
                                )}
                                {i < purchaseCount && i === purchaseCount - 1 && (
                                    <div className="absolute inset-0 rounded-full animate-ping bg-amber-500/20"></div>
                                )}
                            </div>
                        ))}
                    </div>
                    {purchaseCount >= maxPurchases && (
                        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-in fade-in zoom-in">
                            <p className="text-center text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                                ¡MANTENIMIENTO GRATIS ACTIVADO! 🎉
                            </p>
                        </div>
                    )}
                </div>

                {/* META 2: OIL (Leads) */}
                <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-zinc-500">Meta 2: Cambio de Aceite (10 Referidos)</span>
                        <span className="text-blue-500">{leadCount} / {maxLeads}</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-950 rounded-full border border-zinc-800 overflow-hidden p-0.5">
                        <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${Math.min(leadProgress, 100)}%` }}
                        ></div>
                    </div>
                    {leadCount >= maxLeads && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-in fade-in zoom-in">
                            <p className="text-center text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                                ¡CAMBIO DE ACEITE GRATIS ACTIVADO! 🛢️
                            </p>
                        </div>
                    )}
                </div>

                {/* Background Accents */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
};

export default LoyaltyCard;
