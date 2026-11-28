import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Meldingen } from '@/components/meldingen';
import { Nav } from '@/components/nav';
import { Verversen } from '@/components/verversen';
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
    { media: '(prefers-color-scheme: light)', color: '#f3f4f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1120' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [gebruiker, jar] = await Promise.all([huidigeGebruiker().catch(() => null), cookies()]);
  const thema = jar.get('nz_thema')?.value;
  return (
    <html lang="nl" data-theme={thema === 'licht' ? 'light' : thema === 'donker' ? 'dark' : undefined}>
      <body className={gebruiker ? 'met-tabbalk' : undefined}>
        <Meldingen>
          {children}
          {gebruiker && <Nav />}
          {gebruiker && <Verversen />}
        </Meldingen>
      </body>
    </html>
  );
}
