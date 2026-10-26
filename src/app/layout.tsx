import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Suspense } from "react";
import { DeskHydrator } from "@/components/shell/DeskHydrator";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { PageGuide } from "@/features/guide/PageGuide";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "Maple Market",
  description: "A plain-English, visual explorer for big Canadian stocks on the TSX.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex h-dvh flex-col overflow-hidden">
        <DeskHydrator />
        <Suspense fallback={<div className="h-14 border-b border-cream/10" />}>
          <SiteHeader />
        </Suspense>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
        <PageGuide />
        <SiteFooter />
      </body>
    </html>
  );
}
