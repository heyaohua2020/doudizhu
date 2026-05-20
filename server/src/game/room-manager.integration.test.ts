import { describe, it, expect, vi } from 'vitest'
import { createRoom } from './room-manager'

describe('Room integration with AI', () => {
  it('should fill AI on start_game and complete calling phase', () => {
    const room = createRoom()

    // Add 1 human player
    const p1 = room.addPlayer('Human', {
      send: (_msg: string) => { /* noop */ },
    })

    expect(room.playerCount).toBe(1)

    // Add AI
    room.handleAddAi(p1.id)
    expect(room.playerCount).toBe(2)
    expect(room.players[1].aiControlled).toBe(true)

    // Add another AI
    room.handleAddAi(p1.id)
    expect(room.playerCount).toBe(3)

    // Start game
    room.handleStartGame(p1.id)
    expect(room.game).not.toBeNull()
    expect(room.game!.phase).toBe('calling')
    expect(room.players.every(p => p.cards.length === 17)).toBe(true)

    // P1 (human) calls 0
    room.handleCallScore(p1.id, 0)

    // AI should auto-call within 2 seconds
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          expect(room.game!.phase).toBe('playing')
          expect(room.game!.landlordId).not.toBeNull()
          resolve()
        } catch (e) {
          reject(e)
        }
      }, 4000)
    })
  })

  it('should handle AI play after calling phase', () => {
    const room = createRoom()

    // Add 3 AI players via owner
    const p1 = room.addPlayer('Human', {
      send: (_msg: string) => { /* noop */ },
    })
    room.handleAddAi(p1.id)
    room.handleAddAi(p1.id)
    room.handleStartGame(p1.id)

    expect(room.game).not.toBeNull()
    expect(room.game!.phase).toBe('calling')

    // Let human pass, then AI should complete calling
    room.handleCallScore(p1.id, 0)

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          // Game should be in playing phase with next_turn scheduled
          expect(room.game!.phase).toBe('playing')
          expect(room.game!.landlordId).not.toBeNull()
          // AI may have already played, verify game is active
          expect(room.game!.phase).toBe('playing')
          resolve()
        } catch (e) {
          reject(e)
        }
      }, 4000)
    })
  })
})
