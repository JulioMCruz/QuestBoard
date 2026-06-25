import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/lib/WalletContext';

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
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-quest-50 to-white dark:from-quest-900 dark:to-black">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}