"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDailyReport, getTopProducts } from "@/server/inventory/actions";
import { getInvoiceReport, getSoldItemsReport, getRevenueReport, getIngredientReport, getWarehouseReport } from "@/server/reports/actions";
import { useI18n } from "@/i18n/context";
import { useDeviceInfo } from "@/components/shared/device-provider";
import { Download, DollarSign, FileText, ShoppingBag, TrendingUp, Package, ClipboardList, AlertTriangle } from "lucide-react";

function fmt(n: number) { return new Intl.NumberFormat("es-BO").format(n || 0); }

type InvoiceReport = Awaited<ReturnType<typeof getInvoiceReport>>;
type SoldItemsReport = Awaited<ReturnType<typeof getSoldItemsReport>>;
type RevenueReport = Awaited<ReturnType<typeof getRevenueReport>>;
type IngredientReport = Awaited<ReturnType<typeof getIngredientReport>>;
type WarehouseReport = Awaited<ReturnType<typeof getWarehouseReport>>;

export function ReportsClientWrapper({ today }: { today: string }) {
  return <ReportsClient today={today} />;
}

export function ReportsClient({ today }: { today: string }) {
  const { t } = useI18n();
  const { isMobile } = useDeviceInfo();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className={`h-full overflow-y-auto space-y-6 ${isMobile ? "px-3 py-4" : "p-6"}`}>
      <div>
        <h2 className={`${isMobile ? "text-xl" : "text-2xl"} font-bold text-gray-900`}>{t.reports.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{t.dashboard.modules.reports}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`bg-gray-100 border border-gray-200 p-1 rounded-full ${isMobile ? "flex flex-wrap" : "flex flex-wrap"}`}>
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-full px-4 py-2 text-sm font-medium">{t.reports.overview}</TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-full px-4 py-2 text-sm font-medium">{t.reports.invoices}</TabsTrigger>
          <TabsTrigger value="sold" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-full px-4 py-2 text-sm font-medium">{t.reports.soldItems}</TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-full px-4 py-2 text-sm font-medium">{t.reports.revenue}</TabsTrigger>
          <TabsTrigger value="ingredients" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-full px-4 py-2 text-sm font-medium">{t.reports.ingredients}</TabsTrigger>
          <TabsTrigger value="warehouse" className="data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-full px-4 py-2 text-sm font-medium">{t.reports.warehouse}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6"><OverviewTab today={today} t={t} /></TabsContent>
        <TabsContent value="invoices" className="mt-6"><InvoiceTab today={today} t={t} /></TabsContent>
        <TabsContent value="sold" className="mt-6"><SoldItemsTab today={today} t={t} /></TabsContent>
        <TabsContent value="revenue" className="mt-6"><RevenueTab today={today} t={t} /></TabsContent>
        <TabsContent value="ingredients" className="mt-6"><IngredientTab today={today} t={t} /></TabsContent>
        <TabsContent value="warehouse" className="mt-6"><WarehouseTab today={today} t={t} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ======================== MODE SELECTOR ========================

function ModeSelector({ mode, setMode, date, setDate, startDate, setStartDate, endDate, setEndDate, onExport, exporting, label, t }: {
  mode: string; setMode: (v: string) => void;
  date: string; setDate: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
  onExport: () => void; exporting: boolean; label: string;
  t: any;
}) {
  return (
    <div className="section-amber space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500 uppercase tracking-wider">{t.reports.filter}</Label>
          <Select value={mode} onValueChange={(v) => setMode(v ?? "day")}>
            <SelectTrigger className="h-10 rounded-lg w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t.reports.today}</SelectItem>
              <SelectItem value="week">{t.reports.thisWeek}</SelectItem>
              <SelectItem value="month">{t.reports.thisMonth}</SelectItem>
              <SelectItem value="year">{t.reports.thisYear}</SelectItem>
              <SelectItem value="custom">{t.reports.custom}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "custom" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">{t.reports.fromDate}</Label>
              <Input type="date" className="h-10 rounded-lg w-44" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">{t.reports.toDate}</Label>
              <Input type="date" className="h-10 rounded-lg w-44" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </>
        ) : (["week", "month", "year"].includes(mode)) ? (
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 uppercase tracking-wider">{t.reports.referenceDate}</Label>
            <Input type="date" className="h-10 rounded-lg w-44" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs text-gray-500 uppercase tracking-wider">{t.reports.referenceDate}</Label>
            <Input type="date" className="h-10 rounded-lg w-44" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        )}

        <button onClick={onExport} disabled={exporting} className="btn-pos-primary h-10 ml-auto">
          <Download className="h-4 w-4" />
          {exporting ? t.reports.exporting : `${t.reports.export} ${label}`}
        </button>
      </div>
    </div>
  );
}

