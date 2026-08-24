import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Rounded, friendly — closest free match to Duolingo's DIN Round. Full Cyrillic.
const nunito = Nunito({ subsets: ["latin", "cyrillic"], variable: "--font-app" });

export const metadata: Metadata = {
  title: "ZERTTE — адаптивное обучение с ИИ",
  description:
    "ZERTTE знает, что вы знаете, чего не знаете и что учить дальше: карта знаний, мастерство и ИИ-наставник.",
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${nunito.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
