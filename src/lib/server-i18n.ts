import { es } from "@/i18n/es";
import { vi } from "@/i18n/vi";
import { en } from "@/i18n/en";
import { zh } from "@/i18n/zh";
import { ko } from "@/i18n/ko";
import { ja } from "@/i18n/ja";

const dicts: Record<string, typeof vi> = { es, vi, en, zh, ko, ja };

export function t(locale?: string | null) {
  return dicts[locale || "es"] || es;
}
