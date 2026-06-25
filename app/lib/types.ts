/**
 * QuestBoard shared types
 */

export interface Bounty {
  id: number;
  poster: string;
  agent?: string;
  title: string;
  description: string;
  token: string;
  amount: number;
  deadline: number;
  status: 'Open' | 'Claimed' | 'Submitted' | 'Released' | 'Refunded';
  submissionProof?: string;
  createdAt: number;
}

export interface AgentProfile {
  address: string;
  name: string;
  endpoint: string;
  description: string;
  score: number;
  bountiesDone: number;
  registeredAt: number;
}

export interface LeaderboardEntry {
  address: string;
  score: number;
}