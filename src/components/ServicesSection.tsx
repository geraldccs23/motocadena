import React, { useEffect, useState } from 'react';
import { Zap, Shield, Award, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Service } from '../types';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

const ServicesSection: React.FC = () => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchServices = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('services')
                    .select('*')
                    .order('name');
                if (error) throw error;
                setServices(data || []);
            } catch (err) {
                console.error("Error fetching services:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchServices();
    }, []);

    // Categorización lógica
    const scooterServices = services.filter(s => s.name.toLowerCase().includes('scooter') || s.description?.toLowerCase().includes('scooter'));
    const standardServices = services.filter(s => !scooterServices.some(sc => sc.id === s.id));

    return (
        <section id="servicios" className="py-20 px-4">
            <div className="container mx-auto max-w-7xl">
                {/* Value Props */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                    <Card className="text-center p-8 bg-zinc-900/50 border-zinc-800 hover:border-amber-500/30 transition-all">
                        <Zap className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">RAPIDEZ</h3>
                        <p className="text-sm text-zinc-400 font-medium">Servicio eficiente sin comprometer la calidad en cada detalle.</p>
                    </Card>
                    <Card className="text-center p-8 bg-zinc-900/50 border-zinc-800 hover:border-amber-500/30 transition-all">
                        <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">GARANTÍA</h3>
                        <p className="text-sm text-zinc-400 font-medium">Respaldamos nuestro trabajo con garantía total para tu tranquilidad.</p>
                    </Card>
                    <Card className="text-center p-8 bg-zinc-900/50 border-zinc-800 hover:border-amber-500/30 transition-all">
                        <Award className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">EXPERIENCIA</h3>
                        <p className="text-sm text-zinc-400 font-medium">Años trabajando con todas las marcas y modelos del mercado.</p>
                    </Card>
                </div>

                <div className="text-center mb-16">
                    <Badge variant="warning" className="mb-4">TELEMETRÍA DE SERVICIO</Badge>
                    <h2 className="text-5xl md:text-7xl font-bold heading-racing text-white mb-4 italic tracking-tighter">
                        Nuestro <span className="text-amber-500 text-glow-amber">Line-Up</span>
                    </h2>
                    <p className="text-neutral-400 max-w-2xl mx-auto text-lg leading-relaxed">
                        Selecciona tu categoría y descubre el mantenimiento especializado que tu máquina merece.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="w-16 h-16 text-amber-500 animate-spin mb-6" />
                        <p className="text-zinc-500 italic uppercase tracking-widest font-black text-xs animate-pulse">Sincronizando Base de Datos de Pista...</p>
                    </div>
                ) : (
                    <div className="space-y-32">
                        {/* Categoría Standard */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div className="relative group overflow-hidden rounded-[3rem] border border-zinc-800 shadow-2xl order-2 lg:order-1">
                                <img src="/standard_service_premium.png" alt="Standard Services" className="w-full h-[500px] object-cover transition-transform duration-1000 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-10">
                                    <h3 className="heading-racing text-5xl text-white italic mb-2">STANDARD</h3>
                                    <p className="text-amber-500 font-bold tracking-widest text-xs uppercase">Motos de Cambios y Sport</p>
                                </div>
                            </div>
                            <div className="space-y-6 order-1 lg:order-2">
                                <h3 className="text-3xl font-black heading-racing text-white italic border-l-4 border-amber-500 pl-4">
                                    SERVICIOS <span className="text-amber-500">STANDAR</span>
                                </h3>
                                <p className="text-zinc-500 text-sm font-medium leading-relaxed italic pr-8">
                                    Mantenimiento integral para motocicletas de transmisión manual y alto rendimiento.
                                </p>
                                <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-4">
                                    {standardServices.length > 0 ? standardServices.map((srv) => (
                                        <div key={srv.id} className="flex justify-between items-center p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:border-amber-500/30 transition-all group">
                                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{srv.name}</span>
                                            <span className="text-xl font-black heading-racing text-amber-500 italic">${Number(srv.price || 0).toFixed(0)}</span>
                                        </div>
                                    )) : (
                                        <p className="text-zinc-600 italic text-sm py-4">Sincronizando servicios standard...</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Categoría Scooter */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <h3 className="text-3xl font-black heading-racing text-white italic border-l-4 border-amber-500 pl-4">
                                    SERVICIOS <span className="text-amber-500">SCOOTER</span>
                                </h3>
                                <p className="text-zinc-500 text-sm font-medium leading-relaxed italic pr-8">
                                    Especialistas en transmisión CVT y sistemas automáticos para máxima fluidez en la ciudad.
                                </p>
                                <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-4">
                                    {scooterServices.length > 0 ? scooterServices.map((srv) => (
                                        <div key={srv.id} className="flex justify-between items-center p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:border-amber-500/30 transition-all group">
                                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{srv.name}</span>
                                            <span className="text-xl font-black heading-racing text-amber-500 italic">${Number(srv.price || 0).toFixed(0)}</span>
                                        </div>
                                    )) : (
                                        <p className="text-zinc-600 italic text-sm py-4">Sincronizando servicios scooter...</p>
                                    )}
                                </div>
                            </div>
                            <div className="relative group overflow-hidden rounded-[3rem] border border-zinc-800 shadow-2xl">
                                <img src="/scooter_service_premium.png" alt="Scooter Services" className="w-full h-[500px] object-cover transition-transform duration-1000 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-10">
                                    <h3 className="heading-racing text-5xl text-white italic mb-2">SCOOTER</h3>
                                    <p className="text-amber-500 font-bold tracking-widest text-xs uppercase">Automáticas y CVT Performance</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-24 pt-12 border-t border-zinc-900 text-center">
                    <Button
                        size="lg"
                        className="h-16 px-12 heading-racing text-2xl italic gap-4 shadow-[0_0_50px_rgba(245,158,11,0.2)]"
                        onClick={() => window.open('https://wa.me/584147131270?text=Hola%20Motocadena%2C%20quiero%20cotizar%20un%20servicio', '_blank')}
                    >
                        CONSULTA TÉCNICA PERSONALIZADA <ArrowRight className="w-6 h-6" />
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default ServicesSection;
