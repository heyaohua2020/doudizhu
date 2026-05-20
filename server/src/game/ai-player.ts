import type { Card } from '@doudizhu/shared'
import { RANK_VALUES } from '@doudizhu/shared'
import { getRankCounts, identifyPattern } from './card-patterns'

export function aiCallScore(hand: Card[]): 0 | 1 | 2 | 3 {
  let score = 0
  // bombs: +1 each
  const rankCounts = new Map<number, number>()
  for (const c of hand) {
    const v = RANK_VALUES[c.rank]
    rankCounts.set(v, (rankCounts.get(v) || 0) + 1)
  }
  for (const count of rankCounts.values()) {
    if (count === 4) score += 1
  }
  // 2s: +0.5 each
  const twos = hand.filter(c => c.rank === '2').length
  score += twos * 0.5
  // Aces: +0.3 each
  const aces = hand.filter(c => c.rank === 'A').length
  score += aces * 0.3

  if (score >= 2) return 3
  if (score >= 1) return 2
  if (score >= 0.5) return 1
  return 0
}

export function aiPlayCards(hand: Card[], lastPlay: { playerId: string; cards: Card[] } | null): Card[] {
  // If leading and can play all at once (only for small hands forming a complete pattern)
  if (!lastPlay && identifyPattern(hand) && hand.length <= 5) {
    return [...hand]
  }

  // Need to beat opponent
  if (lastPlay) {
    const candidates = findBeatCandidates(hand, lastPlay.cards)
    if (candidates.length > 0) {
      return candidates[0] // play smallest winning hand
    }
    return [] // pass
  }

  // Free play: lead with smallest
  return findLeadCards(hand)
}

function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank])
}

function findLeadCards(hand: Card[]): Card[] {
  const sorted = sortByRank(hand)

  if (hand.length === 1) return hand

  const singles: Card[] = []
  const pairs: Card[][] = []
  const triples: Card[][] = []
  const bombs: Card[][] = []

  const byRank = new Map<number, Card[]>()
  for (const c of sorted) {
    const v = RANK_VALUES[c.rank]
    if (!byRank.has(v)) byRank.set(v, [])
    byRank.get(v)!.push(c)
  }

  const entries = [...byRank.entries()].sort((a, b) => a[0] - b[0])

  for (const [, cards] of entries) {
    if (cards.length === 4) bombs.push(cards)
    else if (cards.length === 3) triples.push(cards)
    else if (cards.length === 2) pairs.push(cards)
    else singles.push(...cards)
  }

  if (hand.length <= 2) {
    return [sorted[0]]
  }

  // Play smallest single first
  if (singles.length > 0) {
    return [singles[0]]
  }

  // Play smallest pair
  if (pairs.length > 0) {
    return pairs[0]
  }

  // Play triple with a kicker
  if (triples.length > 0) {
    const triple = triples[0]
    const kicker = sorted.find(c => RANK_VALUES[c.rank] !== RANK_VALUES[triple[0].rank])
    if (kicker) {
      return [...triple, kicker]
    }
    return triple
  }

  // Only bombs left
  if (bombs.length > 0) return bombs[0]

  return [sorted[0]]
}

function findBeatCandidates(hand: Card[], lastCards: Card[]): Card[][] {
  const pattern = identifyPattern(lastCards)
  if (!pattern) return []

  const sorted = sortByRank(hand)
  const rankCounts = getRankCounts(hand)

  if (pattern.type === 'single') {
    for (const c of sorted) {
      if (RANK_VALUES[c.rank] > pattern.rank) {
        return [[c]]
      }
    }
  } else if (pattern.type === 'pair') {
    const byRank = new Map<number, Card[]>()
    for (const c of sorted) {
      const v = RANK_VALUES[c.rank]
      if (!byRank.has(v)) byRank.set(v, [])
      byRank.get(v)!.push(c)
    }
    for (const [, cards] of [...byRank.entries()].sort((a, b) => a[0] - b[0])) {
      if (cards.length >= 2 && RANK_VALUES[cards[0].rank] > pattern.rank) {
        return [cards.slice(0, 2)]
      }
    }
  } else if (pattern.type === 'triple' || pattern.type === 'triple_one' || pattern.type === 'triple_pair') {
    const byRank = new Map<number, Card[]>()
    for (const c of sorted) {
      const v = RANK_VALUES[c.rank]
      if (!byRank.has(v)) byRank.set(v, [])
      byRank.get(v)!.push(c)
    }
    for (const [, cards] of [...byRank.entries()].sort((a, b) => a[0] - b[0])) {
      if (cards.length >= 3 && RANK_VALUES[cards[0].rank] > pattern.rank) {
        const triple = cards.slice(0, 3)
        if (pattern.type === 'triple') return [triple]
        if (pattern.type === 'triple_one') {
          const kicker = sorted.find(c => RANK_VALUES[c.rank] !== RANK_VALUES[triple[0].rank])
          if (!kicker) continue
          return [triple.concat(kicker)]
        }
        if (pattern.type === 'triple_pair') {
          const kickerPair = [...byRank.entries()].find(([r, cs]) => r !== RANK_VALUES[triple[0].rank] && cs.length >= 2)
          if (!kickerPair) continue
          return [triple.concat(kickerPair[1].slice(0, 2))]
        }
      }
    }
  }

  // Try bomb
  const sortedEntries = [...rankCounts.entries()].sort((a, b) => a[0] - b[0])
  for (const [rank, count] of sortedEntries) {
    if (count === 4) {
      const bombCards = hand.filter(c => RANK_VALUES[c.rank] === rank)
      if (pattern.type !== 'bomb' || rank > pattern.rank) {
        return [bombCards]
      }
    }
  }

  return []
}
