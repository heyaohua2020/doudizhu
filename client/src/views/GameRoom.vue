<template>
  <div class="game-room">
    <!-- 背景装饰 -->
    <div class="bg-pattern"></div>
    <div class="bg-glow"></div>

    <!-- ===== 等待房间 ===== -->
    <div v-if="ws.room.phase === 'waiting'" class="waiting-room">
      <div class="waiting-card">
        <div class="waiting-header">
          <div class="room-tag">🃏 房间号 <strong>{{ ws.roomId.value }}</strong></div>
          <p class="waiting-hint">分享房间号给好友，或添加 AI 开始游戏</p>
        </div>
        <div class="seats">
          <div
            v-for="(seat, i) in seatList"
            :key="i"
            class="seat"
            :class="{ occupied: seat.player, ai: seat.player?.aiControlled, owner: i === 0 }"
          >
            <template v-if="seat.player">
              <div class="seat-avatar" :class="{ 'is-ai': seat.player.aiControlled }">
                {{ seat.player.aiControlled ? '🤖' : seat.player.nickname.charAt(0) }}
              </div>
              <div class="seat-info">
                <div class="seat-name">
                  {{ seat.player.nickname }}
                  <span v-if="seat.player.aiControlled" class="ai-badge">AI</span>
                  <span v-if="seat.player.id === ws.playerId.value" class="me-badge">你</span>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="seat-empty">
                <div class="seat-icon">➕</div>
                <span class="seat-label">等待加入</span>
                <button
                  v-if="ws.playerId.value === ws.room.state?.owner"
                  class="btn-add-ai"
                  @click="ws.addAi()"
                >
                  + 添加AI
                </button>
              </div>
            </template>
          </div>
        </div>
        <div class="waiting-actions">
          <button
            v-if="ws.playerId.value === ws.room.state?.owner"
            class="btn-start"
            @click="ws.requestStartGame()"
          >
            🎯 开始游戏
          </button>
          <button class="btn-leave-waiting" @click="ws.leaveRoom()">退出房间</button>
        </div>
      </div>
    </div>

    <!-- ===== 游戏中 ===== -->
    <template v-if="ws.room.phase !== 'waiting'">
      <!-- 顶部栏 -->
      <div class="top-bar">
        <div class="room-badge">🃏 {{ ws.roomId.value }}</div>
        <div class="top-actions">
          <button class="btn-chat" @click="showChat = !showChat" :class="{ active: showChat }">
            💬 {{ chatUnreadCount > 0 ? '(' + chatUnreadCount + ')' : '' }}
          </button>
          <button class="btn-quit" @click="ws.leaveRoom()">✕ 退出</button>
        </div>
      </div>

      <!-- 桌面区域 -->
      <div class="table-area">
        <!-- 底牌 -->
        <div class="bottom-cards-area">
          <div class="bottom-label">底牌</div>
          <div class="bottom-cards">
            <div
              v-for="(card, i) in ws.bottomCards.value"
              :key="i"
              class="bc-card"
              :class="{ revealed: ws.landlordId.value }"
            >
              <div v-if="ws.landlordId.value" class="bc-card-face">
                <CardFace :card="card" :size="bottomCardSize" />
              </div>
              <div v-else class="bc-card-back"></div>
            </div>
          </div>
        </div>

        <!-- 上家（我 +1） -->
        <div class="player-spot top-spot" :class="{ active: isPlayerTurn(spotIndices.top) }">
          <div class="spot-avatar" :class="{ landlord: isLandlord(players[spotIndices.top]?.id) }">
            {{ players[spotIndices.top]?.aiControlled ? '🤖' : (players[spotIndices.top]?.nickname?.charAt(0) ?? '?') }}
            <div v-if="isLandlord(players[spotIndices.top]?.id)" class="crown">👑</div>
          </div>
          <div class="spot-info">
            <div class="spot-name-row">
              <span class="spot-name">{{ players[spotIndices.top]?.nickname ?? '等待中' }}</span>
            </div>
            <div class="spot-tags">
              <span v-if="players[spotIndices.top]?.aiControlled" class="ai-tag">AI</span>
              <span v-if="isLandlord(players[spotIndices.top]?.id)" class="landlord-tag">地主</span>
              <span v-else-if="players[spotIndices.top]" class="farmer-tag">农民</span>
            </div>
          </div>
          <div class="spot-count">✕ {{ players[spotIndices.top] ? getPlayerCardCount(players[spotIndices.top].id) : 0 }}</div>
          <div v-if="callScoreText && callScoreText.idx === spotIndices.top" class="status-tag call-status">
            {{ callScoreText.text }}
          </div>
          <div v-if="passDisplayIdx === spotIndices.top" class="status-tag pass-status">不出</div>
        </div>

        <!-- 下家（我 +2） -->
        <div class="player-spot right-spot" :class="{ active: isPlayerTurn(spotIndices.right) }">
          <div class="spot-avatar" :class="{ landlord: isLandlord(players[spotIndices.right]?.id) }">
            {{ players[spotIndices.right]?.aiControlled ? '🤖' : (players[spotIndices.right]?.nickname?.charAt(0) ?? '?') }}
            <div v-if="isLandlord(players[spotIndices.right]?.id)" class="crown">👑</div>
          </div>
          <div class="spot-info">
            <div class="spot-name-row">
              <span class="spot-name">{{ players[spotIndices.right]?.nickname ?? '等待中' }}</span>
            </div>
            <div class="spot-tags">
              <span v-if="players[spotIndices.right]?.aiControlled" class="ai-tag">AI</span>
              <span v-if="isLandlord(players[spotIndices.right]?.id)" class="landlord-tag">地主</span>
              <span v-else-if="players[spotIndices.right]" class="farmer-tag">农民</span>
            </div>
          </div>
          <div class="spot-count">✕ {{ players[spotIndices.right] ? getPlayerCardCount(players[spotIndices.right].id) : 0 }}</div>
          <div v-if="callScoreText && callScoreText.idx === spotIndices.right" class="status-tag call-status">
            {{ callScoreText.text }}
          </div>
          <div v-if="passDisplayIdx === spotIndices.right" class="status-tag pass-status">不出</div>
        </div>

        <!-- 中央出牌区 -->
        <div class="center-play-area">
          <!-- 叫地主阶段 -->
          <div v-if="ws.room.phase === 'calling'" class="calling-area">
            <div v-if="isMyTurn" class="call-prompt">
              <div class="call-title">🗣 叫地主</div>
              <div class="call-btns">
                <button class="call-btn no-call" @click="ws.callScore(0)">不叫</button>
                <button class="call-btn one-call" @click="ws.callScore(1)">1分</button>
                <button class="call-btn two-call" @click="ws.callScore(2)">2分</button>
                <button class="call-btn three-call" @click="ws.callScore(3)">3分</button>
              </div>
            </div>
            <div v-else class="call-waiting">
              <div class="waiting-dots">
                <span>等待叫地主</span>
                <span class="dot-anim">...</span>
              </div>
            </div>
          </div>

          <!-- 出牌阶段 -->
          <div v-if="ws.room.phase === 'playing'" class="playing-area">
            <div v-if="lastPlayDisplay && lastPlayDisplay.cards.length > 0" class="played-group" :class="`from-${lastPlayDisplay.direction}`">
              <div class="played-label">
                <span class="played-direction">{{ lastPlayDisplay.directionArrow }}</span>
                <span class="played-name">{{ lastPlayDisplay.playerName }}</span>
              </div>
              <div class="played-cards-row">
                <div
                  v-for="(c, ci) in lastPlayDisplay.cards"
                  :key="ci"
                  class="played-card-wrapper"
                  :style="{ animationDelay: ci * 0.05 + 's' }"
                >
                  <CardItem :card="c" :size="playedCardSize" />
                </div>
              </div>
            </div>

            <div v-if="isMyTurn" class="my-turn-prompt">
              <span>请出牌 👇</span>
            </div>
          </div>

          <!-- 游戏结束 -->
          <div v-if="ws.room.phase === 'ended'" class="game-result">
            <div class="result-overlay"></div>
            <div class="result-card">
              <div class="result-icon">{{ isLandlord(ws.winner.value) ? '👑' : '🎉' }}</div>
              <h2 class="result-title">{{ winnerName }} 获胜！</h2>
              <div class="result-detail">
                <span class="result-bomb">💣 炸弹 × {{ ws.bombsCount.value }}</span>
                <span class="result-role">{{ isLandlord(ws.winner.value) ? '地主' : '农民' }} 胜利</span>
              </div>
              <div class="result-actions">
                <button class="btn-replay" @click="ws.requestRestartGame()">🔄 再来一局</button>
                <button class="btn-leave-result" @click="ws.leaveRoom()">🚪 退出房间</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的手牌区 -->
      <div class="my-area">
        <!-- 错误提示 -->
        <div v-if="ws.error.value" class="error-toast">{{ ws.error.value }}</div>
        <div class="my-bar">
          <div class="my-avatar" :class="{ landlord: isLandlord(playerId) }">
            {{ myName.charAt(0) }}
            <div v-if="isLandlord(playerId)" class="mini-crown">👑</div>
          </div>
          <div class="my-info-text">
            <span class="my-name">{{ myName }}</span>
            <span v-if="isLandlord(playerId)" class="landlord-badge">地主</span>
            <span v-else class="farmer-badge">农民</span>
            <span class="my-count">✕ {{ ws.myCards.value.length }}</span>
          </div>
          <div class="my-actions">
            <template v-if="ws.room.phase === 'playing' && isMyTurn">
              <button class="act-btn hint-act" @click="onHint">💡 提示</button>
              <button class="act-btn pass-act" @click="ws.playCards([])" :disabled="!canPass">
                🙅 不出
              </button>
              <button class="act-btn play-act" @click="onPlayCards" :disabled="selectedIndices.size === 0">
                🚀 出牌
              </button>
            </template>
          </div>
        </div>

        <div class="my-cards-container" ref="cardsContainer" @mousemove="onCardsMouseMove" @mouseup="onCardsMouseUp" @mouseleave="onCardsMouseLeave">
          <div class="my-cards" :style="cardsContainerStyle">
            <div
              v-for="(card, i) in sortedCards"
              :key="`${card.rank}-${card.suit ?? card.jokerType ?? '?'}`"
              class="card-slot"
              :class="{
                selected: selectedIndices.has(i),
                disabled: !isMyTurn || ws.room.phase !== 'playing',
                dragging: isDragging
              }"
              :style="getCardStyle(i)"
              @mousedown.prevent="onCardsMouseDown($event, i)"
              @click="onCardClick(i)"
              @touchstart.prevent="onTouchStart($event, i)"
              @touchmove="onTouchMove"
              @touchend="onTouchEnd"
            >
              <CardFace :card="card" :size="cardSize" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 聊天面板 -->
    <div v-if="showChat" class="chat-panel" @click.stop>
      <div class="chat-header">
        <span>房间聊天</span>
        <button class="chat-close" @click="showChat = false">✕</button>
      </div>
      <div class="chat-messages" ref="chatListRef">
        <div v-for="(m, i) in ws.chatMessages.value" :key="i" class="chat-msg"
          :class="{ 'chat-self': m.playerId === ws.playerId.value }">
          <span class="chat-nick">{{ m.nickname }}</span>
          <span class="chat-text">{{ m.text }}</span>
        </div>
        <div v-if="ws.chatMessages.value.length === 0" class="chat-empty">
          暂无消息，发条消息打个招呼吧
        </div>
      </div>
      <div class="chat-input-row">
        <input
          v-model="chatInput"
          class="chat-input"
          placeholder="说点什么..."
          maxlength="100"
          @keydown.enter="onSendChat"
        />
        <button class="chat-send" @click="onSendChat" :disabled="!chatInput.trim()">发送</button>
      </div>
    </div>

    <!-- 等待室聊天按钮 -->
    <button v-if="ws.room.phase === 'waiting' && !showChat" class="btn-chat-waiting" @click="showChat = true">
      💬
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref, watch, onMounted, onUnmounted } from 'vue'
import type { Card } from '@doudizhu/shared'
import CardFace from '../components/CardFace.vue'
import CardItem from '../components/CardItem.vue'
import {
  playSelectSound, playCardSound, playPassSound, playCallSound,
  playLandlordSound, playWinSound, playLoseSound, playDealSound,
  startBgm, stopBgm,
} from '../composables/useSound'

