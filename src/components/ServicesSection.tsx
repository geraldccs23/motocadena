import React from 'react';
import { Zap, Shield, Award } from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';

const ServicesSection: React.FC = () => {
    const basicServices = [
        "Revisión del flotante de gasolina",
        "Ajuste de rodamientos / holguras",
        "Ajuste general de la moto (tornillería crítica)",
        "Mantenimiento del filtro del purificador / caja filtro",
        "Revisión y ajuste de luces: altas, bajas, direccionales y stop",
        "Cambio de aceite + limpieza de filtro",
        "Calibración y limpieza de bujía",
        "Ajuste de clutch y freno (cable/tensión)",
        "Ajuste de cadena y alineación básica de rueda",
        "Revisión de presión de neumáticos y desgaste",
        "Revisión de batería y terminales",
        "Engrase rápido de cables, palancas y pedales",
    ];

    const pricingList = [
        ["Motor 3/4", "$25"],
        ["Reparación de motor (completo)", "$50"],
        ["Reparación o cambio de caja", "$50"],
        ["Calibración de válvulas", "$15"],
        ["Limpieza de carburador", "$10"],
        ["Cambio de cadena, piñón y corona", "$20"],
        ["Mantenimiento de barras", "$20"],
        ["Cambio o mantenimiento de pista del manubrio", "$20"],
        ["Reparaciones del croche (clutch)", "$20"],
        ["Diagnóstico eléctrico", "$15 – $30"],
        ["Cambio de buje de horquilla", "$20"],
        ["Mantenimiento / reparación de frenos", "$10 – $15"],
        ["Cambio de árbol de levas", "$20"],
        ["Revisión para detectar fallas", "$10"],
    ];

    return (
        <section id="servicios" className="py-20 px-4">
            <div className="container mx-auto max-w-6xl">
                {/* Value Props */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    <Card className="text-center p-8 bg-zinc-900/50 border-zinc-800">
                        <Zap className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">RAPIDEZ</h3>
                        <p className="text-sm text-zinc-400">Servicio eficiente sin comprometer la calidad en cada detalle.</p>
                    </Card>
                    <Card className="text-center p-8 bg-zinc-900/50 border-zinc-800">
                        <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">GARANTÍA</h3>
                        <p className="text-sm text-zinc-400">Respaldamos nuestro trabajo con garantía total para tu tranquilidad.</p>
                    </Card>
                    <Card className="text-center p-8 bg-zinc-900/50 border-zinc-800">
                        <Award className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">EXPERIENCIA</h3>
                        <p className="text-sm text-zinc-400">Años trabajando con todas las marcas y modelos del mercado.</p>
                    </Card>
                </div>

                <div className="text-center mb-12">
                    <Badge variant="warning" className="mb-4">CATÁLOGO</Badge>
                    <h2 className="text-4xl md:text-5xl font-bold heading-racing text-white">
                        Nuestros Servicios
                    </h2>
                    <p className="text-neutral-400 mt-2">
                        Elegibles para miembros y público en general
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Basic Services List */}
                    <div>
                        <h3 className="text-2xl font-bold text-amber-500 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm font-black">1</span>
                            Servicios Básicos
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {basicServices.map((srv, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/30 transition-colors">
                                    <span className="text-amber-500">⚡</span>
                                    <p className="text-sm text-zinc-300">{srv}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Pricing */}
                    <div>
                        <h3 className="text-2xl font-bold text-amber-500 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm font-black">2</span>
                            Mano de Obra Especializada
                        </h3>
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 overflow-hidden">
                            <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-2 max-h-[500px] overflow-y-auto">
                                {pricingList.map(([serv, price], i) => (
                                    <div key={i} className="flex flex-col p-3 rounded-lg bg-black/40 border border-zinc-900 hover:border-zinc-700 transition-all">
                                        <span className="text-xs text-zinc-500 mb-1">{serv}</span>
                                        <span className="text-lg font-bold text-amber-400">{price}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed">
                                    * Precios base de mano de obra. Repuestos e insumos no incluidos.
                                    Sujetos a cambios según complejidad técnica.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <Button
                                className="flex-1 h-14"
                                onClick={() => window.open('https://wa.me/584147131270?text=Hola%20Motocadena%2C%20quiero%20cotizar%20un%20servicio', '_blank')}
                            >
                                SOLICITAR COTIZACIÓN PERSONALIZADA
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ServicesSection;
