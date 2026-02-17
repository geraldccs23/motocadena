import React, { useEffect, useState } from 'react';
import { Wrench, Loader2, Info, ArrowRight, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Service } from '../types';
import Badge from './ui/Badge';
import Button from './ui/Button';

const ScooterServicesSection: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScooterServices = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('services')
                    .select('id, name, description, price, estimated_duration_min, is_active')
                    .eq('is_active', true)
                    .order('price');
                if (error) throw error;
                setServices(data || []);
            } catch (err) {
                console.error("Error fetching Scooter services:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchScooterServices();
    }, []);

    // Enhanced categorization logic
    const individualServices = services.filter((s: Service) => s.name.toLowerCase().includes('scooter') && !s.name.toLowerCase().includes('completa') && !s.name.toLowerCase().includes('general'));
    const combinedServices = services.filter((s: Service) => s.name.toLowerCase().includes('scooter') && (s.name.toLowerCase().includes('general') || s.name.toLowerCase().includes('combinado')));
    const fullServices = services.filter((s: Service) => s.name.toLowerCase().includes('scooter') && s.name.toLowerCase().includes('completa'));

    return (
        <section id="scooter-servicios" className="py-24 px-4 bg-zinc-950 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-amber-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-amber-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

            <div className="container mx-auto max-w-6xl relative z-10">
                <div className="text-center mb-16">
                    <Badge variant="warning" className="mb-4 px-4 py-1.5 text-[10px] tracking-[0.3em]">EXCLUSIVO SCOOTER</Badge>
                    <h2 className="text-5xl md:text-7xl font-black heading-racing text-white mb-6 italic tracking-tighter">
                        Servicios para <br />
                        <span className="text-amber-500 text-glow-amber">SCOOTER</span>
                    </h2>
                    <p className="text-zinc-400 max-w-3xl mx-auto text-lg leading-relaxed">
                        Nuestros servicios para scooter están diseñados específicamente para este tipo de vehículo, considerando su sistema de transmisión automática (**CVT**), configuración del motor y uso urbano.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Loader2 className="w-16 h-16 text-amber-500 animate-spin mb-6" />
                        <p className="text-zinc-500 heading-racing text-xl italic animate-pulse">CARGANDO TARIFARIO SCOOTER...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Individual Services */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                                <h3 className="text-2xl font-black heading-racing text-white italic border-l-4 border-amber-500 pl-4 mb-8">
                                    SERVICIOS INDIVIDUALES
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {individualServices.map((srv: Service) => (
                                        <div key={srv.id} className="flex justify-between items-center p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 hover:border-amber-500/30 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-amber-500 transition-colors">
                                                    <Wrench size={18} />
                                                </div>
                                                <span className="text-sm font-bold text-zinc-300 leading-tight pr-4">{srv.name.replace(' (Scooter)', '')}</span>
                                            </div>
                                            <span className="text-2xl font-black heading-racing text-amber-500 italic shrink-0">${srv.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-zinc-900/50 to-amber-900/10">
                                <h3 className="text-2xl font-black heading-racing text-white italic border-l-4 border-amber-500 pl-4 mb-8">
                                    SERVICIOS COMBINADOS
                                </h3>
                                {combinedServices.map((srv: Service) => (
                                    <div key={srv.id} className="flex flex-col md:flex-row justify-between items-center p-8 rounded-3xl bg-black/40 border-2 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
                                        <div className="mb-6 md:mb-0">
                                            <h4 className="text-3xl font-black heading-racing text-amber-500 italic mb-2">{srv.name.replace(' (Scooter)', '')}</h4>
                                            <p className="text-zinc-500 text-sm font-medium italic">Paquete de mantenimiento básico para scooter con revisión general</p>
                                        </div>
                                        <div className="text-center md:text-right">
                                            <span className="text-6xl font-black heading-racing text-white italic block mb-1">${srv.price} <span className="text-sm uppercase tracking-widest text-zinc-500 not-italic">USD</span></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Full Service Scooter Completa */}
                        <div className="lg:col-span-1">
                            <div className="glass-panel p-8 rounded-[3rem] border border-amber-500/30 bg-zinc-900/40 flex flex-col h-full relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Zap size={120} className="text-amber-500" />
                                </div>

                                <h3 className="text-4xl font-black heading-racing text-white italic mb-4 leading-tight">
                                    SERVICIO <br />
                                    <span className="text-amber-500 text-glow-amber">SCOOTER COMPLETA</span>
                                </h3>
                                <p className="text-zinc-500 text-xs uppercase tracking-widest font-black mb-8 border-b border-zinc-800 pb-4">CVT Performance & Urbana</p>

                                <div className="space-y-4 flex-1">
                                    {fullServices.map((srv: Service) => (
                                        <div key={srv.id} className="p-6 rounded-2xl bg-black/60 border border-zinc-800 hover:border-amber-500/50 transition-all">
                                            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest mb-1">Cilindrada</p>
                                            <div className="flex justify-between items-end">
                                                <span className="text-lg font-bold text-zinc-200">{srv.name.replace('Servicio Scooter Completa (', '').replace(')', '')}</span>
                                                <span className="text-3xl font-black heading-racing text-amber-500 italic">${srv.price}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 pt-6 border-t border-zinc-800">
                                    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                        <div className="flex items-start gap-3">
                                            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-zinc-200 uppercase font-black tracking-widest leading-relaxed">Nota Importante</p>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                                            Los precios y servicios aquí descritos aplican **únicamente a scooters**.
                                            Los precios pueden variar según el estado general del vehículo y su cilindrada.
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    className="w-full mt-8 py-6 heading-racing text-2xl italic gap-4 h-16"
                                    onClick={() => window.open('https://wa.me/584147131270?text=Hola%20Motocadena%20SCOOTER%2C%20quiero%20el%20servicio%20SCOOTER%20COMPLETA', '_blank')}
                                >
                                    AGENDAR AHORA <ArrowRight size={24} />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ScooterServicesSection;
