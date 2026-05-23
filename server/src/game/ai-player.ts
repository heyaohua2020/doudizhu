import type { Card } from '@doudizhu/shared'
import { RANK_VALUES } from '@doudizhu/shared'
import { getRankCounts, identifyPattern } from './card-patterns'

// ===== 叫分 =====
export function aiCallScore(hand: Card[]): 0 | 1 | 2 | 3 {
  const rankCounts = new Map<number, number>()
  for (const c of hand) {
    const v = RANK_VALUES[c.rank]
    rankCounts.set(v, (rankCounts.get(v) || 0) + 1)
  }

  let score = 0
  for (const count of rankCounts.values()) {
    if (count === 4) score += 2      // bomb
  }
  const twos = hand.filter(c => c.rank === '2').length
  score += twos * 0.6
  const aces = hand.filter(c => c.rank === 'A').length
  score += aces * 0.4
  const kings = hand.filter(c => c.rank === 'K').length
  score += kings * 0.2

  // jokers
  const hasSmall = hand.some(c => c.jokerType === 'small')
  const hasBig = hand.some(c => c.jokerType === 'big')
  if (hasBig) score += 1
  if (hasSmall) score += 0.5

  // Rocket (both jokers) = huge
  if (hasSmall && hasBig) score += 1

  if (score >= 3) return 3
  if (score >= 1.5) return 2
  if (score >= 0.8) return 1
  return 0
}

// ===== 出牌 =====

export interface AiContext {
  /** 当前 AI 玩家的 ID */
  playerId: string
  /** 地主 ID */
  landlordId: string
  /** 所有玩家剩余牌数（含自己），用于判断队友是否快赢了 */
  cardCounts?: Record<string, number>
}

export function aiPlayCards(
  hand: Card[],
  lastPlay: { playerId: string; cards: Card[] } | null,
  context?: AiContext,
): Card[] {
  // === 需要管上家的牌 ===
  if (lastPlay && lastPlay.playerId !== context?.playerId) {
    // 无 context 时回退旧行为（向后兼容测试 / 外部调用）
    if (!context) {
      const candidates = findBeatCandidates(hand, lastPlay.cards, false)
      if (candidates.length > 0) return candidates[0]
      return []
    }

    const isLandlord = context.playerId === context.landlordId
    const lastIsLandlord = lastPlay.playerId === context.landlordId

    // 🔑 农民不打队友：我是农民，上家也是农民 → 让队友走
    if (!isLandlord && !lastIsLandlord) {
      // 特例：手牌很少（≤2 张）时可以抢出，防止队友被地主截胡
      if (hand.length <= 2) {
        const candidates = findBeatCandidates(hand, lastPlay.cards, /* preferSmallest */ true)
        if (candidates.length > 0) return candidates[0]
      }
      return [] // 过牌，让队友走
    }

    // 地主打所有人 / 农民打地主 → 选最小能管的牌，保留大牌
    const candidates = findBeatCandidates(hand, lastPlay.cards, /* preferSmallest */ true)
    if (candidates.length > 0) {
      return candidates[0]
    }
    return [] // 管不上，过牌
  }

  // === 自由出牌（自己先手） ===
  return findLeadCards(hand, context)
}

// ===== 工具函数 =====

function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank])
}

/** 按点数分组 */
function groupByRank(cards: Card[]): Map<number, Card[]> {
  const map = new Map<number, Card[]>()
  for (const c of sortByRank(cards)) {
    const v = RANK_VALUES[c.rank]
    if (!map.has(v)) map.set(v, [])
    map.get(v)!.push(c)
  }
  return map
}

/** 按点数统计数量 */
function rankCountMap(cards: Card[]): Map<number, number> {
  const m = new Map<number, number>()
  for (const c of cards) {
    const v = RANK_VALUES[c.rank]
    m.set(v, (m.get(v) || 0) + 1)
  }
  return m
}

/** 找顺子（至少5张连续） */
function findStraight(byRank: Map<number, Card[]>): Card[][] {
  const ranks = [...byRank.keys()].filter(r => r >= 3 && r <= 14).sort((a, b) => a - b)
  const straights: Card[][] = []
  let seq: number[] = []
  for (const r of ranks) {
    if (seq.length === 0 || r === seq[seq.length - 1] + 1) {
      seq.push(r)
    } else {
      if (seq.length >= 5) straights.push(seq.map(r => byRank.get(r)![0]))
      seq = [r]
    }
  }
  if (seq.length >= 5) straights.push(seq.map(r => byRank.get(r)![0]))
  return straights
}

