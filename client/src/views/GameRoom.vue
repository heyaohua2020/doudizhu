<template>
  <div class="game-room">
    <!-- 等待房间 -->
    <div v-if="ws.room.phase === 'waiting'" class="waiting-room">
      <div class="waiting-header">
        <h2>房间号: {{ ws.roomId.value }}</h2>
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
            <div class="seat-avatar">{{ seat.player.nickname.charAt(0) }}</div>
            <div class="seat-name">
              {{ seat.player.nickname }}
              <span v-if="seat.player.aiControlled" class="ai-badge">AI</span>
              <span v-if="seat.player.id === ws.playerId.value" class="me-badge">你</span>
            </div>
            <div v-if="seat.player.id === ws.room.state?.owner" class="owner-badge">房主</div>
          </template>
          <template v-else>
            <div class="seat-empty">
              <span class="seat-label">空位</span>
              <button
                v-if="ws.playerId.value === ws.room.state?.owner"
                class="btn-add-ai"
                @click="ws.addAi()"
              >
                +AI
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
          开始游戏
        </button>
      </div>
    </div>

    <template v-if="ws.room.phase !== 'waiting'">
    <!-- 其他玩家 -->
    <div class="player-top">
      <div class="player-info">
        <div class="avatar" :class="{ landlord: isLandlord(players[1]?.id) }">P2</div>
        <span class="name">{{ players[1]?.nickname ?? '等待中...' }}<span v-if="players[1]?.aiControlled" class="ai-badge">AI</span></span>
        <span v-if="isLandlord(players[1]?.id)" class="badge">地主</span>
        <span class="card-count">{{ players[1] ? '×' + remainingCards(players[1].id) : '' }}</span>
      </div>
    </div>

    <div class="player-side">
      <div class="player-info">
        <div class="avatar" :class="{ landlord: isLandlord(players[2]?.id) }">P3</div>
        <span class="name">{{ players[2]?.nickname ?? '等待中...' }}<span v-if="players[2]?.aiControlled" class="ai-badge">AI</span></span>
        <span v-if="isLandlord(players[2]?.id)" class="badge">地主</span>
        <span class="card-count">{{ players[2] ? '×' + remainingCards(players[2].id) : '' }}</span>
      </div>
    </div>

    <!-- 底牌 -->
    <div v-if="ws.landlordId.value" class="bottom-cards">
      <div
        v-for="(card, i) in ws.bottomCards.value"
        :key="i"
        class="card back"
      ></div>
    </div>

    <!-- 上家出牌 -->
    <div v-if="lastPlayDisplay && lastPlayDisplay.pos === 'left'" class="played-cards left">
      <CardItem v-for="(c, i) in lastPlayDisplay.cards" :key="i" :card="c" :small="true" />
    </div>

    <!-- 上家出牌（右侧玩家） -->
    <div v-if="lastPlayDisplay && lastPlayDisplay.pos === 'right'" class="played-cards right">
      <CardItem v-for="(c, i) in lastPlayDisplay.cards" :key="i" :card="c" :small="true" />
    </div>

    <!-- 中间提示 -->
    <div class="center-info" v-if="ws.room.phase === 'calling' && isMyTurn">
      <p class="phase-title">叫地主</p>
      <div class="call-btns">
        <button v-if="canCall(0)" class="call-btn" @click="ws.callScore(0)">不叫</button>
        <button v-if="canCall(1)" class="call-btn" @click="ws.callScore(1)">1分</button>
        <button v-if="canCall(2)" class="call-btn" @click="ws.callScore(2)">2分</button>
        <button v-if="canCall(3)" class="call-btn highlight" @click="ws.callScore(3)">3分</button>
      </div>
    </div>

    <div v-else-if="ws.room.phase === 'calling'" class="center-info">
      <p class="phase-title">叫地主中...</p>
    </div>

    <div v-if="isMyTurn && ws.room.phase === 'playing'" class="play-info">
      请出牌
    </div>

    <!-- 游戏结束 -->
    <div v-if="ws.winner.value" class="game-over-overlay">
      <div class="game-over-card">
        <h2>游戏结束</h2>
        <p class="winner-name">{{ winnerName }} 获胜！</p>
        <p class="bomb-info">炸弹 × {{ ws.bombsCount.value }}</p>
        <button class="btn-back" @click="ws.leaveRoom()">返回大厅</button>
      </div>
    </div>

    <!-- 房间号 -->
    <div class="room-id-bar">
      房间号: {{ ws.roomId.value }}
      <button class="btn-leave" @click="ws.leaveRoom()">退出</button>
    </div>

    <!-- 我的手牌 -->
    <div class="my-area">
      <div class="my-info">
        <div class="avatar me" :class="{ landlord: isLandlord(playerId) }">
          {{ ws.playerId.value?.slice(-2) ?? '我' }}
        </div>
        <span class="name">{{ myName }}</span>
        <span v-if="isLandlord(playerId)" class="badge">地主</span>
        <template v-if="ws.room.phase === 'playing' && isMyTurn">
          <button class="action-btn play-btn" @click="onPlayCards">出牌</button>
          <button class="action-btn pass-btn" @click="ws.playCards([])">不要</button>
        </template>
        <button v-if="ws.room.phase === 'ended'" class="action-btn" @click="ws.leaveRoom()">返回大厅</button>
      </div>

      <div class="my-cards">
        <div
          v-for="(card, i) in ws.myCards.value"
          :key="`${card.rank}-${card.suit}-${i}`"
          class="card-wrapper"
          :class="{ selected: selectedIndices.has(i) }"
          :style="{ left: i * 28 + 'px', zIndex: i }"
          @click="toggleCard(i)"
        >
          <CardFace :card="card" />
        </div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref } from 'vue'
