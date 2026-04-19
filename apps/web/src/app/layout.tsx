import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fragments — Curador digital",
  description: "Un ecosistema de aprendizaje interactivo de próxima generación.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif" }}
    >
      <body
        className="min-h-full"
        style={{ background: "var(--base)", color: "var(--ink)" }}
      >
        {children}
      </body>
    </html>
  );
}
