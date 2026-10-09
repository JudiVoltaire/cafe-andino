"use client";

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Merge, Crown, ArrowRight, Loader2, Users, UtensilsCrossed, AlertTriangle } from "lucide-react";
import { useI18n } from "@/i18n/context";

type TableInfo = {
  id: string;
  name: string;
  capacity: number;
  orders: {
    id: string;
    orderNumber: number;
    orderNumberSuffix?: string | null;
    totalAmount?: number | null;
  }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  targetTableId: string | null;
  selectedTableIds: string[];
  tables: TableInfo[];
  onConfirm: (sourceOrderIds: string[], targetTableId: string) => Promise<void>;
  onChangeTargetTable: (newTargetTableId: string) => void;
  pending: boolean;
};

function fmt(v: number) {
  return new Intl.NumberFormat("es-BO").format(v);
}

export function MergeConfirmModal({
  open,
  onClose,
  targetTableId,
  selectedTableIds,
  tables,
  onConfirm,
  onChangeTargetTable,
  pending,
}: Props) {
  const { t } = useI18n();

  const targetTable = tables.find(tb => tb.id === targetTableId);
  const targetOrder = targetTable?.orders[0];

  const sourceTables = useMemo(() => {
    return selectedTableIds
      .filter(id => id !== targetTableId)
      .map(id => tables.find(tb => tb.id === id))
      .filter((tb): tb is TableInfo => tb !== undefined && tb.orders.length > 0);
  }, [selectedTableIds, targetTableId, tables]);

  const sourceOrderIds = useMemo(() => {
    return sourceTables.map(tb => tb.orders[0].id);
  }, [sourceTables]);

  const combinedTotal = useMemo(() => {
    const targetAmt = targetOrder?.totalAmount ?? 0;
    const sourceAmt = sourceTables.reduce((s, tb) => s + (tb.orders[0]?.totalAmount ?? 0), 0);
    return targetAmt + sourceAmt;
  }, [targetOrder, sourceTables]);

  if (!open || !targetTable || !targetOrder) return null;

  async function handleExecute() {
    if (!targetTableId || sourceOrderIds.length === 0) return;
    await onConfirm(sourceOrderIds, targetTableId);
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !pending && !isOpen && onClose()}>
      <DialogContent className="max-w-md w-full p-6 rounded-2xl bg-white shadow-2xl">
        <DialogHeader className="text-left pb-2">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Merge className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {t.order.mergeConfirm || "Confirmar unión de mesas"}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                {t.order.mergeConfirmDesc || "Los pedidos se combinarán en la mesa receptora y las mesas secundarias quedarán libres."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Target Table (Receptora) Card */}
          <div className="p-3.5 rounded-xl border-2 border-blue-500 bg-blue-50/70 relative">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-blue-600 fill-blue-500" />
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  Mesa Principal (Receptora)
                </span>
              </div>
              <Badge className="bg-blue-600 text-white text-[11px] font-semibold">
                Conserva la cuenta
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div>
                <h4 className="text-base font-extrabold text-gray-900">{targetTable.name}</h4>
                <p className="text-xs text-gray-500 font-mono">
                  #{String(targetOrder.orderNumber).padStart(8, "0")}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-blue-800 font-mono">
                  {fmt(targetOrder.totalAmount ?? 0)}Bs
                </span>
                <p className="text-[10px] text-gray-500">Subtotal actual</p>
              </div>
            </div>

            {/* Selector to switch target table if multiple selected */}
            {selectedTableIds.length > 2 && (
              <div className="mt-3 pt-2.5 border-t border-blue-200/60 flex items-center gap-2">
                <span className="text-[11px] text-gray-600">Cambiar principal:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {selectedTableIds.map(tid => {
                    const tb = tables.find(t => t.id === tid);
                    if (!tb || tb.id === targetTableId) return null;
                    return (
                      <button
                        key={tid}
                        type="button"
                        onClick={() => onChangeTargetTable(tid)}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Hacer {tb.name} principal
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Source Tables to Merge Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 px-1">
              <span>Mesas secundarias a fusionar ({sourceTables.length}):</span>
              <span className="text-gray-400">Se desocuparán al unir</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {sourceTables.map(tb => {
                const ord = tb.orders[0];
                return (
                  <div
                    key={tb.id}
                    className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/70 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">
                        +
                      </span>
                      <div>
                        <span className="font-bold text-gray-900">{tb.name}</span>
                        <span className="text-gray-400 ml-1.5 font-mono text-[11px]">
                          #{String(ord.orderNumber).padStart(8, "0")}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold font-mono text-gray-700">
                      {fmt(ord.totalAmount ?? 0)}Bs
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combined Total Bar */}
          <div className="p-3 rounded-xl bg-gray-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-medium text-gray-300">Total Combinado ({targetTable.name}):</span>
            </div>
            <span className="text-base font-extrabold font-mono text-amber-400">
              {fmt(combinedTotal)}Bs
            </span>
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 text-amber-800 text-[11px] leading-relaxed border border-amber-200/70">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Todos los ítems de las mesas secundarias pasarán a la <strong>{targetTable.name}</strong>. Las mesas secundarias quedarán libres inmediatamente.
            </span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2 mt-2">
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
            disabled={pending || sourceTables.length === 0}
            className="flex-1 rounded-xl h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Uniendo mesas...
              </>
            ) : (
              <>
                <Merge className="h-4 w-4 mr-1.5" />
                Confirmar Unión
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
