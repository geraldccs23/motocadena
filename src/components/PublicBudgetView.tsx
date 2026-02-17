import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Check, X, Loader2, Gauge, Calendar, FileText, User, Bike, Trash2 } from 'lucide-react';

interface Budget {
    id: string;
    budget_number: number;
    workshop_id: string | null;
    customer_id: string | null;
    vehicle_id: string | null;
    manual_customer_name: string | null;
    manual_vehicle_name: string | null;
    status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
    valid_until: string | null;
    notes: string | null;
    total_amount: number;
    created_at: string;
}

interface BudgetItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
}

interface Workshop {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
}

const PublicBudgetView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [budget, setBudget] = useState<Budget | null>(null);
    const [items, setItems] = useState<BudgetItem[]>([]);
    const [workshop, setWorkshop] = useState<Workshop | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchBudgetData();
        }
    }, [id]);

    const fetchBudgetData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Fetch Budget
            const { data: budgetData, error: budgetError } = await supabase
                .from('budgets')
                .select('*')
                .eq('id', id)
                .single();

            if (budgetError) throw budgetError;
            setBudget(budgetData as any);

            // Fetch Items
            const { data: itemsData, error: itemsError } = await supabase
                .from('budget_items')
                .select('*')
                .eq('budget_id', id);

            if (itemsError) throw itemsError;
            setItems((itemsData as any[]) || []);

            // Fetch Workshop Info
            if (budgetData && (budgetData as any).workshop_id) {
                const { data: workshopData } = await supabase
                    .from('workshops')
                    .select('*')
                    .eq('id', (budgetData as any).workshop_id)
                    .single();

                if (workshopData) setWorkshop(workshopData as Workshop);
            }
        } catch (err: any) {
            console.error("Error fetching budget:", err);
            setError("No se pudo encontrar el presupuesto. Por favor verifica el link.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: 'APPROVED' | 'REJECTED') => {
        if (!id) return;
        setUpdating(true);
        try {
            const { error: updateError } = await supabase
                .from('budgets')
                .update({ status: newStatus } as any)
                .eq('id', id);

            if (updateError) throw updateError;

            setBudget(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (err: any) {
            alert("Error al actualizar el presupuesto: " + err.message);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-amber-500">
                <Loader2 size={48} className="animate-spin" />
                <p className="heading-racing text-2xl tracking-widest uppercase italic">Cargando Cotización...</p>
            </div>
        );
    }

    if (error || !budget) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="glass-panel p-10 rounded-[3rem] border-amber-500/20 max-w-md">
                    <X size={64} className="text-red-500 mx-auto mb-6" />
                    <h2 className="text-zinc-100 heading-racing text-3xl mb-4 italic">ERROR</h2>
                    <p className="text-zinc-400 mb-8">{error || "Presupuesto no encontrado"}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-amber-500 text-black px-8 py-3 rounded-xl font-bold heading-racing uppercase hover:bg-amber-400 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    const isFinalized = budget.status === 'APPROVED' || budget.status === 'REJECTED' || budget.status === 'EXPIRED';

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans pb-20">
            {/* Header / Branding */}
            <div className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-500 flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                            <Gauge className="text-black" size={28} />
                        </div>
                        <div>
                            <h1 className="heading-racing text-2xl italic tracking-tighter text-glow-amber leading-none uppercase">{workshop?.name || 'Motocadena'}</h1>
                            <p className="text-[10px] text-zinc-500 tracking-[0.2em] font-bold uppercase mt-1">Sincroniza tu pasión</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold heading-racing tracking-widest uppercase border ${budget.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                            budget.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            }`}>
                            {budget.status === 'DRAFT' ? 'PENDIENTE' :
                                budget.status === 'SENT' ? 'ENVIADO' :
                                    budget.status === 'APPROVED' ? 'ACEPTADO' :
                                        budget.status === 'REJECTED' ? 'RECHAZADO' : budget.status}
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 pt-10">
                {/* Intro Section */}
                <div className="mb-12">
                    <h2 className="heading-racing text-5xl italic tracking-tighter mb-4">Presupuesto #{budget.budget_number}</h2>
                    <div className="text-zinc-400 max-w-2xl leading-relaxed italic">
                        "En Motocadena, entendemos que cada kilómetro cuenta. Hemos diseñado esta propuesta para asegurar que tu máquina rinda al nivel de tu pasión."
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="glass-panel p-8 rounded-[2rem] border-zinc-800/50 hover:border-amber-500/20 transition-all group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-colors">
                                <User size={20} />
                            </div>
                            <h3 className="heading-racing text-lg uppercase tracking-widest italic">Información del Cliente</h3>
                        </div>
                        <p className="text-zinc-100 text-2xl font-bold mb-1">{budget.manual_customer_name || 'Cliente Motocadena'}</p>
                        <p className="text-zinc-500 text-sm">Registro de servicio preferencial</p>
                    </div>

                    <div className="glass-panel p-8 rounded-[2rem] border-zinc-800/50 hover:border-amber-500/20 transition-all group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-colors">
                                <Bike size={24} />
                            </div>
                            <h3 className="heading-racing text-lg uppercase tracking-widest italic">Detalles de la Máquina</h3>
                        </div>
                        <p className="text-zinc-100 text-2xl font-bold mb-1">{budget.manual_vehicle_name || 'Vehículo bajo revisión'}</p>
                        <p className="text-zinc-500 text-sm">Configuración de alto rendimiento</p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="glass-panel rounded-[2rem] border-zinc-800/50 overflow-hidden mb-10">
                    <div className="bg-zinc-900/50 px-8 py-5 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="heading-racing text-xl italic tracking-wide uppercase">Plan de Intervención</h3>
                        <div className="flex items-center gap-2 text-zinc-500 text-sm italic">
                            <Calendar size={16} />
                            Válido hasta: {budget.valid_until ? new Date(budget.valid_until).toLocaleDateString() : 'Consultar'}
                        </div>
                    </div>
                    <div className="px-8 py-4">
                        {items.length === 0 ? (
                            <p className="py-10 text-center text-zinc-600 italic">No hay detalles disponibles</p>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                                        <th className="text-left py-4">Descripción del Servicio / Repuesto</th>
                                        <th className="text-center py-4">Cant.</th>
                                        <th className="text-right py-4">Precio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="group">
                                            <td className="py-6 text-zinc-300 group-hover:text-zinc-100 transition-colors uppercase text-sm font-medium tracking-tight">
                                                {item.description}
                                            </td>
                                            <td className="py-6 text-center text-zinc-400 font-mono tracking-tighter">
                                                {item.quantity}
                                            </td>
                                            <td className="py-6 text-right text-amber-500 font-mono text-lg tracking-tighter">
                                                ${(item.quantity * item.unit_price).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="bg-amber-500/5 border-t border-zinc-800 px-8 py-10 flex flex-col items-end">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em] mb-2">Inversión Final Proyectada</p>
                        <div className="text-6xl heading-racing italic text-amber-500 text-glow-amber tracking-tighter">
                            ${budget.total_amount.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {budget.notes && (
                    <div className="mb-12 p-8 border-l-4 border-amber-500/50 bg-amber-500/5 rounded-r-[1rem] italic text-zinc-400 leading-relaxed">
                        <FileText size={18} className="mb-3 text-amber-500/50" />
                        "{budget.notes}"
                    </div>
                )}

                {/* Actions */}
                {!isFinalized ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            disabled={updating}
                            onClick={() => handleUpdateStatus('APPROVED')}
                            className="bg-green-600 hover:bg-green-500 text-white py-6 rounded-2xl font-bold heading-racing text-2xl uppercase tracking-tighter shadow-[0_4px_30px_rgba(22,163,74,0.3)] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {updating ? <Loader2 className="animate-spin text-white" /> : <Check size={28} />}
                            Aceptar Presupuesto
                        </button>
                        <button
                            disabled={updating}
                            onClick={() => handleUpdateStatus('REJECTED')}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-6 rounded-2xl font-bold heading-racing text-2xl uppercase tracking-tighter border border-zinc-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {updating ? <Loader2 className="animate-spin text-zinc-300" /> : <Trash2 size={24} />}
                            Rechazar Propuesta
                        </button>
                    </div>
                ) : (
                    <div className={`p-10 rounded-[3rem] text-center border-2 ${budget.status === 'APPROVED' ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800 bg-zinc-900/30'
                        }`}>
                        {budget.status === 'APPROVED' ? (
                            <>
                                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(22,163,74,0.4)]">
                                    <Check size={40} className="text-white" />
                                </div>
                                <h3 className="heading-racing text-4xl italic text-green-500 uppercase tracking-tighter mb-4">¡Presupuesto Aceptado!</h3>
                                <p className="text-zinc-400 italic">Gracias por confiar en Motocadena. Nos pondremos en contacto pronto para iniciar la intervención.</p>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <X size={40} className="text-zinc-500" />
                                </div>
                                <h3 className="heading-racing text-4xl italic text-zinc-500 uppercase tracking-tighter mb-4">Propuesta Finalizada</h3>
                                <p className="text-zinc-500 italic">Esta cotización ha sido gestionada. Si deseas una nueva revisión, no dudes en contactarnos.</p>
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="max-w-4xl mx-auto px-6 mt-20 text-center opacity-30 text-[9px] uppercase tracking-[0.4em] italic pointer-events-none">
                Motocadena Ecosystem • High Performance Logic • {new Date().getFullYear()}
            </footer>
        </div>
    );
};

export default PublicBudgetView;
