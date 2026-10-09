"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Split, ArrowRight, Loader2, Layers, MapPin, Check, Plus, Minus,
  AlertCircle, CheckSquare, Square, CheckCircle2,
} from "lucide-react";
import { useI18n } from "@/i18n/context";

type TableInfo = {
  id: string;
  name: string;
  capacity: number;
};

type OrderItemInfo = {
  id: string;
  quantity: number;
  unitPrice: number;
  note?: string | null;
  status: string;
  product: { id: string; name: string };
  toppings: { topping: { name: string }; price: number }[];
};

type OrderDetail = {
  id: string;
  orderNumber: number;
  orderNumberSuffix?: string | null;
  totalAmount?: number | null;
  table: { id: string; name: string };
  items: OrderItemInfo[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  orderDetail: OrderDetail | null;
  availableTables: TableInfo[];
  onConfirmSplit: (data: {
    sourceOrderId: string;
    targetTableId?: string | null;
    items: { orderItemId: string; quantity: number }[];
  }) => Promise<void>;
  pending: boolean;
};

function fmt(v: number) {
  return new Intl.NumberFormat("es-BO").format(v);
}

export function SplitOrderModal({
  open,
  onClose,
  orderDetail,
  availableTables,
  onConfirmSplit,
  pending,
}: Props) {
  const { t } = useI18n();

  // Mode: "TABLE" = mover a otra mesa libre | "SAME_TABLE" = sub-cuenta en misma mesa
  const [splitMode, setSplitMode] = useState<"TABLE" | "SAME_TABLE">(
    availableTables.length > 0 ? "TABLE" : "SAME_TABLE"
  );
  const [targetTableId, setTargetTableId] = useState<string>(
    availableTables[0]?.id || ""
  );

  // Map of orderItemId -> quantity to move
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      setItemQuantities({});
      setSplitMode(availableTables.length > 0 ? "TABLE" : "SAME_TABLE");
      setTargetTableId(availableTables[0]?.id || "");
    }
  }, [open, orderDetail?.id, availableTables]);

  const activeItems = useMemo(() => {
    return orderDetail?.items.filter(i => i.status !== "CANCELLED") || [];
  }, [orderDetail]);

  // Toggle item selection (all or 0)
  function toggleItem(itemId: string, maxQty: number) {
    setItemQuantities(prev => {
      const current = prev[itemId] || 0;
      const next = { ...prev };
      if (current > 0) {
        delete next[itemId];
      } else {
        next[itemId] = maxQty;
      }
      return next;
    });
  }

  // Adjust item quantity with stepper
  function adjustItemQty(itemId: string, maxQty: number, delta: number) {
    setItemQuantities(prev => {
      const current = prev[itemId] || 0;
      const newVal = Math.max(0, Math.min(maxQty, current + delta));
      const next = { ...prev };
      if (newVal === 0) {
        delete next[itemId];
      } else {
        next[itemId] = newVal;
      }
      return next;
    });
  }

  function handleSelectAll() {
    const all: Record<string, number> = {};
    activeItems.forEach(i => {
      all[i.id] = i.quantity;
    });
    setItemQuantities(all);
  }

  function handleDeselectAll() {
    setItemQuantities({});
  }

  // Calculations for live preview
  const { movingTotal, movingQtyCount, remainingTotal, remainingQtyCount } = useMemo(() => {
    let movingTot = 0;
    let movingCount = 0;
    let remainingTot = 0;
    let remainingCount = 0;

    activeItems.forEach(item => {
      const toppingSum = item.toppings.reduce((s, t) => s + t.price, 0);
      const unitTot = item.unitPrice + toppingSum;
      const moving = itemQuantities[item.id] || 0;
      const remaining = item.quantity - moving;

      movingTot += moving * unitTot;
      movingCount += moving;
      remainingTot += remaining * unitTot;
      remainingCount += remaining;
    });

    return {
      movingTotal: movingTot,
      movingQtyCount: movingCount,
      remainingTotal: remainingTot,
      remainingQtyCount: remainingCount,
    };
  }, [activeItems, itemQuantities]);

  if (!open || !orderDetail) return null;

  async function handleExecute() {
    if (!orderDetail || movingQtyCount === 0) return;
    if (splitMode === "TABLE" && !targetTableId) return;

    const payloadItems = Object.entries(itemQuantities)
      .filter(([_, q]) => q > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    await onConfirmSplit({
      sourceOrderId: orderDetail.id,
      targetTableId: splitMode === "TABLE" ? targetTableId : null,
      items: payloadItems,
    });
  }

  const selectedDestinationTable = availableTables.find(tb => tb.id === targetTableId);

  return (
    <Dialog open={open} onOpenChange={isOpen => !pending && !isOpen && onClose()}>
      <DialogContent className="max-w-lg w-full p-5 sm:p-6 rounded-2xl bg-white shadow-2xl max-h-[92vh] flex flex-col">
        <DialogHeader className="text-left pb-1 shrink-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Split className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {t.order.splitTable}: {orderDetail.table.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Pedido #{String(orderDetail.orderNumber).padStart(8, "0")} • Total: {fmt(orderDetail.totalAmount ?? 0)}Bs
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Destination Type Selector */}
          <div className="bg-gray-100/90 p-1 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => setSplitMode("TABLE")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                splitMode === "TABLE"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {t.order.splitToTable || "Mover a otra mesa"}
            </button>
            <button
              type="button"
              onClick={() => setSplitMode("SAME_TABLE")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                splitMode === "SAME_TABLE"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {t.order.splitToSubAccount || "Sub-cuenta en la misma mesa"}
            </button>
          </div>

          {/* Destination Configuration */}
          {splitMode === "TABLE" ? (
            <div className="space-y-2 p-3 rounded-xl border border-gray-200 bg-gray-50/70">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <span>{t.order.splitSelectTable || "Selecciona la mesa destino:"}</span>
                {availableTables.length > 0 && (
                  <span className="text-[11px] text-emerald-700 font-bold">
                    {availableTables.length} mesas libres
                  </span>
                )}
              </div>

              {availableTables.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-28 overflow-y-auto p-1">
                  {availableTables.map(tb => {
                    const isSelected = targetTableId === tb.id;
                    return (
                      <button
                        key={tb.id}
                        type="button"
                        onClick={() => setTargetTableId(tb.id)}
                        className={`p-2 rounded-xl text-center border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-100 border-purple-600 text-purple-900 font-bold shadow-xs"
                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-xs font-bold truncate">{tb.name}</div>
                        <div className="text-[10px] text-gray-400">{tb.capacity} as.</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-lg text-amber-800 text-xs border border-amber-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">No hay mesas vacías en este salón.</span>
                    <p className="mt-0.5 text-[11px]">
                      Puedes dividir la cuenta usando la pestaña <strong>Sub-cuenta en la misma mesa</strong> para crear una cuenta separada (Cuenta B).
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/70 flex items-start gap-2.5 text-xs text-purple-950">
              <Layers className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Sub-cuenta independiente (Misma mesa)</span>
                <p className="text-[11px] text-purple-900/80 mt-0.5 leading-relaxed">
                  {t.order.splitSameTableDesc ||
                    `Se creará una cuenta independiente (ej. ${orderDetail.table.name} - B) para cobrar por separado a comensales en la misma mesa.`}
                </p>
              </div>
            </div>
          )}

          {/* Item Selection Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
              <span>{t.order.selectItems || "Selecciona los ítems a transferir:"}</span>
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-purple-700 hover:underline font-semibold"
                >
                  Seleccionar todos
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-gray-500 hover:underline"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto p-1 border border-gray-200 rounded-xl bg-gray-50/40">
              {activeItems.map(item => {
                const movingQty = itemQuantities[item.id] || 0;
                const isChecked = movingQty > 0;
                const toppingSum = item.toppings.reduce((s, t) => s + t.price, 0);
                const itemPrice = item.unitPrice + toppingSum;

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                      isChecked
                        ? "bg-purple-50/90 border-purple-400 shadow-xs"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Checkbox & Product Name */}
                    <div
                      onClick={() => toggleItem(item.id, item.quantity)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                        isChecked ? "bg-purple-600 border-purple-600 text-white" : "border-gray-300 bg-white"
                      }`}>
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>

                      <div className="truncate">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                          <span>{fmt(itemPrice)}Bs c/u</span>
                          <span>• Total pedido: x{item.quantity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.quantity > 1 ? (
                        <div className="flex items-center border border-gray-200 bg-white rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => adjustItemQty(item.id, item.quantity, -1)}
                            disabled={movingQty <= 0}
                            className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-extrabold font-mono text-purple-900">
                            {movingQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustItemQty(item.id, item.quantity, 1)}
                            disabled={movingQty >= item.quantity}
                            className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold text-purple-900">
                          {isChecked ? `x1` : `x0`}
                        </span>
                      )}

                      <span className="text-xs font-bold font-mono text-gray-900 w-16 text-right">
                        {fmt(movingQty * itemPrice)}Bs
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Balance Summary */}
          <div className="p-3 rounded-xl bg-gray-900 text-white space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-gray-300">
              <span>{t.order.splitSummaryCurrent || "Mesa actual conserva:"} ({remainingQtyCount} ítems)</span>
              <span className="font-mono font-bold text-white">{fmt(remainingTotal)}Bs</span>
            </div>
            <div className="flex items-center justify-between text-purple-300 pt-1 border-t border-gray-800">
              <span className="font-bold flex items-center gap-1">
                <ArrowRight className="h-3.5 w-3.5" />
                {t.order.splitSummaryNew || "Nueva cuenta recibe:"} ({movingQtyCount} ítems)
              </span>
              <span className="font-mono font-extrabold text-amber-400 text-sm">
                {fmt(movingTotal)}Bs
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2 pt-2 border-t border-gray-100 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={pending}
            className="flex-1 rounded-xl h-11"
          >
            {t.order.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleExecute}
            disabled={
              pending ||
              movingQtyCount === 0 ||
              (splitMode === "TABLE" && (!targetTableId || availableTables.length === 0))
            }
            className="flex-1 rounded-xl h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Dividiendo...
              </>
            ) : (
              <>
                <Split className="h-4 w-4 mr-1.5" />
                Dividir {movingQtyCount} {movingQtyCount === 1 ? "ítem" : "ítems"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
