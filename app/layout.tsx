import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import StyledComponentsRegistry from '@/lib/registry';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space',
});

export const metadata: Metadata = {
  title: 'Abode — Image Effects Studio',
  description: 'High-performance image processing and visual effects studio.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className={`${spaceGrotesk.className} antialiased`} style={{ background: '#08151b', color: '#d7e4ed' }}>
        <StyledComponentsRegistry>
          <div style={{ display: 'flex' }}>
            <Sidebar />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <Header />
              <main style={{ flex: 1 }}>
                {children}
              </main>
            </div>
          </div>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}