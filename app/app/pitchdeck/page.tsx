import type { Metadata } from 'next';
import { PitchDeck } from './PitchDeck';

// Unlisted page: kept out of search indexes (and the SiteHeader doesn't link to it).
export const metadata: Metadata = {
  title: 'QuestBoard — Pitch',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PitchDeckPage() {
  return <PitchDeck />;
}
