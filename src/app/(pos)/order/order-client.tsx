"use client";

import { useState, useTransition, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/i18n/context";
import { useDeviceInfo } from "@/components/shared/device-provider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Users, Clock, Send, Printer, Merge, Split,
  Plus, Minus, ShoppingCart, X, ArrowLeft,
  UtensilsCrossed, Flame, Banknote, CheckCircle, Bluetooth, BluetoothConnected, BluetoothOff,
  XCircle, Crown, Check,
} from "lucide-react";
import {
  openTable, addItem, updateItemQuantity, removeItem, cancelItem,
  sendOrder, mergeTables, splitOrder, getOrder, printTempBill, checkoutOrder, updateOrderGuest, refreshKaraokeTime,
  cancelOrder,
} from "@/server/order/actions";
import { useBluetoothPrinter } from "@/hooks/use-bluetooth-printer";
import { MergeConfirmModal } from "./merge-confirm-modal";
import { SplitOrderModal } from "./split-order-modal";

type Area = {
  id: string; name: string; type: string;
  tables: TableInfo[];
};
type TableInfo = {
  id: string; name: string; capacity: number; isKaraoke: boolean;
  orders: { id: string; status: string; orderNumber: number; orderNumberSuffix?: string | null; type: string; openedAt: Date; guestCount: number; totalAmount?: number | null }[];
};
type Category = { id: string; name: string; products: ProductInfo[] };
type ProductInfo = {
  id: string; name: string; price: number; unit: { name: string };
  toppingGroups: { toppingGroup: { id: string; name: string; type: string; toppings: { id: string; name: string; price: number }[] } }[];
};
type OrderDetail = Awaited<ReturnType<typeof getOrder>>;

function fmt(v: number) { return new Intl.NumberFormat("es-BO").format(v); }

