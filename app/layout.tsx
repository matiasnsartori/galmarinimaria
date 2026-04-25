import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Instrument_Sans } from 'next/font/google';
import './globals.css';

const cabinet = localFont({
  src: [
    { path: '../public/fonts/CabinetGrotesk-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/CabinetGrotesk-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-cabinet',
  display: 'swap',
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Abriendo Caminos', template: '%s · Abriendo Caminos' },
  description: 'Preparación integral para el coloquio de ascenso y acompañamiento a docentes.',
  openGraph: { type: 'website', locale: 'es_AR' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${cabinet.variable} ${instrument.variable}`}>
      <body>{children}</body>
    </html>
  );
}
