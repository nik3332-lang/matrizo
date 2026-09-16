import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthProvider } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
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
  title: "Matrizo Ops",
  description: "Matrizo dark-store operations portal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-slate-900">
        <AuthProvider>
          <NavBar />
          <main className="portal-main">
            <div className="portal-breadcrumb">
              <span>MATRIZO / OPERATIONS</span>
              <span>Good things, working together.</span>
            </div>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
