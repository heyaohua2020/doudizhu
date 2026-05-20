import { describe, it, expect } from 'vitest'
import { identifyPattern, canBeat } from './card-patterns'
import type { Card } from '@doudizhu/shared'

function c(rank: string, suit = 'spade'): Card {
  if (rank === 'SM' ) return { rank: 'SMALL_JOKER', jokerType: 'small' }
  if (rank === 'BG') return { rank: 'BIG_JOKER', jokerType: 'big' }
  return { rank: rank as any, suit: suit as any }
}

describe('identifyPattern', () => {
  it('identifies single', () => {
    expect(identifyPattern([c('3')])).toEqual({ type: 'single', rank: 3, length: 1 })
  })

  it('identifies pair', () => {
    expect(identifyPattern([c('3'), c('3', 'heart')])).toEqual({ type: 'pair', rank: 3, length: 1 })
  })

  it('identifies triple', () => {
    const cards = [c('K'), c('K', 'heart'), c('K', 'diamond')]
    expect(identifyPattern(cards)).toEqual({ type: 'triple', rank: 13, length: 1 })
  })

  it('identifies bomb', () => {
    const cards = [c('A'), c('A', 'heart'), c('A', 'diamond'), c('A', 'club')]
    expect(identifyPattern(cards)).toEqual({ type: 'bomb', rank: 14, length: 1 })
  })

  it('identifies rocket', () => {
    expect(identifyPattern([c('SM'), c('BG')])).toEqual({ type: 'rocket', rank: 17, length: 1 })
  })

  it('identifies triple with one', () => {
    const cards = [c('5'), c('5', 'heart'), c('5', 'diamond'), c('8')]
    expect(identifyPattern(cards)).toEqual({ type: 'triple_one', rank: 5, length: 1 })
  })

  it('identifies triple with pair', () => {
    const cards = [c('5'), c('5', 'heart'), c('5', 'diamond'), c('8'), c('8', 'heart')]
    expect(identifyPattern(cards)).toEqual({ type: 'triple_pair', rank: 5, length: 1 })
  })

  it('identifies straight of 5', () => {
    const cards = [c('3'), c('4'), c('5'), c('6'), c('7')]
    expect(identifyPattern(cards)).toEqual({ type: 'straight', rank: 7, length: 5 })
  })

  it('rejects straight containing 2', () => {
    const cards = [c('10'), c('J'), c('Q'), c('K'), c('A'), c('2')]
    expect(identifyPattern(cards)).toBeNull()
  })

  it('identifies double straight', () => {
    const cards = [c('3'),c('3','heart'), c('4'),c('4','heart'), c('5'),c('5','heart')]
    expect(identifyPattern(cards)).toEqual({ type: 'double_straight', rank: 5, length: 3 })
  })

  it('identifies airplane (no wings)', () => {
    const cards = [c('3'),c('3','heart'),c('3','diamond'), c('4'),c('4','heart'),c('4','diamond')]
    expect(identifyPattern(cards)).toEqual({ type: 'airplane', rank: 4, length: 2 })
  })

  it('identifies airplane with singles', () => {
    const cards = [c('3'),c('3','heart'),c('3','diamond'), c('4'),c('4','heart'),c('4','diamond'), c('7'), c('8')]
    expect(identifyPattern(cards)).toEqual({ type: 'airplane_single', rank: 4, length: 2 })
  })

  it('returns null for invalid cards', () => {
    expect(identifyPattern([c('3'), c('4')])).toBeNull()
  })
})

describe('canBeat', () => {
  it('rocket beats everything', () => {
    const rocket = { type: 'rocket' as const, rank: 17, length: 1 }
    expect(canBeat(rocket, { type: 'bomb', rank: 15, length: 1 })).toBe(true)
    expect(canBeat(rocket, { type: 'single', rank: 14, length: 1 })).toBe(true)
  })

  it('bomb beats non-bomb non-rocket', () => {
    expect(canBeat({ type: 'bomb', rank: 5, length: 1 }, { type: 'single', rank: 14, length: 1 })).toBe(true)
  })

  it('higher bomb beats lower bomb', () => {
    expect(canBeat({ type: 'bomb', rank: 10, length: 1 }, { type: 'bomb', rank: 5, length: 1 })).toBe(true)
    expect(canBeat({ type: 'bomb', rank: 5, length: 1 }, { type: 'bomb', rank: 10, length: 1 })).toBe(false)
  })

  it('same type higher rank beats', () => {
    expect(canBeat({ type: 'single', rank: 10, length: 1 }, { type: 'single', rank: 5, length: 1 })).toBe(true)
  })

  it('different type cannot beat', () => {
    expect(canBeat({ type: 'pair', rank: 10, length: 1 }, { type: 'single', rank: 10, length: 1 })).toBe(false)
  })

  it('same type different length cannot beat', () => {
    expect(canBeat({ type: 'straight', rank: 8, length: 5 }, { type: 'straight', rank: 7, length: 4 })).toBe(false)
  })
})
