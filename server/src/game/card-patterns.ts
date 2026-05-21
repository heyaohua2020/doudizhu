import type { Card, PatternResult } from '@doudizhu/shared'
import { RANK_VALUES } from '@doudizhu/shared'

/** 获取牌的点数值 */
export function getCardRankValue(card: Card): number {
  return RANK_VALUES[card.rank]
}

/** 统计各点数出现次数 */
export function getRankCounts(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const c of cards) {
    const v = getCardRankValue(c)
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  return counts
}

/** 检查是否为顺子序列 */
export function isConsecutive(ranks: number[]): boolean {
  if (ranks.length < 1) return false
  // 2 和王不能参与顺子
  if (ranks.some(r => r >= 15)) return false
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false
  }
  return true
}

/** 识别牌型，返回 null 表示非法牌型 */
export function identifyPattern(cards: Card[]): PatternResult | null {
  const n = cards.length
  if (n === 0) return null
  const rankCounts = getRankCounts(cards)
  const values = [...rankCounts.keys()]
  const counts = [...rankCounts.values()].sort((a, b) => b - a)

  // 火箭：大小王
  if (n === 2 && cards.some(c => c.rank === 'SMALL_JOKER') && cards.some(c => c.rank === 'BIG_JOKER')) {
    return { type: 'rocket', rank: 17, length: 1 }
  }

  // 单张
  if (n === 1) {
    return { type: 'single', rank: getCardRankValue(cards[0]), length: 1 }
  }

  // 对子
  if (n === 2 && counts[0] === 2) {
    return { type: 'pair', rank: values[0], length: 1 }
  }

  // 三张
  if (n === 3 && counts[0] === 3) {
    return { type: 'triple', rank: values[0], length: 1 }
  }

  // 炸弹
  if (n === 4 && counts[0] === 4) {
    return { type: 'bomb', rank: values[0], length: 1 }
  }

  // 三带一
  if (n === 4 && counts[0] === 3 && counts[1] === 1) {
    const tripleRank = [...rankCounts.entries()].find(([, c]) => c === 3)![0]
    return { type: 'triple_one', rank: tripleRank, length: 1 }
  }

  // 三带二
  if (n === 5 && counts[0] === 3 && counts[1] === 2) {
    const tripleRank = [...rankCounts.entries()].find(([, c]) => c === 3)![0]
    return { type: 'triple_pair', rank: tripleRank, length: 1 }
  }

  // 顺子：>=5 张单牌连续
  if (n >= 5 && values.length === n && isConsecutive(values.sort((a, b) => a - b))) {
    return { type: 'straight', rank: Math.max(...values), length: n }
  }

  // 连对：>=3 对 连续
  if (n >= 6 && n % 2 === 0 && counts.every(c => c === 2) && isConsecutive(values.sort((a, b) => a - b))) {
    return { type: 'double_straight', rank: Math.max(...values), length: n / 2 }
  }

  // 飞机（不带/带单/带对）
  const tripleValues = [...rankCounts.entries()].filter(([, c]) => c >= 3).map(([v]) => v).sort((a, b) => a - b)
  if (tripleValues.length >= 2) {
    const consecutive = findLongestConsecutive(tripleValues)
    if (consecutive.length >= 2) {
      const tripleCount = consecutive.length

      // 计算移除连续三张后各点数剩余张数
      const remaining = new Map(rankCounts)
      for (const v of consecutive) {
        const left = remaining.get(v)! - 3
        if (left > 0) remaining.set(v, left)
        else remaining.delete(v)
      }
      const remainingEntries = [...remaining.entries()]
      const totalRemaining = remainingEntries.reduce((s, [, c]) => s + c, 0)

      if (totalRemaining === 0) {
        return { type: 'airplane', rank: Math.max(...consecutive), length: tripleCount }
      }
      if (totalRemaining === tripleCount) {
        return { type: 'airplane_single', rank: Math.max(...consecutive), length: tripleCount }
      }
      if (totalRemaining === tripleCount * 2) {
        // 验证剩余牌能凑出足够的对子
        const pairCount = remainingEntries.reduce((s, [, c]) => s + Math.floor(c / 2), 0)
        if (pairCount >= tripleCount) {
          return { type: 'airplane_pair', rank: Math.max(...consecutive), length: tripleCount }
        }
      }
    }
  }

  // 四带二单
  if (n === 6) {
    const fourRank = [...rankCounts.entries()].find(([, c]) => c === 4)
    if (fourRank && counts[1] === 1 && counts[2] === 1) {
      return { type: 'four_two_single', rank: fourRank[0], length: 1 }
    }
  }

  // 四带二对
  if (n === 8) {
    const fourRank = [...rankCounts.entries()].find(([, c]) => c === 4)
    if (fourRank) {
      const remaining = [...rankCounts.entries()].filter(([v]) => v !== fourRank[0])
      if (remaining.every(([, c]) => c === 2) && remaining.length === 2) {
        return { type: 'four_two_pair', rank: fourRank[0], length: 1 }
      }
      if (remaining.length === 4 && remaining.every(([, c]) => c === 1)) {
        return { type: 'four_two_single', rank: fourRank[0], length: 1 }
      }
    }
  }

  return null
}

function findLongestConsecutive(sortedValues: number[]): number[] {
  if (sortedValues.length === 0) return []
  let best: number[] = [sortedValues[0]]
  let current: number[] = [sortedValues[0]]
  for (let i = 1; i < sortedValues.length; i++) {
    if (sortedValues[i] === sortedValues[i - 1] + 1) {
      current.push(sortedValues[i])
    } else {
      if (current.length > best.length) best = current
      current = [sortedValues[i]]
    }
  }
  return current.length > best.length ? current : best
}

/** 判断能否打过上家的牌 */
export function canBeat(hand: PatternResult, previous: PatternResult): boolean {
  if (hand.type === 'rocket') return true
  if (hand.type === 'bomb') {
    if (previous.type === 'rocket') return false
    if (previous.type === 'bomb') return hand.rank > previous.rank
    return true
  }
  return hand.type === previous.type &&
         hand.length === previous.length &&
         hand.rank > previous.rank
}

/** 检查给定的牌是否能从上家牌中打过 */
export function canBeatCards(hand: Card[], previous: Card[]): boolean {
  const handPattern = identifyPattern(hand)
  const prevPattern = identifyPattern(previous)
  if (!handPattern || !prevPattern) return false
  return canBeat(handPattern, prevPattern)
}
