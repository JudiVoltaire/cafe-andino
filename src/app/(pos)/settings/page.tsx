import { getGeneralConfig, updateGeneralConfig } from "@/server/settings/actions";
import { GeneralConfigForm } from "./form";
import { getServerDictionary } from "@/lib/locale";
import { DangerZoneSection } from "./danger-zone";

export default async function GeneralConfigPage() {
  const config = await getGeneralConfig();
  const t = await getServerDictionary();
  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-2">{t.settings.generalConfig}</h2>
      <p className="text-sm text-muted-foreground mb-6">{t.settings.generalPageDesc}</p>
      <GeneralConfigForm config={config} action={updateGeneralConfig} />
      <DangerZoneSection />
    </div>
  );
}
