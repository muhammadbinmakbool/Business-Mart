import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { AuthProvider } from "@/components/layout/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import CommandPalette from "@/modules/command-palette/components/CommandPalette";
import FastEntryHelperCard from "@/components/ui/FastEntryHelperCard";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>
              <AppLayout>
                {children}
              </AppLayout>
              <Toaster position="top-center" richColors />
              <CommandPalette />
              <FastEntryHelperCard />
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