const ws: ReturnType<typeof import('../composables/useWebSocket').useWebSocket> = inject('ws')!

// ===== 响应式屏幕检测 =====
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 600)

function onResize() { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

// ===== Card 尺寸选择 =====
const cardSize = computed(() => isMobile.value ? 'sm' as const : 'lg' as const)
const playedCardSize = computed(() => isMobile.value ? 'xs' as const : 'lg' as const)
const bottomCardSize = computed(() => isMobile.value ? 'sm' as const : 'md' as const)

// ===== 聊天 =====
const showChat = ref(false)
const chatInput = ref('')
const chatListRef = ref<HTMLDivElement | null>(null)

const chatUnreadCount = computed(() => {
  if (showChat.value) return 0
  const pid = ws.playerId.value
  return ws.chatMessages.value.filter(m => m.playerId !== pid).length
})

function onSendChat() {
  const text = chatInput.value.trim()
  if (!text) return
  ws.sendChat(text)
  chatInput.value = ''
  if (!showChat.value) showChat.value = true
}

watch(() => ws.chatMessages.value.length, () => {
  setTimeout(() => {
    if (chatListRef.value) {
      chatListRef.value.scrollTop = chatListRef.value.scrollHeight
    }
  }, 50)
})

// 牌面大小映射
const RANK_ORDER: Record<string, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  'SMALL_JOKER': 16, 'BIG_JOKER': 17,
}
const SUIT_ORDER: Record<string, number> = { spade: 4, heart: 3, club: 2, diamond: 1 }