function exportExcel(type: string, mode: string, date: string, startDate: string, endDate: string) {
  const params = new URLSearchParams({ type, mode });
  if (mode === "custom") {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  } else {
    params.set("date", date);
  }
  window.open(`/api/reports?${params.toString()}`, "_blank");
}

// ======================== OVERVIEW TAB ========================

function OverviewTab({ today, t }: { today: string; t: any }) {
  const [report, setReport] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [rep, top] = await Promise.all([getDailyReport(today), getTopProducts(today)]);
      setReport(rep); setTopProducts(top); setLoading(false);
    })();
  }, [today]);

  if (loading) return <div className="text-center text-gray-400 py-16">{t.reports.loading}</div>;
  if (!report) return <div className="text-center text-gray-400 py-16">{t.reports.noData}</div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">{new Date(today).toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.reports.revenue, value: fmt(report.revenue) + "Bs", sub: report.orders + " " + t.dashboard.orders_unit, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: t.reports.expenseLabel, value: fmt(report.totalExpense) + "Bs", sub: t.reports.expenseSub, icon: TrendingUp, color: "text-red-500", bg: "bg-red-50" },
          { label: t.reports.profitLabel, value: fmt(report.profit) + "Bs", sub: report.profit >= 0 ? t.reports.profitSub : t.reports.lossSub, icon: TrendingUp, color: report.profit >= 0 ? "text-emerald-600" : "text-red-500", bg: report.profit >= 0 ? "bg-emerald-50" : "bg-red-50" },
          { label: t.reports.taxLabel, value: fmt(report.vatTotal + report.exciseTaxTotal) + "Bs", sub: t.reports.taxSub, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
            <div><p className="text-xs font-medium text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-400 mt-0.5">{s.sub}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="section-amber">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.reports.byPaymentMethod}</h3>
          {Object.keys(report.paymentMethods).length === 0 ? <p className="text-sm text-gray-400">{t.reports.noData}</p> : (
            <div className="space-y-2">{Object.entries(report.paymentMethods).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"><span className="text-sm font-medium">{method}</span><span className="text-sm font-mono font-bold">{fmt(amount as number)}Bs</span></div>
            ))}</div>
          )}
        </div>
        <div className="section-amber">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.dashboard.topProduct}</h3>
          {topProducts.length === 0 ? <p className="text-sm text-gray-400">{t.reports.noData}</p> : (
            <div className="space-y-2">{topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-3"><span className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: i < 3 ? "#d97706" : "#9ca3af" }}>{i + 1}</span><span className="text-sm font-medium">{p.name}</span></div>
                <div className="flex items-center gap-4"><span className="text-xs text-gray-500">{p.quantity} {t.inventory.items}</span><span className="text-sm font-mono font-bold">{fmt(p.revenue)}Bs</span></div>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================== INVOICE TAB ========================

function InvoiceTab({ today, t }: { today: string; t: any }) {
  const [mode, setMode] = useState("day");
  const [date, setDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<InvoiceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await getInvoiceReport(mode, date, startDate, endDate);
    setData(d);
    setLoading(false);
  }, [mode, date, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <ModeSelector mode={mode} setMode={setMode} date={date} setDate={setDate} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onExport={() => { setExporting(true); exportExcel("invoices", mode, date, startDate, endDate); setTimeout(() => setExporting(false), 2000); }} exporting={exporting} label={t.reports.invoices} t={t} />

      {loading ? <p className="text-center text-gray-400 py-16">{t.reports.loading}</p> : !data ? <p className="text-center text-gray-400 py-16">{t.reports.noData}</p> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t.reports.totalInvoice, value: data.summary.totalOrders },
              { label: t.reports.subtotalLabel, value: fmt(data.summary.totalSubtotal) + "Bs" },
              { label: t.reports.taxTotalLabel, value: fmt(data.summary.totalVat + data.summary.totalExciseTax) + "Bs" },
              { label: t.reports.totalRevenue, value: fmt(data.summary.totalRevenue) + "Bs", highlight: true },
            ].map((s, i) => (
              <div key={i} className={`stat-card ${s.highlight ? "ring-2 ring-amber-200" : ""}`}>
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="section-amber overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-3 font-semibold">{t.order.orderNumber}</th><th className="text-left p-3">{t.settings.tables}</th><th className="text-center p-3">{t.order.guestCount}</th>
                  <th className="text-left p-3">{t.inventory.staff}</th><th className="text-right p-3">{t.reports.subtotalLabel}</th>
                  <th className="text-right p-3">{t.order.vat}</th><th className="text-right p-3">{t.order.exciseTax}</th><th className="text-right p-3">{t.order.discount}</th>
                  <th className="text-right p-3">{t.settings.serviceCharges}</th><th className="text-right p-3">{t.order.total}</th><th className="text-left p-3">{t.reports.paymentMethods}</th>
                  <th className="text-left p-3">{t.inventory.date}</th>
                </tr></thead>
                <tbody>
                  {data.orders.map((o, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-amber-50/30">
                      <td className="p-3 font-mono text-xs text-amber-700 font-semibold">{o.orderNumber}{o.orderNumberSuffix ? "-" + o.orderNumberSuffix : ""}</td>
                      <td className="p-3 font-medium">{o.table}</td><td className="p-3 text-center">{o.guestCount}</td>
                      <td className="p-3">{o.staff}</td><td className="p-3 text-right font-mono">{fmt(o.subtotal)}</td>
                      <td className="p-3 text-right font-mono">{fmt(o.vatAmount)}</td><td className="p-3 text-right font-mono">{fmt(o.exciseTaxAmount)}</td>
                      <td className="p-3 text-right font-mono">{fmt(o.discountAmount)}</td><td className="p-3 text-right font-mono">{fmt(o.serviceCharge)}</td>
                      <td className="p-3 text-right font-mono font-bold">{fmt(o.totalAmount)}</td>
                      <td className="p-3 text-xs text-gray-500 max-w-40 truncate">{o.paymentMethods}</td>
                      <td className="p-3">{o.closedAt ? new Date(o.closedAt).toLocaleDateString("es-BO") : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.orders.length === 0 && <p className="text-center text-gray-400 py-12">{t.reports.noData}</p>}
          </div>
        </>
      )}
    </div>
  );
}

// ======================== SOLD ITEMS TAB ========================

function SoldItemsTab({ today, t }: { today: string; t: any }) {
  const [mode, setMode] = useState("day");
  const [date, setDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<SoldItemsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await getSoldItemsReport(mode, date, startDate, endDate);
    setData(d);
    setLoading(false);
  }, [mode, date, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <ModeSelector mode={mode} setMode={setMode} date={date} setDate={setDate} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onExport={() => { setExporting(true); exportExcel("sold-items", mode, date, startDate, endDate); setTimeout(() => setExporting(false), 2000); }} exporting={exporting} label={t.reports.soldItems} t={t} />

      {loading ? <p className="text-center text-gray-400 py-16">{t.reports.loading}</p> : !data ? <p className="text-center text-gray-400 py-16">{t.reports.noData}</p> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: t.reports.totalSoldItems, value: data.summary.totalItems },
              { label: t.reports.totalSoldQty, value: data.summary.totalQuantity },
              { label: t.reports.totalRevenue, value: fmt(data.summary.totalRevenue) + "Bs", highlight: true },
            ].map((s, i) => (
              <div key={i} className={`stat-card ${s.highlight ? "ring-2 ring-amber-200" : ""}`}>
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By product */}
            <div className="section-amber">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.reports.byProduct}</h3>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left p-3 text-xs text-gray-400">#</th><th className="text-left p-3 font-semibold">{t.settings.products}</th><th className="text-left p-3">{t.settings.categories}</th><th className="text-right p-3">{t.inventory.quantity}</th><th className="text-right p-3">{t.reports.revenue}</th></tr></thead>
                <tbody>{data.byProduct.map((p, i) => (
                  <tr key={i} className="border-b border-gray-100"><td className="p-3 text-gray-400">{i + 1}</td><td className="p-3 font-medium">{p.name}</td><td className="p-3 text-gray-500">{p.category}</td><td className="p-3 text-right font-mono">{p.quantity}</td><td className="p-3 text-right font-mono font-bold">{fmt(p.revenue)}</td></tr>
                ))}</tbody>
              </table>
            </div>

            {/* Detail */}
            <div className="section-amber">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.reports.detail}</h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left p-3 font-semibold">{t.inventory.dish}</th><th className="text-right p-3">{t.inventory.quantity}</th><th className="text-right p-3">{t.inventory.unitPrice}</th><th className="text-right p-3">{t.inventory.totalPrice}</th><th className="text-left p-3">{t.order.orderNumber}</th><th className="text-left p-3">{t.settings.tables}</th></tr></thead>
                  <tbody>{data.items.slice(0, 50).map((it, i) => (
                    <tr key={i} className="border-b border-gray-100"><td className="p-3 text-xs">{it.productName} {it.toppings ? `(+${it.toppings})` : ""}</td><td className="p-3 text-right font-mono">{it.quantity}</td><td className="p-3 text-right font-mono text-xs">{fmt(it.unitPrice)}</td><td className="p-3 text-right font-mono font-bold text-xs">{fmt(it.totalAmount)}</td><td className="p-3 font-mono text-xs">{it.orderNumber}</td><td className="p-3 text-xs">{it.table}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ======================== REVENUE TAB ========================

function RevenueTab({ today, t }: { today: string; t: any }) {
  const [mode, setMode] = useState("day");
  const [date, setDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await getRevenueReport(mode, date, startDate, endDate);
    setData(d);
    setLoading(false);
  }, [mode, date, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <ModeSelector mode={mode} setMode={setMode} date={date} setDate={setDate} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onExport={() => { setExporting(true); exportExcel("revenue", mode, date, startDate, endDate); setTimeout(() => setExporting(false), 2000); }} exporting={exporting} label={t.reports.revenue} t={t} />

      {loading ? <p className="text-center text-gray-400 py-16">{t.reports.loading}</p> : !data ? <p className="text-center text-gray-400 py-16">{t.reports.noData}</p> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: t.reports.revenue, value: fmt(data.summary.totalRevenue) + "Bs" },
              { label: t.reports.subtotalLabel, value: fmt(data.summary.totalSubtotal) + "Bs" },
              { label: t.reports.taxLabel, value: fmt(data.summary.totalVat + data.summary.totalExciseTax) + "Bs" },
              { label: t.reports.expenseLabel, value: fmt(data.summary.totalExpenses) + "Bs" },
              { label: t.reports.profitLabel, value: fmt(data.summary.profit) + "Bs", highlight: data.summary.profit >= 0 },
            ].map((s, i) => (
              <div key={i} className={`stat-card ${s.highlight ? "ring-2 ring-emerald-200" : data.summary.profit < 0 && s.label === t.reports.profitLabel ? "ring-2 ring-red-200" : ""}`}>
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment methods */}
            <div className="section-amber">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.reports.byPaymentMethod}</h3>
              {Object.keys(data.summary.byPaymentMethod).length === 0 ? <p className="text-sm text-gray-400">{t.reports.noData}</p> : (
                <div className="space-y-2">{Object.entries(data.summary.byPaymentMethod).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"><span className="text-sm font-medium">{method}</span><span className="text-sm font-mono font-bold">{fmt(amount as number)}Bs</span></div>
                ))}</div>
              )}
            </div>
            {/* Expenses by category */}
            <div className="section-amber">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.reports.expenseLabel} {t.reports.byCategory.toLowerCase()}</h3>
              {Object.keys(data.expensesByCategory).length === 0 ? <p className="text-sm text-gray-400">{t.reports.noData}</p> : (
                <div className="space-y-2">{Object.entries(data.expensesByCategory).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"><span className="text-sm font-medium">{cat}</span><span className="text-sm font-mono font-bold text-red-600">{fmt(amount as number)}Bs</span></div>
                ))}</div>
              )}
            </div>
          </div>

          {/* Daily breakdown */}
          <div className="section-amber overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.reports.byDay}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-3 font-semibold">{t.inventory.date}</th><th className="text-right p-3">{t.order.orderNumber}</th><th className="text-right p-3">{t.reports.subtotalLabel}</th>
                  <th className="text-right p-3">{t.order.vat}</th><th className="text-right p-3">{t.order.exciseTax}</th><th className="text-right p-3">{t.order.discount}</th>
                  <th className="text-right p-3">{t.settings.serviceCharges}</th><th className="text-right p-3 font-semibold">{t.reports.revenue}</th>
                </tr></thead>
                <tbody>{data.days.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-amber-50/30">
                    <td className="p-3 font-medium">{new Date(d.date).toLocaleDateString("es-BO", { weekday: "short", day: "2-digit", month: "2-digit" })}</td>
                    <td className="p-3 text-right">{d.orders}</td><td className="p-3 text-right font-mono">{fmt(d.subtotal)}</td>
                    <td className="p-3 text-right font-mono">{fmt(d.vat)}</td><td className="p-3 text-right font-mono">{fmt(d.excise)}</td>
                    <td className="p-3 text-right font-mono">{fmt(d.discount)}</td><td className="p-3 text-right font-mono">{fmt(d.service)}</td>
                    <td className="p-3 text-right font-mono font-bold">{fmt(d.revenue)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ======================== INGREDIENT TAB ========================

function IngredientTab({ today, t }: { today: string; t: any }) {
  const [mode, setMode] = useState("month");
  const [date, setDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState<IngredientReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await getIngredientReport(mode, date, startDate, endDate);
    setData(d);
    setLoading(false);
  }, [mode, date, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <ModeSelector mode={mode} setMode={setMode} date={date} setDate={setDate} startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} onExport={() => { setExporting(true); exportExcel("ingredients", mode, date, startDate, endDate); setTimeout(() => setExporting(false), 2000); }} exporting={exporting} label={t.reports.ingredients} t={t} />

      {loading ? <p className="text-center text-gray-400 py-16">{t.reports.loading}</p> : !data ? <p className="text-center text-gray-400 py-16">{t.reports.noData}</p> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t.reports.stockInNote, value: data.stockInSummary.totalStockIns, icon: Package },
              { label: t.reports.totalMoneyIn, value: fmt(data.stockInSummary.totalAmount) + "Bs", highlight: true },
              { label: t.reports.stockOutNote, value: data.stockOutSummary.totalStockOuts, icon: ShoppingBag },
              { label: t.reports.totalQtyOut, value: data.stockOutSummary.totalQuantity },
            ].map((s, i) => (
              <div key={i} className={`stat-card ${s.highlight ? "ring-2 ring-amber-200" : ""}`}>
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nhập theo NCC */}
            <div className="section-amber">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.inventory.stockIn} {t.settings.suppliers.toLowerCase()}</h3>
              {Object.keys(data.stockInSummary.bySupplier).length === 0 ? <p className="text-sm text-gray-400">{t.reports.noData}</p> : (
                <div className="space-y-2">{Object.entries(data.stockInSummary.bySupplier).map(([sup, amount]) => (
                  <div key={sup} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"><span className="text-sm font-medium">{sup}</span><span className="text-sm font-mono font-bold">{fmt(amount as number)}Bs</span></div>
                ))}</div>
              )}
            </div>
            {/* Xuất theo lý do */}
            <div className="section-amber">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.inventory.stockOut} {t.inventory.reason.toLowerCase()}</h3>
              {Object.keys(data.stockOutSummary.byReason).length === 0 ? <p className="text-sm text-gray-400">{t.reports.noData}</p> : (
                <div className="space-y-2">{Object.entries(data.stockOutSummary.byReason).map(([reason, qty]) => (
                  <div key={reason} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"><span className="text-sm font-medium">{reason}</span><span className="text-sm font-mono font-bold">{qty as number}</span></div>
                ))}</div>
              )}
            </div>
          </div>

          {/* Stock In detail */}
          <div className="section-amber overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.reports.detail} {t.reports.stockInNote.toLowerCase()}</h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-3 font-semibold">{t.inventory.code}</th><th className="text-left p-3">{t.inventory.date}</th><th className="text-left p-3">{t.settings.suppliers}</th>
                  <th className="text-left p-3">{t.settings.ingredients}</th><th className="text-right p-3">{t.inventory.quantity}</th><th className="text-right p-3">{t.inventory.unitPrice}</th>
                  <th className="text-right p-3">{t.inventory.totalPrice}</th>
                </tr></thead>
                <tbody>{data.stockIns.slice(0, 100).flatMap(si => si.items.map((item: any, idx: number) => (
                  <tr key={`${si.id}-${idx}`} className="border-b border-gray-100 hover:bg-amber-50/30">
                    <td className="p-3 font-mono text-xs text-amber-700">{idx === 0 ? si.code : ""}</td>
                    <td className="p-3">{idx === 0 ? new Date(si.createdAt).toLocaleDateString("es-BO") : ""}</td>
                    <td className="p-3">{idx === 0 ? (si.supplier || "—") : ""}</td>
                    <td className="p-3">{item.ingredient.name}</td>
                    <td className="p-3 text-right font-mono">{item.quantity}</td>
                    <td className="p-3 text-right font-mono">{fmt(item.unitPrice)}</td>
                    <td className="p-3 text-right font-mono font-bold">{fmt(item.totalPrice)}</td>
                  </tr>
                )))}</tbody>
              </table>
            </div>
            {data.stockIns.length === 0 && <p className="text-center text-gray-400 py-8">{t.reports.noData}</p>}
          </div>

          {/* Stock Out detail */}
          <div className="section-amber overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.reports.detail} {t.reports.stockOutNote.toLowerCase()}</h3>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-3 font-semibold">{t.inventory.date}</th><th className="text-left p-3">{t.settings.ingredients}</th><th className="text-right p-3">{t.inventory.quantity}</th>
                  <th className="text-left p-3">{t.inventory.reason}</th><th className="text-left p-3">{t.inventory.staff}</th><th className="text-left p-3">{t.inventory.note}</th>
                </tr></thead>
                <tbody>{data.stockOuts.map((so: any) => (
                  <tr key={so.id} className="border-b border-gray-100 hover:bg-amber-50/30">
                    <td className="p-3">{new Date(so.createdAt).toLocaleDateString("es-BO")}</td>
                    <td className="p-3">{so.ingredient?.name || "—"}</td>
                    <td className="p-3 text-right font-mono">{so.quantity}</td>
                    <td className="p-3"><span className="inline-flex text-xs bg-gray-100 rounded-lg px-2.5 py-1 font-medium">{so.reason}</span></td>
                    <td className="p-3">{so.user?.name || "—"}</td>
                    <td className="p-3 text-xs text-gray-500">{so.note || ""}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {data.stockOuts.length === 0 && <p className="text-center text-gray-400 py-8">{t.reports.noData}</p>}
          </div>

          {/* Current stock after ingr tracking */}
          <div className="section-amber overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t.inventory.currentStock} ({t.settings.ingredients.toLowerCase()})</h3>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-3 font-semibold">{t.settings.name}</th><th className="text-left p-3">{t.inventory.purchaseUnit}</th><th className="text-left p-3">{t.inventory.baseUnit}</th>
                  <th className="text-right p-3">{t.inventory.conversionFactor}</th><th className="text-right p-3">{t.inventory.currentStock}</th><th className="text-right p-3">{t.inventory.minStock}</th>
                  <th className="text-right p-3">{t.inventory.costPrice}</th><th className="text-left p-3">{t.inventory.usedIn}</th>
                </tr></thead>
                <tbody>{data.ingredients.map(ing => (
                  <tr key={ing.id} className={`border-b border-gray-100 hover:bg-amber-50/30 ${ing.currentStock <= ing.minStock && ing.minStock > 0 ? "bg-amber-50" : ""}`}>
                    <td className="p-3 font-medium flex items-center gap-1.5">
                      {ing.name}
                      {ing.currentStock <= ing.minStock && ing.minStock > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                    </td>
                    <td className="p-3 text-gray-500">{ing.purchaseUnit}</td><td className="p-3 text-gray-500">{ing.baseUnit}</td>
                    <td className="p-3 text-right text-gray-500">{fmt(ing.conversionFactor)}</td>
                    <td className={`p-3 text-right font-mono font-bold ${ing.currentStock <= ing.minStock && ing.minStock > 0 ? "text-amber-600" : ""}`}>{fmt(ing.currentStock)}</td>
                    <td className="p-3 text-right text-gray-500">{fmt(ing.minStock)}</td>
                    <td className="p-3 text-right font-mono">{fmt(ing.costPerBaseUnit)}</td>
                    <td className="p-3 text-xs text-gray-500">{ing.recipes?.map((r: any) => r.product.name).join(", ") || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ======================== WAREHOUSE TAB ========================

function WarehouseTab({ today: _today, t }: { today: string; t: any }) {
  const [data, setData] = useState<WarehouseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => { setLoading(true); const d = await getWarehouseReport(); setData(d); setLoading(false); })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">{t.reports.warehouse} {t.reports.overview.toLowerCase()}</h3>
        <button onClick={() => { setExporting(true); window.open("/api/reports?type=warehouse", "_blank"); setTimeout(() => setExporting(false), 2000); }} disabled={exporting} className="btn-pos-primary h-10">
          <Download className="h-4 w-4" />
          {exporting ? t.reports.exporting : t.reports.export}
        </button>
      </div>

      {loading ? <p className="text-center text-gray-400 py-16">{t.reports.loading}</p> : !data ? <p className="text-center text-gray-400 py-16">{t.reports.noData}</p> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t.reports.ingredientCount, value: data.summary.totalIngredients },
              { label: t.reports.stockValue, value: fmt(data.summary.totalStockValue) + "Bs", highlight: true },
              { label: t.reports.productsCount, value: data.summary.totalProducts },
              { label: t.reports.suppliersCount, value: data.summary.totalSuppliers },
            ].map((s, i) => (
              <div key={i} className={`stat-card ${s.highlight ? "ring-2 ring-amber-200" : ""}`}>
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Low stock alerts */}
          {data.lowStock.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-amber-800">⚠️ {data.lowStock.length} {t.reports.lowStockAlert.toLowerCase()}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">{data.lowStock.map(i => (
                  <span key={i.id} className="inline-flex text-xs bg-white border border-amber-200 text-amber-700 rounded-lg px-2.5 py-1 font-medium">{i.name} ({fmt(i.currentStock)} {i.baseUnit})</span>
                ))}</div>
              </div>
            </div>
          )}

          {data.outOfStock.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-red-800">🚫 {data.outOfStock.length} {t.reports.outOfStockAlert.toLowerCase()}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">{data.outOfStock.map(i => (
                  <span key={i.id} className="inline-flex text-xs bg-white border border-red-200 text-red-700 rounded-lg px-2.5 py-1 font-medium">{i.name}</span>
                ))}</div>
              </div>
            </div>
          )}

          {/* Full table */}
          <div className="section-amber overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-3 font-semibold">{t.settings.name}</th><th className="text-left p-3">{t.inventory.purchaseUnit}</th><th className="text-left p-3">{t.inventory.baseUnit}</th>
                  <th className="text-right p-3">{t.inventory.conversionFactor}</th><th className="text-right p-3">{t.inventory.currentStock}</th><th className="text-right p-3">{t.inventory.minStock}</th>
                  <th className="text-right p-3">{t.inventory.costPrice}</th><th className="text-right p-3">{t.inventory.stockValue}</th>
                  <th className="text-left p-3">{t.inventory.usedIn}</th><th className="text-left p-3">{t.settings.suppliers}</th>
                </tr></thead>
                <tbody>{data.ingredients.map(ing => (
                  <tr key={ing.id} className={`border-b border-gray-100 hover:bg-amber-50/30 ${ing.currentStock <= ing.minStock && ing.minStock > 0 ? "bg-amber-50" : ing.currentStock <= 0 ? "bg-red-50" : ""}`}>
                    <td className="p-3 font-medium">{ing.name}</td><td className="p-3 text-gray-500">{ing.purchaseUnit}</td>
                    <td className="p-3 text-gray-500">{ing.baseUnit}</td><td className="p-3 text-right text-gray-500">{fmt(ing.conversionFactor)}</td>
                    <td className={`p-3 text-right font-mono font-bold ${ing.currentStock <= 0 && ing.minStock > 0 ? "text-red-600" : ing.currentStock <= ing.minStock ? "text-amber-600" : ""}`}>{fmt(ing.currentStock)}</td>
                    <td className="p-3 text-right text-gray-500">{fmt(ing.minStock)}</td><td className="p-3 text-right font-mono">{fmt(ing.costPerBaseUnit)}</td>
                    <td className="p-3 text-right font-mono font-bold">{fmt(ing.currentStock * ing.costPerBaseUnit)}</td>
                    <td className="p-3 text-xs text-gray-500">{ing.recipes?.map((r: any) => r.product.name).join(", ") || "—"}</td>
                    <td className="p-3 text-xs">{ing.supplier || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {data.ingredients.length === 0 && <p className="text-center text-gray-400 py-12">{t.reports.noData}</p>}
          </div>
        </>
      )}
    </div>
  );
}