// ─── Table Grid View ────────────────────────────────────────────
// ─── Table Grid View ────────────────────────────────────────────
export function TableGridView({
  areas, activeAreaId, setActiveAreaId, onOpenTable, onSelectOrder,
  onMergeTables, onSplitTable, initialMergeTableId, onClearInitialMergeTable,
}: {
  areas: Area[]; activeAreaId: string; setActiveAreaId: (id: string) => void;
  onOpenTable: (t: TableInfo) => void; onSelectOrder: (orderId: string) => void;
  onMergeTables: (orderIds: string[], targetTableId: string) => Promise<any>;
  onSplitTable: (orderId: string) => void;
  initialMergeTableId?: string | null;
  onClearInitialMergeTable?: () => void;
}) {
  const { t } = useI18n();
  const { isMobile, isTablet, isDesktop } = useDeviceInfo();
  const [pending, start] = useTransition();
  const [mergeMode, setMergeMode] = useState(!!initialMergeTableId);
  const [splitMode, setSplitMode] = useState(false);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(
    initialMergeTableId ? new Set([initialMergeTableId]) : new Set()
  );
  const [targetTableId, setTargetTableId] = useState<string | null>(initialMergeTableId || null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);

  const activeArea = areas.find(a => a.id === activeAreaId)!;
  const occupied = activeArea.tables.filter(t => t.orders.length > 0 && (t.orders[0].status === "OPEN" || t.orders[0].status === "SENT")).length;

  useEffect(() => {
    if (initialMergeTableId) {
      setMergeMode(true);
      setSplitMode(false);
      setSelectedTables(new Set([initialMergeTableId]));
      setTargetTableId(initialMergeTableId);
      onClearInitialMergeTable?.();
    }
  }, [initialMergeTableId, onClearInitialMergeTable]);

  function toggleMerge() {
    const next = !mergeMode;
    setMergeMode(next);
    setSplitMode(false);
    setSelectedTables(new Set());
    setTargetTableId(null);
  }

  function toggleSplit() {
    const next = !splitMode;
    setSplitMode(next);
    setMergeMode(false);
    setSelectedTables(new Set());
    setTargetTableId(null);
  }

  function toggleTable(tableId: string) {
    if (mergeMode) {
      setSelectedTables(prev => {
        const next = new Set(prev);
        if (next.has(tableId)) {
          next.delete(tableId);
          if (targetTableId === tableId) {
            const remaining = Array.from(next);
            setTargetTableId(remaining[0] || null);
          }
        } else {
          next.add(tableId);
          if (!targetTableId) {
            setTargetTableId(tableId);
          }
        }
        return next;
      });
    } else if (splitMode) {
      const tbl = activeArea.tables.find(tb => tb.id === tableId);
      const order = tbl?.orders[0];
      if (order) {
        onSplitTable(order.id);
        setSplitMode(false);
      }
    }
  }

  async function handleConfirmMergeExecution(sourceOrderIds: string[], targetTid: string) {
    start(async () => {
      try {
        await onMergeTables(sourceOrderIds, targetTid);
        toast.success(t.order.mergeSuccess || "¡Mesas unidas con éxito!");
        setShowMergeConfirm(false);
        setMergeMode(false);
        setSelectedTables(new Set());
        setTargetTableId(null);
      } catch (err: any) {
        toast.error("Error al unir mesas: " + (err?.message || "Error desconocido"));
      }
    });
  }

  // Responsive grid: mobile 3 cols, tablet 4, desktop 8/10
  const gridCols = isMobile ? "grid-cols-3" : isTablet ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10";
  const cardPadding = isMobile ? "p-2.5" : "p-3.5";
  const gapSize = isMobile ? "gap-2" : "gap-3.5";

  return (
    <div className="flex flex-col h-full">
      {/* Area tabs + buttons */}
      <div className={`${isMobile ? "px-3 py-2 gap-1.5" : "px-6 py-3 gap-2"} flex items-center overflow-x-auto shrink-0 border-b border-gray-200 bg-white`}>
        {areas.map(a => (
          <button
            key={a.id}
            onClick={() => {
              setActiveAreaId(a.id);
              setMergeMode(false);
              setSplitMode(false);
              setSelectedTables(new Set());
              setTargetTableId(null);
            }}
            className={`${isMobile ? "px-3 py-1.5 text-xs" : "px-5 py-2 text-sm"} rounded-full font-semibold whitespace-nowrap transition-all active:scale-95 ${
              activeAreaId === a.id ? "bg-amber-500 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {a.name}
          </button>
        ))}

        {/* Desktop: Unir / Dividir buttons */}
        {!isMobile && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={toggleMerge}
              className={`px-4 py-2 text-sm rounded-full font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                mergeMode
                  ? "bg-blue-600 text-white ring-2 ring-blue-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Merge className="h-4 w-4" />
              {t.order.merge}
            </button>
            <button
              onClick={toggleSplit}
              className={`px-4 py-2 text-sm rounded-full font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                splitMode
                  ? "bg-purple-600 text-white ring-2 ring-purple-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Split className="h-4 w-4" />
              {t.order.split}
            </button>
          </div>
        )}
      </div>

      {/* Mode Banner: Merge Mode */}
      {mergeMode && (
        <div className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 bg-blue-50 border-b border-blue-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Merge className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-blue-950">
              {selectedTables.size === 0
                ? "Paso 1: Toca la mesa principal (receptora)"
                : selectedTables.size === 1
                ? `Mesa principal: ${activeArea.tables.find(t => t.id === targetTableId)?.name || ""}. Ahora toca las mesas que se unirán a ella:`
                : `Uniendo ${selectedTables.size} mesas en ${activeArea.tables.find(t => t.id === targetTableId)?.name || ""}:`}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full text-[11px] font-bold">
              {selectedTables.size} {t.order.selectedCount}
            </span>
            <button
              onClick={() => {
                setMergeMode(false);
                setSelectedTables(new Set());
                setTargetTableId(null);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-blue-100 transition-colors"
            >
              {t.order.cancel}
            </button>
            <button
              onClick={() => {
                if (selectedTables.size < 2) {
                  toast.error("Selecciona al menos 2 mesas para unir (una principal y una secundaria)");
                  return;
                }
                setShowMergeConfirm(true);
              }}
              disabled={selectedTables.size < 2 || pending}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Merge className="h-3.5 w-3.5" />
              Revisar y Unir ({selectedTables.size})
            </button>
          </div>
        </div>
      )}

      {/* Mode Banner: Split Mode */}
      {splitMode && (
        <div className="px-3 sm:px-6 py-2.5 text-xs sm:text-sm flex items-center justify-between gap-2 shrink-0 bg-purple-50 border-b border-purple-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              <Split className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-purple-950">
              Modo Dividir: Toca cualquier mesa ocupada para dividir sus ítems o cuenta
            </span>
          </div>

          <button
            onClick={() => setSplitMode(false)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-purple-100 transition-colors"
          >
            {t.order.cancel}
          </button>
        </div>
      )}

      {/* Legend */}
      {!isMobile && !mergeMode && !splitMode && (
        <div className="px-6 py-2 flex items-center gap-6 text-xs font-medium text-gray-500 bg-gray-50/70 border-b border-gray-200 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {t.order.tableFree}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {t.order.occupied}
          </span>
          <span className="text-gray-400 font-mono">
            {occupied}/{activeArea.tables.length} {t.order.occupied}
          </span>
        </div>
      )}

      {/* Table Grid */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? "p-2" : "p-6"}`}>
        <div className={`grid ${gridCols} ${gapSize}`}>
          {activeArea.tables.map(table => {
            const hasOrder = table.orders.length > 0 && (table.orders[0].status === "OPEN" || table.orders[0].status === "SENT");
            const order = table.orders[0];
            const isSelected = selectedTables.has(table.id);
            const isTarget = table.id === targetTableId;

            // Compute styling and badges dynamically for total clarity
            let cardClasses = "";
            let badge = null;
            let disabled = false;

            if (mergeMode) {
              if (!hasOrder) {
                disabled = true;
                cardClasses = "opacity-30 border-gray-200 bg-gray-50 cursor-not-allowed";
                badge = <span className="text-[10px] text-gray-400 font-medium">Sin pedido</span>;
              } else if (isTarget) {
                cardClasses = "bg-blue-100/90 border-blue-600 ring-2 ring-blue-400 shadow-sm";
                badge = (
                  <span className="text-[10px] font-extrabold text-blue-900 bg-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Crown className="h-3 w-3 fill-blue-700 text-blue-700" /> Destino
                  </span>
                );
              } else if (isSelected) {
                cardClasses = "bg-amber-100/90 border-amber-500 ring-2 ring-amber-300 shadow-xs";
                badge = (
                  <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    + A unir
                  </span>
                );
              } else {
                cardClasses = "bg-amber-50 border-amber-300 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer";
                badge = <span className="text-[10px] text-amber-700 font-semibold">Toca para unir</span>;
              }
            } else if (splitMode) {
              if (!hasOrder) {
                disabled = true;
                cardClasses = "opacity-30 border-gray-200 bg-gray-50 cursor-not-allowed";
                badge = <span className="text-[10px] text-gray-400 font-medium">Libre</span>;
              } else {
                cardClasses = "bg-purple-50/90 border-purple-500 hover:bg-purple-100 ring-2 ring-purple-300 shadow-xs cursor-pointer";
                badge = (
                  <span className="text-[10px] font-extrabold text-purple-900 bg-purple-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Split className="h-3 w-3" /> Toca para dividir
                  </span>
                );
              }
            } else {
              // Normal mode
              if (hasOrder) {
                cardClasses = "bg-amber-50/90 border-amber-300 hover:border-amber-400 hover:shadow-xs";
              } else {
                cardClasses = "bg-emerald-50/80 border-emerald-200 hover:border-emerald-300 hover:shadow-xs";
              }
            }

            return (
              <button
                key={table.id}
                disabled={disabled}
                onClick={() => {
                  if (mergeMode) {
                    if (hasOrder) toggleTable(table.id);
                  } else if (splitMode) {
                    if (hasOrder) toggleTable(table.id);
                  } else {
                    hasOrder ? onSelectOrder(order.id) : onOpenTable(table);
                  }
                }}
                className={`rounded-xl ${cardPadding} flex flex-col gap-1 transition-all active:scale-95 text-left border-2 min-h-[${isMobile ? "68px" : "90px"}] justify-center ${cardClasses}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`${isMobile ? "text-xs" : "text-sm"} font-extrabold ${hasOrder ? "text-amber-900" : "text-emerald-900"}`}>
                      {table.name}
                    </span>
                    {hasOrder && order && !mergeMode && !splitMode && (
                      <span className="text-[10px] font-semibold text-amber-700 flex items-center gap-0.5 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {Math.round((Date.now() - new Date(order.openedAt).getTime()) / 60000)}&apos;
                      </span>
                    )}
                  </div>

                  <div className="shrink-0">
                    {badge ? (
                      badge
                    ) : order?.status === "SENT" ? (
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                    ) : null}
                  </div>
                </div>

                {hasOrder && order ? (
                  <>
                    <span className="text-[11px] font-mono font-bold text-amber-800">
                      #{String(order.orderNumber).padStart(8, "0")}
                      {order.orderNumberSuffix ? `-${order.orderNumberSuffix}` : ""}
                    </span>
                    <span className={`${isMobile ? "text-[10px]" : "text-xs"} font-extrabold text-amber-700`}>
                      {fmt(order.totalAmount ?? 0)}Bs
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-700">
                    {table.capacity} {isMobile ? "" : t.order.seats}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Fixed bottom action bar — Unir / Dividir */}
      {isMobile && !mergeMode && !splitMode && (
        <div className="fixed bottom-14 left-0 right-0 z-30 px-3 pb-2 pt-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>
          <div className="flex gap-2 bg-white rounded-2xl shadow-xl border border-gray-200 px-3 py-2">
            <button
              onClick={toggleMerge}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 bg-blue-50 text-blue-700 active:scale-95 transition-all touch-manipulation border border-blue-200"
            >
              <Merge className="h-4 w-4" /> {t.order.merge}
            </button>
            <button
              onClick={toggleSplit}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 active:scale-95 transition-all touch-manipulation border border-purple-200"
            >
              <Split className="h-4 w-4" /> {t.order.split}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Confirm Merge Dialog */}
      <MergeConfirmModal
        open={showMergeConfirm}
        onClose={() => setShowMergeConfirm(false)}
        targetTableId={targetTableId}
        selectedTableIds={Array.from(selectedTables)}
        tables={activeArea.tables}
        onConfirm={handleConfirmMergeExecution}
        onChangeTargetTable={newTid => setTargetTableId(newTid)}
        pending={pending}
      />
    </div>
  );
}

// ─── Order Detail View ──────────────────────────────────────────
function OrderDetailView({
  orderDetail, categories, onBack,
  onSend, onTempBill, onCheckout, onMerge, onSplit,
  onAddItem, onUpdateQty, onRemoveItem, onCancelItem,
  onCancelOrder,
  pending, onGuestChange,
  btState, onBtConnect, onBtDisconnect,
  onMobileCheckout, mobileCheckoutPending,
}: {
  orderDetail: OrderDetail; categories: Category[]; onBack: () => void;
  onSend: () => void; onTempBill: () => void; onCheckout: () => void; onMerge: () => void; onSplit: () => void;
  onAddItem: (product: ProductInfo) => void;
  onUpdateQty: (itemId: string, qty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCancelItem: (itemId: string) => void;
  onCancelOrder: () => void;
  pending: boolean;
  onGuestChange: (delta: number) => void;
  btState: { connected: boolean; connecting: boolean; error: string | null };
  onBtConnect: () => void;
  onBtDisconnect: () => void;
  onMobileCheckout: (method: string, amount: string) => void;
  mobileCheckoutPending: boolean;
}) {
  const { t } = useI18n();
  const { isMobile, isTablet, isDesktop } = useDeviceInfo();
  const [activeCatId, setActiveCatId] = useState(categories[0]?.id ?? "");
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  // Mobile checkout states (inline, no popup)
  const [mobileCheckout, setMobileCheckout] = useState(false);
  const [mPaymentMethod, setMPaymentMethod] = useState("CASH");
  const [mPaymentAmount, setMPaymentAmount] = useState("");
  if (!orderDetail) return null;
  const activeCat = categories.find(c => c.id === activeCatId);
  const pendingItems = orderDetail.items.filter(i => i.status === "PENDING");
  const canSend = pendingItems.length > 0;
  const sidebarW = isTablet ? "w-[300px]" : "w-[380px]";

  // ══════ Shared: Order Panel content ══════
  function OrderPanelContent({ compact }: { compact?: boolean }) {
    if (!orderDetail) return null;
    return (
      <div className="flex flex-col h-full bg-white">
        {compact && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0">
            <span className="font-bold text-sm">{t.order.orderedItems} ({orderDetail!.items.length})</span>
            <button onClick={() => setOrderSheetOpen(false)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 touch-manipulation">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        )}
        {!compact && (
          <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400 shrink-0">
            {t.order.orderedItems} ({orderDetail.items.length})
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {orderDetail.items.map(item => (
            <div key={item.id} className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${
              item.status === "CANCELLED" ? "opacity-40 line-through bg-red-50 border-red-100" : "bg-gray-50 border-gray-200"
            }`}>
              {item.status === "SENT" && <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
              {item.status === "PENDING" && <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 shrink-0" />}
              {item.status === "CANCELLED" && <X className="h-3.5 w-3.5 text-red-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{item.product.name}</div>
                {item.toppings?.length > 0 && (
                  <div className="text-[10px] text-gray-400 truncate">+ {item.toppings.map((t: any) => t.topping?.name).join(", ")}</div>
                )}
              </div>
              {item.status === "PENDING" && !item.product.slug?.startsWith("karaoke-") ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => item.quantity <= 1 ? onRemoveItem(item.id) : onUpdateQty(item.id, item.quantity - 1)}
                    className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 active:scale-90 touch-manipulation">
                    <Minus className="h-2.5 w-2.5" /></button>
                  <span className="w-5 text-center font-mono font-bold text-xs">{item.quantity}</span>
                  <button onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 active:scale-90 touch-manipulation">
                    <Plus className="h-2.5 w-2.5" /></button>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-gray-500">x{item.quantity}</span>
              )}
              <span className="font-mono font-bold text-xs shrink-0 w-16 text-right text-gray-900">{fmt(item.unitPrice * item.quantity)}Bs</span>
              {item.status === "PENDING" && !item.product.slug.startsWith("karaoke-") && (
                <button onClick={() => onCancelItem(item.id)} className="text-[10px] text-red-400 hover:text-red-600 shrink-0 font-medium">{t.order.cancel}</button>
              )}
            </div>
          ))}
          {orderDetail.items.length === 0 && (
            <div className="text-center py-16 text-sm text-gray-400">{t.order.selectItems}</div>
          )}
        </div>

        {/* Totals + Actions */}
        <div className="px-4 py-3 space-y-1 text-sm shrink-0 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between"><span className="text-gray-500">{t.order.tempBill}</span><span className="font-mono font-semibold">{fmt(orderDetail.subtotal)}Bs</span></div>
          {(orderDetail.vatAmount ?? 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">{t.order.vat}</span><span className="font-mono">{fmt(orderDetail.vatAmount)}Bs</span></div>}
          {(orderDetail.exciseTaxAmount ?? 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">{t.order.exciseTax}</span><span className="font-mono">{fmt(orderDetail.exciseTaxAmount)}Bs</span></div>}
          {(orderDetail.serviceCharge ?? 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">{t.order.serviceCharge}</span><span className="font-mono">{fmt(orderDetail.serviceCharge)}Bs</span></div>}
          {(orderDetail.discountAmount ?? 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">{t.order.discount}</span><span className="font-mono text-emerald-600">-{fmt(orderDetail.discountAmount)}Bs</span></div>}
          <div className="flex justify-between text-base font-extrabold pt-1.5 border-t border-gray-200 text-amber-600">
            <span>{t.order.total}</span><span className="font-mono">{fmt(orderDetail.totalAmount)}Bs</span>
          </div>
        </div>

        {/* Actions */}
        <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-3"} gap-1.5 px-3 py-2.5 shrink-0 border-t border-gray-200`}>
          <button onClick={onSend} disabled={pending || !canSend}
            className="col-span-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 transition-all touch-manipulation">
            <Send className="h-4 w-4" /> {t.order.sendToKitchen}</button>
          <button onClick={onTempBill} className="py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all touch-manipulation">
            <Printer className="h-3 w-3" /> {t.order.tempBill}</button>
          <button onClick={onMerge} className="py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all touch-manipulation">
            <Merge className="h-3 w-3" /> {t.order.merge}</button>
          <button onClick={onSplit} className="py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 font-semibold text-xs flex items-center justify-center gap-1 active:scale-[0.98] transition-all touch-manipulation">
            <Split className="h-3 w-3" /> {t.order.split}</button>
          <button onClick={() => { if (compact) { setOrderSheetOpen(false); setMPaymentAmount(String(orderDetail!.totalAmount)); setMobileCheckout(true); } else { onCheckout(); } }} className="col-span-3 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm touch-manipulation">
            <Banknote className="h-4 w-4" /> {t.order.checkout}</button>
          <button onClick={() => { if (compact) setOrderSheetOpen(false); onCancelOrder(); }} className="col-span-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all touch-manipulation">
            <XCircle className="h-4 w-4 text-red-500" /> Cancelar orden / Desocupar mesa
          </button>
        </div>
      </div>
    );
  }

  // ══════ MOBILE: Full-width products + bottom sheet order ══════

  // ══════ Mobile Checkout View (inline, replaces sheet) ══════
  function MobileCheckoutView() {
    const raw = mPaymentAmount.replace(/[^0-9]/g, "");
    return (
      <div className="flex-1 flex flex-col bg-white">
        <div className="px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileCheckout(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 touch-manipulation">
              <ArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
            <h3 className="font-bold text-lg">{t.order.checkout}</h3>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.tempBill}</span><span className="font-mono">{fmt(orderDetail!.subtotal)}Bs</span></div>
            {(orderDetail!.vatAmount ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.vat}</span><span className="font-mono">{fmt(orderDetail!.vatAmount)}Bs</span></div>}
            {(orderDetail!.exciseTaxAmount ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.exciseTax}</span><span className="font-mono">{fmt(orderDetail!.exciseTaxAmount)}Bs</span></div>}
            {(orderDetail!.serviceCharge ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.serviceCharge}</span><span className="font-mono">{fmt(orderDetail!.serviceCharge)}Bs</span></div>}
            {(orderDetail!.discountAmount ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.discount}</span><span className="font-mono text-emerald-600">-{fmt(orderDetail!.discountAmount)}Bs</span></div>}
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-1.5 text-amber-600"><span>{t.order.total}</span><span className="font-mono">{fmt(orderDetail!.totalAmount)}Bs</span></div>
          </div>
          <div><label className="text-sm font-medium text-gray-700 block mb-1">{t.order.paymentMethod}</label>
            <select className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm" value={mPaymentMethod} onChange={e => setMPaymentMethod(e.target.value)}>
              <option value="CASH">💵 {t.order.cash}</option><option value="BANK_TRANSFER">🏦 {t.order.transfer}</option><option value="MOMO">📱 Momo</option></select></div>
          <div><label className="text-sm font-medium text-gray-700 block mb-1">{t.order.amount}</label>
            <input type="text" inputMode="numeric" style={{ textAlign: "right" }} className="w-full h-12 px-4 rounded-lg border border-gray-200 text-xl font-mono font-bold" value={mPaymentAmount ? Number(mPaymentAmount).toLocaleString("es-BO") : ""} onFocus={e => e.target.value = mPaymentAmount || ""} onBlur={e => { const v = e.target.value.replace(/[^0-9]/g, ""); setMPaymentAmount(v); }} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ""); setMPaymentAmount(v); }} placeholder="0" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setMobileCheckout(false)} className="flex-1 h-12 rounded-xl border border-gray-200 font-medium text-sm text-gray-600 touch-manipulation">{t.order.cancel}</button>
            <button onClick={() => { if (!mobileCheckoutPending) onMobileCheckout(mPaymentMethod, raw); }} disabled={mobileCheckoutPending || !raw || parseFloat(raw) <= 0} className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm touch-manipulation">
              {mobileCheckoutPending ? (<><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> {t.common.loading}</>) : (t.order.confirm + " — " + fmt(orderDetail!.totalAmount) + "Bs")}
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Compact Header */}
        <div className="flex items-center justify-between px-3 py-2 gap-2 shrink-0 bg-amber-500 text-white">
          <button onClick={onBack} className="p-1 -ml-1 rounded-lg hover:bg-white/10 active:scale-90 transition-all touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-extrabold text-sm">{orderDetail.table?.name}</span>
            <span className="text-xs opacity-80">#{String(orderDetail.orderNumber).padStart(8, "0")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <button onClick={() => onGuestChange(-1)} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 active:scale-90 touch-manipulation">−</button>
            <span className="font-medium">{orderDetail.guestCount}</span>
            <button onClick={() => onGuestChange(1)} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 active:scale-90 touch-manipulation">+</button>
            <Users className="h-3 w-3 ml-1 opacity-70" />
          </div>
          <button
            onClick={onCancelOrder}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/80 text-white transition-all touch-manipulation"
            title="Cancelar orden / Desocupar mesa"
          >
            <XCircle className="h-4 w-4" />
          </button>
          <button
            onClick={btState.connected ? onBtDisconnect : onBtConnect}
            disabled={btState.connecting}
            className={`p-1.5 rounded-lg transition-all touch-manipulation ${btState.connected ? "bg-white/20 text-white" : "bg-white/20 text-white/60"}`}
          >
            {btState.connecting ? <Bluetooth className="h-4 w-4 animate-pulse" /> : btState.connected ? <BluetoothConnected className="h-4 w-4" /> : <BluetoothOff className="h-4 w-4" />}
          </button>
        </div>

        {/* Product Catalog — full width / Checkout View */}
        {mobileCheckout ? (
          <MobileCheckoutView />
        ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category tabs */}
          <div className="px-2 py-1.5 flex gap-1 overflow-x-auto shrink-0 bg-gray-50 border-b border-gray-200">
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCatId(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 touch-manipulation ${
                  activeCatId === c.id ? "bg-white text-amber-700 border border-gray-200 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                {c.name}
              </button>
            ))}
          </div>
          {/* Product grid — 2 cols on mobile */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-2">
              {activeCat?.products.map(p => (
                <button key={p.id} onClick={() => onAddItem(p)}
                  className="bg-white rounded-xl p-3 text-left border border-gray-200 hover:border-amber-300 hover:shadow-sm active:scale-[0.97] transition-all touch-manipulation">
                  <div className="flex items-center gap-1">
                    <UtensilsCrossed className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-xs font-semibold text-gray-900 truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold text-amber-600">{fmt(p.price)}Bs</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{p.unit?.name}</span>
                  </div>
                  {(p.toppingGroups?.length ?? 0) > 0 && (
                    <span className="text-[10px] mt-1 block font-medium text-amber-600">+ {t.order.topping}</span>
                  )}
                </button>
              ))}
              {activeCat?.products.length === 0 && (
                <div className="col-span-full text-center py-12 text-sm text-gray-400">{t.settings.noData}</div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Floating Order Button — hide during checkout */}
        {!mobileCheckout && (
        <button
          onClick={() => setOrderSheetOpen(true)}
          className="fixed bottom-16 left-3 right-3 z-30 h-12 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all touch-manipulation"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>{t.order.orderedItems} ({orderDetail.items.length})</span>
          <span className="font-mono">{fmt(orderDetail.totalAmount)}Bs</span>
        </button>
        )}

        {/* Order Sheet — slides up from bottom */}
        <Sheet open={orderSheetOpen} onOpenChange={setOrderSheetOpen}>
          <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-2xl [&>button]:hidden">
            <OrderPanelContent compact />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ══════ TABLET / DESKTOP: Side-by-side ══════
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 gap-3 shrink-0 bg-amber-500 text-white">
        <button onClick={onBack} className="p-1.5 -ml-1 rounded-lg hover:bg-white/10 active:scale-90 transition-all">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="font-extrabold text-lg">{orderDetail.table?.name}</span>
          <span className="text-sm opacity-90">#{String(orderDetail.orderNumber).padStart(8, "0")}{orderDetail.orderNumberSuffix ? `-${orderDetail.orderNumberSuffix}` : ""}</span>
          <span className="text-xs opacity-70 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {orderDetail.closedAt
              ? `${t.order.closedAt} · ${new Date(orderDetail.closedAt).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}`
              : `${t.order.openedAt} ${new Date(orderDetail.openedAt).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}`
            }
          </span>
          <span className="text-xs opacity-70 flex items-center gap-1">
            <Users className="h-3 w-3" />
            <button onClick={() => onGuestChange(-1)} className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 active:scale-90 transition-all text-xs">−</button>
            <span className="font-medium">{orderDetail.guestCount}</span>
            <button onClick={() => onGuestChange(1)} className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 active:scale-90 transition-all text-xs">+</button>
          </span>
        </div>
        <span className="text-sm font-bold">{t.order.total}: {fmt(orderDetail.totalAmount)}Bs</span>
        <button
          onClick={onCancelOrder}
          className="px-2.5 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          title="Cancelar pedido y desocupar mesa"
        >
          <XCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Desocupar mesa</span>
        </button>
        <button
          onClick={btState.connected ? onBtDisconnect : onBtConnect}
          disabled={btState.connecting}
          className={`p-1.5 rounded-lg transition-all ${btState.connected ? "bg-white/20 text-white hover:bg-white/30" : "bg-white/20 text-white/60 hover:bg-white/30"}`}
          title={btState.connected ? t.order.bluetoothConnected : btState.connecting ? t.order.bluetoothConnecting : t.order.bluetoothConnect}
        >
          {btState.connecting ? (
            <Bluetooth className="h-4 w-4 animate-pulse" />
          ) : btState.connected ? (
            <BluetoothConnected className="h-4 w-4" />
          ) : (
            <BluetoothOff className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Body: Products | Order Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Products */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0 bg-gray-50 border-b border-gray-200">
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCatId(c.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  activeCatId === c.id ? "bg-white text-amber-700 border border-gray-200 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className={`grid ${isTablet ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5" : "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7"} gap-2`}>
              {activeCat?.products.map(p => (
                <button key={p.id} onClick={() => onAddItem(p)}
                  className="bg-white rounded-lg p-3 text-left border border-gray-200 hover:border-amber-300 hover:shadow-sm active:scale-[0.97] transition-all">
                  <div className="flex items-center gap-1">
                    <UtensilsCrossed className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-xs font-semibold text-gray-900 truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold text-amber-600">{fmt(p.price)}Bs</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{p.unit?.name}</span>
                  </div>
                  {(p.toppingGroups?.length ?? 0) > 0 && (
                    <span className="text-[10px] mt-1 block font-medium text-amber-600">+ {t.order.topping}</span>
                  )}
                </button>
              ))}
              {activeCat?.products.length === 0 && (
                <div className="col-span-full text-center py-12 text-sm text-gray-400">{t.settings.noData}</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Order Panel */}
        <div className={`${sidebarW} shrink-0 flex flex-col border-l border-gray-200`}>
          <OrderPanelContent />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────
export function OrderClient({ areas, categories }: { areas: Area[]; categories: Category[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [view, setView] = useState<"tables" | "order">("tables");
  const [activeAreaId, setActiveAreaId] = useState(areas[0]?.id ?? "");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toppingProduct, setToppingProduct] = useState<ProductInfo | null>(null);
  const [toppingSelections, setToppingSelections] = useState<Record<string, boolean>>({});

  // Dialogs & Modes
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [mobileCheckoutPending, setMobileCheckoutPending] = useState(false);
  const [initialMergeTableId, setInitialMergeTableId] = useState<string | null>(null);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitTargetOrderDetail, setSplitTargetOrderDetail] = useState<OrderDetail | null>(null);

  const activeArea = areas.find(a => a.id === activeAreaId);

  const availableEmptyTables = useMemo(() => {
    const currentTableId = splitTargetOrderDetail?.table?.id;
    const currentArea = areas.find(a => a.id === activeAreaId) || areas[0];
    if (!currentArea) return [];
    return currentArea.tables
      .filter(t => t.id !== currentTableId && (!t.orders || t.orders.length === 0 || !t.orders.some(o => o.status === "OPEN" || o.status === "SENT")))
      .map(t => ({ id: t.id, name: t.name, capacity: t.capacity }));
  }, [areas, activeAreaId, splitTargetOrderDetail]);

  // Bluetooth printer
  const bt = useBluetoothPrinter();

  const refreshOrder = useCallback(async () => {
    if (!activeOrderId) return;
    setOrderDetail(await getOrder(activeOrderId));
  }, [activeOrderId]);

  useEffect(() => { if (activeOrderId) refreshOrder(); }, [refreshOrder, refreshKey]);
  useEffect(() => { const interval = setInterval(() => router.refresh(), 30000); return () => clearInterval(interval); }, [router]);
  // Auto-refresh karaoke orders every 30s to update time
  useEffect(() => {
    if (!orderDetail || orderDetail.type !== "KARAOKE" || !activeOrderId) return;
    const interval = setInterval(async () => {
      await refreshKaraokeTime(activeOrderId);
      setRefreshKey(k => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [orderDetail?.id, orderDetail?.type, activeOrderId]);

  async function handleBack() {
    if (activeOrderId && orderDetail && orderDetail.items.length === 0) {
      try {
        await cancelOrder(activeOrderId);
        router.refresh();
      } catch (e) {
        console.error("Auto cancel empty order error:", e);
      }
    }
    setView("tables");
    setActiveOrderId(null);
    setOrderDetail(null);
  }

  function handleCancelOrder() {
    if (!activeOrderId) return;
    const hasItems = orderDetail && orderDetail.items.some(i => i.status !== "CANCELLED");
    if (hasItems) {
      if (!window.confirm("¿Estás seguro de cancelar esta orden y desocupar la mesa? Se anularán los items cargados.")) {
        return;
      }
    }
    start(async () => {
      try {
        await cancelOrder(activeOrderId, "Cancelado por el usuario");
        toast.success("Mesa desocupada y pedido cancelado");
        setView("tables");
        setActiveOrderId(null);
        setOrderDetail(null);
        router.refresh();
      } catch (err) {
        console.error("Cancel order error:", err);
        toast.error("Error al cancelar la orden");
      }
    });
  }

  // Table actions
  function handleOpenTable(table: TableInfo) {
    start(async () => {
      const o = await openTable(table.id, 1);
      setActiveOrderId(o.id); setView("order"); setRefreshKey(k => k + 1);
    });
  }
  function handleSelectOrder(orderId: string) {
    setActiveOrderId(orderId); setView("order");
    start(async () => {
      await refreshKaraokeTime(orderId);
      setRefreshKey(k => k + 1);
    });
  }

  // Gộp từ màn bàn (multi-select)
  async function handleMergeTables(orderIds: string[], targetTableId: string) {
    await mergeTables(orderIds, targetTableId);
    setRefreshKey(k => k + 1);
    router.refresh();
  }
  // Tách bàn / cuenta
  async function handleSplitTable(orderId: string) {
    try {
      const detail = await getOrder(orderId);
      if (!detail) {
        toast.error("No se encontró el detalle de la orden");
        return;
      }
      setSplitTargetOrderDetail(detail);
      setSplitModalOpen(true);
    } catch (err: any) {
      toast.error("Error al cargar orden para dividir: " + (err?.message || "Error"));
    }
  }

  async function handleConfirmSplit(payload: {
    sourceOrderId: string;
    targetTableId?: string | null;
    items: { orderItemId: string; quantity: number }[];
  }) {
    start(async () => {
      try {
        await splitOrder(payload);
        toast.success("¡Cuenta / mesa dividida con éxito!");
        setSplitModalOpen(false);
        setSplitTargetOrderDetail(null);
        if (activeOrderId === payload.sourceOrderId) {
          await refreshOrder();
        }
        setRefreshKey(k => k + 1);
        router.refresh();
      } catch (err: any) {
        toast.error("Error al dividir orden: " + (err?.message || "Error desconocido"));
      }
    });
  }

  // Product actions
  function handleAddItem(product: ProductInfo) {
    const groups = product.toppingGroups?.filter(g => g.toppingGroup.toppings.length > 0);
    if (groups && groups.length > 0) {
      const sel: Record<string, boolean> = {};
      groups.forEach(g => g.toppingGroup.toppings.forEach(t => { sel[t.id] = false; }));
      setToppingSelections(sel); setToppingProduct(product);
    } else {
      start(async () => { await addItem(activeOrderId!, product.id, 1); setRefreshKey(k => k + 1); });
    }
  }
  function confirmTopping() {
    if (!toppingProduct) return;
    start(async () => {
      const selected = Object.entries(toppingSelections).filter(([, v]) => v).map(([id]) => {
        const tp = toppingProduct.toppingGroups.flatMap(g => g.toppingGroup.toppings).find(tp => tp.id === id);
        return { toppingId: id, price: tp?.price ?? 0 };
      });
      await addItem(activeOrderId!, toppingProduct.id, 1, selected.length > 0 ? selected : undefined);
      setRefreshKey(k => k + 1); setToppingProduct(null);
    });
  }
  function handleUpdateQty(itemId: string, qty: number) { updateItemQuantity(itemId, qty); setTimeout(() => setRefreshKey(k => k + 1), 200); }
  function handleRemoveItem(itemId: string) { removeItem(itemId); setTimeout(() => setRefreshKey(k => k + 1), 200); }
  function handleCancelItem(itemId: string) { start(async () => { await cancelItem(itemId, "user"); setRefreshKey(k => k + 1); }); }
  async function handlePrintBluetooth(orderId: string, type: string) {
    try {
      const res = await fetch(`/api/render-print?orderId=${orderId}&type=${type}`);
      const data = await res.json();
      if (data.content) {
        const ok = await bt.print(data.content);
        if (ok) toast.success(t.order.printSuccess.replace("{type}", type === "ORDER" ? t.order.kitchen : type === "BILL" ? t.order.bill : t.order.prebill));
        else toast.error(t.order.printFailed);
      } else {
        toast.info("Impresión enviada vía servidor");
      }
    } catch (e) {
      // Print via server — no Bluetooth needed
    }
  }

  function handleSend() {
    if (!activeOrderId) return;
    start(async () => {
      await sendOrder(activeOrderId, activeAreaId!);
      toast.success(t.order.sendSuccess);
      if (bt.connected) await handlePrintBluetooth(activeOrderId, "ORDER");
      setRefreshKey(k => k + 1);
    });
  }
  function handleTempBill() {
    if (!activeOrderId) return;
    start(async () => {
      await printTempBill(activeOrderId);
      if (bt.connected) await handlePrintBluetooth(activeOrderId, "TEMP_BILL");
      else toast.success(t.order.tempBillSuccess);
    });
  }
  function handleCheckout() { if (!orderDetail) return; setPaymentAmount(orderDetail.totalAmount.toString()); setCheckoutDialog(true); }
  function confirmCheckout() {
    start(async () => {
      try {
        await checkoutOrder(activeOrderId!, [{ method: paymentMethod, amount: parseFloat(paymentAmount) }]);
        toast.success(t.order.checkoutSuccess);
        setCheckoutDialog(false);
        if (bt.connected) await handlePrintBluetooth(activeOrderId!, "BILL");
        handleBack();
        router.refresh();
      } catch (err) {
        console.error("Checkout error:", err);
        toast.error(t.common.error);
      }
    });
  }
  // Mobile checkout: inline, no dialog
  function handleMobileCheckout(method: string, amount: string) {
    if (!activeOrderId || mobileCheckoutPending) return;
    setMobileCheckoutPending(true);
    start(async () => {
      try {
        await checkoutOrder(activeOrderId!, [{ method, amount: parseFloat(amount) }]);
        toast.success(t.order.checkoutSuccess);
        if (bt.connected) await handlePrintBluetooth(activeOrderId!, "BILL");
        handleBack();
        router.refresh();
      } catch {
        toast.error(t.common.error);
      } finally {
        setMobileCheckoutPending(false);
      }
    });
  }
  function handleGuestChange(delta: number) {
    if (!activeOrderId || !orderDetail) return;
    start(async () => { await updateOrderGuest(activeOrderId, Math.max(1, orderDetail.guestCount + delta)); setRefreshKey(k => k + 1); });
  }

  return (
    <div className="h-full overflow-hidden">
      {view === "tables" && areas.length > 0 && (
        <TableGridView
          areas={areas}
          activeAreaId={activeAreaId}
          setActiveAreaId={setActiveAreaId}
          onOpenTable={handleOpenTable}
          onSelectOrder={handleSelectOrder}
          onMergeTables={handleMergeTables}
          onSplitTable={handleSplitTable}
          initialMergeTableId={initialMergeTableId}
          onClearInitialMergeTable={() => setInitialMergeTableId(null)}
        />
      )}

      {view === "order" && orderDetail && (
        <OrderDetailView
          orderDetail={orderDetail}
          categories={categories}
          onBack={handleBack}
          onSend={handleSend}
          onTempBill={handleTempBill}
          onCheckout={handleCheckout}
          onMerge={() => {
            const tid = (orderDetail as any).tableId || orderDetail.table?.id;
            if (tid) {
              setInitialMergeTableId(tid);
              setView("tables");
              setActiveOrderId(null);
              setOrderDetail(null);
            }
          }}
          onSplit={() => {
            if (activeOrderId) {
              handleSplitTable(activeOrderId);
            }
          }}
          onAddItem={handleAddItem}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onCancelItem={handleCancelItem}
          onCancelOrder={handleCancelOrder}
          pending={pending}
          onGuestChange={handleGuestChange}
          btState={{ connected: bt.connected, connecting: bt.connecting, error: bt.error }}
          onBtConnect={bt.connect}
          onBtDisconnect={bt.disconnect}
          onMobileCheckout={handleMobileCheckout}
          mobileCheckoutPending={mobileCheckoutPending}
        />
      )}

      {/* DIALOGS */}
      {toppingProduct && (
        <MobileSheet open={!!toppingProduct} onClose={() => setToppingProduct(null)} title={`${t.order.topping} — ${toppingProduct.name}`}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {toppingProduct.toppingGroups?.filter(g => g.toppingGroup.toppings.length > 0).map(g => (
            <div key={g.toppingGroup.id}>
              <p className="text-xs font-bold uppercase text-gray-500 mb-2">{g.toppingGroup.name}</p>
              <div className="space-y-1.5">{g.toppingGroup.toppings.map(topping => (
                <label key={topping.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 cursor-pointer has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                  <input type={g.toppingGroup.type === "SINGLE" ? "radio" : "checkbox"} name={`tg-${g.toppingGroup.id}`} checked={toppingSelections[topping.id] ?? false}
                    onChange={() => {
                      if (g.toppingGroup.type === "SINGLE") { const sel: Record<string, boolean> = {}; g.toppingGroup.toppings.forEach(ot => { sel[ot.id] = ot.id === topping.id; }); setToppingSelections(f => ({ ...f, ...sel })); }
                      else setToppingSelections(f => ({ ...f, [topping.id]: !f[topping.id] }));
                    }} className="h-4 w-4 accent-amber-500" />
                  <span className="text-sm flex-1">{topping.name}</span>
                  {topping.price > 0 ? <span className="text-xs font-medium text-amber-600">+{fmt(topping.price)}Bs</span> : <span className="text-xs text-emerald-600 font-medium">{t.order.free}</span>}
                </label>
              ))}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setToppingProduct(null)} className="flex-1 h-11 rounded-lg border border-gray-200 font-medium text-sm text-gray-600">{t.order.cancel}</button>
          <button onClick={confirmTopping} disabled={pending} className="flex-1 h-11 rounded-lg bg-amber-500 text-white font-semibold text-sm">{t.order.addItem}</button>
        </div>
        </MobileSheet>
      )}

      {checkoutDialog && <MobileSheet open={checkoutDialog} onClose={() => setCheckoutDialog(false)} title={t.order.checkout}>
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.tempBill}</span><span className="font-mono">{fmt(orderDetail!.subtotal)}Bs</span></div>
            {(orderDetail!.vatAmount ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.vat}</span><span className="font-mono">{fmt(orderDetail!.vatAmount)}Bs</span></div>}
            {(orderDetail!.exciseTaxAmount ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.exciseTax}</span><span className="font-mono">{fmt(orderDetail!.exciseTaxAmount)}Bs</span></div>}
            {(orderDetail!.serviceCharge ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.serviceCharge}</span><span className="font-mono">{fmt(orderDetail!.serviceCharge)}Bs</span></div>}
            {(orderDetail!.discountAmount ?? 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">{t.order.discount}</span><span className="font-mono text-emerald-600">-{fmt(orderDetail!.discountAmount)}Bs</span></div>}
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-1.5 text-amber-600"><span>{t.order.total}</span><span className="font-mono">{fmt(orderDetail!.totalAmount)}Bs</span></div>
          </div>
          <div><label className="text-sm font-medium text-gray-700 block mb-1">{t.order.paymentMethod}</label>
            <select className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="CASH">💵 {t.order.cash}</option><option value="BANK_TRANSFER">🏦 {t.order.transfer}</option><option value="MOMO">📱 Momo</option></select></div>
          <div><label className="text-sm font-medium text-gray-700 block mb-1">{t.order.amount}</label>
            <input type="text" inputMode="numeric" style={{ textAlign: 'right' }} className="w-full h-11 px-4 rounded-lg border border-gray-200 text-lg font-mono font-bold" value={paymentAmount ? Number(paymentAmount).toLocaleString("es-BO") : ""} onFocus={e => e.target.value = paymentAmount || ""} onBlur={e => { const raw = e.target.value.replace(/[^0-9]/g, ""); setPaymentAmount(raw); }} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ""); setPaymentAmount(raw); }} placeholder="0" /></div>
          <div className="flex gap-3">
            <button onClick={() => setCheckoutDialog(false)} className="flex-1 h-11 rounded-lg border border-gray-200 font-medium text-sm text-gray-600">{t.order.cancel}</button>
            <button onClick={confirmCheckout} disabled={pending} className="flex-1 h-11 rounded-lg bg-red-500 text-white font-semibold text-sm">{t.order.checkout}</button>
          </div>
        </div>
      </MobileSheet>}

      <SplitOrderModal
        open={splitModalOpen}
        onClose={() => {
          if (!pending) {
            setSplitModalOpen(false);
            setSplitTargetOrderDetail(null);
          }
        }}
        orderDetail={splitTargetOrderDetail as any}
        availableTables={availableEmptyTables}
        onConfirmSplit={handleConfirmSplit}
        pending={pending}
      />
    </div>
  );
}

// Adaptive: Sheet on mobile, Dialog on desktop
function MobileSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { isMobile } = useDeviceInfo();
  if (!isMobile) {
    return open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
          {children}
        </div>
      </div>
    ) : null;
  }
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[85vh] p-0 rounded-t-2xl [&>button]:hidden">
        <div className="px-4 pt-4 pb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Reusable modal wrapper (fallback)
function Dialog({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-0 mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
