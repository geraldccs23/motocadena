import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { user, loading: authLoading, loginDemo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      console.log("➡️ Login: Sesión activa detectada, desviando a Pits (/admin)");
      navigate('/admin', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 Intento de login para:", email);
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg("Introduce el email de staff y la llave de acceso.");
      return;
    }

    setLocalLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        console.error("❌ Login Error:", error);
        setErrorMsg(error.message === 'Invalid login credentials'
          ? 'Credenciales de Staff incorrectas. Verifica mayúsculas y minúsculas.'
          : error.message);
        setLocalLoading(false);
        return;
      }

      if (data.user) {
        console.log("✅ Acceso concedido:", data.user.email);
        // We wait a bit for AuthContext to detect the session
        // but also manually check if we can proceed
        setTimeout(() => {
          if (localLoading) {
            console.log("🔍 Login: Auto-check post-login success...");
            navigate('/admin', { replace: true });
          }
        }, 1500);
      } else {
        throw new Error("No user data returned after success.");
      }

    } catch (err: any) {
      console.error("❌ Fallo crítico en login:", err);
      setErrorMsg("Error de comunicación con el servidor central de MOTOCADENA.");
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* High-Performance Decorative Layers */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[160px] animate-pulse pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-zinc-900/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm z-10 flex flex-col items-center">
        {/* Floating Brand Logo */}
        <div className="relative mb-10 group">
          <div className="absolute inset-0 bg-amber-500/20 blur-[40px] rounded-full animate-pulse group-hover:bg-amber-500/30 transition-all" />
          <div className="relative w-28 h-28 backdrop-blur-md bg-zinc-950/40 rounded-3xl border border-white/5 p-4 flex items-center justify-center shadow-2xl transition-transform duration-700 hover:scale-105 active:scale-95">
            <img
              src="/logomotocadena.png"
              alt="Motocadena Logo"
              className="w-full h-full object-contain brightness-150 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            />
          </div>
        </div>

        {/* Dynamic Branding */}
        <div className="text-center mb-14 select-none">
          <h1 className="heading-racing text-5xl md:text-7xl text-white italic tracking-tighter leading-none m-0 p-0 skew-x-[-12deg] drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            MOTOCADENA
          </h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-[1px] w-8 bg-zinc-800" />
            <p className="text-[9px] uppercase tracking-[0.6em] text-amber-500 font-black">
              Advanced Workshop Control
            </p>
            <div className="h-[1px] w-8 bg-zinc-800" />
          </div>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-6">
          {errorMsg && (
            <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 text-red-400 p-4 rounded-3xl flex items-start gap-3 text-xs animate-shake mb-4">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* Glassmorphic Email Field */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-black text-zinc-600 tracking-widest ml-4">Staff Identifier</label>
            <div className="relative group">
              <div className="absolute inset-0 bg-amber-500/5 rounded-[1.8rem] opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
              <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-500 transition-all" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[1.8rem] py-6 pl-14 pr-6 text-zinc-200 font-bold outline-none focus:border-amber-500/40 focus:bg-zinc-900/60 transition-all placeholder:text-zinc-800 text-base"
                placeholder="soporteacadai@gmail.com"
                disabled={localLoading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Glassmorphic Password Field */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-black text-zinc-600 tracking-widest ml-4">Access Key</label>
            <div className="relative group">
              <div className="absolute inset-0 bg-amber-500/5 rounded-[1.8rem] opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-500 transition-all" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-[1.8rem] py-6 pl-14 pr-6 text-zinc-200 font-bold outline-none focus:border-amber-500/40 focus:bg-zinc-900/60 transition-all placeholder:text-zinc-800 text-base"
                placeholder="••••••"
                disabled={localLoading}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Racing Performance Button */}
          <button
            type="submit"
            disabled={localLoading}
            className="w-full py-6 mt-6 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-zinc-900 disabled:to-zinc-950 disabled:text-zinc-700 text-black font-black heading-racing text-4xl rounded-[1.8rem] shadow-[0_25px_60px_-15px_rgba(245,158,11,0.4)] flex items-center justify-center gap-4 transition-all active:scale-[0.96] active:shadow-none relative overflow-hidden group"
          >
            {localLoading ? (
              <>
                <Loader2 className="animate-spin" size={28} />
                <span className="italic tracking-tighter">SINC_PITS</span>
              </>
            ) : (
              <>
                <span className="skew-x-[-10deg]">INGRESAR</span>
                <ChevronRight size={38} className="group-hover:translate-x-2 transition-transform stroke-[4]" />
              </>
            )}

            {/* Glossy Scanning Effect */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />
          </button>
        </form>

        {!localLoading && (
          <div className="mt-12 opacity-60 hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.preventDefault(); loginDemo(); }}
              className="px-8 py-3 bg-zinc-950/40 backdrop-blur-md text-zinc-700 hover:text-amber-500 border border-zinc-900 rounded-full text-[8px] font-black uppercase tracking-[0.4em] transition-all"
            >
              System Survival Restricted
            </button>
          </div>
        )}
      </div>

      {/* Futuristic Status Bar */}
      <div className="absolute bottom-8 w-64 h-[1px] bg-zinc-900 overflow-hidden opacity-30">
        <div className="w-1/3 h-full bg-amber-500 animate-[loading_2s_infinite]" />
      </div>

      <div className="absolute bottom-6 text-[8px] text-zinc-800 uppercase font-black tracking-[0.5em] opacity-30 select-none">
        Performance Terminal • 2.4.0
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}} />
    </div>
  );
};

export default Login;
