import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/i18n/context";
import { DeviceProvider } from "@/components/shared/device-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bakery And Coffee Eben Ezer",
  description: "Sistema de punto de venta - Bakery And Coffee Eben Ezer",
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <DeviceProvider>
          <I18nProvider>
            <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
              <TooltipProvider>
                {children}
                <Toaster position="top-center" richColors />
              </TooltipProvider>
            </SessionProvider>
          </I18nProvider>
        </DeviceProvider>
      </body>
    </html>
  );
}
