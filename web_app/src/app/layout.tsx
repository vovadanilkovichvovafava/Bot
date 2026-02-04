import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { AudioProvider } from '@/components/AudioProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BetPredict AI - Football Match Predictions',
  description: 'AI-powered football match analysis and betting predictions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AudioProvider>
          <Navbar />
          <main className="min-h-screen pt-16">
            {children}
          </main>
        </AudioProvider>
      </body>
    </html>
  );
}
