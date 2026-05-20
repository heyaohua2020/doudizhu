import type { Card } from '@doudizhu/shared'
import { SUITS, NUM_RANKS } from './types'

/** 创建一副 54 张新牌 */
export function createDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (const rank of NUM_RANKS) {
      cards.push({ suit, rank })
    }
  }
  cards.push({ rank: 'SMALL_JOKER', jokerType: 'small' })
  cards.push({ rank: 'BIG_JOKER', jokerType: 'big' })
  return cards
}

/** Fisher-Yates 洗牌 */
export function shuffleDeck(cards: Card[]): Card[] {
  const deck = [...cards]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

/** 发牌：每人 17 张，底牌 3 张 */
export function dealCards(deck: Card[]): {
  hands: [Card[], Card[], Card[]]
  bottomCards: Card[]
} {
  return {
    hands: [
      deck.slice(0, 17),
      deck.slice(17, 34),
      deck.slice(34, 51)
    ],
    bottomCards: deck.slice(51, 54)
  }
}
