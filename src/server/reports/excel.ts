"use server";

import ExcelJS from "exceljs";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n || 0);
}

// ─── Style helpers ───

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FF000000" }, size: 11 };
const TITLE_FONT: Partial<ExcelJS.Font> = { bold: true, size: 16, color: { argb: "FFD97706" } };
const SUBTITLE_FONT: Partial<ExcelJS.Font> = { bold: false, size: 11, color: { argb: "FF6B7280" } };
const SECTION_FONT: Partial<ExcelJS.Font> = { bold: true, size: 12, color: { argb: "FFD97706" } };
const DATA_FONT: Partial<ExcelJS.Font> = { size: 10 };
const AMOUNT_FONT: Partial<ExcelJS.Font> = { size: 10, bold: true };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
};

function addTitle(ws: ExcelJS.Worksheet, title: string) {
  ws.mergeCells("A1:L1");
  const cell = ws.getCell("A1");
  cell.value = title;
  cell.font = TITLE_FONT;
  cell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 32;
}

function addSubtitle(ws: ExcelJS.Worksheet, subtitle: string, row: number = 2) {
  ws.mergeCells(`A${row}:L${row}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = subtitle;
  cell.font = SUBTITLE_FONT;
  cell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(row).height = 22;
}

function addSection(ws: ExcelJS.Worksheet, label: string, row: number, col: number) {
  const cell = ws.getCell(row, col);
  cell.value = label;
  cell.font = SECTION_FONT;
  cell.alignment = { vertical: "middle" };
  ws.getRow(row).height = 24;
}

function addHeaderRow(ws: ExcelJS.Worksheet, headers: string[], row: number) {
  ws.getRow(row).height = 28;
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
}

function addDataRow(ws: ExcelJS.Worksheet, values: (string | number)[], row: number, startCol: number = 1) {
  values.forEach((v, i) => {
    const cell = ws.getCell(row, startCol + i);
    cell.value = v;
    cell.font = typeof v === "number" ? AMOUNT_FONT : DATA_FONT;
    cell.border = BORDER;
    cell.alignment = { vertical: "middle", horizontal: typeof v === "number" ? "right" : "left" };
    if (typeof v === "number") cell.numFmt = "#,##0";
  });
}

function colWidths(ws: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

// ======================== EXPORT FUNCTIONS ========================

export async function exportInvoicesToExcel(invoices: any[], summary: any, dateFrom: string, dateTo: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Invoices");

  const d1 = new Date(dateFrom).toLocaleDateString("es-BO");
  const d2 = new Date(dateTo).toLocaleDateString("es-BO");
  addTitle(ws, "INVOICE REPORT");
  addSubtitle(ws, `From ${d1} to ${d2}`);

  // Summary
  let row = 4;
  addSection(ws, "📊 OVERVIEW", row, 1); row++;
  const summaryData = [
    ["Total Orders:", summary.totalOrders],
    ["Total Revenue:", `${fmt(summary.totalRevenue)}Bs`],
    ["Total Subtotal:", `${fmt(summary.totalSubtotal)}Bs`],
    ["Total VAT:", `${fmt(summary.totalVat)}Bs`],
    ["Total Excise Tax:", `${fmt(summary.totalExciseTax)}Bs`],
    ["Total Discount:", `${fmt(summary.totalDiscount)}Bs`],
    ["Total Service Charge:", `${fmt(summary.totalServiceCharge)}Bs`],
  ];
  summaryData.forEach(([k, v]) => {
    ws.getCell(row, 1).value = k;
    ws.getCell(row, 1).font = { bold: true, size: 10 };
    ws.getCell(row, 2).value = v;
    ws.getCell(row, 2).font = AMOUNT_FONT;
    row++;
  });
  row++;

  // Table
  addSection(ws, "📋 INVOICE LIST", row, 1); row++;
  const headers = ["Order #", "Table", "Guests", "Type", "Staff", "Subtotal", "VAT", "Excise", "Discount", "Service", "Total", "Pay Method", "Items", "Closed Date"];
  addHeaderRow(ws, headers, row); row++;

  invoices.forEach((inv) => {
    addDataRow(ws, [
      `${inv.orderNumber}${inv.orderNumberSuffix ? "-" + inv.orderNumberSuffix : ""}`,
      inv.table,
      inv.guestCount,
      inv.type === "COMP" ? "Complimentary" : "Normal",
      inv.staff,
      inv.subtotal,
      inv.vatAmount,
      inv.exciseTaxAmount,
      inv.discountAmount,
      inv.serviceCharge,
      inv.totalAmount,
      inv.paymentMethods,
      inv.items,
      inv.closedAt ? new Date(inv.closedAt).toLocaleDateString("es-BO") : "",
    ], row);
    row++;
  });

  colWidths(ws, [10, 10, 8, 8, 14, 14, 14, 14, 14, 14, 16, 24, 36, 14]);

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

export async function exportSoldItemsToExcel(items: any[], byProduct: any[], summary: any, dateFrom: string, dateTo: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sold Items");

  const d1 = new Date(dateFrom).toLocaleDateString("es-BO");
  const d2 = new Date(dateTo).toLocaleDateString("es-BO");
  addTitle(ws, "SOLD ITEMS REPORT");
  addSubtitle(ws, `From ${d1} to ${d2}`);

  let row = 4;
  addSection(ws, "📊 OVERVIEW", row, 1); row++;
  const summaryData = [
    ["Total Lines Sold:", summary.totalItems],
    ["Total Quantity:", summary.totalQuantity],
    ["Total Revenue:", `${fmt(summary.totalRevenue)}Bs`],
  ];
  summaryData.forEach(([k, v]) => { ws.getCell(row, 1).value = k; ws.getCell(row, 1).font = { bold: true, size: 10 }; ws.getCell(row, 2).value = v; ws.getCell(row, 2).font = AMOUNT_FONT; row++; });
  row++;

  // By product
  addSection(ws, "📋 BY PRODUCT", row, 1); row++;
  const prodHeaders = ["#", "Product", "Category", "Qty Sold", "Revenue"];
  addHeaderRow(ws, prodHeaders, row); row++;
  byProduct.forEach((p, i) => {
    addDataRow(ws, [i + 1, p.name, p.category, p.quantity, p.revenue], row);
    row++;
  });
  row++;

  // Detail
  addSection(ws, "📋 ITEM DETAIL", row, 1); row++;
  const detailHeaders = ["Item", "Category", "Qty", "Unit Price", "Topping", "Amount", "Order", "Table", "Date"];
  addHeaderRow(ws, detailHeaders, row); row++;
  items.forEach((it) => {
    addDataRow(ws, [
      it.productName, it.category, it.quantity, it.unitPrice,
      it.toppings || "—", it.totalAmount, it.orderNumber, it.table,
      it.closedAt ? new Date(it.closedAt).toLocaleDateString("es-BO") : "",
    ], row);
    row++;
  });

  colWidths(ws, [20, 14, 8, 14, 20, 16, 12, 8, 14]);

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

export async function exportRevenueToExcel(days: any[], summary: any, expensesByCategory: any, incomeByCategory: any, dateFrom: string, dateTo: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Revenue");

  const d1 = new Date(dateFrom).toLocaleDateString("es-BO");
  const d2 = new Date(dateTo).toLocaleDateString("es-BO");
  addTitle(ws, "REVENUE REPORT");
  addSubtitle(ws, `From ${d1} to ${d2}`);

  let row = 4;
  addSection(ws, "📊 OVERVIEW", row, 1); row++;
  const summaryData = [
    ["Total Orders:", summary.totalOrders],
    ["Total Sales Revenue:", `${fmt(summary.totalRevenue)}Bs`],
    ["Total Subtotal:", `${fmt(summary.totalSubtotal)}Bs`],
    ["Total VAT:", `${fmt(summary.totalVat)}Bs`],
    ["Total Excise Tax:", `${fmt(summary.totalExciseTax)}Bs`],
    ["Total Discount:", `${fmt(summary.totalDiscount)}Bs`],
    ["Total Service Charge:", `${fmt(summary.totalServiceCharge)}Bs`],
    ["Total Other Income:", `${fmt(summary.totalOtherIncome)}Bs`],
    ["Total Expenses:", `${fmt(summary.totalExpenses)}Bs`],
    ["Profit:", `${fmt(summary.profit)}Bs`],
  ];
  summaryData.forEach(([k, v]) => { ws.getCell(row, 1).value = k; ws.getCell(row, 1).font = { bold: true, size: 10 }; ws.getCell(row, 2).value = v; ws.getCell(row, 2).font = AMOUNT_FONT; row++; });
  row++;

  // Payment methods
  if (Object.keys(summary.byPaymentMethod).length > 0) {
    addSection(ws, "💳 BY PAYMENT METHOD", row, 1); row++;
    Object.entries(summary.byPaymentMethod).forEach(([method, amount]) => {
      ws.getCell(row, 1).value = method;
      ws.getCell(row, 1).font = { bold: true, size: 10 };
      ws.getCell(row, 2).value = `${fmt(amount as number)}Bs`;
      ws.getCell(row, 2).font = AMOUNT_FONT;
      row++;
    });
    row++;
  }

  // Daily breakdown
  addSection(ws, "📅 DAILY REVENUE", row, 1); row++;
  const dayHeaders = ["Fecha", "Nº fact.", "Subtotal", "IVA", "Esp.", "Descuento", "Recargo", "Ingresos", "Normal", "Cortesía"];
  addHeaderRow(ws, dayHeaders, row); row++;
  days.forEach((d) => {
    addDataRow(ws, [
      new Date(d.date).toLocaleDateString("es-BO"), d.orders, d.subtotal, d.vat, d.excise,
      d.discount, d.service, d.revenue, d.normalCount, d.compCount,
    ], row);
    row++;
  });
  row++;

  // Expenses
  if (Object.keys(expensesByCategory).length > 0) {
    addSection(ws, "📉 EXPENSE BY CATEGORY", row, 1); row++;
    Object.entries(expensesByCategory).forEach(([cat, amount]) => {
      ws.getCell(row, 1).value = cat;
      ws.getCell(row, 1).font = { bold: true, size: 10 };
      ws.getCell(row, 2).value = `${fmt(amount as number)}Bs`;
      ws.getCell(row, 2).font = AMOUNT_FONT;
      row++;
    });
  }

  colWidths(ws, [14, 10, 14, 14, 14, 14, 14, 16, 8, 8]);

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

export async function exportIngredientsToExcel(stockIns: any[], stockOuts: any[], stockInSummary: any, stockOutSummary: any, ingredients: any[], dateFrom: string, dateTo: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ingredients");

  const d1 = new Date(dateFrom).toLocaleDateString("es-BO");
  const d2 = new Date(dateTo).toLocaleDateString("es-BO");
  addTitle(ws, "INGREDIENT REPORT");
  addSubtitle(ws, `From ${d1} to ${d2}`);

  let row = 4;
  addSection(ws, "📊 STOCK IN OVERVIEW", row, 1); row++;
  const inSummary = [
    ["Total Stock Ins:", stockInSummary.totalStockIns],
    ["Total Items In:", stockInSummary.totalItems],
    ["Total Stock In Value:", `${fmt(stockInSummary.totalAmount)}Bs`],
  ];
  inSummary.forEach(([k, v]) => { ws.getCell(row, 1).value = k; ws.getCell(row, 1).font = { bold: true, size: 10 }; ws.getCell(row, 2).value = v; ws.getCell(row, 2).font = AMOUNT_FONT; row++; });
  row++;

  addSection(ws, "📊 STOCK OUT OVERVIEW", row, 1); row++;
  const outSummary = [
    ["Total Stock Outs:", stockOutSummary.totalStockOuts],
    ["Total Qty Out:", stockOutSummary.totalQuantity],
    ["FIFO Cost Out:", `${fmt(stockOutSummary.totalCost || 0)}Bs`],
  ];
  outSummary.forEach(([k, v]) => { ws.getCell(row, 1).value = k; ws.getCell(row, 1).font = { bold: true, size: 10 }; ws.getCell(row, 2).value = v; ws.getCell(row, 2).font = AMOUNT_FONT; row++; });
  row++;

  // Stock In table
  addSection(ws, "📥 STOCK IN DETAIL", row, 1); row++;
  const inHeaders = ["Ref #", "Date In", "Supplier", "Ingredient", "Qty", "Unit Price", "Total", "Staff"];
  addHeaderRow(ws, inHeaders, row); row++;
  stockIns.forEach((si) => {
    si.items.forEach((item: any, idx: number) => {
      const date = new Date(si.createdAt).toLocaleDateString("es-BO");
      addDataRow(ws, [
        idx === 0 ? si.code : "",
        idx === 0 ? date : "",
        idx === 0 ? (si.supplier || "—") : "",
        item.ingredient.name,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
        idx === 0 ? (si.user?.name || "—") : "",
      ], row);
      row++;
    });
    if (si.items.length === 0) {
      addDataRow(ws, [si.code, new Date(si.createdAt).toLocaleDateString("es-BO"), si.supplier || "—", "(no items)", 0, 0, 0, si.user?.name || "—"], row);
      row++;
    }
  });
  row++;

  // Stock Out table
  addSection(ws, "📤 STOCK OUT DETAIL", row, 1); row++;
  const outHeaders = ["Date Out", "Ingredient", "Quantity", "Reason", "FIFO Cost", "Batch Layers", "Staff", "Note"];
  addHeaderRow(ws, outHeaders, row); row++;
  stockOuts.forEach((so) => {
    const layers = so.batches?.map((b: any) => `${b.quantity} @ ${fmt(b.unitCost)} (${b.batch?.batchCode || "batch"})`).join("; ") || "";
    addDataRow(ws, [
      new Date(so.createdAt).toLocaleDateString("es-BO"),
      so.ingredient?.name || "—",
      so.quantity,
      so.reason,
      so.totalCost || 0,
      layers,
      so.user?.name || "—",
      so.note || "",
    ], row);
    row++;
  });
  row++;

  // Current stock status
  addSection(ws, "📦 CURRENT STOCK", row, 1); row++;
  const invHeaders = ["Name", "Purchase Unit", "Base Unit", "Conv Factor", "Stock", "Min", "Cost", "Stock Value", "Used In"];
  addHeaderRow(ws, invHeaders, row); row++;
  ingredients.forEach((ing) => {
    addDataRow(ws, [
      ing.name,
      ing.purchaseUnit,
      ing.baseUnit,
      ing.conversionFactor,
      ing.currentStock,
      ing.minStock,
      ing.costPerBaseUnit,
      ing.currentStock * ing.costPerBaseUnit,
      ing.recipes?.map((r: any) => r.product.name).join(", ") || "—",
    ], row);
    row++;
  });

  colWidths(ws, [14, 12, 16, 18, 10, 14, 14, 14, 14, 14, 14, 14, 14, 24]);

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

export async function exportWarehouseToExcel(ingredients: any[], summary: any, lowStock: any[], outOfStock: any[], batches: any[] = []) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Warehouse");

  addTitle(ws, "WAREHOUSE REPORT");
  addSubtitle(ws, `Updated: ${new Date().toLocaleDateString("es-BO")} ${new Date().toLocaleTimeString("es-BO")}`);

  let row = 4;
  addSection(ws, "📊 WAREHOUSE OVERVIEW", row, 1); row++;
  const summaryData = [
    ["Total Ingredients:", summary.totalIngredients],
    ["Total Stock Value:", `${fmt(summary.totalStockValue)}Bs`],
    ["Total Products:", summary.totalProducts],
    ["Total Categories:", summary.totalCategories],
    ["Total Suppliers:", summary.totalSuppliers],
    ["Below Min Stock:", summary.lowStockCount],
    ["Out of Stock:", summary.outOfStockCount],
  ];
  summaryData.forEach(([k, v]) => { ws.getCell(row, 1).value = k; ws.getCell(row, 1).font = { bold: true, size: 10 }; ws.getCell(row, 2).value = v; ws.getCell(row, 2).font = AMOUNT_FONT; row++; });
  row++;

  // Low stock alerts
  if (lowStock.length > 0) {
    addSection(ws, "⚠️ LOW STOCK INGREDIENTS", row, 1); row++;
    const lowHeaders = ["Name", "Stock", "Min", "Base Unit", "Supplier"];
    addHeaderRow(ws, lowHeaders, row); row++;
    lowStock.forEach((i) => {
      addDataRow(ws, [i.name, i.currentStock, i.minStock, i.baseUnit, i.supplier || "—"], row);
      row++;
    });
    row++;
  }

  if (outOfStock.length > 0) {
    addSection(ws, "🚫 OUT OF STOCK", row, 1); row++;
    const outHeaders = ["Name", "Stock", "Min", "Base Unit", "Supplier"];
    addHeaderRow(ws, outHeaders, row); row++;
    outOfStock.forEach((i) => {
      addDataRow(ws, [i.name, i.currentStock, i.minStock, i.baseUnit, i.supplier || "—"], row);
      row++;
    });
    row++;
  }

  // FIFO batch valuation
  if (batches.length > 0) {
    addSection(ws, "📚 FIFO BATCH BALANCE", row, 1); row++;
    const batchHeaders = ["Ingredient", "Batch", "Date In", "Supplier", "Qty Left", "Unit", "Unit Cost", "Stock Value"];
    addHeaderRow(ws, batchHeaders, row); row++;
    batches.forEach((b) => {
      addDataRow(ws, [
        b.ingredient?.name || "—",
        b.batchCode || b.stockInItem?.stockIn?.code || "—",
        new Date(b.receivedAt).toLocaleDateString("es-BO"),
        b.stockInItem?.stockIn?.supplier || "—",
        b.remainingQuantity,
        b.ingredient?.baseUnit || "",
        b.unitCost,
        b.remainingQuantity * b.unitCost,
      ], row);
      row++;
    });
    row++;
  }

  // All ingredients
  addSection(ws, "📦 ALL INGREDIENTS", row, 1); row++;
  const invHeaders = ["Name", "Purchase Unit", "Base Unit", "Conv Factor", "Stock", "Min", "Cost / Base Unit", "Stock Value", "Used In", "Supplier"];
  addHeaderRow(ws, invHeaders, row); row++;
  ingredients.forEach((ing) => {
    addDataRow(ws, [
      ing.name,
      ing.purchaseUnit,
      ing.baseUnit,
      ing.conversionFactor,
      ing.currentStock,
      ing.minStock,
      ing.costPerBaseUnit,
      ing.currentStock * ing.costPerBaseUnit,
      ing.recipes?.map((r: any) => r.product.name).join(", ") || "—",
      ing.supplier || "—",
    ], row);
    row++;
  });

  colWidths(ws, [18, 12, 12, 10, 10, 10, 16, 14, 30, 16]);

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}
