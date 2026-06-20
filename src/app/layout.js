import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { AuthProvider } from "@/components/layout/AuthContext";
import { SettingsProvider } from "@/components/layout/SettingsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import CommandPalette from "@/modules/command-palette/components/CommandPalette";
import FastEntryHelperCard from "@/components/ui/FastEntryHelperCard";
import { getFeatureFlags } from "@/lib/settings/featureFlags";
import { getGeneralSettingsAction } from "@/modules/settings/controllers/settingsActions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Business Mart",
  description: "Modular Business Management System",
};

export default async function RootLayout({ children }) {
  const flags = await getFeatureFlags();
  const salesWorkflow = flags.salesWorkflow || "CLASSIC";
  const isSourceTrackingEnabled = flags.modules?.sourceTracking !== false;
  const settingsRes = await getGeneralSettingsAction();
  const initialSettings = settingsRes?.success ? settingsRes.settings : {};

  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider initialSettings={initialSettings}>
              <SidebarProvider>
                <AppLayout salesWorkflow={salesWorkflow} isSourceTrackingEnabled={isSourceTrackingEnabled}>
                  {children}
                </AppLayout>
                <Toaster position="top-center" richColors />
                <CommandPalette />
                <FastEntryHelperCard />
              </SidebarProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

