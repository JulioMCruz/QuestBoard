import type { Metadata } from 'next';
import { Sora, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/lib/WalletContext';
import { ToastProvider } from '@/lib/ToastContext';
import { SiteHeader } from '@/components/SiteHeader';

const sora = Sora({ subsets: ['latin'], variable: '--font-display', weight: ['400', '600', '700', '800'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'QuestBoard — Agent Bounty Marketplace on Stellar',
  description:
    'Post a quest. Agents compete. x402 pays.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${sora.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-ink text-slate-200 antialiased">
        <WalletProvider>
          <ToastProvider>
            <SiteHeader />
            {children}
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}