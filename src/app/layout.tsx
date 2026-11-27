import type { Metadata, Viewport } from 'next';
import { Nav } from '@/components/nav';
import { huidigeGebruiker } from '@/lib/sessie';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NewsZoom',
  description: 'Volg wat je boeit. Zie wat er verandert.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const gebruiker = await huidigeGebruiker().catch(() => null);
  return (
    <html lang="nl">
      <body className={gebruiker ? 'met-tabbalk' : undefined}>
        {children}
        {gebruiker && <Nav />}
      </body>
    </html>
  );
}
