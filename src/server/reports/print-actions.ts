"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import * as net from "net";

function fmt(n: number) {
  return new Intl.NumberFormat("es-BO").format(n || 0);
}

// ======================== PARSE TEMPLATE CONFIG ========================

interface TplConfig {
  header: { showLogo: boolean; showAddress: boolean; showPhone: boolean; showTaxCode: boolean; showDateTime: boolean };
  body: { showTable: boolean; showGuestCount: boolean; showQuantity: boolean; showUnitPrice: boolean; showAmount: boolean; showTopping: boolean; showNote: boolean; showOrderNumber: boolean };
  footer: { showSubtotal: boolean; showVat: boolean; showDiscount: boolean; showServiceCharge: boolean; showTotal: boolean; showPaymentMethod: boolean; showCashier: boolean; thankYou: string };
}

// ORDER config
interface OrderCfg {
  showSequence: boolean; showTable: boolean; showTime: boolean; showQuantity: boolean; showTopping: boolean; showNote: boolean;
}
const defaultOrderCfg: OrderCfg = {
  showSequence: true, showTable: true, showTime: true, showQuantity: true, showTopping: true, showNote: true,
};

// BILL config
interface BillCfg {
  header: { showLogo: boolean; showAddress: boolean; showPhone: boolean; showTaxCode: boolean; showDateTime: boolean };
  body: { showTable: boolean; showGuestCount: boolean; showQuantity: boolean; showUnitPrice: boolean; showAmount: boolean; showTopping: boolean; showNote: boolean; showOrderNumber: boolean };
  footer: { showSubtotal: boolean; showVat: boolean; showDiscount: boolean; showServiceCharge: boolean; showTotal: boolean; showPaymentMethod: boolean; showCashier: boolean; thankYou: string };
}
const defaultBillCfg: BillCfg = {
  header: { showLogo: true, showAddress: true, showPhone: true, showTaxCode: false, showDateTime: true },
  body: { showTable: true, showGuestCount: true, showQuantity: true, showUnitPrice: true, showAmount: true, showTopping: true, showNote: false, showOrderNumber: true },
  footer: { showSubtotal: true, showVat: true, showDiscount: true, showServiceCharge: true, showTotal: true, showPaymentMethod: true, showCashier: true, thankYou: "Thank you!" },
};

function parseTplConfig(raw: string): { order: OrderCfg; bill: BillCfg } {
  try {
    const parsed = JSON.parse(raw);
    if (parsed._version === 2) {
      return {
        order: { ...defaultOrderCfg, ...parsed.order },
        bill: { ...defaultBillCfg, ...(parsed.bill || {}), header: { ...defaultBillCfg.header, ...parsed.bill?.header }, body: { ...defaultBillCfg.body, ...parsed.bill?.body }, footer: { ...defaultBillCfg.footer, ...parsed.bill?.footer } },
      };
    }
  } catch {}
  return { order: defaultOrderCfg, bill: defaultBillCfg };
}

// ======================== BUILD ORDER TICKET CONTENT (ĐƠN GIẢN: STT + Bàn + Món x SL) ========================

async function buildOrderContent(orderId: string, orderCfg: OrderCfg, sequence: number): Promise<string> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      table: { select: { name: true } },
      items: {
        where: { status: { not: "CANCELLED" } },
        include: {
          product: { select: { name: true, slug: true } },
          toppings: { include: { topping: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!order) return "";

  const now = new Date();
  const lines: string[] = [];

  lines.push("\x1B\x40");

  if (orderCfg.showSequence) {
    lines.push("\x1B\x61\x01");
    lines.push("\x1B\x21\x30");
    lines.push(`#${sequence}`);
    lines.push("\x1B\x21\x00");
    lines.push("\x1B\x61\x00");
  }

  if (orderCfg.showTable) lines.push(`Ban: ${order.table.name}`);
  if (orderCfg.showTime) lines.push(now.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }));
  lines.push("------------------------");

  const foodItems = order.items.filter(i => !i.product.slug.startsWith("karaoke-"));
  for (const item of foodItems) {
    const prefix = orderCfg.showQuantity ? `  ${item.quantity}x ` : "  ";
    lines.push(prefix + item.product.name);
    if (orderCfg.showTopping && item.toppings.length > 0) {
      lines.push("    + " + item.toppings.map(t => t.topping.name).join(", "));
    }
  }

  if (orderCfg.showNote && order.note) {
    lines.push("------------------------");
    lines.push("* " + order.note);
  }

  lines.push("------------------------");
  lines.push("\n\n\n\n");
  lines.push("\x1D\x56\x00");

  return lines.join("\n");
}

// ======================== BUILD BILL CONTENT ========================

