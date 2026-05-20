import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, dealCards } from './deck'

describe('createDeck', () => {
  it('should create 54 cards', () => {
    expect(createDeck()).toHaveLength(54)
  })

  it('should include 2 jokers', () => {
    const deck = createDeck()
    const jokers = deck.filter(c => c.rank === 'SMALL_JOKER' || c.rank === 'BIG_JOKER')
    expect(jokers).toHaveLength(2)
  })

  it('should have 13 ranks for each suit', () => {
    const deck = createDeck()
    const spades = deck.filter(c => c.suit === 'spade')
    expect(spades).toHaveLength(13)
  })
})

describe('shuffleDeck', () => {
  it('should return 54 cards', () => {
    const deck = createDeck()
    expect(shuffleDeck(deck)).toHaveLength(54)
  })
})

describe('dealCards', () => {
  it('should deal 17 cards to each player and 3 bottom cards', () => {
    const deck = shuffleDeck(createDeck())
    const { hands, bottomCards } = dealCards(deck)
    expect(hands[0]).toHaveLength(17)
    expect(hands[1]).toHaveLength(17)
    expect(hands[2]).toHaveLength(17)
    expect(bottomCards).toHaveLength(3)
  })
})
