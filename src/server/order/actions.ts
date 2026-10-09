"use server";

import { db } from "@/lib/db";
import { revalidatePath, unstable_cache } from "next/cache";
import { autoDeductStockForOrder } from "@/server/recipe/actions";
import { isSystemModuleEnabled, getGeneralConfig } from "@/server/settings/actions";

// ============ TABLE VIEW ============

export async function getAreasWithTables() {
  return db.area.findMany({
    include: {
      tables: {
        include: {
          orders: {
            where: { status: { in: ["OPEN", "SENT"] } },
            select: { id: true, status: true, orderNumber: true, orderNumberSuffix: true, type: true, openedAt: true, guestCount: true, totalAmount: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getActiveAreasWithTables() {
  return getAreasWithTables();
}

// ============ UPDATE GUEST COUNT ============

export async function updateOrderGuest(orderId: string, guestCount: number) {
  await db.order.update({ where: { id: orderId }, data: { guestCount } });
  revalidatePath("/order");
}

// ============ KARAOKE REFRESH ============

export async function refreshKaraokeTime(orderId: string) {
  await recalcOrder(orderId);
  revalidatePath("/order");
}

// ============ ORDER CRUD ============

export async function openTable(tableId: string, guestCount: number = 1, orderType: "NORMAL" | "COMP" = "NORMAL") {
  const existing = await db.order.findFirst({
    where: { tableId, status: { in: ["OPEN", "SENT"] } },
  });
  if (existing) return existing;

  const lastOrder = await db.order.findFirst({ orderBy: { orderNumber: "desc" } });
  const nextNumber = (lastOrder?.orderNumber ?? 0) + 1;

  const table = await db.table.findUnique({ where: { id: tableId }, include: { area: true } });
  const isKaraoke = table?.isKaraoke || table?.area?.type === "KARAOKE";

  const order = await db.order.create({
    data: {
      orderNumber: nextNumber,
      tableId,
      guestCount,
      status: "OPEN",
      type: isKaraoke ? "KARAOKE" : orderType,
    },
    include: { items: { include: { product: true, toppings: { include: { topping: true } } } } },
  });

  // Auto-add karaoke time item if karaoke table
  if (isKaraoke) {
    const pricing = await db.karaokePricing.findFirst({
      where: { areaId: table!.areaId },
      orderBy: { startTime: "asc" },
    });
    if (pricing) {
      await db.order.update({
        where: { id: order.id },
        data: { karaokePricingId: pricing.id },
      });
    }
  }

  revalidatePath("/order");
  await recalcOrder(order.id);
  return order;
}

export async function cancelOrder(orderId: string, reason?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true, printJobs: true },
  });
  if (!order) return;

  // If order was empty without payments/prints, delete it completely so DB stays clean
  if (order.items.length === 0 && order.payments.length === 0 && order.printJobs.length === 0) {
    await db.order.delete({ where: { id: orderId } });
  } else {
    // If it had items, cancel all items and mark order as CANCELLED
    await db.orderItem.updateMany({
      where: { orderId },
      data: { status: "CANCELLED", cancelledAt: new Date(), note: reason || "Cancelado por el usuario" },
    });
    await db.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        closedAt: new Date(),
        note: reason || "Cancelado",
        totalAmount: 0,
      },
    });
  }

  revalidatePath("/order");
}

export async function getOrder(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      table: { include: { area: true } },
      items: {
        include: {
          product: { include: { category: true, vat: true, exciseTax: true, unit: true } },
          toppings: { include: { topping: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      payments: true,
      karaokeSessions: true,
      user: { select: { name: true } },
    },
  });
}

// ============ ORDER ITEMS ============

export async function addItem(orderId: string, productId: string, quantity: number = 1, toppings?: { toppingId: string; price: number }[]) {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");

  const item = await db.orderItem.create({
    data: {
      orderId,
      productId,
      quantity,
      unitPrice: product.price,
      toppings: toppings ? {
        create: toppings.map(t => ({ toppingId: t.toppingId, price: t.price })),
      } : undefined,
    },
    include: { product: true, toppings: { include: { topping: true } } },
  });

  await recalcOrder(orderId);
  revalidatePath("/order");
  return item;
}

export async function updateItemQuantity(itemId: string, quantity: number) {
  await db.orderItem.update({ where: { id: itemId }, data: { quantity } });
  const item = await db.orderItem.findUnique({ where: { id: itemId } });
  if (item) await recalcOrder(item.orderId);
  revalidatePath("/order");
}

export async function removeItem(itemId: string) {
  const item = await db.orderItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  await db.orderItem.delete({ where: { id: itemId } });
  await recalcOrder(item.orderId);
  revalidatePath("/order");
}

export async function cancelItem(itemId: string, userId: string, note?: string) {
  const existing = await db.orderItem.findUnique({ where: { id: itemId } });
  if (!existing) return;
  const item = await db.orderItem.update({
    where: { id: itemId },
    data: { status: "CANCELLED", cancelledBy: userId, cancelledAt: new Date(), note: note || existing.note },
  });
  await recalcOrder(item.orderId);
  revalidatePath("/order");
}

// ============ SEND ORDER ============

export async function sendOrder(orderId: string, areaId: string) {
  // Only send non-karaoke items to kitchen
  const karaokeSlugs = await db.product.findMany({
    where: { slug: { startsWith: "karaoke-" } },
    select: { id: true },
  });
  const karaokeProductIds = karaokeSlugs.map(p => p.id);

  await db.orderItem.updateMany({
    where: { orderId, status: "PENDING", productId: { notIn: karaokeProductIds } },
    data: { status: "SENT" },
  });
  await db.order.update({ where: { id: orderId }, data: { status: "SENT" } });

  try { await printOrderTicket(orderId, areaId, "ORDER"); } catch (e) { console.error("Print error:", e); }
  revalidatePath("/order");
}

// ============ MERGE / SPLIT ============

export async function mergeTables(orderIds: string[], targetTableId: string) {
  const targetOrder = await db.order.findFirst({
    where: { tableId: targetTableId, status: { in: ["OPEN", "SENT"] } },
  });
  if (!targetOrder) throw new Error("Target order not found");

  const mergedIds: string[] = [];
  for (const orderId of orderIds) {
    if (orderId === targetOrder.id) continue;
    await db.order.update({
      where: { id: orderId },
      data: { status: "MERGED", parentOrderId: targetOrder.id, closedAt: new Date() },
    });
    await db.orderItem.updateMany({ where: { orderId }, data: { orderId: targetOrder.id } });
    mergedIds.push(orderId);
  }

  await db.order.update({
    where: { id: targetOrder.id },
    data: { mergedFrom: JSON.stringify(mergedIds) },
  });
  await recalcOrder(targetOrder.id);
  revalidatePath("/order");
}

export async function splitItems(orderId: string, itemIds: string[], newTableId: string) {
  const originalOrder = await db.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  });
  const existingSplits = await db.order.count({
    where: { parentOrderId: orderId, status: "SPLIT" },
  });

  const newOrder = await db.order.create({
    data: {
      orderNumber: originalOrder?.orderNumber ?? 0,
      orderNumberSuffix: String(existingSplits + 1),
      tableId: newTableId,
      guestCount: 1,
      status: "SPLIT",
      parentOrderId: orderId,
      splitFrom: orderId,
      type: "NORMAL",
    },
  });

  for (const itemId of itemIds) {
    await db.orderItem.update({ where: { id: itemId }, data: { orderId: newOrder.id } });
  }

  const remainingItems = await db.orderItem.findMany({
    where: { orderId, status: { not: "CANCELLED" } },
  });
  if (remainingItems.length === 0) {
    await db.order.update({
      where: { id: orderId },
      data: { status: "SPLIT", closedAt: new Date() },
    });
  }

  await recalcOrder(orderId);
  await recalcOrder(newOrder.id);
  revalidatePath("/order");
}

export async function splitItemsEvenly(orderId: string, itemIds: string[]) {
  const originalOrder = await db.order.findUnique({
    where: { id: orderId },
    include: { table: { select: { areaId: true } } },
  });
  if (!originalOrder) throw new Error("Order not found");

  const emptyTable = await db.table.findFirst({
    where: { areaId: originalOrder.table.areaId, orders: { none: { status: { in: ["OPEN", "SENT"] } } } },
  });
  if (!emptyTable) throw new Error("No empty tables in this area");

  const existingSplits = await db.order.count({
    where: { parentOrderId: orderId, status: "SPLIT" },
  });

  const newOrder = await db.order.create({
    data: {
      orderNumber: originalOrder.orderNumber,
      orderNumberSuffix: String(existingSplits + 1),
      tableId: emptyTable.id,
      guestCount: 1,
      status: "OPEN",
      parentOrderId: orderId,
      splitFrom: orderId,
      type: originalOrder.type,
    },
  });

  for (const itemId of itemIds) {
    const item = await db.orderItem.findUnique({ where: { id: itemId } });
    if (!item || item.orderId !== orderId) continue;
    if (item.quantity > 1) {
      const stay = Math.ceil(item.quantity / 2);
      const move = item.quantity - stay;
      await db.orderItem.update({ where: { id: itemId }, data: { quantity: stay } });
      await db.orderItem.create({
        data: { orderId: newOrder.id, productId: item.productId, quantity: move, unitPrice: item.unitPrice },
      });
    } else {
      await db.orderItem.update({ where: { id: itemId }, data: { orderId: newOrder.id } });
    }
  }

  await recalcOrder(orderId);
  await recalcOrder(newOrder.id);
  revalidatePath("/order");
  return newOrder;
}

// ============ TEMPORARY BILL ============

export async function getTempBill(orderId: string) {
  return getOrder(orderId);
}

export async function printTempBill(orderId: string) {
  const order = await getOrder(orderId);
  if (!order) return;
  try { await printOrderTicket(orderId, order.table.areaId, "TEMP_BILL"); } catch (e) { console.error("Print error:", e); }
}

// ============ FINAL BILL + PAYMENT ============

export async function checkoutOrder(orderId: string, payments: { method: string; amount: number; reference?: string }[], userId?: string) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");

  for (const p of payments) {
    await db.payment.create({
      data: { orderId, method: p.method, amount: p.amount, reference: p.reference, status: "COMPLETED", paidAt: new Date() },
    });
  }

  await db.order.update({
    where: { id: orderId },
    data: { status: "PAID", closedAt: new Date(), userId },
  });

  if (await isSystemModuleEnabled("inventory")) {
    try { await autoDeductStockForOrder(orderId); } catch (e) { console.error("Stock deduction error:", e); }
  }

  if (order.type !== "COMP") {
    const salesCat = await db.cashFlowCategory.findFirst({
      where: {
        OR: [
          { id: "inc-sales" },
          { id: "inc-ventas" },
          { type: "INCOME" },
        ],
      },
      orderBy: { sortOrder: "asc" },
    });

    if (salesCat) {
      await db.cashFlow.create({
        data: {
          type: "INCOME",
          categoryId: salesCat.id,
          amount: order.totalAmount,
          description: `Order #${String(order.orderNumber).padStart(8, "0")}${order.orderNumberSuffix ? "-" + order.orderNumberSuffix : ""}`,
          referenceId: orderId,
          userId: userId || null,
        },
      });
    }
  }

  try { await printOrderTicket(orderId, order.table.areaId, "BILL"); } catch (e) { console.error("Print error:", e); }
  revalidatePath("/order");
  revalidatePath("/cash");
}

