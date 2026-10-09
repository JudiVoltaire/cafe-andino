import { getVats, upsertVat, createVat, deleteVat, getGeneralConfig } from "@/server/settings/actions";
import { DataTable } from "../data-table";
import { getServerDictionary } from "@/lib/locale";
import { db } from "@/lib/db";
import { TaxExemptionCard } from "./tax-exemption-card";

export default async function VatPage() {
  const [vats, config, totalProducts, zeroVatProducts] = await Promise.all([
    getVats(),
    getGeneralConfig(),
    db.product.count(),
    db.product.count({ where: { vat: { rate: 0 } } }),
  ]);

  const t = await getServerDictionary();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1 text-gray-900">{t.settings.vat}</h2>
        <p className="text-sm text-muted-foreground">{t.settings.vatPageDesc}</p>
      </div>

      {/* Tax Exemption and Regime Configuration Card */}
      <TaxExemptionCard
        initialTaxMode={config?.taxMode || "EXCLUSIVE"}
        vats={vats}
        totalProducts={totalProducts}
        zeroVatProducts={zeroVatProducts}
      />

      {/* VAT Rates Table */}
      <div className="pt-2">
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900">Alícuotas y Códigos de IVA</h3>
          <p className="text-xs text-muted-foreground">
            Tasas impositivas disponibles en el sistema para asociar a ítems del catálogo.
          </p>
        </div>

        <DataTable
          data={vats}
          columns={[
            { key: "code", label: t.inventory.code, type: "text" as const },
            { key: "name", label: t.settings.name, type: "text" as const },
            { key: "rate", label: t.common.taxRate || "Tasa (%)", type: "percent" as const },
          ]}
          onCreate={createVat}
          onUpdate={upsertVat}
          onDelete={deleteVat}
        />
      </div>
    </div>
  );
}
