import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike, ArrowRight, Loader2, KeyRound } from 'lucide-react';

const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const backendUrl = import.meta.env.VITE_ADMIN_BACKEND_URL || 'http://localhost:3003';
      const res = await fetch(`${backendUrl}/api/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, plate: plate.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || 'Credenciales inválidas');

      // Save portal snapshot to session storage
      sessionStorage.setItem('motocadena_portal_data', JSON.stringify(data));
      navigate('/portal/dashboard');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
      
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative z-10 glass-panel animate-in zoom-in duration-500">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)] mb-4">
            <Bike size={40} className="text-black" />
          </div>
          <h1 className="heading-racing text-3xl font-black text-white italic">MI GARAJE</h1>
          <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest font-bold">Portal del Piloto Motocadena</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-2">Número de Teléfono</label>
            <input
              required
              type="tel"
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white placeholder-zinc-700 outline-none focus:border-amber-500/50 transition-all font-bold"
              placeholder="Ej. 04121234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest ml-2">Placa de la Máquina</label>
            <input
              required
              type="text"
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white placeholder-zinc-700 outline-none focus:border-amber-500/50 transition-all font-bold uppercase"
              placeholder="AB1C23D"
              value={plate}
              onChange={e => setPlate(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black heading-racing text-2xl py-5 rounded-2xl transition-all shadow-[0_10px_30px_rgba(245,158,11,0.2)] flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <>ACCEDER <KeyRound size={20} /></>}
          </button>
        </form>

        <p className="text-center mt-8 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
          ¿No tienes acceso? Visítanos en el taller para afiliarte.
        </p>
      </div>
    </div>
  );
};

export default Login;
