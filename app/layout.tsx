import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Molbhav.AI — your neighbourhood, one buying power",
  description: "Neighbours and local kiranas pool the same product into one bigger order, so a supplier's real quote can beat the usual price.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17143A" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><Suspense><Shell>{children}</Shell></Suspense></body>
    </html>
  );
}
