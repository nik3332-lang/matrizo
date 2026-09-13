import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { AuthProvider } from '@/lib/auth';
import { LocationProvider } from '@/lib/location';
import { Footer } from '@/components/Footer';
import { NavBar } from '@/components/NavBar';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Matrizo — sanitary & paints, delivered fast',
  description: 'Sanitary ware, pipes & fittings, and paints delivered from your nearest dark store.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

// No custom install-prompt/banner code here on purpose — STAGE 6 asks for
// the manifest without an install prompt on first visit. Browsers already
// gate their own install UI behind engagement heuristics; the only way to
// force one earlier is to write beforeinstallprompt handling, which this
// deliberately doesn't.
export const viewport: Viewport = { themeColor: '#c22f16' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-stone-900">
        <AuthProvider>
          <LocationProvider>
            <NavBar />
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">{children}</main>
            <Footer />
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
