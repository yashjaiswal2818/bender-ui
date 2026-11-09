import type { Metadata } from 'next';
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { SiteChrome } from '@/components/site-chrome';
import { SiteFooter } from '@/components/site-footer';
import { SITE } from '@/lib/site';
import './globals.css';

const sans = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-hanken', display: 'swap' });
// Variable font: `opsz` lets the headlines tighten as they get bigger.
const display = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--font-bricolage', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: React components worth touching`, template: `%s · ${SITE.name}` },
  description:
    'Open-source React components you can try live on the page, then take with one command. Each one comes with its code, its props and a prompt for your AI.',
  openGraph: { siteName: SITE.name, type: 'website' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="flex min-h-dvh flex-col bg-bg text-ink">
        <a
          href="#main"
          className="fixed left-4 top-4 z-[80] -translate-y-24 rounded-xl bg-primary px-5 py-2.5 text-[14px] font-medium text-on-primary transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <SiteChrome header={<SiteHeader />} footer={<SiteFooter />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
