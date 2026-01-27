import { useState } from 'react';

export default function SqlEditor() {
  const [sql, setSql] = useState('select 1;');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const runQuery = async () => {
    setIsRunning(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(String(e));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold heading-racing text-neutral-100 mb-4">SQL Editor (Supabase)</h2>
      <p className="text-neutral-300 mb-4">Ejecuta consultas SQL contra Supabase usando el Service Key (solo lectura recomendada).</p>
      <textarea
        className="input-metal w-full h-48 mb-4"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        placeholder="Escribe tu SQL aquí"
      />
      <button
        onClick={runQuery}
        disabled={isRunning}
        className="btn-gold"
      >
        {isRunning ? 'Ejecutando...' : 'Ejecutar SQL'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-900/40 border border-red-700 rounded text-red-200 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 card-metal overflow-auto">
          <pre className="text-neutral-200 text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}