import type { Card } from '@doudizhu/shared'
import CardFace from '../components/CardFace.vue'
import CardItem from '../components/CardItem.vue'

const ws: ReturnType<typeof import('../composables/useWebSocket').useWebSocket> = inject('ws')!

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
const isMyTurn = computed(() => {
  if (!playerId.value) return false
  if (ws.room.phase === 'calling') {
    const idx = players.value.findIndex(p => p.id === playerId.value)
    return idx === ws.currentCallIndex.value
  }
  if (ws.room.phase === 'playing') {
    const idx = players.value.findIndex(p => p.id === playerId.value)
    return idx === ws.currentPlayerIndex.value
  }
  return false
})

function isLandlord(id?: string) {
  return !!id && id === ws.landlordId.value
}

function remainingCards(id: string) {
  if (id === playerId.value) return ws.myCards.value.length
  // 对其他玩家，我们从 lastPlay 的 remaining 获取
  return '?'
}

const winnerName = computed(() => {
  return players.value.find(p => p.id === ws.winner.value)?.nickname ?? '未知'
})

function canCall(score: number): boolean {
  return isMyTurn.value && ws.room.phase === 'calling'
}

// 构建 lastPlayDisplay 以确定显示位置
const lastPlayDisplay = computed(() => {
  const lp = ws.lastPlay.value
  if (!lp) return null
  const idx = players.value.findIndex(p => p.id === lp.playerId)
  if (idx === -1) return null
  const myIdx = players.value.findIndex(p => p.id === playerId.value)
  // pos 0=my, 1=left, 2=right from my perspective (I'm at index 0 in display)
  // Actually the display order is: top(1), side(2), me(0)
  // top is left of me from my perspective
  if (myIdx === -1) return { cards: lp.cards, pos: 'left' }
  if (idx === (myIdx + 1) % 3) return { cards: lp.cards, pos: 'left' }
  if (idx === (myIdx + 2) % 3) return { cards: lp.cards, pos: 'right' }
  return null
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
  const cards = [...selectedIndices].sort((a, b) => a - b).map(i => ws.myCards.value[i])
  if (cards.length === 0) return
  ws.playCards(cards)
  selectedIndices.clear()
}
</script>

<style scoped>
.game-room {
  height: 100%;
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
}

/* 玩家位置 */
.player-top {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}
.player-side {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}
.player-info {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.3);
  padding: 6px 12px;
  border-radius: 20px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3a7bd5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}
