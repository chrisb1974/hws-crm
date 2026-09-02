import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { t } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: t.appName,
  description: "Portefeuille des établissements Hospitality Web Services.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
