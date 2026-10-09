import { getExciseTaxes, upsertExciseTax, createExciseTax, deleteExciseTax, getGeneralConfig } from "@/server/settings/actions";
import { DataTable } from "../data-table";
import { getServerDictionary } from "@/lib/locale";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default async function ExciseTaxPage() {
  const [taxes, config] = await Promise.all([
    getExciseTaxes(),
    getGeneralConfig(),
  ]);

  const t = await getServerDictionary();
  const isExempt = config?.taxMode === "EXEMPT";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1 text-gray-900">{t.settings.exciseTax}</h2>
        <p className="text-sm text-muted-foreground">{t.settings.exciseTaxPageDesc}</p>
      </div>

      {isExempt && (
        <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Modo Exento Activo: </span>
              El sistema opera en régimen 100% exento de impuestos. No se aplicará impuesto al consumo a ningún pedido.
            </div>
          </div>
          <Link
            href="/settings/vat"
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 shrink-0"
          >
            Configurar régimen fiscal en IVA <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900">Alícuotas de Impuesto Especial</h3>
          <p className="text-xs text-muted-foreground">
            Tasas específicas para productos que gravan impuesto al consumo.
          </p>
        </div>

        <DataTable
          data={taxes}
          columns={[
            { key: "code", label: t.inventory.code, type: "text" as const },
            { key: "name", label: t.settings.name, type: "text" as const },
            { key: "rate", label: t.common.taxRate || "Tasa (%)", type: "percent" as const },
          ]}
          onCreate={createExciseTax}
          onUpdate={upsertExciseTax}
          onDelete={deleteExciseTax}
        />
      </div>
    </div>
  );
}
