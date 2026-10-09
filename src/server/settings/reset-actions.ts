"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { compare } from "bcryptjs";
import { revalidatePath } from "next/cache";

export type ResetResult =
  | { ok: true; orders: number; stockIns: number; registers: number; printJobs: number }
  | { ok: false; error: "unauthorized" | "wrong_password" | "server_error" };

/**
 * Deletes ALL transactional / test data while preserving every configuration
 * record (products, categories, areas, tables, users, roles, etc.).
 *
 * Tables cleared:
 *   OrderLog, AuditLog, LoginLog
 *   PrintJob
 *   Payment, OrderItemTopping, OrderItem, Order
 *   PettyTransaction, CashRegister
 *   CashFlow
 *   StockOutBatch, StockOut
 *   InventoryBatch, StockInIngredient, StockIn
 *   ShiftAssignment
 *   KaraokeSession
 *
 * After clearing stock tables, every Ingredient.currentStock is reset to 0.
 */
export async function resetForProductionLaunch(adminPassword: string): Promise<ResetResult> {
  // 1. Auth – must be an admin
  const session = await auth();
  if (!session?.user) return { ok: false, error: "unauthorized" };

  const user = await db.user.findUnique({
    where: { username: session.user.username },
    include: { role: true },
  });
  if (!user) return { ok: false, error: "unauthorized" };

  // Verify caller is an admin (role permissions must contain "settings:delete" or role name Admin)
  const perms: string[] = JSON.parse(user.role.permissions || "[]");
  const isAdmin =
    user.role.name.toLowerCase() === "admin" ||
    perms.includes("settings:delete") ||
    perms.includes("*");
  if (!isAdmin) return { ok: false, error: "unauthorized" };

  // 2. Verify password
  const valid = await compare(adminPassword, user.password);
  if (!valid) return { ok: false, error: "wrong_password" };

  try {
    // 3. Collect counts before deletion (for success message)
    const [ordersCount, stockInsCount, registersCount, printJobsCount] = await Promise.all([
      db.order.count(),
      db.stockIn.count(),
      db.cashRegister.count(),
      db.printJob.count(),
    ]);

    // 4. Delete in dependency order (children before parents)

    // Audit & Logs
    await db.orderLog.deleteMany({});
    await db.auditLog.deleteMany({});
    await db.loginLog.deleteMany({});

    // Print jobs
    await db.printJob.deleteMany({});

    // Payments + order items (cascade handles OrderItemTopping via onDelete: Cascade)
    await db.payment.deleteMany({});
    await db.orderItem.deleteMany({});

    // Karaoke sessions
    await db.karaokeSession.deleteMany({});

    // Orders
    await db.order.deleteMany({});

    // Cash
    await db.pettyTransaction.deleteMany({});
    await db.cashRegister.deleteMany({});
    await db.cashFlow.deleteMany({});

    // Inventory movements
    await db.stockOutBatch.deleteMany({});
    await db.stockOut.deleteMany({});
    await db.inventoryBatch.deleteMany({});
    await db.stockInIngredient.deleteMany({});
    await db.stockIn.deleteMany({});

    // Reset ingredient stock quantities to zero
    await db.ingredient.updateMany({ data: { currentStock: 0 } });

    // Shift assignments (not the shift definitions themselves)
    await db.shiftAssignment.deleteMany({});

    // 5. Revalidate all affected pages
    revalidatePath("/order");
    revalidatePath("/cash");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/settings");

    return {
      ok: true,
      orders: ordersCount,
      stockIns: stockInsCount,
      registers: registersCount,
      printJobs: printJobsCount,
    };
  } catch (err) {
    console.error("[resetForProductionLaunch]", err);
    return { ok: false, error: "server_error" };
  }
}
