import React, { useState } from 'react';
import { Search, Bike, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOrderStatus } from '../hooks/useOrderStatus';
import Button from './ui/Button';
import Card, { CardContent } from './ui/Card';
import Badge from './ui/Badge';

const OrderStatusSection: React.FC = () => {
    const [plate, setPlate] = useState('');
    const { loading, error, result, lookupByPlate } = useOrderStatus();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        lookupByPlate(plate);
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'in_progress': return 'info';
            case 'pending': return 'warning';
            case 'cancelled': return 'danger';
            default: return 'default';
        }
    };

    return (
        <section id="consulta" className="py-20 px-4 bg-zinc-950/50">
            <div className="container mx-auto max-w-5xl">
                <div className="text-center mb-12">
                    <Badge variant="info" className="mb-4">CONSULTA RÁPIDA</Badge>
                    <h2 className="text-4xl md:text-5xl font-bold heading-racing text-white text-glow">
                        Estado de tu Reparación
                    </h2>
                    <p className="text-neutral-400 mt-2">
                        Consulta el progreso de tu moto ingresando su placa
                    </p>
                </div>

                <Card className="border-zinc-800 bg-zinc-900/30 backdrop-blur-md">
                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 mb-8">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type="text"
                                    value={plate}
                                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                                    placeholder="INGRESA LA PLACA (EJ: ABC123)"
                                    className="w-full h-12 bg-black/40 border border-zinc-700 rounded-xl pl-11 pr-4 text-white font-bold tracking-widest focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                />
                            </div>
                            <Button type="submit" className="h-12 px-8" isLoading={loading}>
                                CONSULTAR PROGRESO
                            </Button>
                        </form>

                        {error && (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
                                <AlertCircle className="w-5 h-5" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {result && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Client & Vehicle Info */}
                                <div className="space-y-6">
                                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Bike className="w-4 h-4 text-amber-500" />
                                            Vehículo Registrado
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-zinc-500 uppercase">Marca</p>
                                                <p className="text-lg font-bold text-white">{result.client?.vehicle_brand || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-zinc-500 uppercase">Modelo</p>
                                                <p className="text-lg font-bold text-white">{result.client?.vehicle_model || '—'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs text-zinc-500 uppercase">Propietario</p>
                                                <p className="text-lg font-bold text-white">{result.client?.full_name || '—'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Latest Order Info */}
                                <div className="space-y-6">
                                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-amber-500" />
                                            Estado Actual
                                        </h3>

                                        {result.order ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-zinc-400">ID de Orden:</span>
                                                    <span className="text-sm font-mono text-white">#{result.order.id.split('-')[0].toUpperCase()}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-zinc-400">Estatus:</span>
                                                    <Badge variant={getStatusVariant(result.order.status)}>
                                                        {result.order.status_label.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-zinc-400">Fecha:</span>
                                                    <span className="text-sm text-white">{new Date(result.order.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="pt-4 border-t border-zinc-800 mt-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle2 className={`w-4 h-4 ${result.inspections?.initial ? 'text-emerald-500' : 'text-zinc-600'}`} />
                                                        <span className={`text-xs ${result.inspections?.initial ? 'text-zinc-300' : 'text-zinc-600'}`}>Inspección de Entrada</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className={`w-4 h-4 ${result.inspections?.final ? 'text-emerald-500' : 'text-zinc-600'}`} />
                                                        <span className={`text-xs ${result.inspections?.final ? 'text-zinc-300' : 'text-zinc-600'}`}>Control de Calidad</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center bg-black/20 rounded-xl border border-dashed border-zinc-800">
                                                <p className="text-sm text-zinc-500 italic">No se encontraron órdenes activas</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </section>
    );
};

export default OrderStatusSection;
