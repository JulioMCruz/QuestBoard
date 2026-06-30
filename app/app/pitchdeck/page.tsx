import type { Metadata } from 'next';
import { PitchDeck } from './PitchDeck';

// Linked from the nav as "Learn more" but kept out of search indexes (robots noindex).
export const metadata: Metadata = {
  title: 'QuestBoard — Pitch',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PitchDeckPage() {
  return <PitchDeck />;
}
