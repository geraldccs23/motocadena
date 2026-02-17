import React, { useEffect } from 'react';
import { ChevronLeft, Bike, Shield, Zap, Settings as Tool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScooterServicesSection from './ScooterServicesSection';

const ScooterPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-amber-500 selection:text-black font-sans">
            {/* Minimal Header */}
            <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/80 border-b border-zinc-900">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">VOLVER AL HOME</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <img src="/logomotocadena.png" alt="Logo" className="w-8 h-8 object-contain" />
                        <span className="heading-racing text-xl italic text-glow-amber">MOTOCADENA</span>
                    </div>

                    <div className="w-24 hidden md:block" /> {/* Spacer */}
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/scooter_service_premium.png')] bg-cover bg-center opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />

                <div className="container mx-auto px-4 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest mb-8">
                        <Bike size={14} />
                        MANTENIMIENTO ESPECIALIZADO SCOOTER
                    </div>
                    <h1 className="text-6xl md:text-9xl font-black heading-racing italic tracking-tighter mb-6 leading-none uppercase">
                        TRANSFORMAMOS TU <br />
                        <span className="text-amber-500 text-glow-amber">SCOOTER</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto italic font-medium">
                        Optimización de transmisiones CVT, inyección electrónica y servicios especializados para la movilidad urbana fluida.
                    </p>
                </div>
            </section>

            {/* Scooter Services Section */}
            <ScooterServicesSection />

            {/* Features Grid */}
            <section className="py-24 bg-zinc-950/50">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800 hover:border-amber-500/20 transition-all">
                            <Zap className="w-10 h-10 text-amber-500 mb-6" />
                            <h4 className="text-xl font-black heading-racing mb-2 italic">FLUIDEZ CVT</h4>
                            <p className="text-sm text-zinc-500 leading-relaxed font-medium">Calibración precisa de variadores, rodillos y correas para una entrega de potencia lineal.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800 hover:border-amber-500/20 transition-all">
                            <Shield className="w-10 h-10 text-amber-500 mb-6" />
                            <h4 className="text-xl font-black heading-racing mb-2 italic">SEGURIDAD</h4>
                            <p className="text-sm text-zinc-500 leading-relaxed font-medium">Revisión profunda de frenos combinados y estado de neumáticos para tu tranquilidad.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800 hover:border-amber-500/20 transition-all">
                            <Tool className="w-10 h-10 text-amber-500 mb-6" />
                            <h4 className="text-xl font-black heading-racing mb-2 italic">TECNOLOGÍA</h4>
                            <p className="text-sm text-zinc-500 leading-relaxed font-medium">Escaneo especializado para sistemas de inyección y sensores electrónicos de scooter.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800 hover:border-amber-500/20 transition-all">
                            <Bike className="w-10 h-10 text-amber-500 mb-6" />
                            <h4 className="text-xl font-black heading-racing mb-2 italic">CONFORT</h4>
                            <p className="text-sm text-zinc-500 leading-relaxed font-medium">Ajuste de suspensión y puntos de contacto para la mejor experiencia urbana.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-zinc-900 bg-black">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <img src="/logomotocadena.png" alt="Logo" className="w-10 h-10" />
                        <h1 className="text-2xl font-black text-white italic heading-racing">MOTOCADENA</h1>
                    </div>
                    <p className="text-zinc-600 text-[10px] uppercase font-black tracking-[0.5em]">© 2024 MOTOCADENA SYSTEM PERFORMANCE. ALL RIGHTS RESERVED.</p>
                </div>
            </footer>
        </div>
    );
};

export default ScooterPage;
