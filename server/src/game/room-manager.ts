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
const PLAY_TIMEOUT_MS = 30_000

export class Room {
  id: string
  players: CreatedPlayer[] = []
  game: GameState | null = null
  sessions: Map<string, ClientSession> = new Map()
  ownerIndex = 0
  private callTimer: ReturnType<typeof setTimeout> | null = null
  private playTimer: ReturnType<typeof setTimeout> | null = null
  /** 断线代打定时器：playerId → timerId，重连时取消 */
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor() {
    this.id = generateRoomId()
  }

  get playerCount() { return this.players.length }

  addPlayer(nickname: string, session?: ClientSession): Player {
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
    if (session) this.sessions.set(player.id, session)

    // 如果新玩家是人类且当前房主是AI，自动转移房主给新玩家
    const currentOwner = this.players[this.ownerIndex]
    if (currentOwner?.aiControlled && session) {
      this.ownerIndex = this.players.length - 1
    }

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

  /**
   * 标记玩家断线（保留玩家和手牌，移除 session）
   * 游戏进行中时断线不直接移除，给重连机会
   */
  disconnectPlayer(playerId: string) {
    const player = this.players.find(p => p.id === playerId)
    if (!player) return
    player.disconnectedAt = Date.now()
    this.sessions.delete(playerId)

    // 如果是游戏中且该玩家轮次，AI 代打
    if (this.game) {
      if (this.game.phase === 'calling' &&
          this.players[this.game.currentCallIndex]?.id === playerId) {
        // 叫分已有超时处理
      } else if (this.game.phase === 'playing' &&
                 this.players[this.game.currentPlayerIndex]?.id === playerId) {
        // 出牌阶段：8秒后 AI 代打出牌（保存 timerId 以便重连时取消）
        const timerId = setTimeout(() => {
          this.disconnectTimers.delete(playerId)
          if (player.disconnectedAt && this.game && this.game.phase === 'playing' &&
              this.players[this.game.currentPlayerIndex]?.id === playerId) {
            const cards = aiPlayCards(player.cards, this.game.lastPlay, {
              playerId: player.id,
              landlordId: this.game.landlordId!,
            })
            this.handlePlayCards(player.id, cards)
          }
        }, 8000)
        this.disconnectTimers.set(playerId, timerId)
      }
    }
  }

  /**
   * 重连玩家：重新绑定 session，清除断线标记，取消 AI 代打定时器
   */
  reconnectPlayer(playerId: string, session: ClientSession): boolean {
    const player = this.players.find(p => p.id === playerId)
    if (!player) return false
    player.disconnectedAt = null
    this.sessions.set(playerId, session)
    // 取消该玩家的 AI 代打定时器
    const timerId = this.disconnectTimers.get(playerId)
    if (timerId !== undefined) {
      clearTimeout(timerId)
      this.disconnectTimers.delete(playerId)
    }
    return true
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
    const player = this.addPlayer(nickname)
    // 添加2个AI（AI 没有真实 session，靠 runAiAction 驱动）
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
      winnerId: null,
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

  /** 游戏结束后重新开始（保留房间和玩家，重新发牌） */
  restartGame(): boolean {
    if (!this.game || this.game.phase !== 'ended') return false
    this.clearCallTimer()
    return this.startGame()
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

  private clearPlayTimer() {
    if (this.playTimer !== null) {
      clearTimeout(this.playTimer)
      this.playTimer = null
    }
  }

  private scheduleNextAction() {
    if (!this.game) return
    const idx = this.game.phase === 'calling' ? this.game.currentCallIndex : this.game.currentPlayerIndex
    const player = this.players[idx]
    if (player?.aiControlled) {
      setTimeout(() => this.runAiAction(), 800 + Math.random() * 600)
    } else if (this.game.phase === 'calling') {
      this.startCallTimer()
    } else if (this.game.phase === 'playing') {
      // 出牌阶段 30 秒超时 → AI 代出/自动过牌
      this.clearPlayTimer()
      this.playTimer = setTimeout(() => {
        if (!this.game || this.game.phase !== 'playing') return
        const p = this.players[this.game.currentPlayerIndex]
        if (!p || p.aiControlled || !this.game.lastPlay || this.game.lastPlay.playerId === p.id) {
          // 先手或有自由出牌权 → 时间到出最小的牌
          if (this.game.lastPlay?.playerId === p.id || !this.game.lastPlay) {
            // 不应该发生（先手真人不应有超时），但安全兜底
            this.playTimer = null
            return
          }
        }
        // 超时自动过牌
        this.handlePlayCards(p.id, [])
        this.playTimer = null
      }, PLAY_TIMEOUT_MS)
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
      const cards = aiPlayCards(player.cards, this.game.lastPlay, {
        playerId: player.id,
        landlordId: this.game.landlordId!,
      })
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
      // 全都不叫 → 重新发牌
      if (maxScore === 0) {
        this.clearCallTimer()
        this.broadcast({ type: 'game_restart', payload: { message: '🔄 全都不叫，重新发牌' } })
        // 保留玩家，重新开始游戏
        this.players.forEach(p => { p.cards = []; p.isLandlord = false })
        this.game = null
        this.startGame()
        return
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
    if (!player) return
    player.isLandlord = true
    player.cards.push(...this.game.bottomCards)

    this.game.phase = 'playing'
    this.game.currentPlayerIndex = this.players.findIndex(p => p.id === playerId)
    // 底牌广播给所有人
    const farmerPlayers = this.players.filter(p => p.id !== playerId)
    this.broadcast({ type: 'landlord_cards', payload: {
      cards: this.game.bottomCards,
      landlordId: playerId,
      landlordCardCount: player.cards.length,
      farmerCardCount: farmerPlayers.map(p => p.cards.length),
      farmerIds: farmerPlayers.map(p => p.id),
    } })
    this.broadcast({ type: 'landlord_set', payload: { landlordId: playerId } })
    this.broadcast({ type: 'next_turn', payload: { currentPlayerIndex: this.game.currentPlayerIndex } })
    this.broadcastRoomState()
    this.scheduleNextAction()
  }

  handlePlayCards(playerId: string, cards: Card[]) {
    if (!this.game || this.game.phase !== 'playing') {
      this.sendTo(playerId, { type: 'error', payload: { message: '游戏未开始或已结束' } })
      return
    }
    const playerIdx = this.players.findIndex(p => p.id === playerId)
    if (playerIdx !== this.game.currentPlayerIndex) {
      this.sendTo(playerId, { type: 'error', payload: { message: '还没轮到你出牌' } })
      return
    }

    const player = this.players[playerIdx]

    if (cards.length === 0) {
      // 过牌
      if (!this.game.lastPlay || this.game.lastPlay.playerId === playerId) {
        this.sendTo(playerId, { type: 'error', payload: { message: '你是先手，必须出牌' } })
        return
      }
      this.game.passCount++
      this.broadcast({ type: 'player_passed', payload: { playerId } })
      // 出牌人之外两人都 pass → 出牌人获得自由出牌权
      if (this.game.passCount >= 2) {
        this.game.lastPlay = null
        this.game.passCount = 0
        this.advanceTurn(true)
      } else {
        this.advanceTurn()
      }
      return
    }

    // 验证牌是否在玩家手牌中
    const handCopy = [...player.cards]
    for (const card of cards) {
      const idx = handCopy.findIndex(c =>
        c.rank === card.rank && (c.suit ?? c.jokerType) === (card.suit ?? card.jokerType)
      )
      if (idx === -1) {
        this.sendTo(playerId, { type: 'error', payload: { message: '手牌中没有这些牌' } })
        return
      }
      handCopy.splice(idx, 1)
    }

    // 验证牌型
    const pattern = identifyPattern(cards)
    if (!pattern) {
      this.sendTo(playerId, { type: 'error', payload: { message: '无效牌型' } })
      return
    }

    // 验证是否能打过上家
    if (this.game.lastPlay && this.game.lastPlay.playerId !== playerId) {
      const prevPattern = identifyPattern(this.game.lastPlay.cards)
      if (!prevPattern || !canBeat(pattern, prevPattern)) {
        this.sendTo(playerId, { type: 'error', payload: { message: '管不上' } })
        return
      }
    }

    if (pattern.type === 'bomb') this.game.bombsPlayed++

    // 从手牌移除（验证已在上面完成，此处必定找到）
    for (const card of cards) {
      const idx = player.cards.findIndex(c =>
        c.rank === card.rank && (c.suit ?? c.jokerType) === (card.suit ?? card.jokerType)
      )
      player.cards.splice(idx, 1)
    }

    this.game.lastPlay = { playerId, cards }
    this.game.passCount = 0

    this.broadcast({
      type: 'cards_played',
      payload: { playerId, cards, remaining: player.cards.length },
    })

    // 出牌后清除超时定时器
    this.clearPlayTimer()

    // 检查是否出完
    if (player.cards.length === 0) {
      this.game.winnerId = playerId
      this.game.phase = 'ended'
      this.broadcast({
        type: 'game_over',
        payload: { winnerId: playerId, bombsCount: this.game.bombsPlayed },
      })
      return
    }

    this.advanceTurn()
  }

  private advanceTurn(freePlay = false) {
    if (!this.game) return
    this.game.currentPlayerIndex = (this.game.currentPlayerIndex + 1) % 3
    this.broadcast({
      type: 'next_turn',
      payload: { currentPlayerIndex: this.game.currentPlayerIndex, freePlay },
    })
    this.scheduleNextAction()
  }

  broadcastRoomState() {
    this.broadcast({ type: 'room_state', payload: this.toPublicState() })
  }

  /**
   * 生成重连玩家的完整游戏状态消息序列
   * 按顺序发送给客户端，客户端 handleMessage 按序处理恢复状态
   */
  getReconnectPayload(playerId: string): object[] {
    const msgs: object[] = []
    msgs.push({ type: 'room_state', payload: this.toPublicState() })

    const player = this.players.find(p => p.id === playerId)
    if (!this.game || !player) return msgs

    // 发送玩家手牌
    msgs.push({ type: 'deal_cards', payload: { cards: player.cards } })

    // 游戏开始信息
    msgs.push({
      type: 'game_start',
      payload: {
        currentCallIndex: this.game.currentCallIndex,
        cardCounts: Object.fromEntries(this.players.map(p => [p.id, p.cards.length])),
      },
    })

    // 恢复叫分记录
    if (this.game.phase === 'calling' || this.game.phase === 'playing' || this.game.phase === 'ended') {
      for (const [pid, score] of Object.entries(this.game.callScores)) {
        msgs.push({ type: 'player_called', payload: { playerId: pid, score } })
      }
      msgs.push({ type: 'next_caller', payload: { currentCallIndex: this.game.currentCallIndex } })
    }

    // 恢复地主信息
    if (this.game.landlordId) {
      const landlordPlayer = this.players.find(p => p.id === this.game!.landlordId)
      const farmerPlayers = this.players.filter(p => p.id !== this.game!.landlordId)
      msgs.push({
        type: 'landlord_cards',
        payload: {
          cards: this.game.bottomCards,
          landlordId: this.game.landlordId,
          landlordCardCount: landlordPlayer?.cards.length ?? 0,
          farmerCardCount: farmerPlayers.map(p => p.cards.length),
          farmerIds: farmerPlayers.map(p => p.id),
        },
      })
      msgs.push({ type: 'landlord_set', payload: { landlordId: this.game.landlordId } })
    }

    // 恢复出牌阶段状态
    if (this.game.phase === 'playing' || this.game.phase === 'ended') {
      if (this.game.lastPlay) {
        const playPlayer = this.players.find(p => p.id === this.game!.lastPlay!.playerId)
        msgs.push({
          type: 'cards_played',
          payload: {
            playerId: this.game.lastPlay.playerId,
            cards: this.game.lastPlay.cards,
            remaining: playPlayer?.cards.length ?? 0,
          },
        })
      }
      msgs.push({ type: 'next_turn', payload: { currentPlayerIndex: this.game.currentPlayerIndex } })
    }

    // 游戏结束
    if (this.game.phase === 'ended') {
      msgs.push({ type: 'game_over', payload: { winnerId: this.game.winnerId ?? '', bombsCount: this.game.bombsPlayed } })
    }

    return msgs
  }

  destroy() {
    this.clearCallTimer()
    this.clearPlayTimer()
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