/** 找连对（至少3对连续） */
function findDoubleStraight(byRank: Map<number, Card[]>): Card[][] {
  const ranks = [...byRank.keys()].filter(r => r >= 3 && r <= 14 && (byRank.get(r)?.length ?? 0) >= 2).sort((a, b) => a - b)
  const results: Card[][] = []
  let seq: number[] = []
  for (const r of ranks) {
    if (seq.length === 0 || r === seq[seq.length - 1] + 1) {
      seq.push(r)
    } else {
      if (seq.length >= 3) results.push(seq.flatMap(r => byRank.get(r)!.slice(0, 2)))
      seq = [r]
    }
  }
  if (seq.length >= 3) results.push(seq.flatMap(r => byRank.get(r)!.slice(0, 2)))
  return results
}

/** 找飞机（至少2组三张连续） */
function findAirplane(byRank: Map<number, Card[]>): Card[][] {
  const ranks = [...byRank.keys()].filter(r => r >= 3 && r <= 14 && (byRank.get(r)?.length ?? 0) >= 3).sort((a, b) => a - b)
  const results: Card[][] = []
  let seq: number[] = []
  for (const r of ranks) {
    if (seq.length === 0 || r === seq[seq.length - 1] + 1) {
      seq.push(r)
    } else {
      if (seq.length >= 2) results.push(seq.flatMap(r => byRank.get(r)!.slice(0, 3)))
      seq = [r]
    }
  }
  if (seq.length >= 2) results.push(seq.flatMap(r => byRank.get(r)!.slice(0, 3)))
  return results
}

// ===== 自由出牌策略 =====

function findLeadCards(hand: Card[], context?: AiContext): Card[] {
  if (hand.length === 0) return []
  if (hand.length === 1) return hand

  const byRank = groupByRank(hand)
  const allCards = sortByRank(hand)
  const counts = rankCountMap(hand)

  const singles: Card[] = []
  const pairs: Card[][] = []
  const triples: Card[][] = []
  const bombs: Card[][] = []

  for (const [rank, cards] of byRank) {
    if (cards.length === 4) bombs.push(cards)
    else if (cards.length === 3) triples.push(cards)
    else if (cards.length === 2) pairs.push(cards)
    else singles.push(...cards)
  }

  // 只剩一手可出的完整牌型 → 全出
  if (hand.length <= 4) {
    const p = identifyPattern(hand)
    if (p) return [...hand]
  }

  const isFarmer = context ? context.playerId !== context.landlordId : false

  // 🚜 农民先手策略：优先出小单张、小对子，帮队友探路
  if (isFarmer) {
    // 优先出最小的单张（帮队友了解牌型）
    if (singles.length > 0) {
      return [singles[0]]
    }
    // 其次出小对子
    if (pairs.length > 0) {
      return pairs[0]
    }
  }

  // 有飞机 → 出最小的飞机
  const airplanes = findAirplane(byRank)
  if (airplanes.length > 0) {
    const ap = airplanes[0]
    const apRanks = new Set(ap.map(c => RANK_VALUES[c.rank]))
    const otherCards = allCards.filter(c => !apRanks.has(RANK_VALUES[c.rank]))
    const otherSingles = otherCards.filter(c => (byRank.get(RANK_VALUES[c.rank])?.length ?? 0) === 1)
    if (otherSingles.length >= ap.length / 3) {
      return [...ap, ...otherSingles.slice(0, ap.length / 3)]
    }
    return ap
  }

  // 有顺子 → 出最小的顺子
  const straights = findStraight(byRank)
  if (straights.length > 0) {
    return straights[0]
  }

  // 有连对 → 出最小的连对
  const doubleStraights = findDoubleStraight(byRank)
  if (doubleStraights.length > 0) {
    return doubleStraights[0]
  }

  // 有三带一或三带二 → 出最小的
  if (triples.length > 0) {
    const t = triples[0]
    const tr = RANK_VALUES[t[0].rank]
    const kicker = allCards.find(c => RANK_VALUES[c.rank] !== tr && (byRank.get(RANK_VALUES[c.rank])?.length ?? 0) === 1)
    if (kicker) return [...t, kicker]
    const pairKicker = [...byRank.entries()].find(([r, cs]) => r !== tr && cs.length >= 2)
    if (pairKicker) return [...t, ...pairKicker[1].slice(0, 2)]
    return t
  }

  // 有对子且手牌多于3张 → 出最小的对子
  if (pairs.length > 0 && hand.length > 3) {
    return pairs[0]
  }

  // 只剩单牌 → 出最小的单张
  if (singles.length > 0) {
    return [singles[0]]
  }

  // 只剩对子
  if (pairs.length > 0) return pairs[0]

  // 只剩炸弹
  if (bombs.length > 0) return bombs[0]

  return [allCards[0]]
}

