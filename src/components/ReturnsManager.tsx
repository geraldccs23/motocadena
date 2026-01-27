import { useEffect, useState } from 'react';
import { RotateCcw, Search, Save } from 'lucide-react';
import { ADMIN_BASE } from '../lib/api';

type Sale = {
  id: string;
  sale_number?: string | null;
  status: string;
  total: number;
  items?: Array<{ id: string; description: string | null; product_id: string | null; service_id: string | null; quantity: number; unit_price: number }>
};

export default function ReturnsManager() {
  const [saleIdInput, setSaleIdInput] = useState('');
  const [sale, setSale] = useState<Sale | null>(null);
  const [returnLines, setReturnLines] = useState<Record<string, { quantity: string }>>({});
  const [notes, setNotes] = useState('');

  const loadSale = async () => {
    if (!saleIdInput) return;
    try {
      const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${saleIdInput}`, { headers: { 'X-Role': 'admin' } });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || `Error ${resp.status}`);
      setSale(json.sale);
      setReturnLines({});
    } catch (e) {
      console.error(e);
      alert('No se pudo cargar la venta. Use el ID exacto.');
    }
  };

  const submitReturn = async () => {
    if (!sale) return alert('Primero cargue la venta');
    const items = (sale.items || [])
      .map((it) => ({
        sale_item_id: it.id,
        product_id: it.product_id,
        service_id: it.service_id,
        unit_price: it.unit_price,
        quantity: Number(returnLines[it.id]?.quantity || '0')
      }))
      .filter((r) => r.quantity > 0);
    if (!items.length) return alert('Indique cantidades a devolver');
    try {
      const resp = await fetch(`${ADMIN_BASE}/admin/pos/sales/${sale.id}/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Role': 'admin' },
        body: JSON.stringify({ items, notes })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || `Error ${resp.status}`);
      alert('Devolución registrada');
      setReturnLines({});
      setNotes('');
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'No se pudo registrar la devolución');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <RotateCcw className="w-7 h-7 text-amber-500" />
        <h2 className="text-2xl font-bold heading-racing text-neutral-100">Devoluciones</h2>
      </div>

      <div className="card-metal p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-neutral-100">Buscar Venta</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input value={saleIdInput} onChange={(e) => setSaleIdInput(e.target.value)} placeholder="ID de venta (uuid)" className="bg-neutral-800/50 text-neutral-200 rounded p-2 col-span-2" />
          <button onClick={loadSale} className="btn-gold">Cargar</button>
        </div>
        <p className="text-xs text-neutral-400 mt-2">Tip: copie el ID desde el módulo POS (encabezado de la venta).</p>
      </div>

      {sale && (
        <div className="card-metal p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-neutral-400 text-sm">Venta #{sale.sale_number ?? '—'}</p>
              <p className="text-neutral-300 text-sm">Estado: <span className="text-amber-400">{sale.status}</span></p>
            </div>
            <div className="text-right">
              <p className="text-neutral-400 text-sm">Total</p>
              <p className="text-2xl font-bold text-neutral-100">${Number(sale.total || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-neutral-700/50 rounded-lg mb-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-neutral-800/50 text-neutral-300">
                  <th className="text-left px-3 py-2">Descripción</th>
                  <th className="text-right px-3 py-2">Cant.</th>
                  <th className="text-right px-3 py-2">Precio</th>
                  <th className="text-right px-3 py-2">Devolver</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((it) => (
                  <tr key={it.id} className="border-t border-neutral-700/50">
                    <td className="px-3 py-2 text-neutral-200">{it.description || 'Ítem'}</td>
                    <td className="px-3 py-2 text-right text-neutral-300">{Number(it.quantity || 0)}</td>
                    <td className="px-3 py-2 text-right text-neutral-300">${Number(it.unit_price || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" min="0" max={Number(it.quantity || 0)} step="1" value={returnLines[it.id]?.quantity || ''} onChange={(e) => setReturnLines((prev) => ({ ...prev, [it.id]: { quantity: e.target.value } }))} className="bg-neutral-800/50 text-neutral-200 rounded p-2 w-24" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas de la devolución" className="w-full bg-neutral-800/50 text-neutral-200 rounded p-2 mb-4" />
          <button onClick={submitReturn} className="btn-gold flex items-center gap-2"><Save className="w-4 h-4" /> Guardar Devolución</button>
        </div>
      )}
    </div>
  );
}
