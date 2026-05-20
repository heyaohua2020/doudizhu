import { ref, reactive, type Ref } from 'vue'
import type { Card, RoomState, GamePhase } from '@doudizhu/shared'

const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_URL = `${WS_PROTOCOL}//${window.location.host}/ws`

export function useWebSocket() {
  const ws: Ref<WebSocket | null> = ref(null)
  const connected = ref(false)
  const playerId = ref<string | null>(null)
  const roomId = ref<string | null>(null)
  const room = reactive<{
    state: RoomState | null
    phase: GamePhase
  }>({
    state: null,
    phase: 'waiting',
  })

  const myCards: Ref<Card[]> = ref([])
  const bottomCards: Ref<Card[]> = ref([])
  const landlordId: Ref<string | null> = ref(null)
  const currentPlayerIndex = ref(0)
  const currentCallIndex = ref(0)
  const lastPlay: Ref<{ playerId: string; cards: Card[] } | null> = ref(null)
  const winner: Ref<string | null> = ref(null)
  const bombsCount = ref(0)
  const error = ref<string | null>(null)
  const lastCallScore = ref<{ playerId: string; score: number } | null>(null)
  const lastPassPlayerId = ref<string | null>(null)
  const playerCardCounts = reactive<Record<string, number>>({})

  function connect() {
    const socket = new WebSocket(WS_URL)

    socket.onopen = () => {
      connected.value = true
    }

    socket.onclose = () => {
      connected.value = false
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch { /* ignore malformed */ }
    }

    ws.value = socket
  }

  function send(type: string, payload: Record<string, unknown> = {}) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({ type, payload }))
    }
  }

  function handleMessage(msg: { type: string; payload: any }) {
    const { type, payload } = msg

    switch (type) {
      case 'room_created':
      case 'room_joined':
        playerId.value = payload.playerId
        roomId.value = payload.roomId
        break

      case 'room_state':
        room.state = payload
        break

      case 'deal_cards':
        myCards.value = payload.cards
        break

      case 'game_start':
        room.phase = 'calling'
        currentCallIndex.value = payload.currentCallIndex
        break

      case 'player_called':
        lastCallScore.value = { playerId: payload.playerId, score: payload.score }
        break

      case 'next_caller':
        currentCallIndex.value = payload.currentCallIndex
        break

      case 'landlord_cards':
        bottomCards.value = payload.cards
        // 地主获得底牌，加入手牌
        myCards.value = [...myCards.value, ...payload.cards]
        break

      case 'landlord_set':
        landlordId.value = payload.landlordId
        room.phase = 'playing'
        break

      case 'cards_played': {
        lastPlay.value = { playerId: payload.playerId, cards: payload.cards }
        // 跟踪所有玩家剩余牌数
        if (typeof payload.remaining === 'number') {
          playerCardCounts[payload.playerId] = payload.remaining
        }
        // 如果是自己出的牌，从手牌中移除
        if (payload.playerId === playerId.value) {
          const playedCards = payload.cards as Card[]
          myCards.value = myCards.value.filter(c =>
            !playedCards.some(pc => pc.rank === c.rank && (pc.suit ?? pc.jokerType) === (c.suit ?? c.jokerType))
          )
        }
        break
      }

      case 'player_passed':
        lastPassPlayerId.value = payload.playerId
        break

      case 'next_turn':
        currentPlayerIndex.value = payload.currentPlayerIndex
        break

      case 'game_over':
        winner.value = payload.winnerId
        bombsCount.value = payload.bombsCount
        room.phase = 'ended'
        break

      case 'error':
        error.value = payload.message
        break
    }
  }

  function createRoom(nickname: string) {
    send('create_room', { nickname })
  }

  function joinRoom(roomId: string, nickname: string) {
    send('join_room', { roomId, nickname })
  }

  function callScore(score: 0 | 1 | 2 | 3) {
    send('call_score', { score })
  }

  function playCards(cards: Card[]) {
    send('play_cards', { cards })
  }

  function leaveRoom() {
    send('leave_room')
    playerId.value = null
    roomId.value = null
    myCards.value = []
    room.state = null
    room.phase = 'waiting'
    landlordId.value = null
    winner.value = null
  }

  function addAi() {
    send('add_ai')
  }

  function startSinglePlayer(nickname: string) {
    send('single_player_start', { nickname })
  }

  function requestStartGame() {
    send('start_game')
  }

  return {
    ws,
    connected,
    playerId,
    roomId,
    room,
    myCards,
    bottomCards,
    landlordId,
    currentPlayerIndex,
    currentCallIndex,
    lastPlay,
    winner,
    bombsCount,
    error,
    lastCallScore,
    lastPassPlayerId,
    playerCardCounts,
    connect,
    createRoom,
    joinRoom,
    callScore,
    playCards,
    leaveRoom,
    addAi,
    startSinglePlayer,
    requestStartGame,
  }
}