const sortedCards = computed(() => {
  return [...ws.myCards.value].sort((a, b) => {
    const rankDiff = (RANK_ORDER[b.rank] ?? 0) - (RANK_ORDER[a.rank] ?? 0)
    if (rankDiff !== 0) return rankDiff
    return (SUIT_ORDER[b.suit ?? ''] ?? 0) - (SUIT_ORDER[a.suit ?? ''] ?? 0)
  })
})

const selectedIndices = reactive(new Set<number>())

const players = computed(() => ws.room.state?.players ?? [])
const seatList = computed(() => {
  const p = ws.room.state?.players ?? []
  const seats = []
  for (let i = 0; i < 3; i++) {
    seats.push({ player: p[i] ?? null })
  }
  return seats
})
const playerId = computed(() => ws.playerId.value)
const myName = computed(() => players.value.find(p => p.id === playerId.value)?.nickname ?? '我')
const myIdx = computed(() => players.value.findIndex(p => p.id === playerId.value))

const spotIndices = computed(() => {
  const base = myIdx.value
  if (base === -1) return { top: 1, right: 2 }
  return {
    top: (base + 1) % 3,
    right: (base + 2) % 3,
  }
})

const isMyTurn = computed(() => {
  if (!playerId.value || myIdx.value === -1) return false
  if (ws.room.phase === 'calling') return myIdx.value === ws.currentCallIndex.value
  if (ws.room.phase === 'playing') return myIdx.value === ws.currentPlayerIndex.value
  return false
})

function isPlayerTurn(spotIdx: number): boolean {
  if (ws.room.phase === 'calling') return spotIdx === ws.currentCallIndex.value
  if (ws.room.phase === 'playing') return spotIdx === ws.currentPlayerIndex.value
  return false
}

function isLandlord(id?: string | null) {
  return !!id && id === ws.landlordId.value
}

function getPlayerCardCount(pid: string): number {
  if (pid === playerId.value) return ws.myCards.value.length
  if (ws.playerCardCounts[pid] !== undefined) return ws.playerCardCounts[pid]
  return 0
}

const canPass = computed(() => {
  const lp = ws.lastPlay.value
  return lp && lp.playerId !== playerId.value && lp.cards.length > 0
})

// ===== 叫分&过牌状态显示 =====
const callScoreText = ref<{ idx: number; text: string } | null>(null)
const passDisplayIdx = ref<number | null>(null)

const winnerName = computed(() => {
  return players.value.find(p => p.id === ws.winner.value)?.nickname ?? '未知'
})

let callTimeout: ReturnType<typeof setTimeout> | null = null
let passTimeout: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (callTimeout) { clearTimeout(callTimeout); callTimeout = null }
  if (passTimeout) { clearTimeout(passTimeout); passTimeout = null }
}

watch(() => ws.lastCallScore.value, (cs) => {
  if (!cs) return
  clearTimers()
  const idx = players.value.findIndex(p => p.id === cs.playerId)
  if (idx === -1) return
  const labels = ['不叫', '1分', '2分', '3分']
  callScoreText.value = { idx, text: labels[cs.score] ?? `${cs.score}分` }
  callTimeout = setTimeout(() => { callScoreText.value = null }, 2500)
})

watch(() => ws.lastPassPlayerId.value, (pid) => {
  if (!pid) return
  const idx = players.value.findIndex(p => p.id === pid)
  if (idx === -1) return
  passDisplayIdx.value = idx
  if (passTimeout) clearTimeout(passTimeout)
  passTimeout = setTimeout(() => { passDisplayIdx.value = null }, 2500)
})

