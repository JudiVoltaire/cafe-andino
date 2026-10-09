"use server";

import { db } from "@/lib/db";

export async function getDashboardStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);

  const [paidOrders, orderCount, activeTables, occupiedTables, recentOrders, topItem] = await Promise.all([
    db.order.findMany({
      where: {
        status: "PAID",
        closedAt: { gte: today, lt: tomorrow },
      },
      select: { totalAmount: true },
    }),
    db.order.count({
      where: {
        status: { in: ["PAID", "OPEN", "SENT"] },
        openedAt: { gte: today, lt: tomorrow },
      },
    }),
    db.table.count(),
    db.order.count({
      where: { status: { in: ["OPEN", "SENT"] } },
    }),
    db.order.findMany({
      where: {
        status: { in: ["PAID", "OPEN", "SENT"] },
        closedAt: { gte: today, lt: tomorrow },
      },
      orderBy: { openedAt: "desc" },
      take: 6,
      include: {
        table: { select: { name: true } },
        payments: { select: { amount: true } },
      },
    }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { closedAt: { gte: today, lt: tomorrow } },
        status: { not: "CANCELLED" },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 1,
    }),
  ]);

  const revenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  let topProduct = "—";
  let topQty = 0;
  if (topItem[0]) {
    const p = await db.product.findUnique({ where: { id: topItem[0].productId }, select: { name: true } });
    topProduct = p?.name ?? "—";
    topQty = topItem[0]._sum.quantity ?? 0;
  }

  return {
    revenue,
    orderCount,
    activeTables,
    occupiedTables,
    topProduct,
    topQty,
    timeline,
  };
}

function minutesAgo(date: Date) {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
}
