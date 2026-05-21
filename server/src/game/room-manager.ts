import { createDeck, shuffleDeck, dealCards } from './deck'
import { identifyPattern, canBeat } from './card-patterns'
import { aiCallScore, aiPlayCards } from './ai-player'
import type { Card, Player, RoomState, GamePhase, PatternResult } from '@doudizhu/shared'
import type { CreatedPlayer, GameState } from './types'

const ROOM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRoomId(): string {
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)]
  }
  return id
}

export interface ClientSession {
  send: (msg: string) => void
}

const CALL_TIMEOUT_MS = 15_000

export class Room {
  id: string
  players: CreatedPlayer[] = []
  game: GameState | null = null
  sessions: Map<string, ClientSession> = new Map()
  ownerIndex = 0
  private callTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.id = generateRoomId()
  }

  get playerCount() { return this.players.length }

  addPlayer(nickname: string, session: ClientSession): Player {
    const player: CreatedPlayer = {
      id: `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      nickname,
      cards: [],
      isLandlord: false,
      isReady: false,
      connectionId: null,
      disconnectedAt: null,
      aiControlled: false,
    }
    this.players.push(player)
    this.sessions.set(player.id, session)
    return player
  }

  addAiPlayer(nickname?: string): CreatedPlayer {
    const player: CreatedPlayer = {
      id: `ai_${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      nickname: nickname ?? `AI-${this.players.length + 1}`,
      cards: [],
      isLandlord: false,
      isReady: false,
      connectionId: null,
      disconnectedAt: null,
      aiControlled: true,
    }
    this.players.push(player)
    return player
  }

  removePlayer(playerId: string) {
    const idx = this.players.findIndex(p => p.id === playerId)
    if (idx === -1) return
    this.players.splice(idx, 1)
    this.sessions.delete(playerId)
    // Transfer ownership if owner leaves
    if (this.ownerIndex >= this.players.length) {
      this.ownerIndex = this.players.findIndex(p => !p.aiControlled)
      if (this.ownerIndex === -1) this.ownerIndex = 0
    } else if (idx < this.ownerIndex) {
      this.ownerIndex--
    } else if (idx === this.ownerIndex && this.players.length > 0) {
      this.ownerIndex = this.players.findIndex(p => !p.aiControlled)
      if (this.ownerIndex === -1) this.ownerIndex = 0
    }
  }

  handleAddAi(playerId: string): boolean {
    if (this.players[this.ownerIndex]?.id !== playerId) return false
    if (this.game) return false
    if (this.players.length >= 3) return false
    this.addAiPlayer()
    this.broadcastRoomState()
    return true
  }

  handleSinglePlayerStart(nickname: string): { playerId: string } {
    const player = this.addPlayer(nickname, {
      send: () => {}, // dummy session — 先占位，稍后替换
    })
    // 添加2个AI
    this.addAiPlayer('小艾')
    this.addAiPlayer('小慧')
    return { playerId: player.id }
  }

  setPlayerSession(playerId: string, session: ClientSession) {
    this.sessions.set(playerId, session)
  }

  handleStartGame(playerId: string): boolean {
    if (this.players[this.ownerIndex]?.id !== playerId) return false
    if (this.game) return false
    const hasHuman = this.players.some(p => !p.aiControlled)
    if (!hasHuman) return false
    while (this.players.length < 3) {
      this.addAiPlayer()
    }
    return this.startGame()
  }

  broadcast(msg: object) {
    const data = JSON.stringify(msg)
    for (const session of this.sessions.values()) {
      session.send(data)
    }
  }

  sendTo(playerId: string, msg: object) {
    const session = this.sessions.get(playerId)
    if (session) session.send(JSON.stringify(msg))
  }

  toPublicState(): RoomState {
    return {
      id: this.id,
      players: this.players.map(p => ({ ...p, cards: [] })),
      owner: this.players[this.ownerIndex]?.id ?? '',
      phase: this.game?.phase ?? 'waiting',
      settings: { maxPlayers: 3, baseScore: 1 },
    }
  }

  startGame(): boolean {
    if (this.players.length !== 3) return false

    const deck = shuffleDeck(createDeck())
    const { hands, bottomCards } = dealCards(deck)

    this.players.forEach((p, i) => {
      p.cards = hands[i]
      p.isLandlord = false
      p.isReady = false
    })

    const callOrder = [0, 1, 2]
    this.game = {
      deck,
      bottomCards,
      players: this.players,
      currentPlayerIndex: 0,
      phase: 'calling',
      lastPlay: null,
      passCount: 0,
      callScores: {},
      currentCallIndex: 0,
      bombsPlayed: 0,
      landlordId: null,
    }

    // 通知各玩家手牌
    this.players.forEach((p, i) => {
      this.sendTo(p.id, { type: 'deal_cards', payload: { cards: hands[i] } })
    })

    this.broadcast({
      type: 'game_start',
      payload: {
        currentCallIndex: 0,
        // 广播各玩家初始牌数，让所有人能看到对手的剩余牌数
        cardCounts: Object.fromEntries(this.players.map((p, i) => [p.id, hands[i].length])),
      },
    })

    this.broadcastRoomState()
    this.scheduleNextAction()
    return true
  }

  private startCallTimer() {
    this.clearCallTimer()
    this.callTimer = setTimeout(() => {
      if (!this.game || this.game.phase !== 'calling') return
      const currentPlayer = this.players[this.game.currentCallIndex]
      if (!currentPlayer) return
      // 超时自动不叫
      this.handleCallScore(currentPlayer.id, 0)
    }, CALL_TIMEOUT_MS)
  }

  private clearCallTimer() {
    if (this.callTimer !== null) {
      clearTimeout(this.callTimer)
      this.callTimer = null
    }
  }

  private scheduleNextAction() {
    if (!this.game) return
    const idx = this.game.phase === 'calling' ? this.game.currentCallIndex : this.game.currentPlayerIndex
    const player = this.players[idx]
    if (player?.aiControlled) {
      setTimeout(() => this.runAiAction(), 800 + Math.random() * 600)
    } else {
      this.startCallTimer()
    }
  }

  private runAiAction() {
    if (!this.game) return
    if (this.game.phase === 'calling') {
      const player = this.players[this.game.currentCallIndex]
      if (!player?.aiControlled) return
      const score = aiCallScore(player.cards)
      this.handleCallScore(player.id, score)
    } else if (this.game.phase === 'playing') {
      const player = this.players[this.game.currentPlayerIndex]
      if (!player?.aiControlled) return
      const cards = aiPlayCards(player.cards, this.game.lastPlay)
      this.handlePlayCards(player.id, cards)
    }
  }

  handleCallScore(playerId: string, score: 0 | 1 | 2 | 3) {
    if (!this.game || this.game.phase !== 'calling') return
    const idx = this.players.findIndex(p => p.id === playerId)
    if (idx !== this.game.currentCallIndex) return

    this.game.callScores[playerId] = score

    this.broadcast({
      type: 'player_called',
      payload: { playerId, score },
    })

    if (score === 3) {
      this.setLandlord(playerId)
      return
    }

    // 检查是否所有人都叫过
    const allCalled = this.players.every(p => p.id in this.game!.callScores)
    if (allCalled) {
      // 找最高分
      let maxScore = 0
      let landlordId = this.players[0].id
      for (const p of this.players) {
        const s = this.game.callScores[p.id] ?? 0
        if (s > maxScore) {
          maxScore = s
          landlordId = p.id
        }
      }
      this.setLandlord(landlordId)
      return
    }

    // 下一位
    this.game.currentCallIndex = (this.game.currentCallIndex + 1) % 3
    this.broadcast({
      type: 'next_caller',
      payload: { currentCallIndex: this.game.currentCallIndex },
    })
    this.scheduleNextAction()
  }

  private setLandlord(playerId: string) {
    if (!this.game) return
    this.clearCallTimer()
    this.game.landlordId = playerId
    const player = this.players.find(p => p.id === playerId)
    if (player) {
      player.isLandlord = true
      player.cards.push(...this.game.bottomCards)
    }
    this.game.phase = 'playing'
    this.game.currentPlayerIndex = this.players.findIndex(p => p.id === playerId)
    // 底牌广播给所有人（非地主只展示，不加手牌；地主在前端加到手牌）
    this.broadcast({ type: 'landlord_cards', payload: {
      cards: this.game.bottomCards,
      landlordId: playerId,
      landlordCardCount: player.cards.length,
      farmerCardCount: this.players.filter(p => p.id !== playerId).map(p => p.cards.length),
      farmerIds: this.players.filter(p => p.id !== playerId).map(p => p.id),
    } })
    this.broadcast({ type: 'landlord_set', payload: { landlordId: playerId } })
    // 通知客户端轮到谁出牌（landlord_set 改了 currentPlayerIndex 但要 next_turn 才广播）
    this.broadcast({ type: 'next_turn', payload: { currentPlayerIndex: this.game.currentPlayerIndex } })
    this.broadcastRoomState()
    this.scheduleNextAction()
  }

  handlePlayCards(playerId: string, cards: Card[]) {
    if (!this.game || this.game.phase !== 'playing') return
    const playerIdx = this.players.findIndex(p => p.id === playerId)
    if (playerIdx !== this.game.currentPlayerIndex) return

    const player = this.players[playerIdx]

    if (cards.length === 0) {
      // 过牌
      this.game.passCount++
      this.broadcast({ type: 'player_passed', payload: { playerId } })
      this.advanceTurn()
      return
    }

    // 验证牌是否在玩家手牌中
    const handCopy = [...player.cards]
    for (const card of cards) {
      const idx = handCopy.findIndex(c =>
        c.rank === card.rank && c.suit === card.suit
      )
      if (idx === -1) return // 非法出牌
      handCopy.splice(idx, 1)
    }

    // 验证牌型
    const pattern = identifyPattern(cards)
    if (!pattern) return

    // 验证是否能打过上家
    if (this.game.lastPlay && this.game.lastPlay.playerId !== playerId) {
      if (!canBeat(pattern, identifyPattern(this.game.lastPlay.cards)!)) return
    }

    if (pattern.type === 'bomb') this.game.bombsPlayed++

    // 从手牌移除
    const playedIndices: number[] = []
    for (const card of cards) {
      const idx = player.cards.findIndex(c =>
        c.rank === card.rank && c.suit === card.suit
      )
      if (idx !== -1) {
        playedIndices.push(idx)
        player.cards.splice(idx, 1)
      }
    }

    this.game.lastPlay = { playerId, cards }
    this.game.passCount = 0

    this.broadcast({
      type: 'cards_played',
      payload: { playerId, cards, remaining: player.cards.length },
    })

    // 检查是否出完
    if (player.cards.length === 0) {
      this.game.phase = 'ended'
      this.broadcast({
        type: 'game_over',
        payload: { winnerId: playerId, bombsCount: this.game.bombsPlayed },
      })
      return
    }

    this.advanceTurn()
  }

  private advanceTurn() {
    if (!this.game) return
    this.game.currentPlayerIndex = (this.game.currentPlayerIndex + 1) % 3
    // 如果连续两人 pass，则 lastPlay 重置
    if (this.game.passCount >= 2) {
      this.game.lastPlay = null
      this.game.passCount = 0
    }
    this.broadcast({
      type: 'next_turn',
      payload: { currentPlayerIndex: this.game.currentPlayerIndex },
    })
    this.scheduleNextAction()
  }

  broadcastRoomState() {
    this.broadcast({ type: 'room_state', payload: this.toPublicState() })
  }

  destroy() {
    this.clearCallTimer()
    this.game = null
    this.players = []
    this.sessions.clear()
  }
}

const rooms = new Map<string, Room>()

export function createRoom(): Room {
  const room = new Room()
  rooms.set(room.id, room)
  return room
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId)
}

export function deleteRoom(roomId: string) {
  const room = rooms.get(roomId)
  if (room) room.destroy()
  rooms.delete(roomId)
}
