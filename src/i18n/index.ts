export type Locale = "es" | "vi" | "en" | "zh" | "ko" | "ja";

export const locales: { code: Locale; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "🇧🇴" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

export const localeNames: Record<Locale, string> = {
  es: "Español",
  vi: "Tiếng Việt",
  en: "English",
  zh: "中文",
  ko: "한국어",
  ja: "日本語",
};
