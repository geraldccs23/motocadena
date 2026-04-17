import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, Clock, FileText, CheckCircle2, AlertTriangle, ArrowLeft, Calendar, User, LogOut } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const rawData = sessionStorage.getItem('motocadena_portal_data');
    if (!rawData) {
      navigate('/portal/login');
      return;
    }
    try {
      setData(JSON.parse(rawData));
    } catch {
      navigate('/portal/login');
    }
  }, [navigate]);

  if (!data) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4"><div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>;

  const { customer, vehicles, workOrders, appointments } = data;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'RECEIVED': return 'text-amber-500 border-amber-500 bg-amber-500/10';
      case 'IN_PROGRESS': return 'text-blue-500 border-blue-500 bg-blue-500/10';
      case 'READY': return 'text-emerald-500 border-emerald-500 bg-emerald-500/10';
      case 'DELIVERED': return 'text-zinc-400 border-zinc-600 bg-zinc-900';
      case 'CONFIRMED': return 'text-emerald-500 border-emerald-500 bg-emerald-500/10';
      case 'PENDING': return 'text-amber-500 border-amber-500 bg-amber-500/10';
      default: return 'text-zinc-500 border-zinc-700 bg-zinc-800';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'RECEIVED': return 'RECIBIDA EN TALLER';
      case 'IN_PROGRESS': return 'EN REPARACIÓN';
      case 'READY': return 'LISTA PARA RETIRO';
      case 'DELIVERED': return 'ENTREGADA';
      case 'CONFIRMED': return 'CITA CONFIRMADA';
      case 'PENDING': return 'CITA PENDIENTE';
      default: return status;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('motocadena_portal_data');
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans animate-in fade-in duration-500 pb-20 overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] rotate-3">
              <Bike size={24} className="text-black -rotate-3" />
            </div>
            <span className="heading-racing text-2xl italic tracking-tighter">MOTOCADENA <span className="text-amber-500">GARAJE</span></span>
          </div>
          <button onClick={logout} className="p-2 text-zinc-500 hover:text-red-500 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
             Salir <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-10 relative z-10">
        
        {/* Perfil Header */}
        <div className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-amber-400 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />
           <div className="relative bg-zinc-900/90 border border-white/5 p-8 rounded-[2.2rem] flex items-center gap-8">
              <div className="w-20 h-20 rounded-full bg-zinc-950 border-2 border-amber-500/30 flex items-center justify-center p-1">
                <div className="w-full h-full rounded-full bg-amber-500 flex items-center justify-center text-black font-black text-2xl heading-racing">
                  {customer.first_name?.[0]}{customer.last_name?.[0]}
                </div>
              </div>
              <div>
                <h2 className="heading-racing text-4xl italic leading-none">{customer.first_name} {customer.last_name}</h2>
                <div className="flex items-center gap-4 mt-2">
                   <p className="text-zinc-500 text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                     <Bike size={14} className="text-amber-500" /> {vehicles.length} Máquina(s)
                   </p>
                   <p className="text-zinc-500 text-[10px] font-black tracking-widest uppercase flex items-center gap-2 border-l border-white/10 pl-4">
                     <CheckCircle2 size={14} className="text-emerald-500" /> Miembro Activo
                   </p>
                </div>
              </div>
           </div>
        </div>

        {/* Citas / Próximos Servicios */}
        {appointments && appointments.length > 0 && (
          <div className="animate-in slide-in-from-bottom duration-700">
            <h3 className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.3em] mb-5 ml-2 flex items-center gap-3">
               <Calendar size={14} className="text-amber-500" /> AGENDA DE SERVICIO
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {appointments.filter((a: any) => a.status !== 'CANCELLED').map((app: any) => (
                <div key={app.id} className="relative group bg-zinc-900/40 border border-white/5 p-6 rounded-3xl hover:border-amber-500/30 transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                          <Clock size={24} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{getStatusText(app.status)}</p>
                          <h4 className="text-lg font-bold text-white capitalize">{app.service?.name || 'Mantenimiento General'}</h4>
                          <p className="text-xs text-zinc-500 font-medium">{new Date(app.scheduled_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las {new Date(app.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">{app.vehicle?.plate}</p>
                       <p className="text-sm font-bold text-white">{app.vehicle?.brand} {app.vehicle?.model}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Órdenes de Trabajo Activas / Historial */}
        <div className="animate-in slide-in-from-bottom duration-1000">
          <h3 className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.3em] mb-5 ml-2 flex items-center gap-3">
             <FileText size={14} className="text-amber-500" /> BITÁCORA DE REPARACIÓN
          </h3>
          {workOrders.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/20 rounded-[2.5rem] border border-dashed border-zinc-800">
              <AlertTriangle size={48} className="text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">No hay órdenes de reparación registradas</p>
            </div>
          ) : (
            <div className="space-y-6">
              {workOrders.map((wo: any) => (
                <div key={wo.id} className="relative bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8 overflow-hidden group shadow-xl">
                  {/* Status Overlay Decor */}
                  <div className={`absolute top-0 right-0 w-1 h-full ${wo.status === 'READY' ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-1">Orden de Servicio</span>
                      <h4 className="heading-racing text-3xl italic text-white tracking-tighter">#{wo.id.toString().slice(0,8).toUpperCase()}</h4>
                    </div>
                    <div className={`px-5 py-2.5 border rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-lg ${getStatusColor(wo.status)}`}>
                      {getStatusText(wo.status)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-8 border-y border-white/5 py-8">
                    <div>
                       <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Máquina</p>
                       <p className="text-sm font-bold text-white">{wo.vehicle?.brand} {wo.vehicle?.model}</p>
                       <p className="text-[10px] text-amber-500 font-bold">{wo.vehicle?.plate}</p>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Ingreso</p>
                       <div className="flex items-center gap-2 text-sm font-bold text-zinc-300">
                          <Calendar size={14} /> {new Date(wo.created_at).toLocaleDateString()}
                       </div>
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Inversión</p>
                       <div className="flex items-center gap-2 text-xl font-black text-white heading-racing">
                          <DollarSign size={16} className="text-emerald-500" /> {Number(wo.total_amount).toFixed(2)}
                       </div>
                    </div>
                    <div className="text-right">
                       {wo.status === 'READY' ? (
                         <div className="inline-flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase">
                           <CheckCircle2 size={16}/> ¡Lista para rodar!
                         </div>
                       ) : (
                         <div className="inline-flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase">
                           <Clock size={16} className="animate-spin-slow"/> En proceso
                         </div>
                       )}
                    </div>
                  </div>

                  {wo.diagnostic && (
                    <div className="p-6 bg-zinc-950 rounded-3xl border border-white/5">
                      <p className="text-[9px] text-zinc-600 uppercase font-black mb-3 tracking-widest">Reporte Técnico</p>
                      <p className="text-zinc-400 text-sm leading-relaxed font-medium">{wo.diagnostic}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