// ============ PRINTER ============

async function printOrderTicket(orderId: string, areaId: string, printType: string) {
  try {
    const { createPrintJob } = await import("@/server/reports/print-actions");
    const result = await createPrintJob({
      orderId,
      type: printType === "ORDER" ? "ORDER" : printType === "TEMP_BILL" ? "TEMP_BILL" : "BILL",
    });
    if (!result.success) console.error(`[PRINT] Failed: ${result.error}`);
    else console.log(`[PRINT] Job #${result.jobId} sent successfully`);
  } catch (e) {
    console.error("[PRINT] Error:", e);
  }
}

// ============ KARAOKE TIME SYNC ============

async function syncKaraokeTime(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { table: { include: { area: true } } },
  });
  if (!order || !order.table) return;
  if (!order.table.isKaraoke && order.table.area.type !== "KARAOKE") return;
  if (order.status !== "OPEN" && order.status !== "SENT") return;

  // Use saved pricing ID, or find first matching
  let pricingId = order.karaokePricingId;
  if (!pricingId) {
    const p = await db.karaokePricing.findFirst({
      where: { areaId: order.table.areaId },
      orderBy: { startTime: "asc" },
    });
    if (!p) return;
    pricingId = p.id;
    await db.order.update({ where: { id: orderId }, data: { karaokePricingId: pricingId } });
  }

  const pricing = await db.karaokePricing.findUnique({ where: { id: pricingId } });
  if (!pricing) return;

  const now = new Date();
  const startTime = new Date(order.openedAt);
  const diffMs = now.getTime() - startTime.getTime();
  if (diffMs < 0) return;

  // Time unit mapping
  const unitLabel: Record<string, string> = { HOUR: "hours", MINUTE: "minutes", DAY: "days", MONTH: "months" };
  const msPerUnit: Record<string, number> = { MINUTE: 60000, HOUR: 3600000, DAY: 86400000, MONTH: 2592000000 };
  const unitMs = msPerUnit[pricing.timeUnit] || msPerUnit.HOUR;
  const units = Math.max(1, Math.ceil(diffMs / unitMs));

  // Ensure "Karaoke Time" category + product
  const karaokeCat = await db.category.upsert({
    where: { slug: "gio-karaoke" },
    update: {},
    create: { name: "Karaoke Time", slug: "gio-karaoke", sortOrder: 99 },
  });
  const unit = await db.unit.findFirst();

  const productSlug = `karaoke-${pricing.id}`;
  let timeProduct = await db.product.findFirst({ where: { slug: productSlug } });
  if (!timeProduct) {
    const label = unitLabel[pricing.timeUnit] || "hours";
    const vat = await db.vat.findFirst({ orderBy: { rate: "asc" } });
    timeProduct = await db.product.create({
      data: {
        name: `Cobro ${label} - ${pricing.name}`,
        slug: productSlug,
        price: pricing.pricePerHour,
        costPrice: 0,
        categoryId: karaokeCat.id,
        unitId: unit?.id ?? "unit-gio",
        vatId: vat?.id ?? "vat-5",
        isAvailable: false,
      },
    });
  }

  // Upsert karaoke time item
  const existingItem = await db.orderItem.findFirst({
    where: { orderId, productId: timeProduct.id, status: { not: "CANCELLED" } },
  });
  if (existingItem) {
    await db.orderItem.update({
      where: { id: existingItem.id },
      data: { quantity: units, unitPrice: pricing.pricePerHour },
    });
  } else {
    await db.orderItem.create({
      data: {
        orderId,
        productId: timeProduct.id,
        quantity: units,
        unitPrice: pricing.pricePerHour,
        note: `${pricing.startTime}–${pricing.endTime}`,
        status: "PENDING",
      },
    });
  }
}

