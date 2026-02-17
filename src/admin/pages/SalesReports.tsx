
import React, { useEffect, useState } from 'react';
import {
    TrendingUp,
    Calendar,
    FileText,
    Store,
    User,
    Briefcase,
    Package,
    DollarSign,
    Loader2,
    FilterX,
    Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SalesLine {
    id_documento: string;
    tipo_documento: string;
    doc_num: string;
    fec_emis: string;
    nombre_vendedor: string;
    nombre_cliente: string;
    des_art: string;
    total_art: number;
    prec_vta: number;
    total_usd: number;
    branch_code: string;
}

interface MechanicReport {
    id: string;
    mechanic_name: string;
    customer_name: string;
    vehicle_plate: string;
    total_labor: number;
    commission_rate: number;
    commission_amount: number;
    created_at: string;
    status: string;
}

const SalesReports: React.FC = () => {
    const [sales, setSales] = useState<SalesLine[]>([]);
    const [mechanicReports, setMechanicReports] = useState<MechanicReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [totalDayUsd, setTotalDayUsd] = useState(0);
    const [totalCommissionsUsd, setTotalCommissionsUsd] = useState(0);
    const [activeTab, setActiveTab] = useState<'DAILY' | 'MECHANICS'>('DAILY');

    const fetchSales = async (date: string) => {
        setLoading(true);
        setError(null);
        try {
            // Fetch Daily Sales (Profit Integration)
            const { data: salesDataRaw, error: salesErr } = await supabase
                .from('profit_sales_lines')
                .select('*')
                .gte('fec_emis', `${date}T00:00:00`)
                .lte('fec_emis', `${date}T23:59:59`)
                .order('fec_emis', { ascending: false });

            if (salesErr && salesErr.code !== '42P01') throw salesErr;
            const salesData = (salesDataRaw || []) as SalesLine[];
            setSales(salesData);
            setTotalDayUsd(salesData.reduce((acc, curr) => acc + (curr.total_usd || 0), 0));

            // Fetch Mechanic Performance (Internal)
            const { data: woData, error: woErr } = await supabase
                .from('work_orders')
                .select(`
                    id, 
                    created_at, 
                    total_labor, 
                    status,
                    customer:customers(first_name, last_name),
                    vehicle:vehicles(plate),
                    mechanic:user_profiles!mechanic_id(full_name, commission_rate)
                `)
                .gte('created_at', `${date}T00:00:00`)
                .lte('created_at', `${date}T23:59:59`)
                .not('mechanic_id', 'is', null);

            if (woErr) throw woErr;

            const mReports: MechanicReport[] = (woData || []).map((wo: any) => {
                const labor = Number(wo.total_labor) || 0;
                const rate = Number(wo.mechanic?.commission_rate) || 0;
                return {
                    id: wo.id,
                    mechanic_name: wo.mechanic?.full_name || 'Sin Asignar',
                    customer_name: `${wo.customer?.first_name || ''} ${wo.customer?.last_name || ''}`.trim(),
                    vehicle_plate: wo.vehicle?.plate || 'S/P',
                    total_labor: labor,
                    commission_rate: rate,
                    commission_amount: labor * (rate / 100),
                    created_at: wo.created_at,
                    status: wo.status
                };
            });

            setMechanicReports(mReports);
            setTotalCommissionsUsd(mReports.reduce((acc, curr) => acc + curr.commission_amount, 0));

            if (salesErr?.code === '42P01' && activeTab === 'DAILY') {
                setError("La integración de datos de ventas (profit_sales_lines) aún no está activa.");
            }

        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Error al cargar los reportes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales(dateFilter);
    }, [dateFilter]);

    const getBranchName = (code: string) => {
        const branches: Record<string, string> = {
            '01': 'Boleita',
            '02': 'Chacao',
            '03': 'Sabana Grande'
        };
        return branches[code] || `Sucursal ${code}`;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-10">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-amber-500" size={20} />
                        <span className="text-[10px] uppercase tracking-[0.3em] text-amber-500 font-bold heading-racing">Telemetría de Ventas</span>
                    </div>
                    <h1 className="heading-racing text-7xl text-zinc-100 text-glow-amber italic tracking-tighter leading-none uppercase">
                        Reporte <span className="text-amber-500">{activeTab === 'DAILY' ? 'Financiero' : 'Mecánicos'}</span>
                    </h1>
                    <p className="text-zinc-500 text-sm italic mt-2">Monitorización de transacciones centralizadas en tiempo real.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="glass-panel p-6 rounded-[2rem] border border-amber-500/20 shadow-2xl relative overflow-hidden group min-w-[240px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <DollarSign size={80} className="text-amber-500" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 block mb-1 italic">
                            {activeTab === 'DAILY' ? 'Ingresos del Día' : 'Comisiones del Día'}
                        </span>
                        <span className="heading-racing text-6xl font-bold text-zinc-100 tracking-tighter">
                            ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(activeTab === 'DAILY' ? totalDayUsd : totalCommissionsUsd)}
                        </span>
                        <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest mt-1">Bruto USD</p>
                    </div>

                    <div className="glass-panel p-6 rounded-[2rem] border border-white/5 shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-amber-500">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest block mb-1">Fecha de Consulta</span>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="bg-transparent font-bold text-zinc-100 outline-none focus:text-amber-500 transition-colors uppercase heading-racing text-2xl"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex gap-4 border-b border-zinc-900 pb-1">
                <button
                    onClick={() => setActiveTab('DAILY')}
                    className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-all relative ${activeTab === 'DAILY' ? 'text-amber-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                    Ventas Diarias
                    {activeTab === 'DAILY' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 animate-in slide-in-from-left duration-300" />}
                </button>
                <button
                    onClick={() => setActiveTab('MECHANICS')}
                    className={`pb-4 px-2 font-black text-xs uppercase tracking-widest transition-all relative ${activeTab === 'MECHANICS' ? 'text-amber-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                    Rendimiento Mecánicos
                    {activeTab === 'MECHANICS' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 animate-in slide-in-from-left duration-300" />}
                </button>
            </div>

            {error && (
                <div className="glass-panel p-8 rounded-[2rem] border border-red-500/30 bg-red-500/5 flex items-center gap-6 animate-shake">
                    <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-500">
                        <FilterX size={32} />
                    </div>
                    <div>
                        <p className="text-red-500 font-bold heading-racing text-2xl uppercase tracking-widest italic leading-none">Anomalía en Sistema de Datos</p>
                        <p className="text-red-400/70 text-[11px] font-black uppercase tracking-widest mt-2">{error}</p>
                    </div>
                </div>
            )}

            {/* Main Content Table */}
            <div className="glass-panel rounded-[3rem] border border-zinc-800 shadow-2xl overflow-hidden relative">
                {loading ? (
                    <div className="p-40 flex flex-col items-center justify-center space-y-6">
                        <div className="relative">
                            <Loader2 className="w-16 h-16 animate-spin text-amber-500" />
                            <TrendingUp className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500/20 w-8 h-8" />
                        </div>
                        <p className="heading-racing text-4xl text-zinc-700 tracking-[0.4em] uppercase animate-pulse italic">Escaneando Transacciones...</p>
                    </div>
                ) : activeTab === 'DAILY' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-zinc-900 border-b border-zinc-800">
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">Factura / Registro</th>
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-center">Sucursal</th>
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-center">Intervinientes</th>
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">Articulado</th>
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-right">Monto USD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-40 text-center">
                                            <div className="max-w-md mx-auto space-y-6 opacity-20 group">
                                                <Store size={80} className="mx-auto text-zinc-800 group-hover:text-amber-500 transition-colors" />
                                                <h3 className="heading-racing text-5xl text-zinc-800 uppercase italic tracking-[0.4em] leading-none">Pista Vacía</h3>
                                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest leading-loose">
                                                    No se detectaron movimientos de facturación central para la fecha seleccionada.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sales.map((sale, idx) => (
                                        <tr key={`${sale.id_documento}-${sale.doc_num}-${idx}`} className="hover:bg-amber-500/[0.03] transition-colors group">
                                            <td className="px-8 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-500 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                                        <FileText size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-100 font-black text-xl tracking-tight leading-none mb-1 italic uppercase">#{sale.doc_num}</div>
                                                        <div className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">{sale.tipo_documento}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-8 text-center">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-950 rounded-xl border border-zinc-800">
                                                    <Store size={14} className="text-zinc-700" />
                                                    <span className="text-[10px] font-black text-zinc-100 uppercase tracking-widest">{getBranchName(sale.branch_code)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-8">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-zinc-100 text-xs font-bold uppercase tracking-tight">
                                                        <User size={12} className="text-zinc-700" /> {sale.nombre_cliente}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em]">
                                                        <Briefcase size={12} className="text-zinc-700" /> STAFF: {sale.nombre_vendedor || 'SISTEMA'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-8">
                                                <div className="flex items-center gap-3">
                                                    <Package size={14} className="text-zinc-700" />
                                                    <div className="flex flex-col">
                                                        <span className="text-zinc-400 text-xs font-medium truncate max-w-[200px]">{sale.des_art}</span>
                                                        <span className="text-[9px] text-zinc-600 font-black uppercase">Cant: {sale.total_art}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-8 text-right">
                                                <div className="inline-flex flex-col items-end">
                                                    <span className="heading-racing text-4xl text-zinc-100 group-hover:text-amber-500 transition-colors italic">
                                                        ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(sale.total_usd)}
                                                    </span>
                                                    <span className="text-[8px] font-black text-zinc-800 uppercase tracking-widest mt-1">Sincronización Exitosa</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-zinc-900 border-b border-zinc-800">
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">OT / Orden</th>
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-center">Intervinientes</th>
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-center">Labor (Mano Obra)</th>
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic">Tasa %</th>
                                    <th className="px-8 py-8 heading-racing text-zinc-600 text-xs tracking-[0.3em] uppercase italic text-right">Comisión USD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                                {mechanicReports.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-40 text-center">
                                            <div className="max-w-md mx-auto space-y-6 opacity-20 group">
                                                <Store size={80} className="mx-auto text-zinc-800 group-hover:text-amber-500 transition-colors" />
                                                <h3 className="heading-racing text-5xl text-zinc-800 uppercase italic tracking-[0.4em] leading-none">Box Vacío</h3>
                                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest leading-loose">
                                                    No se detectaron órdenes de trabajo para liquidar comisiones en esta fecha.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    mechanicReports.map((report) => (
                                        <tr key={report.id} className="hover:bg-amber-500/[0.03] transition-colors group">
                                            <td className="px-8 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-emerald-500 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                                        <Zap size={24} />
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-100 font-black text-xl tracking-tight leading-none mb-1 italic uppercase">OT #{report.id.slice(0, 8).toUpperCase()}</div>
                                                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{report.status}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-8">
                                                <div className="flex flex-col gap-2 text-center">
                                                    <div className="flex items-center justify-center gap-2 text-amber-500 text-xs font-black uppercase tracking-tight">
                                                        <Briefcase size={12} className="text-amber-500/50" /> {report.mechanic_name}
                                                    </div>
                                                    <div className="flex items-center justify-center gap-2 text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em]">
                                                        {report.customer_name} ({report.vehicle_plate})
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-8 text-center">
                                                <div className="heading-racing text-2xl text-zinc-400 italic">
                                                    ${report.total_labor.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-8 py-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="px-3 py-1 bg-zinc-950 rounded-lg border border-zinc-800 text-amber-500 heading-racing text-sm">
                                                        {report.commission_rate}%
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-8 text-right">
                                                <div className="inline-flex flex-col items-end">
                                                    <span className="heading-racing text-4xl text-zinc-100 group-hover:text-emerald-500 transition-colors italic">
                                                        ${report.commission_amount.toFixed(2)}
                                                    </span>
                                                    <span className="text-[8px] font-black text-emerald-500/40 uppercase tracking-widest mt-1">Calculado sobre Mano de Obra</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer de Estado de la Tabla */}
                <div className="p-6 bg-zinc-950 border-t border-zinc-900 flex justify-between items-center px-10">
                    <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">
                            {loading ? 'Sincronizando con Servidor Central...' : 'Red de Datos Centralizada Establecida'}
                        </span>
                    </div>
                    <div className="text-[9px] font-black text-zinc-800 uppercase tracking-widest italic">
                        MOTOCADENA SYSTEM // PERFORMANCE DATA ENGINE
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesReports;