async function buildBillContent(orderId: string, billCfg: BillCfg): Promise<string> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      table: { select: { name: true } },
      items: {
        where: { status: { not: "CANCELLED" } },
        include: {
          product: { select: { name: true, slug: true } },
          toppings: { include: { topping: { select: { name: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      payments: { select: { method: true, amount: true } },
      user: { select: { name: true } },
    },
  });
  if (!order) return "";

  const genCfg = await db.generalConfig.findFirst({ where: { id: "default" } });
  const now = new Date();
  const lines: string[] = [];

  lines.push("\x1B\x40");
  lines.push("\x1B\x61\x01");
  lines.push("\x1B\x21\x10");
  if (billCfg.header.showLogo) lines.push("🍽️");
  lines.push((genCfg?.restaurantName || "NHÀ HÀNG").toUpperCase());
  lines.push("\x1B\x21\x00");

  const addrParts: string[] = [];
  if (billCfg.header.showAddress && genCfg?.address) addrParts.push(genCfg.address);
  if (billCfg.header.showPhone && genCfg?.phone) addrParts.push("📞 " + genCfg.phone);
  if (addrParts.length > 0) lines.push(addrParts.join(" - "));
  if (billCfg.header.showTaxCode && genCfg?.taxCode) lines.push("MST: " + genCfg.taxCode);
  if (billCfg.header.showDateTime) {
    lines.push(now.toLocaleDateString("es-BO") + " " + now.toLocaleTimeString("es-BO"));
  }

  lines.push("\x1B\x61\x00");
  lines.push("========================================");
  lines.push("             HOA DON BAN HANG             ");
  lines.push("========================================");

  if (billCfg.body.showOrderNumber) {
    lines.push(`Factura: #${String(order.orderNumber).padStart(4, "0")}${order.orderNumberSuffix ? "-" + order.orderNumberSuffix : ""}`);
  }
  if (billCfg.body.showTable) lines.push(`Mesa: ${order.table.name}`);
  if (billCfg.body.showGuestCount) lines.push(`Comensales: ${order.guestCount}`);
  lines.push("Fecha: " + now.toLocaleDateString("es-BO") + " " + now.toLocaleTimeString("es-BO"));
  if (order.user?.name) lines.push(`Cajero/a: ${order.user.name}`);

  lines.push("----------------------------------------");

  let colHeader = "Ten mon";
  colHeader = colHeader.padEnd(22);
  if (billCfg.body.showQuantity) colHeader += "SL".padStart(4);
  if (billCfg.body.showUnitPrice) colHeader += "DG".padStart(12);
  if (billCfg.body.showAmount) colHeader += "TT".padStart(12);
  lines.push(colHeader);
  lines.push("----------------------------------------");

  for (const item of order.items) {
    const name = item.product.name;
    const qty = billCfg.body.showQuantity ? String(item.quantity) : "";
    const price = billCfg.body.showUnitPrice ? fmt(item.unitPrice) : "";
    const amount = billCfg.body.showAmount ? fmt(item.unitPrice * item.quantity) : "";

    lines.push(name);
    if (billCfg.body.showTopping && item.toppings.length > 0) {
      lines.push("  + " + item.toppings.map(t => t.topping.name).join(", "));
    }
    if (qty || price || amount) {
      const detail = `${qty.padStart(3)}  ${price.padStart(12)}${amount.padStart(12)}`;
      lines.push(detail);
    }
  }

  lines.push("----------------------------------------");

  if (billCfg.footer.showSubtotal) {
    lines.push(`Tien hang:`.padEnd(28) + fmt(order.subtotal).padStart(18));
  }
  if (billCfg.footer.showVat && order.vatAmount > 0) {
    lines.push(`Thue VAT:`.padEnd(28) + fmt(order.vatAmount).padStart(18));
  }
  if (order.exciseTaxAmount > 0) {
    lines.push(`Thue TTDB:`.padEnd(28) + fmt(order.exciseTaxAmount).padStart(18));
  }
  if (billCfg.footer.showDiscount && order.discountAmount > 0) {
    lines.push(`Giam gia:`.padEnd(28) + ("-" + fmt(order.discountAmount)).padStart(18));
  }
  if (billCfg.footer.showServiceCharge && order.serviceCharge > 0) {
    lines.push(`Phi dich vu:`.padEnd(28) + fmt(order.serviceCharge).padStart(18));
  }

  lines.push("========================================");
  if (billCfg.footer.showTotal) {
    lines.push("\x1B\x21\x10");
    lines.push(`TONG CONG:`.padEnd(28) + fmt(order.totalAmount).padStart(18));
    lines.push("\x1B\x21\x00");
  }
  lines.push("========================================");

  if (billCfg.footer.showPaymentMethod && order.payments.length > 0) {
    lines.push("Thanh toan:");
    for (const p of order.payments) {
      lines.push(`  ${p.method}: ${fmt(p.amount)}`);
    }
  }

  if (billCfg.footer.thankYou) {
    lines.push("\x1B\x61\x01");
    lines.push(billCfg.footer.thankYou);
  }

  lines.push("\n\n\n\n");
  lines.push("\x1D\x56\x00");

  return lines.join("\n");
}

// ======================== BUILD TEMP BILL CONTENT ========================

async function buildTempBillContent(orderId: string, billCfg: BillCfg): Promise<string> {
  return buildBillContent(orderId, billCfg);
}

// ======================== TCP SEND TO PRINTER ========================

async function sendToPrinter(ip: string, port: number, content: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      resolve({ success: false, error: "Timeout connecting to printer" });
    }, 5000);

    client.connect(port, ip, () => {
      clearTimeout(timeout);
      client.write(content, "utf-8", (err) => {
        if (err) {
          client.destroy();
          resolve({ success: false, error: err.message });
        } else {
          // Give printer time to process
          setTimeout(() => { client.destroy(); resolve({ success: true }); }, 500);
        }
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });
  });
}

