import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import StyledComponentsRegistry from '@/lib/registry';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'Abode — Creative Image Effects Studio',
  description: 'Discover creative tools for image art and design.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable} data-scroll-behavior="smooth">
      <body className={`${dmSans.className} bg-[#0a0a0a] text-white antialiased`}>
        <StyledComponentsRegistry>
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}