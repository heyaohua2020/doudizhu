import { describe, it, expect } from 'vitest'
import { aiCallScore, aiPlayCards } from './ai-player'
import type { Card } from '@doudizhu/shared'
import { RANK_VALUES } from '@doudizhu/shared'

function c(rank: string, suit = 'spade'): Card {
  if (rank === 'SM') return { rank: 'SMALL_JOKER', jokerType: 'small' } as Card
  if (rank === 'BG') return { rank: 'BIG_JOKER', jokerType: 'big' } as Card
  return { rank: rank as any, suit: suit as any }
}

function h(...ranks: string[]): Card[] {
  return ranks.map((r, i) => c(r, (['spade', 'heart', 'club', 'diamond'] as const)[i % 4]))
}

describe('aiCallScore', () => {
  it('calls 3 with bomb', () => {
    const hand = [...h('3','3','3','3'), ...h('5','6','7','8','9','10','J','Q','K','A','2','2','2')]
    expect(aiCallScore(hand)).toBe(3)
  })

  it('calls 3 with many 2s', () => {
    const hand = [...h('3','4','5','6','7','8','9','10','J','Q','K','A'), ...h('2','2','2','2','A','A')]
    expect(aiCallScore(hand)).toBe(3)
  })

  it('calls 2 with moderate hand', () => {
    const hand = [...h('3','4','5','6','7','8','9','10','J','Q','K'), ...h('A','2','2')]
    expect(aiCallScore(hand)).toBe(2)
  })

  it('passes with weak hand', () => {
    const hand = h('3','4','5','6','7','8','9','10','J','Q','K','A','3','4','5','6','7')
    expect(aiCallScore(hand)).toBe(0)
  })
})

describe('aiPlayCards', () => {
  it('plays lowest single when leading', () => {
    const hand = h('3', '5', '7', '9', 'J')
    const result = aiPlayCards(hand, null)
    expect(result).toHaveLength(1)
    expect(result[0].rank).toBe('3')
  })

  it('beats single with next higher', () => {
    const hand = h('3', '5', '7', '9', 'J')
    const lastPlay = { playerId: 'p2', cards: h('5') }
    const result = aiPlayCards(hand, lastPlay)
    expect(result).toHaveLength(1)
    expect(RANK_VALUES[result[0].rank]).toBeGreaterThan(RANK_VALUES['5'])
  })

  it('passes when cannot beat', () => {
    const hand = h('3', '4', '5')
    const lastPlay = { playerId: 'p2', cards: h('A') }
    const result = aiPlayCards(hand, lastPlay)
    expect(result).toHaveLength(0)
  })

  it('plays double-straight when consecutive pairs exist', () => {
    const hand = [c('3'),c('3','heart'),c('4'),c('4','heart'),c('5'),c('5','heart')]
    const result = aiPlayCards(hand, null)
    expect(result).toHaveLength(6)
    expect(result[0].rank).toBe('3')
  })

  it('plays all cards when hand is a valid pattern', () => {
    const hand = h('3', '4', '5', '6', '7')
    const result = aiPlayCards(hand, null)
    expect(result).toHaveLength(5)
  })
})