watch(() => ws.room.phase, (phase) => {
  if (phase === 'calling') {
    callScoreText.value = null
    passDisplayIdx.value = null
    selectedIndices.clear()
    playDealSound()
    stopBgm()
  }
  if (phase === 'playing') {
    startBgm()
  }
  if (phase === 'ended') {
    stopBgm()
  }
})

// ===== 音效 =====
watch(() => [...selectedIndices], () => {
  if (!isDragging.value && selectedIndices.size > 0) playSelectSound()
})
watch(() => ws.lastPlay.value, (lp) => {
  ws.hintCards.value = []
  if (lp && lp.cards.length > 0 && lp.playerId !== ws.lastPassPlayerId.value) {
    playCardSound()
  }
})
watch(() => ws.lastPassPlayerId.value, (pid) => {
  if (pid) playPassSound()
})
watch(() => ws.lastCallScore.value, (cs) => {
  if (cs) playCallSound(cs.score)
})
watch(() => ws.landlordId.value, (id) => {
  if (id) playLandlordSound()
})
watch(() => ws.winner.value, (id) => {
  if (!id) return
  setTimeout(() => {
    if (id === playerId.value) playWinSound()
    else playLoseSound()
  }, 600)
})

watch(() => ws.roomId.value, (id) => {
  if (!id) stopBgm()
})

// ===== lastPlayDisplay =====
const lastPlayDisplay = computed(() => {
  const lp = ws.lastPlay.value
  if (!lp || lp.cards.length === 0) return null
  const playIdx = players.value.findIndex(p => p.id === lp.playerId)
  if (playIdx === -1) return { cards: lp.cards, direction: 'center', playerName: '', directionArrow: '' }

  let direction = 'center'
  let playerName = players.value[playIdx]?.nickname ?? ''
  let directionArrow = ''

  if (myIdx.value !== -1) {
    if (playIdx === myIdx.value) {
      direction = 'me'
      playerName = players.value[playIdx]?.nickname ?? '我'
      directionArrow = '⬆️'
    } else if (playIdx === (myIdx.value + 1) % 3) {
      direction = 'left'
      directionArrow = '↘️'
    } else {
      direction = 'right'
      directionArrow = '↙️'
    }
  }

  return { cards: lp.cards, direction, playerName, directionArrow }
})

function toggleCard(i: number) {
  if (!isMyTurn.value || ws.room.phase !== 'playing') return
  if (selectedIndices.has(i)) {
    selectedIndices.delete(i)
  } else {
    selectedIndices.add(i)
  }
}

function onPlayCards() {
  const cards = [...selectedIndices].sort((a, b) => a - b).map(i => sortedCards.value[i])
  if (cards.length === 0) return
  ws.playCards(cards)
  selectedIndices.clear()
}

function onHint() {
  ws.getHint()
}

ws.setHintCallback((hint: any[]) => {
  if (!hint || hint.length === 0) return
  selectedIndices.clear()
  const idxs: number[] = []
  const remaining = [...sortedCards.value]
  for (const hc of hint) {
    const found = remaining.findIndex(c => c.rank === hc.rank && (c.suit ?? c.jokerType) === (hc.suit ?? hc.jokerType))
    if (found !== -1) {
      const matchCard = remaining[found]
      remaining.splice(found, 1)
      const origIdx = sortedCards.value.indexOf(matchCard)
      idxs.push(origIdx)
    }
  }
  if (idxs.length === 0 && sortedCards.value.length > 0) {
    idxs.push(0)
  }
  idxs.forEach(i => selectedIndices.add(i))
})

onUnmounted(() => {
  ws.setHintCallback(null)
})

// ===== 触屏支持 =====
let touchStartIdx = -1
let touchActive = false
let touchStartTime = 0
let touchStartPos = { x: 0, y: 0 }

function onTouchStart(e: TouchEvent, cardIdx: number) {
  if (!isMyTurn.value || ws.room.phase !== 'playing') return
  touchStartIdx = cardIdx
  touchActive = true
  touchStartTime = Date.now()
  const touch = e.touches[0]
  touchStartPos = { x: touch.clientX, y: touch.clientY }
  isDragging.value = false
  dragStartIdx.value = cardIdx
  dragEndIdx.value = cardIdx
}

function onTouchMove(e: TouchEvent) {
  if (!touchActive || !cardsContainer.value) return
  e.preventDefault()
  const touch = e.touches[0]
  const dx = touch.clientX - touchStartPos.x
  const dy = touch.clientY - touchStartPos.y
  if (Math.sqrt(dx * dx + dy * dy) < 10) return
  
  isDragging.value = true
  const rect = cardsContainer.value.getBoundingClientRect()
  const x = touch.clientX - rect.left
  const total = sortedCards.value.length
  const { overlap, offset } = calcLayout(total)
  let hoverIdx = Math.round((x - offset - overlap / 2) / overlap)
  hoverIdx = Math.max(0, Math.min(total - 1, hoverIdx))
  if (hoverIdx === dragEndIdx.value) return
  dragEndIdx.value = hoverIdx
  const start = Math.min(dragStartIdx.value, hoverIdx)
  const end = Math.max(dragStartIdx.value, hoverIdx)
  selectedIndices.clear()
  for (let j = start; j <= end; j++) selectedIndices.add(j)
}

function onTouchEnd() {
  if (!touchActive) return
  touchActive = false
  const wasDragging = isDragging.value
  isDragging.value = false
  
  if (!wasDragging && Date.now() - touchStartTime < 200) {
    toggleCard(touchStartIdx)
  }
  
  touchStartIdx = -1
}

// ===== 拖拽多选 =====
const cardsContainer = ref<HTMLDivElement | null>(null)
const isDragging = ref(false)
const dragStartIdx = ref(-1)
const dragEndIdx = ref(-1)

