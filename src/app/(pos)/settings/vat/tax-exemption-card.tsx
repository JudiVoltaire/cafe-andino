"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Percent, Receipt, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { updateTaxMode, bulkSetProductsVat } from "@/server/settings/actions";
import { toast } from "sonner";
import { useI18n } from "@/i18n/context";

type VatItem = {
  id: string;
  code: string;
  name: string;
  rate: number;
};

type Props = {
  initialTaxMode: string;
  vats: VatItem[];
  totalProducts: number;
  zeroVatProducts: number;
};

export function TaxExemptionCard({
  initialTaxMode,
  vats,
  totalProducts,
  zeroVatProducts: initialZeroProducts,
}: Props) {
  const { t } = useI18n();
  const [taxMode, setTaxMode] = useState(initialTaxMode || "EXCLUSIVE");
  const [zeroCount, setZeroCount] = useState(initialZeroProducts);
  const [pendingMode, startModeTransition] = useTransition();
  const [pendingBulk, startBulkTransition] = useTransition();

  const isExempt = taxMode === "EXEMPT";
  const zeroVat = vats.find(v => v.rate === 0) || vats.find(v => v.code === "IVA0");

  function changeTaxMode(newMode: string) {
    if (newMode === taxMode) return;
    startModeTransition(async () => {
      try {
        await updateTaxMode(newMode);
        setTaxMode(newMode);
        if (newMode === "EXEMPT") {
          toast.success(t.settings.taxExemptBadge + ": Todas las ventas operarán al 0% de impuestos.");
        } else {
          toast.success("Régimen de impuestos actualizado: " + (newMode === "INCLUSIVE" ? "IVA Incluido" : "IVA Adicional"));
        }
      } catch (err: any) {
        toast.error("Error al actualizar régimen: " + (err?.message || "Error desconocido"));
      }
    });
  }

  function handleToggleSwitch(checked: boolean) {
    changeTaxMode(checked ? "EXEMPT" : "EXCLUSIVE");
  }

  function handleBulkSetExempt() {
    if (!zeroVat) {
      toast.error("No se encontró una alícuota de IVA con tasa 0%. Crea una con tasa 0% primero.");
      return;
    }
    startBulkTransition(async () => {
      try {
        await bulkSetProductsVat(zeroVat.id);
        setZeroCount(totalProducts);
        toast.success(t.settings.bulkExemptProductsSuccess || "Catálogo actualizado: Todos los productos tienen tasa 0% (Exento).");
      } catch (err: any) {
        toast.error("Error al actualizar catálogo: " + (err?.message || "Error desconocido"));
      }
    });
  }

  return (
    <Card className="mb-8 border-2 border-emerald-800/20 bg-gradient-to-br from-emerald-950/5 via-white to-emerald-900/5 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isExempt ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {t.settings.taxExemptionTitle || "Régimen Fiscal y Exención de Impuestos"}
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                {t.settings.taxExemptionDesc || "Configuración global de aplicación de impuestos para el punto de venta y facturación."}
              </CardDescription>
            </div>
          </div>
          <div>
            {isExempt ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
                {t.settings.taxExemptBadge || "100% Exento de Impuestos"}
              </Badge>
            ) : taxMode === "INCLUSIVE" ? (
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 font-medium px-3 py-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                IVA Incluido en Precios
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 font-medium px-3 py-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                IVA Adicional (+13%)
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-1">
        {/* Main Highlight Row: Quick Toggle */}
        <div className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isExempt
            ? "bg-emerald-50/80 border-emerald-300 shadow-sm"
            : "bg-gray-50/90 border-gray-200"
        }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">
                {t.settings.taxExemptSwitch || "Exención Total de Impuestos"}
              </span>
              {isExempt && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                  Activo
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
              {t.settings.taxExemptSwitchDesc ||
                "Al activar esta opción, ningún pedido aplicará recargos de IVA ni impuestos al consumo (alícuota 0% en todas las ventas). Ideal para régimen simplificado y cafeterías exentas."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <Switch
              checked={isExempt}
              disabled={pendingMode}
              onCheckedChange={handleToggleSwitch}
              className="data-checked:bg-emerald-700"
            />
          </div>
        </div>

        {/* 3 Tax Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: EXEMPT */}
          <div
            onClick={() => !pendingMode && changeTaxMode("EXEMPT")}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              isExempt
                ? "border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600/30"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isExempt ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900">Régimen Exento / 0%</h4>
                  <p className="text-[10px] text-emerald-700 font-medium">Sin cobro de impuestos</p>
                </div>
              </div>
              <input
                type="radio"
                name="taxModeRadio"
                checked={isExempt}
                onChange={() => changeTaxMode("EXEMPT")}
                disabled={pendingMode}
                className="accent-emerald-700 mt-1 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Las ventas no calculan ni añaden IVA ni impuesto especial. El total a pagar coincide exactamente con el subtotal.
            </p>
            <div className="mt-2 text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 rounded px-1.5 py-0.5 inline-block">
              ✓ Recomendado para Bolivia / RTS
            </div>
          </div>

          {/* Option 2: INCLUSIVE */}
          <div
            onClick={() => !pendingMode && changeTaxMode("INCLUSIVE")}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              taxMode === "INCLUSIVE"
                ? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600/30"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${taxMode === "INCLUSIVE" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900">IVA Incluido</h4>
                  <p className="text-[10px] text-blue-700 font-medium">Precios finales en carta</p>
                </div>
              </div>
              <input
                type="radio"
                name="taxModeRadio"
                checked={taxMode === "INCLUSIVE"}
                onChange={() => changeTaxMode("INCLUSIVE")}
                disabled={pendingMode}
                className="accent-blue-700 mt-1 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Los precios de carta ya tienen el IVA incluido. Se desglosa en la factura sin sumar ningún monto extra sobre el precio visible.
            </p>
          </div>

          {/* Option 3: EXCLUSIVE */}
          <div
            onClick={() => !pendingMode && changeTaxMode("EXCLUSIVE")}
            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
              taxMode === "EXCLUSIVE"
                ? "border-amber-600 bg-amber-50/70 shadow-sm ring-1 ring-amber-600/30"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${taxMode === "EXCLUSIVE" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                  <Percent className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900">IVA Adicional</h4>
                  <p className="text-[10px] text-amber-700 font-medium">+13% sobre el subtotal</p>
                </div>
              </div>
              <input
                type="radio"
                name="taxModeRadio"
                checked={taxMode === "EXCLUSIVE"}
                onChange={() => changeTaxMode("EXCLUSIVE")}
                disabled={pendingMode}
                className="accent-amber-700 mt-1 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              El impuesto se suma como un recargo adicional sobre el subtotal al momento de emitir la cuenta (+13%).
            </p>
          </div>
        </div>

        {/* Catalog Sync helper banner */}
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-gray-900">Catálogo de productos: </span>
              <span className="text-gray-600">
                {zeroCount} de {totalProducts} productos tienen alícuota 0% vinculada.
              </span>
              {isExempt && (
                <span className="text-emerald-700 font-medium ml-1">
                  (El modo exento activo anula impuestos para todos los productos).
                </span>
              )}
            </div>
          </div>

          {zeroVat && zeroCount < totalProducts && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingBulk}
              onClick={handleBulkSetExempt}
              className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 shrink-0 w-full sm:w-auto"
            >
              {pendingBulk ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-700" />
              )}
              {t.settings.bulkExemptProducts || "Asignar alícuota 0% a todos los productos"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
