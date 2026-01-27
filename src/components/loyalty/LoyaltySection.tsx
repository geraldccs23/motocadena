import React, { useState, useEffect } from 'react';
import { LogOut, Award, Sparkles, MessageSquare, Video } from 'lucide-react';
import LoyaltyCard from './LoyaltyCard';
import LoyaltyDashboard from './LoyaltyDashboard';
import VirtualMechanic from './VirtualMechanic';
import MarketingPrompter from './MarketingPrompter';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { supabase } from '../../lib/supabase';

interface Referral {
    referred_name: string;
    referred_phone: string;
    status: 'lead' | 'completed';
}

const LoyaltySection: React.FC = () => {
    const [userName, setUserName] = useState<string | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [activeTab, setActiveTab] = useState<'loyalty' | 'ai' | 'marketing'>('loyalty');
    const [isLoading, setIsLoading] = useState(false);

    // Initial Load
    useEffect(() => {
        const savedName = localStorage.getItem('motocadena_user_name');
        if (savedName) {
            setUserName(savedName);
            fetchReferrals(savedName);
        }
    }, []);

    const fetchReferrals = async (name: string) => {
        setIsLoading(true);
        const { data, error } = await (supabase
            .from('loyalty_referrals') as any)
            .select('referred_name, referred_phone, status')
            .eq('referrer_name', name);

        if (error) {
            console.error('Error fetching referrals:', error);
        } else if (data) {
            setReferrals(data);
        }
        setIsLoading(false);
    };

    const handleAddReferral = async (name: string, phone: string) => {
        if (!userName) return;

        const { error } = await (supabase
            .from('loyalty_referrals') as any)
            .insert([{
                referrer_name: userName!,
                referred_name: name,
                referred_phone: phone,
                status: 'lead'
            }]);

        if (error) {
            alert('Error al registrar referido: ' + error.message);
        } else {
            setReferrals((prev: Referral[]) => [...prev, { referred_name: name, referred_phone: phone, status: 'lead' }]);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('motocadena_user_name');
        setUserName(null);
        setReferrals([]);
    };

    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('userName') as string;
        if (name.trim()) {
            const trimmedName = name.trim();
            setUserName(trimmedName);
            localStorage.setItem('motocadena_user_name', trimmedName);
            fetchReferrals(trimmedName);
        }
    };

    const purchaseCount = referrals.filter(r => r.status === 'completed').length;
    const leadCount = referrals.length;

    if (!userName) {
        return (
            <section id="lealtad" className="py-24 bg-zinc-950/50 border-y border-zinc-900 relative overflow-hidden">
                <div className="container mx-auto px-4 max-w-xl text-center relative z-10">
                    <Badge variant="warning" className="mb-6">SISTEMA RECOMPENSAS</Badge>
                    <h2 className="text-4xl font-black heading-racing text-white mb-6">ACTIVA TU TARJETA DIGITAL</h2>
                    <p className="text-zinc-400 mb-10">
                        Únete a la comunidad Motocadena, acumula referidos y obtén servicios gratuitos para tu máquina.
                    </p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            name="userName"
                            type="text"
                            placeholder="Tu nombre completo..."
                            required
                            className="w-full bg-black border border-zinc-800 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                        />
                        <Button type="submit" className="w-full h-14 font-black tracking-widest uppercase">
                            EMPEZAR A RODAR
                        </Button>
                    </form>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
            </section>
        );
    }

    return (
        <section id="lealtad" className="py-24 bg-zinc-950 relative overflow-hidden">
            <div className="container mx-auto px-4 max-w-6xl relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            <h2 className="text-3xl font-black heading-racing text-white italic">HOLA, <span className="text-amber-500">{userName.toUpperCase()}</span></h2>
                        </div>
                        <p className="text-zinc-500 text-sm font-medium">Bienvenido a tu panel de lealtad personalizada.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 text-red-500 border-red-500/20 hover:bg-red-500/10">
                            <LogOut className="w-3.5 h-3.5" />
                            SALIR
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800 mb-8 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('loyalty')}
                        className={`px-8 py-4 text-xs font-black tracking-[0.2em] transition-all whitespace-nowrap border-b-2 ${activeTab === 'loyalty' ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-500'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            MI PROGRESO
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-8 py-4 text-xs font-black tracking-[0.2em] transition-all whitespace-nowrap border-b-2 ${activeTab === 'ai' ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-500'}`}
                    >
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5" />
                            MECÁNICO VIRTUAL
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`px-8 py-4 text-xs font-black tracking-[0.2em] transition-all whitespace-nowrap border-b-2 ${activeTab === 'marketing' ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-500'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Video className="w-3.5 h-3.5" />
                            HERRAMIENTA REELS
                        </div>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando datos de lealtad...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'loyalty' && (
                                <div className="space-y-12">
                                    <div className="max-w-md mx-auto">
                                        <LoyaltyCard purchaseCount={purchaseCount} leadCount={leadCount} />
                                    </div>
                                    <LoyaltyDashboard onAddReferral={handleAddReferral} purchaseCount={purchaseCount} leadCount={leadCount} />
                                </div>
                            )}
                            {activeTab === 'ai' && (
                                <div className="max-w-3xl mx-auto">
                                    <div className="mb-8 text-center">
                                        <h3 className="text-2xl font-black text-white italic mb-2">CONSULTA TÉCNICA AI</h3>
                                        <p className="text-zinc-500 text-sm">Resuelve tus dudas sobre el servicio de $25 con nuestro experto virtual.</p>
                                    </div>
                                    <VirtualMechanic />
                                </div>
                            )}
                            {activeTab === 'marketing' && (
                                <div className="max-w-3xl mx-auto">
                                    <div className="mb-8 text-center">
                                        <h3 className="text-2xl font-black text-white italic mb-2">CREADOR DE CONTENIDO</h3>
                                        <p className="text-zinc-500 text-sm">Usa nuestro teleprompter para grabar tus videos y promocionar tu código.</p>
                                    </div>
                                    <MarketingPrompter />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Background Decor */}
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
        </section>
    );
};

export default LoyaltySection;