/**
 * 牌布局计算。根据 isMobile 选用不同卡宽（lg=100px, sm=44px）。
 * overlap 受可用宽度约束确保牌不会散太开或挤太紧。
 */
function calcLayout(total: number) {
  if (total === 0) return { overlap: 36, offset: 60 }
  const cardW = isMobile.value ? 44 : 100
  // 可用宽度：桌面 ~560px，手机 ~280px（左右留白）
  const availableW = isMobile.value ? 280 : 560
  const minOverlap = isMobile.value ? 8 : 24
  const maxOverlap = isMobile.value ? 24 : 48
  const overlap = Math.min(maxOverlap, Math.max(minOverlap, availableW / Math.max(total, 1)))
  const offset = isMobile.value ? 16 : 60
  return { overlap, offset }
}

function getCardStyle(i: number) {
  const total = sortedCards.value.length
  const { overlap, offset } = calcLayout(total)
  return {
    left: (i * overlap + offset) + 'px',
    zIndex: i,
  }
}

const cardsContainerStyle = computed(() => {
  const total = sortedCards.value.length
  if (total === 0) return {}
  const { overlap, offset } = calcLayout(total)
  const width = total * overlap + offset * 2
  return { width: width + 'px', minWidth: width + 'px' }
})

function onCardClick(i: number) {
  if (!isMyTurn.value || ws.room.phase !== 'playing') return
  if (touchActive || isDragging.value) return
  toggleCard(i)
}

function onCardsMouseDown(e: MouseEvent, cardIdx: number) {
  if (!isMyTurn.value || ws.room.phase !== 'playing') return
  isDragging.value = true
  dragStartIdx.value = cardIdx
  dragEndIdx.value = cardIdx
}

function onCardsMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const container = cardsContainer.value?.querySelector('.my-cards') as HTMLElement
  if (!container) return

  const rect = container.getBoundingClientRect()
  const x = e.clientX - rect.left
  const total = sortedCards.value.length
  const { overlap, offset } = calcLayout(total)

  let hoverIdx = Math.round((x - offset - overlap / 2) / overlap)
  hoverIdx = Math.max(0, Math.min(total - 1, hoverIdx))

  if (hoverIdx === dragEndIdx.value) return
  dragEndIdx.value = hoverIdx

  selectedIndices.clear()
  const start = Math.min(dragStartIdx.value, dragEndIdx.value)
  const end = Math.max(dragStartIdx.value, dragEndIdx.value)
  for (let i = start; i <= end; i++) {
    selectedIndices.add(i)
  }
}

function onCardsMouseUp() {
  if (!isDragging.value) return
  isDragging.value = false
}

function onCardsMouseLeave() {
  if (isDragging.value) {
    isDragging.value = false
  }
}
</script>

<style scoped>
/* ===== 全局 ===== */
.game-room {
  height: 100%;
  height: 100dvh; /* 动态视口高度，处理手机地址栏 */
  background: radial-gradient(ellipse at center, #1b5936 0%, #0f3d24 40%, #082012 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  overflow: hidden;
}

.bg-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(255,215,0,0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255,100,50,0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}
.bg-glow {
  position: absolute;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: min(600px, 100vw);
  height: 400px;
  background: radial-gradient(ellipse, rgba(255,215,0,0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

/* ===== 等待房间 ===== */
.waiting-room {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  position: relative;
}
.waiting-card {
  background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 20px;
  padding: 40px 36px;
  text-align: center;
  border: 1px solid rgba(255,215,0,0.12);
  box-shadow: 0 16px 48px rgba(0,0,0,0.3);
  max-width: 420px;
  width: min(420px, 92vw);
  box-sizing: border-box;
}
.room-tag {
  font-size: 18px;
  color: #ffd700;
  margin-bottom: 6px;
}
.room-tag strong {
  font-size: 22px;
  letter-spacing: 3px;
}
.waiting-hint {
  color: rgba(255,255,255,0.4);
  font-size: 13px;
  margin-bottom: 24px;
}
.seats {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 28px;
  flex-wrap: wrap; /* 手机端允许换行 */
}
.seat {
  width: 130px;
  height: 150px;
  border: 2px dashed rgba(255,255,255,0.12);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255,255,255,0.03);
  transition: all 0.3s;
  flex-shrink: 0;
}
.seat.occupied {
  border-style: solid;
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05);
}
.seat.owner {
  border-color: rgba(255,215,0,0.3);
}
.seat-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3a7bd5, #2d5aa0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.seat-avatar.is-ai {
  background: linear-gradient(135deg, #667eea, #764ba2);
}
.seat-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.seat-name {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ai-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}
.me-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: #ffd700;
  color: #1a1a2e;
}
.seat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.seat-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: rgba(255,255,255,0.3);
}
.seat-label {
  color: rgba(255,255,255,0.3);
  font-size: 12px;
}
.btn-add-ai {
  padding: 5px 14px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.btn-add-ai:hover {
  background: rgba(255,255,255,0.15);
  color: white;
}
.waiting-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
.btn-start {
  padding: 12px 40px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #f7971e, #ffd200);
  color: #3d2000;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(247,151,30,0.3);
  letter-spacing: 2px;
}
.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(247,151,30,0.4);
}
.btn-leave-waiting {
  padding: 6px 20px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  background: transparent;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.btn-leave-waiting:hover {
  color: rgba(255,255,255,0.7);
  border-color: rgba(255,255,255,0.2);
}

/* ===== 顶部栏 ===== */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%);
  z-index: 10;
}
.room-badge {
  font-size: 13px;
  color: rgba(255,215,0,0.6);
  letter-spacing: 1px;
}
.btn-quit {
  padding: 4px 12px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}