// ======================== CREATE PRINT JOB ========================

export async function createPrintJob(params: {
  orderId: string;
  type: "ORDER" | "TEMP_BILL" | "BILL";
  userId?: string;
}): Promise<{ success: boolean; jobId?: string; content?: string; error?: string }> {
  const { orderId, type, userId } = params;

  // Get order + area
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { table: { select: { areaId: true } } },
  });
  if (!order) return { success: false, error: "Order not found" };

  const areaId = order.table.areaId;

  // Find printer
  let printer = await db.printer.findFirst({
    where: {
      isActive: true,
      areas: { some: { areaId } },
      type: type === "ORDER" ? { in: ["KITCHEN", "BAR"] } : "BILL",
    },
    include: { printTemplates: { where: { type, isDefault: true } } },
  });

  if (!printer) {
    printer = await db.printer.findFirst({
      where: { isActive: true, type: type === "ORDER" ? { in: ["KITCHEN", "BAR"] } : "BILL" },
      include: { printTemplates: { where: { type, isDefault: true } } },
    });
  }

  if (!printer) {
    return { success: false, error: "No active printer found" };
  }

  const template = printer.printTemplates[0] || null;
  const { order: orderCfg, bill: billCfg } = parseTplConfig(template?.config || "{}");

  // Get sequence number for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const count = await db.printJob.count({
    where: { type, createdAt: { gte: todayStart } },
  });
  const sequence = count + 1;

  // Build content based on type
  let content: string;
  if (type === "ORDER") {
    content = await buildOrderContent(orderId, orderCfg, sequence);
  } else if (type === "BILL") {
    content = await buildBillContent(orderId, billCfg);
  } else {
    content = await buildTempBillContent(orderId, billCfg);
  }

  // Send to printer based on mode
  let result: { success: boolean; error?: string };
  if (printer.printMode === "SERVER") {
    result = await sendToPrinter(printer.ipAddress, printer.port, content);
  } else {
    // CLIENT mode: don't send TCP, just build content for client to print
    result = { success: true };
  }

  // Save job
  const job = await db.printJob.create({
    data: {
      sequence,
      type,
      status: result.success ? "SUCCESS" : "FAILED",
      orderId,
      printerId: printer.id,
      templateId: template?.id,
      content,
      error: result.error,
      userId: userId || null,
    },
  });

  return { success: result.success, jobId: job.id, content: printer.printMode === "CLIENT" ? content : undefined, error: result.error };
}

// ======================== GET PRINT JOBS ========================

export async function getPrintJobs(date?: string, type?: string) {
  const where: any = {};
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }
  if (type) where.type = type;

  return db.printJob.findMany({
    where,
    include: {
      printer: { select: { name: true } },
      template: { select: { name: true } },
      user: { select: { name: true } },
      order: { select: { orderNumber: true, orderNumberSuffix: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getPrintJobStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [orderCount, billCount, failedCount, totalToday] = await Promise.all([
    db.printJob.count({ where: { type: "ORDER", createdAt: { gte: today }, status: "SUCCESS" } }),
    db.printJob.count({ where: { type: { in: ["BILL", "TEMP_BILL"] }, createdAt: { gte: today }, status: "SUCCESS" } }),
    db.printJob.count({ where: { createdAt: { gte: today }, status: "FAILED" } }),
    db.printJob.count({ where: { createdAt: { gte: today } } }),
  ]);

  return { orderCount, billCount, failedCount, totalToday };
}