.avatar.landlord { background: linear-gradient(135deg, #ffd700, #f5a623); color: #1a1a2e; }
.avatar.me { width: 40px; height: 40px; background: #00b894; }
.badge {
  font-size: 10px;
  background: #ffd700;
  color: #1a1a2e;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: bold;
}
.card-count {
  font-size: 13px;
  color: #ccc;
}

/* 底牌 */
.bottom-cards {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
}
.card.back {
  width: 40px;
  height: 58px;
  background: linear-gradient(135deg, #2d3436, #636e72);
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.2);
}

/* 出牌显示 */
.played-cards {
  position: absolute;
  display: flex;
  gap: 2px;
}
.played-cards.left { top: 50%; left: 15%; transform: translateY(-50%); }
.played-cards.right { top: 50%; right: 15%; transform: translateY(-50%); }

/* 中间信息 */
.center-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
.phase-title { font-size: 18px; margin-bottom: 12px; }
.call-btns { display: flex; gap: 8px; }
.call-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: white;
  cursor: pointer;
  font-size: 14px;
}
.call-btn.highlight {
  background: linear-gradient(135deg, #ffd700, #f5a623);
  color: #1a1a2e;
  font-weight: bold;
  border-color: #ffd700;
}
.play-info {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 16px;
  color: #ffd700;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 游戏结束 */
.game-over-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.game-over-card {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 36px 48px;
  text-align: center;
}
.game-over-card h2 { font-size: 28px; color: #ffd700; margin-bottom: 12px; }
.winner-name { font-size: 20px; margin-bottom: 8px; }
.bomb-info { color: #ff6b6b; margin-bottom: 20px; }
.btn-back {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ffd700, #f5a623);
  color: #1a1a2e;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

/* 房间号 */
.room-id-bar {
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 12px;
  color: #aaa;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-leave {
  padding: 4px 10px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  background: transparent;
  color: #aaa;
  cursor: pointer;
  font-size: 11px;
}

/* 我的手牌区 */
.my-area {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 24px 16px;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
}
.my-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-left: 8px;
}
.action-btn {
  padding: 5px 14px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: white;
  cursor: pointer;
  font-size: 13px;
}
.action-btn.play-btn {
  background: linear-gradient(135deg, #00b894, #00cec9);
  border-color: #00b894;
  color: white;
  font-weight: bold;
}
.action-btn.pass-btn {
  background: rgba(255,107,107,0.2);
  border-color: #ff6b6b;
  color: #ff6b6b;
}
.my-cards {
  position: relative;
  height: 100px;
  display: flex;
  align-items: flex-end;
  padding-left: 28px;
}
.card-wrapper {
  position: absolute;
  bottom: 0;
  cursor: pointer;
  transition: transform 0.15s;
}
.card-wrapper.selected {
  transform: translateY(-20px);
}

/* 等待房间 */
.waiting-room {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
}
.waiting-header { text-align: center; }
.waiting-header h2 { font-size: 22px; color: #ffd700; margin-bottom: 8px; }
.waiting-hint { color: #aaa; font-size: 14px; }
.seats { display: flex; gap: 24px; }
.seat {
  width: 140px;
  height: 160px;
  border: 2px dashed rgba(255,255,255,0.2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255,255,255,0.05);
}
.seat.occupied { border-style: solid; border-color: rgba(255,255,255,0.3); }
.seat.owner { border-color: #ffd700; }
.seat-avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: #3a7bd5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px; font-weight: bold;
}
.seat-name { font-size: 14px; }
.seat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.seat-label { color: #666; font-size: 13px; }
.btn-add-ai {
  padding: 6px 16px;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: white;
  cursor: pointer;
  font-size: 13px;
}
.btn-add-ai:hover { background: rgba(255,255,255,0.2); }
.waiting-actions { display: flex; gap: 12px; }
.btn-start {
  padding: 10px 32px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #ffd700, #f5a623);
  color: #1a1a2e;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}
.btn-start:hover { opacity: 0.9; }
</style>