.btn-quit:hover {
  color: #ff6b6b;
  border-color: rgba(255,107,107,0.3);
  background: rgba(255,107,107,0.1);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-chat {
  padding: 4px 10px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.btn-chat:hover, .btn-chat.active {
  color: #64c8ff;
  border-color: rgba(100,200,255,0.3);
  background: rgba(100,200,255,0.1);
}
.btn-chat-waiting {
  position: absolute;
  bottom: 60px;
  right: 60px;
  z-index: 20;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(255,215,0,0.2);
  background: rgba(0,0,0,0.3);
  color: #ffd700;
  font-size: 20px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s;
}
.btn-chat-waiting:hover {
  background: rgba(255,215,0,0.15);
  border-color: rgba(255,215,0,0.4);
}

/* ===== 聊天面板 ===== */
.chat-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  z-index: 50;
  background: linear-gradient(180deg, rgba(15,30,20,0.97), rgba(10,20,15,0.97));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-left: 1px solid rgba(255,215,0,0.1);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease;
}
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 13px;
  font-weight: bold;
  color: #ffd700;
}
.chat-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}
.chat-close:hover { color: #ff6b6b; background: rgba(255,107,107,0.1); }
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.chat-messages::-webkit-scrollbar { width: 3px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
.chat-msg {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.03);
}
.chat-msg.chat-self { align-items: flex-end; background: rgba(100,200,255,0.06); }
.chat-nick {
  font-size: 10px;
  color: rgba(255,215,0,0.5);
  font-weight: 600;
}
.chat-msg.chat-self .chat-nick { color: rgba(100,200,255,0.5); }
.chat-text {
  font-size: 13px;
  color: rgba(255,255,255,0.85);
  word-break: break-word;
  line-height: 1.4;
}
.chat-empty {
  text-align: center;
  color: rgba(255,255,255,0.2);
  font-size: 12px;
  padding: 30px 0;
}
.chat-input-row {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.chat-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  color: white;
  font-size: 12px;
  outline: none;
}
.chat-input::placeholder { color: rgba(255,255,255,0.2); }
.chat-input:focus { border-color: rgba(255,215,0,0.2); }
.chat-send {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #ffd700, #f5a623);
  color: #3d2000;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.chat-send:hover { opacity: 0.85; }
.chat-send:disabled { opacity: 0.3; cursor: not-allowed; }

/* ===== 桌面区域 ===== */
.table-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

/* 底牌 */
.bottom-cards-area {
  position: absolute;
  top: 56px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
}
.bottom-label {
  font-size: 13px;
  color: rgba(255,255,255,0.3);
  margin-right: 4px;
}
.bottom-cards {
  display: flex;
  gap: 6px;
}
.bc-card {
  transition: all 0.5s ease;
  width: 68px;
  height: 98px;
}
.bc-card-back {
  width: 68px;
  height: 98px;
  background: linear-gradient(135deg, #c62828, #8e0000);
  border-radius: 6px;
  border: 1px solid rgba(255,215,0,0.2);
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.bc-card-face {
  width: 68px;
  height: 98px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* === 玩家位置 === */
.player-spot {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.top-spot {
  top: 56px;
  right: 120px;
}
.right-spot {
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
}

.spot-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3a7bd5, #2d5aa0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: bold;
  box-shadow: 0 3px 12px rgba(0,0,0,0.3);
  position: relative;
  transition: all 0.3s;
  border: 2px solid transparent;
}
.spot-avatar.landlord {
  background: linear-gradient(135deg, #ffd700, #f5a623);
  color: #3d2000;
  border-color: #ffd700;
  box-shadow: 0 3px 16px rgba(255,215,0,0.3);
}
.player-spot.active .spot-avatar {
  animation: avatarPulse 1.2s ease-in-out infinite;
  border-color: #ffd700;
}
@keyframes avatarPulse {
  0%, 100% { box-shadow: 0 3px 10px rgba(0,0,0,0.3); }
  50% { box-shadow: 0 3px 20px rgba(255,215,0,0.4); }
}
.crown, .mini-crown {
  position: absolute;
  top: -14px;
  font-size: 16px;
}
.mini-crown {
  top: -10px;
  right: -8px;
  font-size: 12px;
}
.spot-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: rgba(0,0,0,0.3);
  padding: 3px 10px 4px;
  border-radius: 10px;
  min-width: 56px;
}
.spot-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 80px;
}
.spot-name {
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: bold;
  color: rgba(255,255,255,0.9);
}
.spot-tags {
  display: flex;
  align-items: center;
  gap: 3px;
}
.ai-tag {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-weight: 600;
}
.landlord-tag {
  font-size: 14px;
  padding: 1px 8px;
  border-radius: 4px;
  background: #ffd700;
  color: #3d2000;
  font-weight: bold;
}
.farmer-tag {
  font-size: 14px;
  padding: 1px 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.8);
  font-weight: bold;
}
.spot-count {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
}

/* 状态标签 */
.status-tag {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 8px;
  font-weight: bold;
  animation: fadeInUp 0.3s ease;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.call-status {
  background: rgba(255,215,0,0.15);
  color: #ffd700;
  border: 1px solid rgba(255,215,0,0.2);
}
.pass-status {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
}

/* === 中央区 === */
.center-play-area {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 240px;
  min-height: 120px;
}

/* 叫地主 */
.calling-area {
  text-align: center;
}
.call-title {
  font-size: 20px;
  font-weight: bold;
  color: #ffd700;
  margin-bottom: 12px;
  text-shadow: 0 2px 8px rgba(255,215,0,0.2);
}
.call-btns {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.call-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 56px;
}
.call-btn:hover {
  transform: translateY(-2px);
}
.no-call {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
}
.no-call:hover {
  background: rgba(255,255,255,0.15);
}
.one-call {
  background: linear-gradient(135deg, #43a047, #66bb6a);
  color: white;
}
.two-call {
  background: linear-gradient(135deg, #fb8c00, #ffa726);
  color: white;
}
.three-call {
  background: linear-gradient(135deg, #e53935, #ef5350);
  color: white;
  box-shadow: 0 3px 12px rgba(229,57,53,0.3);
}
.call-waiting {
  color: rgba(255,255,255,0.5);
  font-size: 16px;
}

/* 出牌区 */
.playing-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 100px;
}
.played-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  animation: fadeInScale 0.3s ease;
}
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

.played-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 1px 8px rgba(255,215,0,0.3);
  background: rgba(0,0,0,0.45);
  padding: 6px 20px;
  border-radius: 14px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(255,215,0,0.15);
  animation: labelPop 0.3s ease;
}
@keyframes labelPop {
  from { opacity: 0; transform: scale(0.7) translateY(-6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.played-direction {
  font-size: 20px;
  line-height: 1;
}
.played-name {
  color: #fff;
  font-size: 18px;
}

/* 出牌动画 */
.from-left .played-card-wrapper {
  animation: flyFromLeft 0.35s ease both;
}
.from-right .played-card-wrapper {
  animation: flyFromRight 0.35s ease both;
}
.from-me .played-card-wrapper {
  animation: flyFromBottom 0.35s ease both;
}
.from-center .played-card-wrapper {
  animation: cardDrop 0.3s ease both;
}
@keyframes flyFromLeft {
  from { opacity: 0; transform: translateX(-90px) scale(0.6); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes flyFromRight {
  from { opacity: 0; transform: translateX(90px) scale(0.6); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes flyFromBottom {
  from { opacity: 0; transform: translateY(50px) scale(0.6); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.played-cards-row {
  display: flex;
  gap: 2px;
}
.played-card-wrapper {
  animation: cardDrop 0.3s ease both;
}
@keyframes cardDrop {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}

.my-turn-prompt {
  font-size: 14px;
  color: #ffd700;
  animation: pulse 1.5s ease-in-out infinite;
  text-shadow: 0 1px 8px rgba(255,215,0,0.2);
  background: rgba(0,0,0,0.2);
  padding: 4px 16px;
  border-radius: 10px;
}
@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 游戏结束 — fixed 全屏遮罩，干净无黑框 */
.game-result {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.result-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.result-card {
  position: relative;
  background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px 48px;
  text-align: center;
  border: 1px solid rgba(255,215,0,0.15);
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  animation: resultPop 0.5s ease;
}
@keyframes resultPop {
  from { opacity: 0; transform: scale(0.7); }
  to { opacity: 1; transform: scale(1); }
}
.result-icon {
  font-size: 56px;
  margin-bottom: 8px;
  animation: bounce 1.5s ease-in-out infinite;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.result-title {
  font-size: 28px;
  color: #ffd700;
  margin-bottom: 8px;
  text-shadow: 0 2px 12px rgba(255,215,0,0.2);
}
.result-detail {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
  color: rgba(255,255,255,0.6);
  font-size: 13px;
}
.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.btn-replay {
  padding: 12px 36px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #f7971e, #ffd200);
  color: #3d2000;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 16px rgba(247,151,30,0.3);
}
.btn-replay:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(247,151,30,0.4);
}
.btn-leave-result {
  padding: 12px 24px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.6);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-leave-result:hover {
  background: rgba(255,255,255,0.12);
  color: white;
}

/* ===== 我的手牌区 ===== */
.my-area {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: linear-gradient(transparent, rgba(0,0,0,0.7) 25%);
  padding: 12px 20px 16px;
  /* 安全区适配：iPhone 底部手势条 */
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

.my-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  padding: 0 8px;
  position: relative; /* 让 my-actions 可绝对居中 */
}
.my-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00b894, #00cec9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  position: relative;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  border: 2px solid rgba(255,255,255,0.2);
  flex-shrink: 0;
  z-index: 1;
}
.my-avatar.landlord {
  background: linear-gradient(135deg, #ffd700, #f5a623);
  color: #3d2000;
  border-color: #ffd700;
}
.my-info-text {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0; /* 允许收缩 */
}
.my-name {
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.landlord-badge, .farmer-badge {
  font-size: 20px;
  padding: 2px 12px;
  border-radius: 8px;
  font-weight: bold;
  flex-shrink: 0;
}
.landlord-badge {
  background: #ffd700;
  color: #3d2000;
}
.farmer-badge {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
}
.my-count {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  margin-left: 4px;
  flex-shrink: 0;
}

.my-actions {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}
.act-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.act-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.pass-act {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6);
}
.pass-act:hover:not(:disabled) {
  background: rgba(255,255,255,0.15);
  color: white;
}
.play-act {
  background: linear-gradient(135deg, #f7971e, #ffd200);
  color: #3d2000;
  box-shadow: 0 2px 10px rgba(247,151,30,0.3);
}
.play-act:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(247,151,30,0.4);
}
.hint-act {
  background: rgba(100,200,255,0.15);
  color: #64c8ff;
  border: 1px solid rgba(100,200,255,0.2);
}
.hint-act:hover {
  background: rgba(100,200,255,0.25);
}

/* 错误提示 */
.error-toast {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(229,57,53,0.9);
  color: white;
  padding: 4px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: bold;
  white-space: nowrap;
  z-index: 30;
  animation: toastFade 2s ease forwards;
  pointer-events: none;
}
@keyframes toastFade {
  0% { opacity: 0; transform: translateX(-50%) translateY(8px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  80% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
}

/* 手牌容器 */
.my-cards-container {
  overflow-x: auto;
  overflow-y: visible;
  padding: 4px 0;
  -webkit-overflow-scrolling: touch;
}
.my-cards-container::-webkit-scrollbar {
  height: 4px;
}
.my-cards-container::-webkit-scrollbar-track {
  background: transparent;
}
.my-cards-container::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
}
/* 手牌区高度: 桌面 lg=144px+36px 抬起=180→190px; 手机 sm=64px+14px 抬起=78→90px */
.my-cards {
  position: relative;
  height: 190px;
  min-width: 100%;
}
.card-slot {
  position: absolute;
  bottom: 0;
  cursor: pointer;
  transition: transform 0.15s ease, bottom 0.15s ease;
}
.card-slot:hover {
  transform: translateY(-12px);
  z-index: 999;
}
.card-slot.selected {
  transform: translateY(-36px);
}
.card-slot.disabled {
  cursor: default;
}
.card-slot.disabled:hover {
  transform: none;
}

/* ===== 手机端适配 ===== */
@media (max-width: 600px) {
  .game-room { font-size: 12px; }

  /* 背景光晕不溢出 */
  .bg-glow { width: 100vw; }

  /* 玩家头像 */
  .spot-avatar {
    width: 40px; height: 40px; font-size: 16px;
  }
  .crown { font-size: 12px; top: -10px; }
  .spot-info { padding: 2px 6px 3px; min-width: auto; }
  .spot-name { font-size: 11px; max-width: 50px; }
  .spot-tags { gap: 2px; }
  .landlord-tag, .farmer-tag { font-size: 11px; padding: 0 5px; }
  .ai-tag { font-size: 9px; padding: 0 4px; }
  .spot-count { font-size: 11px; }

  /* 座位位置：对手统一右对齐靠边，底牌左移平衡视觉 */
  .top-spot { top: 48px; right: 4px; }
  .right-spot { right: 4px; }
  /* 让 spot 内部也右对齐 */
  .top-spot, .right-spot { align-items: flex-end; }

  /* 底牌：使用 sm 尺寸 (44×64)，容器匹配，左移平衡右对齐的对手 */
  .bottom-cards-area { top: 48px; gap: 5px; left: 45%; }
  .bottom-label { font-size: 10px; }
  .bc-card { width: 44px; height: 64px; }
  .bc-card-back { width: 44px; height: 64px; border-radius: 4px; }
  .bc-card-face { width: 44px; height: 64px; }
  .bottom-cards { gap: 3px; }

  /* 顶部栏 */
  .top-bar { height: 36px; padding: 0 10px; }
  .room-badge { font-size: 11px; }
  .btn-quit { font-size: 10px; padding: 3px 8px; }
  .btn-chat { font-size: 10px; padding: 3px 8px; }

  /* 我的手牌区 */
  .my-area { padding: 8px 10px 12px; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
  .my-avatar { width: 38px; height: 38px; font-size: 15px; }
  .my-bar { gap: 6px; margin-bottom: 4px; position: static; flex-wrap: wrap; }
  .my-name { font-size: 12px; max-width: 60px; }
  .landlord-badge, .farmer-badge { font-size: 13px; padding: 1px 8px; }
  .my-count { font-size: 11px; }
  /* 手机端恢复 flex 布局，不居中 */
  .my-actions { position: static; transform: none; left: auto; gap: 5px; flex-shrink: 0; }

  /* 操作按钮：紧凑 */
  .act-btn {
    padding: 8px 10px; font-size: 11px; min-height: 34px;
    border-radius: 8px;
  }
  .hint-act { padding: 8px 8px; }

  /* 手牌容器：sm 卡牌 44×64，选中抬起 14px */
  .my-cards { height: 90px; }
  .my-cards-container { padding: 0; }
  .card-slot.selected { transform: translateY(-14px); }
  .card-slot:hover { transform: none; z-index: auto; }
  .card-slot.selected:hover { transform: translateY(-14px); }

  /* 出牌区：xs 卡牌 40×58，定宽容器+overflow 实现重叠，flex-wrap 支持换行 */
  .played-cards-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0;
    row-gap: 6px; /* 换行后行间距 */
  }
  .played-card-wrapper {
    width: 32px;        /* 8张≈256px，超出自动换行 */
    overflow: visible;  /* 40px 卡牌溢出 8px，形成自然重叠 */
    flex-shrink: 0;
  }
  /* 去掉负 margin，改用 overflow 实现重叠，避免换行时第二行错位 */

  /* 中央区 */
  .center-play-area { min-width: 160px; min-height: 80px; }
  .call-title { font-size: 16px; }
  .call-btn { padding: 8px 12px; font-size: 12px; min-width: 44px; }
  .call-waiting { font-size: 13px; }
  .my-turn-prompt { font-size: 12px; padding: 3px 12px; }

  /* 出牌标签缩小 */
  .played-label {
    font-size: 16px;
    padding: 4px 12px;
    gap: 4px;
  }
  .played-direction { font-size: 14px; }
  .played-name { font-size: 13px; }

  /* 结果卡 */
  .result-card {
    padding: 24px 20px; max-width: 85vw; box-sizing: border-box;
  }
  .result-icon { font-size: 40px; }
  .result-title { font-size: 20px; }
  .result-detail { font-size: 11px; gap: 8px; flex-wrap: wrap; }
  .result-actions { gap: 8px; flex-wrap: wrap; }
  .btn-replay { padding: 10px 24px; font-size: 14px; }
  .btn-leave-result { padding: 10px 18px; font-size: 12px; }

  /* 等待房间 */
  .waiting-card {
    padding: 20px 14px; box-sizing: border-box;
    width: min(340px, 92vw);
  }
  .room-tag { font-size: 14px; }
  .room-tag strong { font-size: 18px; }
  .btn-start { padding: 10px 30px; font-size: 14px; }
  .seats { gap: 8px; }
  .seat { width: 90px; height: 120px; }
  .seat-avatar { width: 36px; height: 36px; font-size: 16px; }
  .seat-name { font-size: 12px; }
  .btn-add-ai { font-size: 11px; padding: 4px 10px; }

  /* 聊天面板：手机端最多占 85vw，不完全遮挡游戏 */
  .chat-panel { width: min(280px, 85vw); }
  .btn-chat-waiting { bottom: 30px; right: 20px; width: 38px; height: 38px; font-size: 16px; }
}
</style>
