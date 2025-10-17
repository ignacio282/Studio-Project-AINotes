import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reading Companion AI",
  description: "AI reading companion UI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className={`${inter.variable} antialiased bg-[var(--color-background)] text-[var(--color-text-main)]`}>
        {children}
      </body>
    </html>
  );
}
