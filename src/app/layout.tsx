import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Volt Burn Fit",
  description: "Gamified fat-loss & strength tracker",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b0f14" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
