import { useState } from 'react';
import { LogIn, Wrench } from 'lucide-react';
import { loginUser, saveUser } from '../lib/auth';
import type { User } from '../lib/auth';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await loginUser(email, password);

      if (user) {
        saveUser(user);
        onLoginSuccess(user);
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Intenta de nuevo.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen garage-texture flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-neutral-900/30"></div>

      <div className="absolute top-10 left-10 right-10 bottom-10 border border-amber-600/20 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fadeIn">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-amber-500/30 animate-pulse"></div>
              <Wrench className="w-24 h-24 text-amber-500 relative animate-float" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-6xl font-bold heading-racing text-amber-500 mb-2 text-glow">
            MOTOCADENA
          </h1>
          <p className="text-neutral-400 text-lg text-racing uppercase tracking-widest">
            ¡Pasion por tu moto, compromiso contigo!
          </p>
          <div className="h-1 w-32 mx-auto mt-4 gold-gradient"></div>
        </div>

        <div className="card-metal p-8 shadow-2xl">
          <h2 className="text-2xl font-bold heading-racing text-center mb-6 text-neutral-100">
            Área de Operaciones
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-metal w-full"
                placeholder="Ingresa tu correo"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wide">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-metal w-full"
                placeholder="Ingresa tu contraseña"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/50 rounded p-3 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gold flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-700/50 text-center text-xs text-neutral-500">
            <p>Usa tus credenciales de Supabase Auth (email/contraseña).</p>
          </div>
        </div>

        <div className="mt-6 text-center text-neutral-600 text-sm">
          <p className="uppercase tracking-wider">Sistema de Gestión de Taller</p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
