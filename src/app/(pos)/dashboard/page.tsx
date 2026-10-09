import { getDashboardStats } from "@/server/dashboard/actions";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  return <DashboardClient initialStats={stats} />;
}