// ============ CALCULATIONS ============

async function recalcOrder(orderId: string) {
  // Sync karaoke time first (for karaoke orders)
  await syncKaraokeTime(orderId);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { status: { not: "CANCELLED" } },
        include: {
          product: { include: { vat: true, exciseTax: true } },
          toppings: true,
        },
      },
      table: { select: { areaId: true } },
    },
  });

  if (!order) return;

  let subtotal = 0;
  let toppingTotal = 0;

  for (const item of order.items) {
    subtotal += item.unitPrice * item.quantity;
    for (const t of item.toppings) {
      toppingTotal += t.price * item.quantity;
    }
  }

  subtotal += toppingTotal;

  // Tax calculation based on general configuration
  const config = await getGeneralConfig();
  const taxMode = config?.taxMode ?? "EXCLUSIVE";
  const isTaxExempt = taxMode === "EXEMPT";
  const isInclusive = taxMode === "INCLUSIVE";

  let vatAmount = 0;
  let exciseTaxAmount = 0;

  if (!isTaxExempt) {
    const taxByVat: Record<string, number> = {};
    const taxByExcise: Record<string, number> = {};

    for (const item of order.items) {
      const itemSubtotal = item.unitPrice * item.quantity;
      const vatRate = item.product.vat?.rate ?? 0;

      if (vatRate > 0) {
        const k = `${item.product.vatId}:${vatRate}`;
        if (isInclusive) {
          taxByVat[k] = (taxByVat[k] || 0) + itemSubtotal * (vatRate / (1 + vatRate));
        } else {
          taxByVat[k] = (taxByVat[k] || 0) + itemSubtotal * vatRate;
        }
      }

      if (item.product.exciseTax && item.product.exciseTax.rate > 0) {
        const ek = `${item.product.exciseTaxId}:${item.product.exciseTax.rate}`;
        if (isInclusive) {
          taxByExcise[ek] = (taxByExcise[ek] || 0) + itemSubtotal * (item.product.exciseTax.rate / (1 + item.product.exciseTax.rate));
        } else {
          taxByExcise[ek] = (taxByExcise[ek] || 0) + itemSubtotal * item.product.exciseTax.rate;
        }
      }
    }

    vatAmount = Object.values(taxByVat).reduce((a, b) => a + b, 0);
    exciseTaxAmount = Object.values(taxByExcise).reduce((a, b) => a + b, 0);
  }

  // Auto-calculate service charges
  let serviceCharge = 0;
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const [activeCharges, todayHolidays] = await Promise.all([
    getCachedServiceCharges(),
    getCachedTodayHolidays(todayISO),
  ]);
  const isHoliday = todayHolidays.length > 0;

  for (const sc of activeCharges) {
    const cond = sc.applyCondition || "ALL_DAYS";
    let applicable = false;

    switch (cond) {
      case "ALL_DAYS": applicable = true; break;
      case "DATE_RANGE":
        if (sc.startDate && sc.endDate) applicable = now >= new Date(sc.startDate) && now <= new Date(sc.endDate);
        break;
      case "HOLIDAY": applicable = isHoliday; break;
      case "MIN_ORDER": applicable = subtotal >= (sc.minOrderValue || 0); break;
      case "GUEST_COUNT": applicable = order.guestCount >= (sc.minGuestCount || 0); break;
    }

    if (applicable && sc.scope === "AREA" && sc.areaId) {
      applicable = order.table?.areaId === sc.areaId;
    }

    if (applicable) {
      if (sc.type === "PERCENTAGE" || sc.type === "SERVICE_FEE") {
        serviceCharge += subtotal * (sc.value / 100);
      } else if (sc.type === "PER_GUEST") {
        serviceCharge += sc.value * order.guestCount;
      } else {
        serviceCharge += sc.value;
      }
    }
  }

  const totalAmount = isTaxExempt || isInclusive
    ? subtotal - order.discountAmount + serviceCharge
    : subtotal + vatAmount + exciseTaxAmount - order.discountAmount + serviceCharge;

  await db.order.update({
    where: { id: orderId },
    data: { subtotal, vatAmount, exciseTaxAmount, serviceCharge, totalAmount },
  });
}

const getCachedServiceCharges = unstable_cache(
  async () => db.serviceCharge.findMany({ where: { isActive: true } }),
  ["active-service-charges"],
  { revalidate: 3600, tags: ["service-charges"] }
);

const getCachedTodayHolidays = unstable_cache(
  async (todayISO: string) =>
    db.holiday.findMany({
      where: {
        date: {
          gte: new Date(todayISO + "T00:00:00.000Z"),
          lte: new Date(todayISO + "T23:59:59.999Z"),
        },
      },
    }),
  ["today-holidays"],
  { revalidate: 3600, tags: ["holidays"] }
);

// ============ CATEGORIES & PRODUCTS FOR ORDER ============
export const getCategoriesWithProducts = unstable_cache(
  async () => {
    return db.category.findMany({
      include: {
        products: {
          where: { isAvailable: true },
          include: {
            vat: true,
            exciseTax: true,
            unit: true,
            toppingGroups: {
              include: { toppingGroup: { include: { toppings: { orderBy: { sortOrder: "asc" } } } } },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  },
  ["categories-with-products"],
  { revalidate: 3600, tags: ["products", "categories"] }
);
