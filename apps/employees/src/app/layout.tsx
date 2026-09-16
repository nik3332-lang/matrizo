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
  title: "Matrizo Employees",
  description:
    "Sales-employee sales entry, commission tracking, and admin management.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-stone-900">
        <AuthProvider>
          <NavBar />
          <main className="portal-main">
            <div className="portal-breadcrumb">
              <span>MATRIZO / TEAM WORKSPACE</span>
              <span>Good things, working together.</span>
            </div>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
