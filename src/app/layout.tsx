import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { CartBar } from "@/components/CartBar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "QuickBasket — Groceries delivered in ~10 minutes",
  description: "QuickBasket is a quick-commerce grocery delivery prototype built with Next.js and PostgreSQL.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <Header />
          <div className="pb-20">
            {children}
            <Footer />
          </div>
          <CartBar />
        </Providers>
      </body>
    </html>
  );
}
