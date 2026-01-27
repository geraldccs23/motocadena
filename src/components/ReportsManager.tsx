import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, Banknote, DollarSign } from 'lucide-react';
import { ADMIN_BASE } from '../lib/api';

type DailyReport = {
  date: string;
  total_sales_usd: number;
  totals_usd_by_method: Record<string, number>;
  original_by_currency: { USD: number; VES: number };
  original_by_currency_by_method: Record<string, Record<string, number>>;
  bank_breakdown: Record<string, Record<string, number>>;
  total_products: number;
  total_services: number;
  sales_count: number;
};

export default function ReportsManager() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadReport(); }, [date]);

  const loadReport = async () => {
    setLoading(true); setError(null);
    try {
      const resp = await fetch(`${ADMIN_BASE}/admin/reports/daily?date=${date}`, { headers: { 'X-Role': 'admin' } });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || `Error ${resp.status}`);
      setReport(json as DailyReport);
    } catch (e: any) {
      console.error('Error cargando reporte diario:', e);
      setError(e?.message || 'No se pudo cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const formatUSD = (n: number) => `$${Number(n || 0).toFixed(2)}`;
  const formatVES = (n: number) => `Bs ${Number(n || 0).toFixed(2)}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-amber-500" />
          <h2 className="text-2xl font-bold heading-racing text-neutral-100">Reporte Diario / Cuadre de Caja</h2>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-neutral-300" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-neutral-800/50 text-neutral-200 rounded p-2" />
        </div>
      </div>

      {loading ? (
        <div className="card-metal p-6">Cargando...</div>
      ) : error ? (
        <div className="card-metal p-6 text-red-400">{error}</div>
      ) : report ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card-metal p-6">
            <p className="text-neutral-400 text-sm">Ventas del día</p>
            <p className="text-3xl font-bold text-neutral-100">{formatUSD(report.total_sales_usd)}</p>
            <p className="text-neutral-500 text-xs">Órdenes: {report.sales_count}</p>
          </div>

          <div className="card-metal p-6">
            <p className="text-neutral-400 text-sm">Desglose por origen</p>
            <p className="text-neutral-300 text-sm">Productos: {formatUSD(report.total_products)}</p>
            <p className="text-neutral-300 text-sm">Servicios: {formatUSD(report.total_services)}</p>
          </div>

          <div className="card-metal p-6">
            <p className="text-neutral-400 text-sm">Monedas originales</p>
            <p className="flex items-center gap-2 text-neutral-300"><DollarSign className="w-4 h-4" /> USD: {formatUSD(report.original_by_currency.USD)}</p>
            <p className="flex items-center gap-2 text-neutral-300"><Banknote className="w-4 h-4" /> VES: {formatVES(report.original_by_currency.VES)}</p>
          </div>

          <div className="lg:col-span-2 card-metal p-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-3">Pagos en USD por método</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {Object.entries(report.totals_usd_by_method).map(([m, v]) => (
                <div key={m} className="bg-neutral-800/50 rounded p-3">
                  <p className="text-neutral-400">{m}</p>
                  <p className="text-neutral-100 font-semibold">{formatUSD(v)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-metal p-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-3">Pagos originales por método</h3>
            {(['USD','VES'] as const).map((curr) => (
              <div key={curr} className="mb-3">
                <p className="text-neutral-400 text-sm">{curr}</p>
                <ul className="text-sm list-disc ml-5">
                  {Object.entries(report.original_by_currency_by_method[curr] || {}).map(([m, v]) => (
                    <li key={`${curr}-${m}`}>{m}: {curr === 'USD' ? formatUSD(v) : formatVES(v)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="lg:col-span-3 card-metal p-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-3">Bancos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(['pos','pagomovil_bs'] as const).map((m) => (
                <div key={m}>
                  <p className="text-neutral-400 text-sm mb-2">{m}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {Object.entries(report.bank_breakdown[m] || {}).map(([bank, v]) => (
                      <div key={`${m}-${bank}`} className="bg-neutral-800/50 rounded p-3">
                        <p className="text-neutral-400">{bank}</p>
                        <p className="text-neutral-100 font-semibold">{formatVES(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card-metal p-6">Sin datos para la fecha</div>
      )}
    </div>
  );
}