// ===== 管牌策略 =====

/**
 * 找到所有能管住 lastCards 的牌组合。
 * @param preferSmallest 为 true 时，返回最小的管牌组合（保留大牌）
 */
function findBeatCandidates(
  hand: Card[],
  lastCards: Card[],
  preferSmallest = false,
): Card[][] {
  const pattern = identifyPattern(lastCards)
  if (!pattern) return []

  const byRank = groupByRank(hand)
  const counts = rankCountMap(hand)
  const sorted = sortByRank(hand)

  const candidates: Card[][] = []

  switch (pattern.type) {
    case 'single': {
      for (const c of sorted) {
        if (RANK_VALUES[c.rank] > pattern.rank) {
          candidates.push([c])
          if (preferSmallest) break // 只取最小的
        }
      }
      break
    }

    case 'pair': {
      for (const [rank, cards] of byRank) {
        if (cards.length >= 2 && rank > pattern.rank) {
          candidates.push(cards.slice(0, 2))
          if (preferSmallest) break
        }
      }
      break
    }

    case 'triple':
    case 'triple_one':
    case 'triple_pair': {
      for (const [rank, cards] of byRank) {
        if (cards.length >= 3 && rank > pattern.rank) {
          const triple = cards.slice(0, 3)
          if (pattern.type === 'triple') {
            candidates.push(triple)
          } else if (pattern.type === 'triple_one') {
            const kicker = sorted.find(c => RANK_VALUES[c.rank] !== rank)
            if (kicker) candidates.push([...triple, kicker])
          } else if (pattern.type === 'triple_pair') {
            const pairKicker = [...byRank.entries()].find(([r, cs]) => r !== rank && cs.length >= 2)
            if (pairKicker) candidates.push([...triple, ...pairKicker[1].slice(0, 2)])
          }
          if (preferSmallest && candidates.length > 0) break
        }
      }
      break
    }

    case 'straight': {
      const len = pattern.length
      const availableRanks = [...byRank.keys()].filter(r => r >= 3 && r <= 14).sort((a, b) => a - b)
      for (let i = 0; i + len <= availableRanks.length; i++) {
        const seq = availableRanks.slice(i, i + len)
        let isConsecutive = true
        for (let j = 1; j < seq.length; j++) {
          if (seq[j] !== seq[j - 1] + 1) { isConsecutive = false; break }
        }
        if (!isConsecutive) continue
        if (seq[seq.length - 1] > pattern.rank) {
          const straightCards = seq.map(r => byRank.get(r)![0])
          candidates.push(straightCards)
          if (preferSmallest) break
        }
      }
      break
    }

    case 'double_straight': {
      const pairCount = pattern.length
      const available = [...byRank.entries()]
        .filter(([, cards]) => cards.length >= 2 && RANK_VALUES[cards[0].rank] >= 3 && RANK_VALUES[cards[0].rank] <= 14)
        .sort((a, b) => a[0] - b[0])
      for (let i = 0; i + pairCount <= available.length; i++) {
        const seq = available.slice(i, i + pairCount)
        let isConsecutive = true
        for (let j = 1; j < seq.length; j++) {
          if (seq[j][0] !== seq[j - 1][0] + 1) { isConsecutive = false; break }
        }
        if (!isConsecutive) continue
        if (seq[seq.length - 1][0] > pattern.rank) {
          candidates.push(seq.flatMap(([, cards]) => cards.slice(0, 2)))
          if (preferSmallest) break
        }
      }
      break
    }

    case 'airplane':
    case 'airplane_single':
    case 'airplane_pair': {
      const tripleCount = pattern.length
      const available = [...byRank.entries()]
        .filter(([, cards]) => cards.length >= 3 && RANK_VALUES[cards[0].rank] >= 3 && RANK_VALUES[cards[0].rank] <= 14)
        .sort((a, b) => a[0] - b[0])
      for (let i = 0; i + tripleCount <= available.length; i++) {
        const seq = available.slice(i, i + tripleCount)
        let isConsecutive = true
        for (let j = 1; j < seq.length; j++) {
          if (seq[j][0] !== seq[j - 1][0] + 1) { isConsecutive = false; break }
        }
        if (!isConsecutive) continue
        if (seq[seq.length - 1][0] > pattern.rank) {
          const triples = seq.flatMap(([, cards]) => cards.slice(0, 3))
          if (pattern.type === 'airplane') {
            candidates.push(triples)
          } else if (pattern.type === 'airplane_single') {
            const usedRanks = new Set(seq.map(([r]) => r))
            const kickers = sorted.filter(c => !usedRanks.has(RANK_VALUES[c.rank]))
              .slice(0, tripleCount)
            if (kickers.length >= tripleCount) {
              candidates.push([...triples, ...kickers.slice(0, tripleCount)])
            } else {
              candidates.push(triples)
            }
          } else if (pattern.type === 'airplane_pair') {
            const usedRanks = new Set(seq.map(([r]) => r))
            const pairKickers = [...byRank.entries()]
              .filter(([r, cs]) => !usedRanks.has(r) && cs.length >= 2)
              .slice(0, tripleCount)
              .flatMap(([, cs]) => cs.slice(0, 2))
            if (pairKickers.length >= tripleCount * 2) {
              candidates.push([...triples, ...pairKickers])
            } else {
              candidates.push(triples)
            }
          }
          if (preferSmallest && candidates.length > 0) break
        }
      }
      break
    }

    case 'four_two_single':
    case 'four_two_pair': {
      for (const [rank, cards] of byRank) {
        if (cards.length === 4 && rank > pattern.rank) {
          if (pattern.type === 'four_two_single') {
            const kickers = sorted.filter(c => RANK_VALUES[c.rank] !== rank).slice(0, 2)
            if (kickers.length >= 2) candidates.push([...cards, ...kickers.slice(0, 2)])
          } else {
            const pairKickers = [...byRank.entries()]
              .filter(([r, cs]) => r !== rank && cs.length >= 2)
              .slice(0, 2)
              .flatMap(([, cs]) => cs.slice(0, 2))
            if (pairKickers.length >= 4) candidates.push([...cards, ...pairKickers])
          }
          if (preferSmallest) break
        }
      }
      break
    }
  }

  // 炸弹可以管任何牌型（除了火箭）
  // 打地主时优先用普通牌型，炸弹作为最后手段
  if (pattern.type !== 'rocket' && pattern.type !== 'bomb') {
    const bombCandidates: Card[][] = []
    for (const [rank, cards] of byRank) {
      if (cards.length === 4) {
        bombCandidates.push(cards)
      }
    }
    if (bombCandidates.length > 0) {
      // 普通管牌已存在 → 不用炸弹（打地主时优先保留炸弹）
      if (candidates.length === 0) {
        candidates.push(...bombCandidates)
      }
      // 如果 preferSmallest，炸弹作为最后选项保留
    }
  }

  // 管炸弹需要更大的炸弹或火箭
  if (pattern.type === 'bomb') {
    for (const [rank, cards] of byRank) {
      if (cards.length === 4 && rank > pattern.rank) {
        candidates.push(cards)
        break
      }
    }
  }

  // 火箭管一切
  const smallJoker = hand.find(c => c.jokerType === 'small')
  const bigJoker = hand.find(c => c.jokerType === 'big')
  if (smallJoker && bigJoker && pattern.type !== 'rocket') {
    // 火箭也作为最后手段
    if (candidates.length === 0) {
      candidates.push([smallJoker, bigJoker])
    }
  }

  // preferSmallest: 按管牌点数升序排列，取最小的
  if (preferSmallest && candidates.length > 1) {
    candidates.sort((a, b) => {
      const pa = identifyPattern(a)
      const pb = identifyPattern(b)
      if (!pa || !pb) return 0
      // 炸弹/火箭排后面
      const aIsBomb = pa.type === 'bomb' || pa.type === 'rocket'
      const bIsBomb = pb.type === 'bomb' || pb.type === 'rocket'
      if (aIsBomb && !bIsBomb) return 1
      if (!aIsBomb && bIsBomb) return -1
      return pa.rank - pb.rank
    })
  }

  return candidates
}
