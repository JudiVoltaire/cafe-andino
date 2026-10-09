"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCashRegisters, getCashFlow, getCashFlowCategories, createCashFlow, openCashRegister, closeCashRegister, createPettyTransaction } from "@/server/inventory/actions";
import { toast } from "sonner";
import { useI18n } from "@/i18n/context";
import { useDeviceInfo } from "@/components/shared/device-provider";
import { Wallet, Plus, TrendingUp, TrendingDown } from "lucide-react";

type CashRegister = Awaited<ReturnType<typeof getCashRegisters>>[0];
type CashFlow = Awaited<ReturnType<typeof getCashFlow>>[0];
type CashCategory = Awaited<ReturnType<typeof getCashFlowCategories>>[0];

function fmt(n: number) { return new Intl.NumberFormat("es-BO").format(n || 0); }

export function CashClient({ registers, flows, categories, today }: { registers: CashRegister[]; flows: CashFlow[]; categories: CashCategory[]; today: string }) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || session?.user?.username || "cajero";
  const { t } = useI18n();
  const { isMobile } = useDeviceInfo();
  const [pending, start] = useTransition();
  const [openReg, setOpenReg] = useState(false);
  const [closeReg, setCloseReg] = useState(false);
  const [openFlow, setOpenFlow] = useState(false);
  const [openPetty, setOpenPetty] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("0");
  const [activeRegisterId, setActiveRegisterId] = useState(registers.find(r => r.status === "OPEN")?.id ?? "");
  const [flowForm, setFlowForm] = useState({ categoryId: categories[0]?.id ?? "", amount: "0", description: "", type: "INCOME" as "INCOME" | "EXPENSE" });
  const [pettyForm, setPettyForm] = useState({ category: "MISC", amount: "0", description: "", type: "EXPENSE" as "INCOME" | "EXPENSE" });

  const todayFlows = flows.filter(f => new Date(f.createdAt).toDateString() === new Date(today).toDateString());
  const totalIncome = todayFlows.filter(f => f.type === "INCOME").reduce((s, f) => s + f.amount, 0);
  const totalExpense = todayFlows.filter(f => f.type === "EXPENSE").reduce((s, f) => s + f.amount, 0);
  const activeRegister = registers.find(r => r.status === "OPEN");

  function doAct(fn: Function, ...args: any[]) { start(async () => { try { await fn(...args); toast.success(t.common.success); setOpenReg(false); setCloseReg(false); setOpenFlow(false); setOpenPetty(false); } catch { toast.error(t.common.error); } }); }

  return (
    <div className={`h-full overflow-y-auto space-y-6 ${isMobile ? "px-3 py-4" : "p-6"}`}>
      <div className={`flex items-center justify-between ${isMobile ? "flex-wrap gap-2" : ""}`}>
        <div><h2 className={`${isMobile ? "text-xl" : "text-2xl"} font-bold text-gray-900`}>{t.cash.title}</h2><p className="text-sm text-gray-500 mt-1">{t.dashboard.modules.cash}</p></div>
        <div className="flex gap-2">
          {!activeRegister ? <button onClick={() => setOpenReg(true)} className={`${isMobile ? "btn-pos-secondary text-sm" : "btn-pos-primary"}`}><Plus className="h-4 w-4" /> {t.cash.openRegister}</button>
            : <button onClick={() => { setActiveRegisterId(activeRegister.id); setCloseReg(true); }} className="btn-pos-secondary text-red-600 hover:bg-red-50 text-sm">{t.cash.closeRegister}</button>}
          <button onClick={() => setOpenFlow(true)} className="btn-pos-secondary text-sm"><Plus className="h-4 w-4" /> {isMobile ? "+" : `${t.cash.income}/${t.cash.expense}`}</button>
        </div>
      </div>

      <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-3"} gap-4`}>
        {[{ label: `${t.cash.income} ${t.reports.today.toLowerCase()}`, value: fmt(totalIncome) + "Bs", color: "text-emerald-600" }, { label: `${t.cash.expense} ${t.reports.today.toLowerCase()}`, value: fmt(totalExpense) + "Bs", color: "text-red-500" }, { label: t.cash.cashRegister, value: activeRegister ? fmt(activeRegister.openingBalance) + "Bs" : "—", color: "text-amber-600" }].map((s, i) => (
          <div key={i} className="stat-card"><p className="text-xs font-medium text-gray-500">{s.label}</p><p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p></div>
        ))}
      </div>

      <Tabs defaultValue="flows">
        <TabsList className={`bg-gray-100 border border-gray-200 p-1 rounded-full ${isMobile ? "flex flex-wrap" : ""}`}>
          <TabsTrigger value="flows" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-full px-4 py-2 text-sm font-medium">{t.cash.title}</TabsTrigger>
          <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-full px-4 py-2 text-sm font-medium">{t.cash.cashRegister}</TabsTrigger>
          {activeRegister && <TabsTrigger value="petty" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-full px-4 py-2 text-sm font-medium">{t.cash.pettyCash}</TabsTrigger>}
        </TabsList>

        <TabsContent value="flows" className="mt-4">
          <div className="section-amber overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left p-4">{t.inventory.date}</th><th className="text-left p-4">{t.settings.type}</th><th className="text-left p-4">{t.cash.category}</th><th className="text-left p-4">{t.cash.description}</th><th className="text-right p-4">{t.order.amount}</th></tr></thead>
            <tbody>{flows.map(f => (<tr key={f.id} className="border-b border-gray-100"><td className="p-4">{new Date(f.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</td>
              <td className="p-4"><span className={`inline-flex text-xs rounded-full px-2.5 py-1 font-bold ${f.type === "INCOME" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{f.type === "INCOME" ? t.cash.income.toUpperCase() : t.cash.expense.toUpperCase()}</span></td>
              <td className="p-4">{f.category?.name}</td><td className="p-4 text-gray-500">{f.description || "—"}</td>
              <td className={`p-4 text-right font-mono font-bold ${f.type === "INCOME" ? "text-emerald-600" : "text-red-500"}`}>{f.type === "EXPENSE" ? "-" : "+"}{fmt(f.amount)}Bs</td></tr>))}</tbody></table>
            {flows.length === 0 && <p className="text-center text-gray-400 py-12">{t.reports.noData}</p>}</div>
        </TabsContent>
        <TabsContent value="register" className="mt-4">
          <div className="section-amber overflow-hidden"><table className="w-full text-sm"><thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left p-4">{t.inventory.date}</th><th className="text-left p-4">{t.inventory.openedBy}</th><th className="text-right p-4">{t.cash.openingBalance}</th><th className="text-right p-4">{t.cash.closingBalance}</th><th className="text-right p-4">{t.cash.expectedBalance}</th><th className="text-right p-4">{t.cash.discrepancy}</th><th className="text-left p-4">{t.inventory.registerStatus}</th></tr></thead>
            <tbody>{registers.map(r => (<tr key={r.id} className="border-b border-gray-100"><td className="p-4 font-semibold">{new Date(r.openingAt).toLocaleDateString("en-US")}</td><td className="p-4">{r.user?.name}</td>
              <td className="p-4 text-right font-mono">{fmt(r.openingBalance)}Bs</td><td className="p-4 text-right font-mono">{r.closingBalance ? fmt(r.closingBalance) + "Bs" : "—"}</td><td className="p-4 text-right font-mono">{r.expectedBalance ? fmt(r.expectedBalance) + "Bs" : "—"}</td>
              <td className={`p-4 text-right font-mono font-bold ${(r.discrepancy ?? 0) !== 0 ? "text-red-500" : "text-emerald-600"}`}>{r.discrepancy !== null ? fmt(r.discrepancy) + "Bs" : "—"}</td>
              <td className="p-4"><span className={`inline-flex text-xs rounded-full px-2 py-1 font-medium ${r.status === "OPEN" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{r.status === "OPEN" ? t.cash.open : t.cash.locked}</span></td></tr>))}</tbody></table></div>
        </TabsContent>
        {activeRegister && <TabsContent value="petty" className="mt-4">
          <div className="flex gap-4">
            <button onClick={() => { setPettyForm(f => ({ ...f, type: "EXPENSE" })); setOpenPetty(true); }} className="flex-1 h-16 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:border-red-300 active:scale-[0.98] transition-all"><TrendingDown className="h-5 w-5" /> {t.cash.expense}</button>
            <button onClick={() => { setPettyForm(f => ({ ...f, type: "INCOME" })); setOpenPetty(true); }} className="flex-1 h-16 rounded-2xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-sm flex items-center justify-center gap-2 hover:border-emerald-300 active:scale-[0.98] transition-all"><TrendingUp className="h-5 w-5" /> {t.cash.income}</button>
          </div>
        </TabsContent>}
      </Tabs>

      {openReg && <D title={t.cash.openRegister} onClose={() => setOpenReg(false)}><div className="space-y-3"><Label>{t.cash.openingBalance} (Bs)</Label><Input type="number" className="h-11 rounded-lg" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} autoFocus /></div><div className="flex gap-3 mt-4"><button onClick={() => setOpenReg(false)} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm text-gray-600">{t.order.cancel}</button><button onClick={() => doAct(openCashRegister, { openingBalance: parseFloat(openingBalance) || 0, userId: currentUserId })} disabled={pending} className="flex-1 h-11 rounded-lg bg-amber-500 text-white font-semibold text-sm">{t.cash.openRegister}</button></div></D>}
      {closeReg && <D title={t.cash.closeRegister} onClose={() => setCloseReg(false)}><div className="space-y-3"><Label>{t.cash.closingBalance} (Bs)</Label><Input type="number" className="h-11 rounded-lg" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} autoFocus /></div><div className="flex gap-3 mt-4"><button onClick={() => setCloseReg(false)} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm text-gray-600">{t.order.cancel}</button><button onClick={() => doAct(closeCashRegister, activeRegisterId, { closingBalance: parseFloat(closingBalance) || 0, closedBy: session?.user?.name || "cajero" })} disabled={pending} className="flex-1 h-11 rounded-lg bg-amber-500 text-white font-semibold text-sm">{t.cash.closeRegister}</button></div></D>}
      {openFlow && <D title={`${t.cash.income}/${t.cash.expense}`} onClose={() => setOpenFlow(false)}><div className="space-y-3"><div className="space-y-1"><Label>{t.settings.type}</Label><Select value={flowForm.type} onValueChange={v => { const newType = v as "INCOME" | "EXPENSE"; const firstCat = categories.find(c => c.type === newType); setFlowForm(f => ({ ...f, type: newType, categoryId: firstCat?.id ?? "" })); }}><SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder={t.settings.type}>{flowForm.type === "INCOME" ? `${t.cash.income} (INCOME)` : `${t.cash.expense} (EXPENSE)`}</SelectValue></SelectTrigger><SelectContent><SelectItem value="INCOME">{t.cash.income} (INCOME)</SelectItem><SelectItem value="EXPENSE">{t.cash.expense} (EXPENSE)</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>{t.cash.category}</Label><Select value={flowForm.categoryId} onValueChange={v => setFlowForm(f => ({ ...f, categoryId: v ?? "" }))}><SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder={t.cash.category}>{categories.find(c => c.id === flowForm.categoryId)?.name}</SelectValue></SelectTrigger><SelectContent>{categories.filter(c => c.type === flowForm.type).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>{t.order.amount} (Bs)</Label><Input type="number" className="h-11 rounded-lg" value={flowForm.amount} onChange={e => setFlowForm(f => ({ ...f, amount: e.target.value }))} /></div><div className="space-y-1"><Label>{t.cash.description}</Label><Input className="h-11 rounded-lg" value={flowForm.description} onChange={e => setFlowForm(f => ({ ...f, description: e.target.value }))} /></div></div><div className="flex gap-3 mt-4"><button onClick={() => setOpenFlow(false)} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm text-gray-600">{t.order.cancel}</button><button onClick={() => doAct(createCashFlow, { ...flowForm, amount: parseFloat(flowForm.amount), userId: currentUserId })} disabled={pending} className="flex-1 h-11 rounded-lg bg-amber-500 text-white font-semibold text-sm">{t.common.save}</button></div></D>}
      {openPetty && <D title={pettyForm.type === "EXPENSE" ? t.cash.expense : t.cash.income} onClose={() => setOpenPetty(false)}><div className="space-y-3"><div className="space-y-1"><Label>{t.settings.type}</Label><Select value={pettyForm.category} onValueChange={v => setPettyForm(f => ({ ...f, category: v ?? "" }))}><SelectTrigger className="h-11 rounded-lg"><SelectValue placeholder={t.settings.type}>{pettyForm.category === "ICECUBE" ? ("🧊 " + t.inventory.icecube) : pettyForm.category === "GAS" ? ("🔥 " + t.inventory.gas) : pettyForm.category === "VEGGIE" ? ("🥬 " + t.inventory.veggie) : pettyForm.category === "REPAIR" ? ("🔧 " + t.inventory.repair) : pettyForm.category === "TIP" ? ("💝 " + t.inventory.tip) : pettyForm.category === "MISC" ? ("📦 " + t.inventory.other) : ""}</SelectValue></SelectTrigger><SelectContent><SelectItem value="ICECUBE">🧊 {t.inventory.icecube}</SelectItem><SelectItem value="GAS">🔥 {t.inventory.gas}</SelectItem><SelectItem value="VEGGIE">🥬 {t.inventory.veggie}</SelectItem><SelectItem value="REPAIR">🔧 {t.inventory.repair}</SelectItem><SelectItem value="TIP">💝 {t.inventory.tip}</SelectItem><SelectItem value="MISC">📦 {t.inventory.other}</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>{t.order.amount} (Bs)</Label><Input type="number" className="h-11 rounded-lg" value={pettyForm.amount} onChange={e => setPettyForm(f => ({ ...f, amount: e.target.value }))} /></div><div className="space-y-1"><Label>{t.order.note}</Label><Input className="h-11 rounded-lg" value={pettyForm.description} onChange={e => setPettyForm(f => ({ ...f, description: e.target.value }))} /></div></div><div className="flex gap-3 mt-4"><button onClick={() => setOpenPetty(false)} className="flex-1 h-11 rounded-lg border border-gray-200 text-sm text-gray-600">{t.order.cancel}</button><button onClick={() => doAct(createPettyTransaction, { cashRegisterId: activeRegister?.id || activeRegisterId, ...pettyForm, amount: parseFloat(pettyForm.amount), userId: currentUserId })} disabled={pending} className="flex-1 h-11 rounded-lg bg-amber-500 text-white font-semibold text-sm">{t.common.save}</button></div></D>}
    </div>
  );
}

function D({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}><div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}><h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>{children}</div></div>;
}
