import React, { useState, useEffect } from 'react';
import {
    Plus, Search, FileText, Download, User, Calendar, Trash2, Loader2, Gauge, Bike, X, Link2, Printer, ChevronRight, DollarSign
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Budget, Customer, Service, Product, BudgetItem, BudgetStatus } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF with autotable types
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

const STATUS_COLORS: Record<BudgetStatus, string> = {
    'DRAFT': 'bg-zinc-800 text-zinc-400',
    'SENT': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'APPROVED': 'bg-green-500/10 text-green-400 border-green-500/20',
    'REJECTED': 'bg-red-500/10 text-red-400 border-red-500/20',
    'EXPIRED': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const Budgets: React.FC = () => {
    const { profile } = useAuth();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [manualCustomerName, setManualCustomerName] = useState('');
    const [manualVehicleName, setManualVehicleName] = useState('');
    const [notes, setNotes] = useState('');
    const [validityDays, setValidityDays] = useState(7); // New state for validity days
    const [validUntil, setValidUntil] = useState(''); // Will be set by useEffect
    const [items, setItems] = useState<Partial<BudgetItem>[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const days = isNaN(validityDays) ? 0 : validityDays;
        const date = new Date();
        date.setDate(date.getDate() + days);
        setValidUntil(date.toISOString().split('T')[0]); // Format for input type="date"
    }, [validityDays]);

    const fetchData = async () => {
        setLoading(true);
        console.log("🔍 Cargando datos de presupuestos...");
        try {
            const { data: budgetsData, error: budgetsError } = await supabase
                .from('budgets')
                .select(`
                    *,
                    customer:customers(first_name, last_name, phone, id_number),
                    vehicle:vehicles(brand, model, plate),
                    items:budget_items(*)
                `)
                .order('created_at', { ascending: false });

            if (budgetsError) {
                console.error("❌ Error cargando presupuestos:", budgetsError);
                throw budgetsError;
            }

            console.log(`✅ ${budgetsData?.length || 0} presupuestos cargados.`);

            const [customersRes, servicesRes, productsRes] = await Promise.all([
                supabase.from('customers').select('id, first_name, last_name, id_number, vehicles(*)').order('last_name'),
                supabase.from('services').select('id, name, price').order('name'),
                supabase.from('products').select('id, name, price').order('name')
            ]);

            if (customersRes.error) throw customersRes.error;
            if (servicesRes.error) throw servicesRes.error;
            if (productsRes.error) throw productsRes.error;

            setBudgets((budgetsData as any) || []);
            setCustomers(customersRes.data || []);
            setServices(servicesRes.data || []);
            setProducts(productsRes.data || []);
            console.log("📁 Catálogos cargados correctamente.");
        } catch (err: any) {
            console.error("🚨 Error en fetchData:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setItems([...items, {
            id: Math.random().toString(36).substr(2, 9),
            service_id: undefined,
            product_id: undefined,
            description: '',
            quantity: 1,
            unit_price: 0
        }]);
    };

    const updateItem = (id: string, updates: Partial<BudgetItem>) => {
        setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleServiceSelect = (id: string, serviceId: string) => {
        if (!serviceId) { // Handle empty selection
            updateItem(id, { service_id: undefined, product_id: undefined, description: '', unit_price: 0 });
            return;
        }
        const service = services.find(s => s.id === serviceId);
        if (service) {
            updateItem(id, {
                service_id: serviceId,
                product_id: undefined,
                description: service.name,
                unit_price: service.price
            });
        }
    };

    const handleProductSelect = (id: string, productId: string) => {
        if (!productId) { // Handle empty selection
            updateItem(id, { service_id: undefined, product_id: undefined, description: '', unit_price: 0 });
            return;
        }
        const product = products.find(p => p.id === productId);
        if (product) {
            updateItem(id, {
                product_id: productId,
                service_id: undefined,
                description: product.name,
                unit_price: product.price
            });
        }
    };

    const totalAmount = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);

    const copyBudgetLink = (id: string) => {
        const url = `${window.location.origin}/#/presupuesto/${id}`;
        navigator.clipboard.writeText(url);
        alert("¡Link de presupuesto copiado!");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const customerName = selectedCustomerId ?
            customers.find(c => c.id === selectedCustomerId)?.first_name + ' ' + customers.find(c => c.id === selectedCustomerId)?.last_name :
            manualCustomerName;

        if (!customerName || items.length === 0) {
            alert("Por favor ingresa un nombre de cliente y agrega al menos un item.");
            return;
        }

        setSubmitting(true);
        console.log("💾 Iniciando guardado de presupuesto...");
        try {
            // Validate workshop_id (must be UUID)
            const isUUID = (uuid: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
            const workshopId = profile?.workshop_id && isUUID(profile.workshop_id) ? profile.workshop_id : null;

            console.log("📝 Preparando datos para inserción de cabecera...", {
                workshop_id: workshopId,
                customer_id: selectedCustomerId,
                vehicle_id: selectedVehicleId,
                total_amount: totalAmount
            });

            // 1. Create Budget
            const budgetToInsert = {
                workshop_id: workshopId,
                customer_id: selectedCustomerId || null,
                vehicle_id: selectedVehicleId || null,
                manual_customer_name: manualCustomerName || null,
                manual_vehicle_name: manualVehicleName || null,
                valid_until: validUntil,
                notes,
                status: 'DRAFT' as const,
                total_amount: totalAmount
            };

            console.log("🚀 Enviando petición a Supabase (budgets)...");
            const { data: budget, error: budgetError } = await (supabase
                .from('budgets') as any)
                .insert([budgetToInsert])
                .select()
                .single();

            if (budgetError) {
                console.error("❌ Error de Supabase en cabecera:", budgetError);
                throw budgetError;
            }

            if (!budget) {
                throw new Error("No se recibió confirmación del presupuesto creado.");
            }

            console.log("✅ Presupuesto creado:", budget.id);

            // 2. Create items
            const itemsToInsert = items.map(({ service_id, product_id, description, quantity, unit_price }) => ({
                budget_id: budget.id,
                service_id: service_id || null,
                product_id: product_id || null,
                description: description || '',
                quantity: quantity || 1,
                unit_price: unit_price || 0
            }));

            console.log("🚀 Enviando items a Supabase...", itemsToInsert);
            const { error: itemsError } = await (supabase
                .from('budget_items') as any)
                .insert(itemsToInsert);

            if (itemsError) {
                console.error("❌ Error de Supabase en items:", itemsError);
                throw itemsError;
            }

            console.log("🏁 Proceso completado exitosamente.");
            setShowModal(false);
            resetForm();
            fetchData();
        } catch (err: any) {
            console.error("🚨 Error crítico:", err);
            alert(`Error al crear presupuesto: ${err.message || 'Error desconocido'} `);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedCustomerId('');
        setSelectedVehicleId('');
        setManualCustomerName('');
        setManualVehicleName('');
        setNotes('');
        setValidityDays(7); // Reset validity days
        setItems([]);
    };

    const generatePDF = (budget: Budget) => {
        const doc = new jsPDF();
        const primaryColor = [245, 158, 11]; // Amber-500
        const blackColor = [24, 24, 27]; // Zinc-900

        // Header
        doc.setFillColor(blackColor[0], blackColor[1], blackColor[2]);
        doc.rect(0, 0, 210, 40, 'F');

        // Logo / Brand
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(28);
        doc.text('MOTOCADENA', 15, 25);

        doc.setFontSize(10);
        doc.text('PERFORMANCE WORKSHOP', 15, 32);

        // Budget Info (Right side of header)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(`PRESUPUESTO #${budget.budget_number} `, 150, 20);
        doc.text(`Fecha: ${new Date(budget.created_at).toLocaleDateString()} `, 150, 26);
        doc.text(`Válido hasta: ${new Date(budget.valid_until!).toLocaleDateString()} `, 150, 32);

        // Client Info
        doc.setTextColor(blackColor[0], blackColor[1], blackColor[2]);
        doc.setFontSize(12);
        doc.text('CLIENTE:', 15, 55);
        doc.setFont('helvetica', 'normal');

        const cName = budget.customer ? `${budget.customer.first_name} ${budget.customer.last_name} ` : budget.manual_customer_name;
        doc.text(cName || 'S/N', 15, 62);

        if (budget.customer?.id_number) doc.text(`ID: ${budget.customer.id_number} `, 15, 68);
        if (budget.customer?.phone) doc.text(`Tel: ${budget.customer.phone} `, 15, 74);

        // Vehicle Info
        const vName = budget.vehicle ? `${budget.vehicle.brand} ${budget.vehicle.model} ` : budget.manual_vehicle_name;
        if (vName) {
            doc.setFont('helvetica', 'bold');
            doc.text('VEHÍCULO:', 110, 55);
            doc.setFont('helvetica', 'normal');
            doc.text(vName, 110, 62);
            if (budget.vehicle?.plate) doc.text(`Placa: ${budget.vehicle.plate} `, 110, 68);
        }

        // Table
        const tableRows = (budget.items || []).map(item => [
            item.description,
            item.quantity.toString(),
            `$${item.unit_price.toFixed(2)} `,
            `$${(item.quantity * item.unit_price).toFixed(2)} `
        ]);

        (doc as any).autoTable({
            startY: 85,
            head: [['Descripción', 'Cant.', 'Precio Unit.', 'Total']],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: blackColor, textColor: primaryColor, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: 15, right: 15 },
            styles: { fontSize: 9 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;

        // Totals
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`TOTAL: $${budget.total_amount.toFixed(2)} `, 150, finalY + 5);

        // Notes
        if (budget.notes) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('NOTAS:', 15, finalY + 5);
            doc.setFont('helvetica', 'normal');
            const splitNotes = doc.splitTextToSize(budget.notes, 120);
            doc.text(splitNotes, 15, finalY + 12);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const footerText = 'Este presupuesto es informativo y no representa un compromiso de compra. Los precios pueden variar tras inspección física.';
        doc.text(footerText, 105, 285, { align: 'center' });

        doc.save(`Presupuesto_Motocadena_${budget.budget_number}.pdf`);
    };

    const filteredBudgets = budgets.filter(b => {
        const cName = b.customer ? `${b.customer.first_name} ${b.customer.last_name} ` : (b.manual_customer_name || '');
        return cName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.budget_number.toString().includes(searchTerm);
    });

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="heading-racing text-5xl text-zinc-100 text-glow-amber italic tracking-tighter">Gestión de Presupuestos</h1>
                    <p className="text-zinc-500 text-sm italic">"Proyectando el rendimiento ideal para cada máquina."</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center gap-2 bg-amber-500 text-black px-8 py-4 rounded-2xl font-bold heading-racing text-2xl hover:bg-amber-400 shadow-[0_4px_30px_rgba(245,158,11,0.3)] transition-all group"
                >
                    <Plus size={24} className="group-hover:rotate-12 transition-transform" />
                    Nuevo Presupuesto
                </button>
            </div>

            <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors" size={24} />
                <input
                    type="text"
                    placeholder="Buscar por cliente o número de presupuesto..."
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-3xl py-6 pl-16 pr-6 text-zinc-100 focus:border-amber-500/50 outline-none backdrop-blur-md transition-all text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-500 gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
                    <p className="heading-racing text-2xl tracking-widest animate-pulse uppercase">Escaneando Registro de Presupuestos...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredBudgets.length === 0 ? (
                        <div className="py-32 text-center glass-panel rounded-[3rem] border-dashed border-zinc-800">
                            <FileText size={64} className="mx-auto text-zinc-900 mb-6" />
                            <p className="text-zinc-500 heading-racing text-3xl uppercase tracking-widest italic">No hay cotizaciones registradas</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredBudgets.map((budget) => (
                                <div key={budget.id} className="glass-panel p-8 rounded-[2.5rem] border border-white/5 hover:border-amber-500/20 transition-all group relative overflow-hidden flex flex-col shadow-xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-amber-500 heading-racing text-2xl shadow-2xl">
                                                #{budget.budget_number}
                                            </div>
                                            <div>
                                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border ${STATUS_COLORS[budget.status]}`}>
                                                    {budget.status}
                                                </span>
                                                <p className="text-xs text-zinc-500 font-bold mt-1 tracking-wider uppercase italic">
                                                    {new Date(budget.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => generatePDF(budget)}
                                                className="p-3 bg-zinc-900 text-zinc-400 rounded-xl hover:bg-amber-500 hover:text-black transition-all border border-zinc-800"
                                                title="Ver PDF"
                                            >
                                                <Printer size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center gap-3">
                                            <User size={18} className="text-amber-500" />
                                            <div>
                                                <p className="text-zinc-100 font-bold text-lg leading-none">
                                                    {budget.customer ? `${budget.customer.first_name} ${budget.customer.last_name}` : budget.manual_customer_name}
                                                </p>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
                                                    {budget.customer?.phone || 'Sin Teléfono'}
                                                </p>
                                            </div>
                                        </div>

                                        {(budget.vehicle || budget.manual_vehicle_name) && (
                                            <div className="flex items-center gap-3 bg-zinc-950/50 p-3 rounded-2xl border border-zinc-800/50">
                                                <Bike size={18} className="text-amber-500" />
                                                <div>
                                                    <p className="text-zinc-300 text-xs font-bold leading-none">
                                                        {budget.vehicle ? `${budget.vehicle.brand} ${budget.vehicle.model}` : budget.manual_vehicle_name}
                                                    </p>
                                                    {budget.vehicle?.plate && (
                                                        <p className="text-[9px] text-amber-500/80 font-black tracking-widest uppercase italic mt-1">{budget.vehicle.plate}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto border-t border-zinc-900/50 pt-6 flex justify-between items-center">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Inversión Estimada</p>
                                            <p className="text-3xl heading-racing text-amber-500 italic leading-none mt-1">
                                                ${budget.total_amount.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => copyBudgetLink(budget.id)}
                                                className="heading-racing text-2xl text-zinc-500 hover:text-amber-500 transition-colors uppercase italic flex items-center gap-2 group/btn"
                                                title="Copiar Link de Aprobación"
                                            >
                                                <Link2 size={20} className="group-hover/btn:rotate-12 transition-transform" /> LINK
                                            </button>
                                            <button
                                                onClick={() => generatePDF(budget)}
                                                className="heading-racing text-2xl text-zinc-100 hover:text-amber-500 transition-colors uppercase italic flex items-center gap-2 group/btn"
                                            >
                                                <Download size={20} className="group-hover/btn:translate-y-0.5 transition-transform" /> PDF
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: NUEVO PRESUPUESTO */}
            {showModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !submitting && setShowModal(false)} />
                    <div className="glass-panel w-full max-w-5xl rounded-[3rem] border border-white/10 relative z-10 animate-in zoom-in duration-300 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                        <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-zinc-900 to-black shrink-0">
                            <div>
                                <h3 className="heading-racing text-5xl text-zinc-100 italic">Pre-Configuración de Servicio</h3>
                                <p className="text-[10px] uppercase font-black text-amber-500 tracking-[0.4em]">Optimización de Costos y Recambios</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                                <X size={32} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto scrollbar-hide">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4 md:col-span-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Piloto (Cliente)</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <select
                                            value={selectedCustomerId}
                                            onChange={e => {
                                                setSelectedCustomerId(e.target.value);
                                                setSelectedVehicleId('');
                                                if (e.target.value) setManualCustomerName('');
                                            }}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none appearance-none"
                                        >
                                            <option value="">-- Vincular Piloto --</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="O ingresa nombre manual..."
                                            value={manualCustomerName}
                                            onChange={e => {
                                                setManualCustomerName(e.target.value);
                                                if (e.target.value) setSelectedCustomerId('');
                                            }}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Máquina</label>
                                    <div className="space-y-4">
                                        {selectedCustomerId ? (
                                            <select
                                                value={selectedVehicleId}
                                                onChange={e => setSelectedVehicleId(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none appearance-none"
                                            >
                                                <option value="">-- Seleccionar Máquina --</option>
                                                {selectedCustomer?.vehicles?.map(v => (
                                                    <option key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="Ej: Yamaha R6..."
                                                value={manualVehicleName}
                                                onChange={e => setManualVehicleName(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Vigencia hasta</label>
                                    <input
                                        type="date"
                                        value={validUntil}
                                        onChange={e => setValidUntil(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:border-amber-500/50 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h4 className="heading-racing text-3xl text-zinc-100 italic tracking-wide">Configuración de Items</h4>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            className="flex items-center gap-2 bg-zinc-900 text-amber-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-zinc-800 hover:bg-zinc-800 transition-all shadow-lg"
                                        >
                                            <Plus size={16} /> Agregar Item
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {items.length === 0 ? (
                                        <div className="p-10 border-2 border-dashed border-zinc-900 rounded-[2rem] text-center text-zinc-700 italic font-medium">
                                            Agrega servicios o productos para calcular la inversión
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {items.map((item) => (
                                                <div key={item.id} className="p-6 bg-zinc-950/40 rounded-3xl border border-zinc-800 flex flex-col md:flex-row gap-6 items-start md:items-center relative group">
                                                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-6">
                                                        <div className="md:col-span-2">
                                                            <div className="space-y-1">
                                                                <label className="text-[8px] uppercase font-black text-zinc-600 tracking-widest ml-1">Componente / Tarea</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Describe el servicio o pieza..."
                                                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 text-sm mb-2"
                                                                    value={item.description}
                                                                    onChange={(e) => updateItem(item.id!, { description: e.target.value })}
                                                                />
                                                                <select
                                                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-600 text-[10px] appearance-none"
                                                                    value={item.service_id || item.product_id || ''}
                                                                    onChange={(e) => {
                                                                        if (services.find(s => s.id === e.target.value)) handleServiceSelect(item.id!, e.target.value);
                                                                        else handleProductSelect(item.id!, e.target.value);
                                                                    }}
                                                                >
                                                                    <option value="">-- O elige del catálogo --</option>
                                                                    <optgroup label="Servicios">
                                                                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                    </optgroup>
                                                                    <optgroup label="Productos">
                                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                    </optgroup>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="text-[8px] uppercase font-black text-zinc-600 tracking-widest ml-1">Cantidad</label>
                                                            <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 mt-1">
                                                                <button type="button" onClick={() => updateItem(item.id!, { quantity: Math.max(1, (item.quantity || 1) - 1) })} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-amber-500">-</button>
                                                                <input
                                                                    type="number"
                                                                    className="w-full bg-transparent border-none text-center text-zinc-100 font-bold focus:ring-0"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateItem(item.id!, { quantity: parseFloat(e.target.value) || 0 })}
                                                                />
                                                                <button type="button" onClick={() => updateItem(item.id!, { quantity: (item.quantity || 1) + 1 })} className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-amber-500">+</button>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="text-[8px] uppercase font-black text-zinc-600 tracking-widest ml-1">Precio Unit.</label>
                                                            <div className="relative mt-1">
                                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={14} />
                                                                <input
                                                                    type="number"
                                                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-8 py-3 text-zinc-100 font-bold text-sm"
                                                                    value={item.unit_price}
                                                                    onChange={(e) => updateItem(item.id!, { unit_price: parseFloat(e.target.value) || 0 })}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id!)}
                                                        className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest ml-1">Observaciones / Notas del Presupuesto</label>
                                <textarea
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-[2rem] px-8 py-6 text-zinc-100 focus:border-amber-500/50 outline-none h-32 resize-none text-lg"
                                    placeholder="Detalla condiciones, vigencia de precios o notas especiales..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between p-10 bg-zinc-950 rounded-[3rem] border border-zinc-800 shadow-2xl shrink-0">
                                <div className="mb-6 md:mb-0 text-center md:text-left">
                                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Inversión Total Programada</p>
                                    <p className="text-6xl heading-racing text-amber-500 italic text-glow-amber leading-none mt-2">
                                        ${totalAmount.toFixed(2)}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || items.length === 0}
                                    className="w-full md:w-auto px-12 py-6 bg-amber-500 text-black rounded-3xl font-bold heading-racing text-4xl hover:bg-amber-400 shadow-[0_20px_50px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? <Loader2 size={36} className="animate-spin" /> : <>GUARDAR COTIZACIÓN <ChevronRight size={36} /></>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Budgets;
