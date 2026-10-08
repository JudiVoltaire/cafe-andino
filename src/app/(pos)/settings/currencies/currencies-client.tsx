"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/i18n/context";
import { createCurrency, updateCurrency, deleteCurrency } from "@/server/settings/actions";
import { Plus, Trash2, Star, X } from "lucide-react";
import { toast } from "sonner";

type Currency = { id: string; code: string; name: string; symbol: string; rate: number; isDefault: boolean; sortOrder: number };

export function CurrenciesManager({ currencies }: { currencies: Currency[] }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", symbol: "", rate: "1", isDefault: false });

  function openNew() { setEditId(null); setForm({ code: "", name: "", symbol: "", rate: "1", isDefault: false }); setOpen(true); }
  function openEdit(c: Currency) { setEditId(c.id); setForm({ code: c.code, name: c.name, symbol: c.symbol, rate: String(c.rate), isDefault: c.isDefault }); setOpen(true); }

  function save() {
    start(async () => {
      const data = { code: form.code, name: form.name, symbol: form.symbol, rate: parseFloat(form.rate), isDefault: form.isDefault };
      if (editId) await updateCurrency(editId, data);
      else await createCurrency(data);
      toast.success(t.common.success);
      setOpen(false);
    });
  }

  function del(id: string) {
    if (!confirm("¿Eliminar esta moneda?")) return;
    start(async () => { await deleteCurrency(id); toast.success(t.common.success); });
  }

  return (
    <div className="space-y-4">
      <button onClick={openNew} className="btn-pos-secondary text-sm gap-1"><Plus className="h-4 w-4" /> Agregar moneda</button>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left p-3 font-semibold">Símbolo</th>
            <th className="text-left p-3">Código</th>
            <th className="text-left p-3">Nombre</th>
            <th className="text-right p-3">Tasa</th>
            <th className="text-center p-3">Principal</th>
            <th className="text-right p-3"></th>
          </tr></thead>
          <tbody>
            {currencies.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(c)}>
                <td className="p-3 font-bold text-lg">{c.symbol}</td>
                <td className="p-3 font-mono text-xs">{c.code}</td>
                <td className="p-3">{c.name}</td>
                <td className="p-3 text-right font-mono">{c.rate}</td>
                <td className="p-3 text-center">{c.isDefault && <Star className="h-4 w-4 text-amber-500 mx-auto" />}</td>
                <td className="p-3 text-right">
                  <button onClick={e => { e.stopPropagation(); del(c.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {currencies.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aún no hay monedas</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{editId ? "Editar moneda" : "Agregar moneda"}</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Código</label><input className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="BOB" /></div>
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Nombre</label><input className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Boliviano" /></div>
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Símbolo</label><input className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder="Bs" /></div>
              <div><label className="text-sm font-medium text-gray-700 block mb-1">Tasa (respecto a la moneda principal)</label><input type="number" step="0.000001" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="h-4 w-4 accent-amber-500" />
                Establecer como moneda principal
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setOpen(false)} className="flex-1 h-11 rounded-lg border border-gray-200 font-medium text-sm text-gray-600">{t.order.cancel}</button>
              <button onClick={save} disabled={pending || !form.code || !form.name} className="flex-1 h-11 rounded-lg bg-amber-500 text-white font-semibold text-sm disabled:opacity-40">{t.common.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
