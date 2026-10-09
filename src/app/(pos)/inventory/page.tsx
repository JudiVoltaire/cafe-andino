import { getInventoryStatus, getStockIns, getStockOuts } from "@/server/inventory/actions";
import { getSuppliers } from "@/server/inventory/supplier-actions";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const [ingredients, stockIns, stockOuts, suppliers] = await Promise.all([
    getInventoryStatus(),
    getStockIns(),
    getStockOuts(),
    getSuppliers(),
  ]);

  const lowStock = ingredients.filter(i => i.minStock > 0 && i.currentStock <= i.minStock);

  return (
    <InventoryClient
      ingredients={ingredients}
      stockIns={stockIns}
      stockOuts={stockOuts}
      lowStock={lowStock}
      allIngredients={ingredients as any}
      suppliers={suppliers}
    />
  );
}
