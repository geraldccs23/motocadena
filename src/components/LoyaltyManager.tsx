import { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock, User, Phone, Award, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Referral {
    id: string;
    referrer_name: string;
    referred_name: string;
    referred_phone: string;
    status: 'lead' | 'completed';
    created_at: string;
}

export default function LoyaltyManager() {
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'lead' | 'completed'>('all');

    useEffect(() => {
        fetchReferrals();
    }, []);

    const fetchReferrals = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('loyalty_referrals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching referrals:', error);
        } else {
            setReferrals(data || []);
        }
        setIsLoading(false);
    };

    const approveService = async (id: string) => {
        const { error } = await (supabase
            .from('loyalty_referrals') as any)
            .update({ status: 'completed' })
            .eq('id', id);

        if (error) {
            alert('Error al aprobar servicio: ' + error.message);
        } else {
            setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'completed' } : r));
        }
    };

    const filteredReferrals = referrals.filter(r => {
        const matchesSearch =
            r.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.referred_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold heading-racing text-neutral-100 mb-2 italic">GESTIÓN DE LEALTAD</h2>
                    <p className="text-neutral-400 text-racing uppercase tracking-widest text-xs">Validación de referidos y servicios</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-metal p-6 border-l-4 border-amber-500">
                    <p className="text-neutral-400 text-[10px] uppercase font-bold tracking-widest mb-1">Total Referidos (Leads)</p>
                    <p className="text-3xl font-black text-white">{referrals.length}</p>
                </div>
                <div className="card-metal p-6 border-l-4 border-green-500">
                    <p className="text-neutral-400 text-[10px] uppercase font-bold tracking-widest mb-1">Servicios Completados</p>
                    <p className="text-3xl font-black text-white">{referrals.filter(r => r.status === 'completed').length}</p>
                </div>
                <div className="card-metal p-6 border-l-4 border-blue-500">
                    <p className="text-neutral-400 text-[10px] uppercase font-bold tracking-widest mb-1">Pendientes por Servicio</p>
                    <p className="text-3xl font-black text-white">{referrals.filter(r => r.status === 'lead').length}</p>
                </div>
            </div>

            <div className="card-metal p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Buscar por cliente o amigo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-neutral-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-neutral-900 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none min-w-[150px]"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="lead">Solo Contactos</option>
                            <option value="completed">Solo Completados</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-neutral-800 text-[10px] uppercase font-bold tracking-widest text-neutral-500">
                                <th className="pb-4 px-4">Referido por</th>
                                <th className="pb-4 px-4">Amigo / Contacto</th>
                                <th className="pb-4 px-4">WhatsApp</th>
                                <th className="pb-4 px-4">Estado</th>
                                <th className="pb-4 px-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-neutral-500 font-bold uppercase tracking-widest animate-pulse">
                                        Cargando base de datos...
                                    </td>
                                </tr>
                            ) : filteredReferrals.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-neutral-500 font-bold uppercase tracking-widest">
                                        No se encontraron registros
                                    </td>
                                </tr>
                            ) : filteredReferrals.map((r) => (
                                <tr key={r.id} className="group hover:bg-neutral-800/30 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                                <User className="w-4 h-4 text-amber-500" />
                                            </div>
                                            <span className="text-sm font-bold text-neutral-200">{r.referrer_name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-sm text-neutral-300 font-medium">{r.referred_name}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-neutral-500" />
                                            <a
                                                href={`https://wa.me/${r.referred_phone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono"
                                            >
                                                {r.referred_phone}
                                            </a>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        {r.status === 'completed' ? (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-black uppercase text-green-500">
                                                <CheckCircle className="w-3 h-3" />
                                                Completado
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase text-blue-500">
                                                <Clock className="w-3 h-3" />
                                                Pendiente
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        {r.status === 'lead' && (
                                            <button
                                                onClick={() => approveService(r.id)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all transform active:scale-95"
                                            >
                                                <Award className="w-3.5 h-3.5" />
                                                Aprobar Servicio
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
