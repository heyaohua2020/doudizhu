import type { Card, Player } from '@doudizhu/shared'

export const SUITS = ['spade', 'heart', 'club', 'diamond'] as const
export const NUM_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const

export interface CreatedPlayer extends Player {
  connectionId: string | null
  disconnectedAt: number | null
  aiControlled: boolean
}

export interface GameState {
  deck: Card[]
  bottomCards: Card[]
  players: CreatedPlayer[]
  currentPlayerIndex: number
  phase: import('@doudizhu/shared').GamePhase
  lastPlay: { playerId: string; cards: Card[] } | null
  passCount: number
  callScores: Record<string, number>
  currentCallIndex: number
  bombsPlayed: number
  landlordId: string | null
  winnerId: string | null
}
