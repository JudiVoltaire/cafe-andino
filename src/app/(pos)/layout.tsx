import { unstable_cache } from "next/cache";
import { getSystemModules } from "@/server/settings/actions";
import { PosLayoutClient } from "./pos-layout-client";

// Core modules that are always enabled unless explicitly disabled in system modules
const CORE_MODULES = ["dashboard", "order", "cash", "reports", "settings"];

// Cache system modules for 5 minutes — they rarely change
const getCachedModules = unstable_cache(
  async (): Promise<string[]> => {
    const modules = await getSystemModules();
    const disabled = new Set(modules.filter(m => !m.enabled).map(m => m.name));
    const enabled = new Set(modules.filter(m => m.enabled).map(m => m.name));
    const allEnabled = [...CORE_MODULES.filter(m => !disabled.has(m)), ...Array.from(enabled)];
    return Array.from(new Set(allEnabled));
  },
  ["system-modules"],
  { revalidate: 300, tags: ["system-modules"] }
);

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const moduleNames = await getCachedModules();
  return <PosLayoutClient enabledModuleNames={moduleNames}>{children}</PosLayoutClient>;
}
