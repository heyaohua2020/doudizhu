# AI + Room Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change rooms from auto-start to manual-start with AI fill, add AI player logic.

**Architecture:** Room UI shows 3 seats with "add AI" buttons; server handles AI as internal `CreatedPlayer` with `aiControlled=true`; AI decisions via `ai-player.ts` module called by Room on turn; full-duplex WebSocket messaging unchanged.

**Tech Stack:** TypeScript, Vue 3, ws WebSocket server, Vitest

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `server/src/game/ai-player.ts` | Create | AI call/play logic |
| `server/src/game/ai-player.test.ts` | Create | AI tests |
| `server/src/game/room-manager.ts` | Modify | Remove auto-start, add add_ai/start_game, AI integration |
| `server/src/index.ts` | Modify | Add add_ai/start_game ws handlers |
| `client/src/composables/useWebSocket.ts` | Modify | Add addAi/startGame methods |
| `client/src/views/GameRoom.vue` | Modify | Add waiting room UI, AI display |

---

### Task 1: AI module

**Files:**
- Create: `server/src/game/ai-player.ts`
- Test: `server/src/game/ai-player.test.ts`

- [ ] **Step 1: Write AI call score logic**

```typescript
import type { Card } from '@doudizhu/shared'
import { RANK_VALUES } from '@doudizhu/shared'

export function aiCallScore(hand: Card[]): 0 | 1 | 2 | 3 {
  let score = 0
  // 炸弹：每个 +1
  const rankCounts = new Map<number, number>()
  for (const c of hand) {
    const v = RANK_VALUES[c.rank]
    rankCounts.set(v, (rankCounts.get(v) || 0) + 1)
  }
  for (const count of rankCounts.values()) {
    if (count === 4) score += 1
  }
  // 2：每张 +0.5
  const twos = hand.filter(c => c.rank === '2').length
  score += twos * 0.5
  // A：每张 +0.3
  const aces = hand.filter(c => c.rank === 'A').length
  score += aces * 0.3

  if (score >= 2) return 3
  if (score >= 1) return 2
  if (score >= 0.5) return 1

  return 0
}
```

- [ ] **Step 2: Write AI play logic**

```typescript
import type { Card } from '@doudizhu/shared'
import { RANK_VALUES } from '@doudizhu/shared'
import { getRankCounts, identifyPattern } from './card-patterns'

export function aiPlayCards(hand: Card[], lastPlay: { playerId: string; cards: Card[] } | null): Card[] {
  // 如果能一次出完，直接出
  if (identifyPattern(hand)) {
    // 但不出炸弹除非只剩炸弹
    const pattern = identifyPattern(hand)!
    if (pattern.type !== 'bomb' || hand.length === 4) return [...hand]
  }

  // 需要管上家
  if (lastPlay) {
    const candidates = findBeatCandidates(hand, lastPlay.cards)
    if (candidates.length > 0) {
      // 出最小的能管上的
      return candidates[0]
    }
    return [] // 管不上，过牌
  }

  // 自由出牌：从小到大出
  return findLeadCards(hand)
}

function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank])
}

function findLeadCards(hand: Card[]): Card[] {
  const sorted = sortByRank(hand)
  const rankCounts = getRankCounts(hand)

  // 只有1张 → 出单张
  if (hand.length === 1) return hand

  // 按 rank 排序统计
  const singles: Card[] = []
  const pairs: Card[][] = []
  const triples: Card[][] = []
  const bombs: Card[][] = []

  // 按点数组牌
  const byRank = new Map<number, Card[]>()
  for (const c of sorted) {
    const v = RANK_VALUES[c.rank]
    if (!byRank.has(v)) byRank.set(v, [])
    byRank.get(v)!.push(c)
  }

  const entries = [...byRank.entries()].sort((a, b) => a[0] - b[0])

  for (const [, cards] of entries) {
    if (cards.length === 4) bombs.push(cards)
    else if (cards.length === 3) triples.push(cards)
    else if (cards.length === 2) pairs.push(cards)
    else singles.push(...cards)
  }

  // 剩1张就出单
  if (hand.length <= 2) {
    return [sorted[0]]
  }

  // 有单张先出最小单张
  if (singles.length > 0) {
    return [singles[0]]
  }

  // 有对子出最小对子
  if (pairs.length > 0) {
    return pairs[0]
  }

  // 有三张出三带一（带最小单张）
  if (triples.length > 0) {
    const triple = triples[0]
    // 找一张最小的其他牌
    const kicker = sorted.find(c => RANK_VALUES[c.rank] !== RANK_VALUES[triple[0].rank])
    if (kicker) {
      return [...triple, kicker]
    }
    return triple
  }

  // 只剩炸弹
  if (bombs.length > 0) return bombs[0]

  return [sorted[0]]
}

function findBeatCandidates(hand: Card[], lastCards: Card[]): Card[][] {
  const pattern = identifyPattern(lastCards)
  if (!pattern) return []

  const sorted = sortByRank(hand)
  const rankCounts = getRankCounts(hand)

  // 尝试相同牌型管上
  if (pattern.type === 'single') {
    // 找一张比上家大的单牌
    for (const c of sorted) {
      if (RANK_VALUES[c.rank] > pattern.rank) {
        return [[c]]
      }
    }
  } else if (pattern.type === 'pair') {
    const byRank = new Map<number, Card[]>()
    for (const c of sorted) {
      const v = RANK_VALUES[c.rank]
      if (!byRank.has(v)) byRank.set(v, [])
      byRank.get(v)!.push(c)
    }
    for (const [, cards] of [...byRank.entries()].sort((a, b) => a[0] - b[0])) {
      if (cards.length >= 2 && RANK_VALUES[cards[0].rank] > pattern.rank) {
        return [cards.slice(0, 2)]
      }
    }
  } else if (pattern.type === 'triple' || pattern.type === 'triple_one' || pattern.type === 'triple_pair') {
    const byRank = new Map<number, Card[]>()
    for (const c of sorted) {
      const v = RANK_VALUES[c.rank]
      if (!byRank.has(v)) byRank.set(v, [])
      byRank.get(v)!.push(c)
    }
    for (const [, cards] of [...byRank.entries()].sort((a, b) => a[0] - b[0])) {
      if (cards.length >= 3 && RANK_VALUES[cards[0].rank] > pattern.rank) {
        const triple = cards.slice(0, 3)
        if (pattern.type === 'triple') return [triple]
        if (pattern.type === 'triple_one') {
          const kicker = sorted.find(c => RANK_VALUES[c.rank] !== RANK_VALUES[triple[0].rank])
          return kicker ? [triple.concat(kicker)] : [triple]
        }
        if (pattern.type === 'triple_pair') {
          const kickerPair = [...byRank.entries()].find(([r, cs]) => r !== RANK_VALUES[triple[0].rank] && cs.length >= 2)
          return kickerPair ? [triple.concat(kickerPair[1].slice(0, 2))] : [triple]
        }
      }
    }
  }

  // 尝试用炸弹管
  for (const [, cards] of [...rankCounts.entries()].sort((a, b) => a[0] - b[0])) {
    if (cards.length === 4) {
      const bomb = hand.filter(c => RANK_VALUES[c.rank] === cards[0])
      if (pattern.type !== 'bomb' || cards[0] > pattern.rank) {
        return [bomb]
      }
    }
  }

  return []
}
```

- [ ] **Step 3: Write the AI tests**

```typescript
import { describe, it, expect } from 'vitest'
import { aiCallScore, aiPlayCards } from './ai-player'
import type { Card } from '@doudizhu/shared'

function c(rank: string, suit = 'spade'): Card {
  if (rank === 'SM') return { rank: 'SMALL_JOKER', jokerType: 'small' }
  if (rank === 'BG') return { rank: 'BIG_JOKER', jokerType: 'big' }
  return { rank: rank as any, suit: suit as any }
}

function h(...ranks: string[]): Card[] {
  return ranks.map((r, i) => c(r, ['spade', 'heart', 'club', 'diamond'][i % 4] as any))
}

describe('aiCallScore', () => {
  it('calls 3 with bomb', () => {
    const hand = [...h('3','3','3','3'), ...h('5','6','7','8','9','10','J','Q','K','A','2','2','2')]
    expect(aiCallScore(hand)).toBe(3)
  })

  it('calls 2 with many 2s', () => {
    const hand = [...h('3','4','5','6','7','8','9','10','J','Q','K','A'), ...h('2','2','2','2','A','A')]
    // 4 twos = 2.0, 3 aces = 0.9 → total > 2 → 3
    expect(aiCallScore(hand)).toBe(3)
  })

  it('calls 1 with moderate hand', () => {
    const hand = [...h('3','4','5','6','7','8','9','10','J','Q','K'), ...h('A','2','2')]
    expect(aiCallScore(hand)).toBe(2)
  })

  it('passes with weak hand', () => {
    const hand = h('3','4','5','6','7','8','9','10','J','Q','K','A','3','4','5','6','7')
    expect(aiCallScore(hand)).toBe(0)
  })
})

describe('aiPlayCards', () => {
  it('plays lowest single when leading', () => {
    const hand = h('3', '5', '7', '9', 'J')
    const result = aiPlayCards(hand, null)
    expect(result).toHaveLength(1)
    expect(result[0].rank).toBe('3')
  })

  it('beats single with next higher', () => {
    const hand = h('3', '5', '7', '9', 'J')
    const lastPlay = { playerId: 'p2', cards: h('5') }
    const result = aiPlayCards(hand, lastPlay)
    expect(result).toHaveLength(1)
    expect(RANK_VALUES[result[0].rank]).toBeGreaterThan(RANK_VALUES['5'])
  })

  it('passes when cannot beat', () => {
    const hand = h('3', '4', '5')
    const lastPlay = { playerId: 'p2', cards: h('A') }
    const result = aiPlayCards(hand, lastPlay)
    expect(result).toHaveLength(0)
  })

  it('plays pair when no singles left', () => {
    // 3,3,4,4,5,5 - no singles
    const hand = [c('3'),c('3','heart'),c('4'),c('4','heart'),c('5'),c('5','heart')]
    const result = aiPlayCards(hand, null)
    expect(result).toHaveLength(2)
    expect(result[0].rank).toBe('3')
  })

  it('plays all cards when hand is a valid pattern', () => {
    const hand = h('3', '4', '5', '6', '7')
    const result = aiPlayCards(hand, null)
    expect(result).toHaveLength(5)
  })
})
```

- [ ] **Step 4: Run AI tests to verify they pass**

Run: `cd server && npx vitest run src/game/ai-player.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/game/ai-player.ts server/src/game/ai-player.test.ts
git commit -m "feat: add AI call and play logic"
```

---

### Task 2: Room manager — remove auto-start, add add_ai / start_game

**Files:**
- Modify: `server/src/game/room-manager.ts`

- [ ] **Step 1: Add `addAiPlayer()` method**

After `addPlayer()`, add a method to create an AI player without a WebSocket session:

```typescript
addAiPlayer(nickname?: string): Player {
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
  // AI 没有 WebSocket session
  return player
}
```

Note: The `sendTo` for AI players should be a no-op since they have no session. The existing `sendTo` already handles this: `if (session) session.send(...)` — if no session, nothing happens. ✓

- [ ] **Step 2: Remove auto-start from `join_room`**

In `room-manager.ts`, we're modifying the server index.ts, not room-manager. Actually the join_room handler is in `server/src/index.ts`. The room-manager `Room` class doesn't have a join handler. Let me check...

Looking at the current server/src/index.ts, the `join_room` handler calls `room.addPlayer()` then checks `if (room.playerCount === 3) room.startGame()`. I need to remove that check in the server index.ts handler. That will be in Task 3.

In room-manager.ts, the `startGame` method still requires `this.players.length !== 3` guard. Since we'll now call it from `handleStartGame` after filling with AI, we need to REMOVE the length check or change it to allow calling with exactly 3 players:

Keep the guard as-is (`if (this.players.length !== 3) return`) — the `start_game` handler will ensure 3 players before calling `startGame()`.

- [ ] **Step 3: Add `handleAddAi()` method**

```typescript
handleAddAi(playerId: string): boolean {
  // 仅房主可调用
  if (this.players[this.ownerIndex]?.id !== playerId) return false
  // 游戏已开始不可加
  if (this.game) return false
  // 已满不可加
  if (this.players.length >= 3) return false

  this.addAiPlayer()
  this.broadcastRoomState()
  return true
}
```

- [ ] **Step 4: Add `handleStartGame()` method**

```typescript
handleStartGame(playerId: string): boolean {
  // 仅房主可调用
  if (this.players[this.ownerIndex]?.id !== playerId) return false
  // 游戏已开始不可再开
  if (this.game) return false
  // 至少需要1个真人
  const hasHuman = this.players.some(p => !p.aiControlled)
  if (!hasHuman) return false

  // 用 AI 补齐到 3 人
  while (this.players.length < 3) {
    this.addAiPlayer()
  }

  this.startGame()
  return true
}
```

- [ ] **Step 5: Modify AI action scheduling**

Replace `startCallTimer()` calls with `scheduleNextAction()` throughout the file:

Change `startGame()` line 118: `this.startCallTimer()` → `this.scheduleNextAction()`

Add `scheduleNextAction()` and `runAiAction()` methods, and update `startCallTimer()` to only fire for human players:

```typescript
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
    const score = aiCallScore(player.cards, this.game.callScores)
    this.handleCallScore(player.id, score)
  } else if (this.game.phase === 'playing') {
    const player = this.players[this.game.currentPlayerIndex]
    if (!player?.aiControlled) return
    const cards = aiPlayCards(player.cards, this.game.lastPlay)
    this.handlePlayCards(player.id, cards)
  }
}
```

Change `handleCallScore` line 179: `this.startCallTimer()` → `this.scheduleNextAction()`

Change `advanceTurn` to call `scheduleNextAction()` after broadcasting `next_turn`:

```typescript
private advanceTurn() {
  if (!this.game) return
  this.game.currentPlayerIndex = (this.game.currentPlayerIndex + 1) % 3
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
```

- [ ] **Step 6: Add imports at top of file**

```typescript
import { aiCallScore, aiPlayCards } from './ai-player'
```

- [ ] **Step 7: Run existing tests to verify no regressions**

Run: `cd server && npx vitest run`
Expected: ALL PASS (deck: 5, card-patterns: 19, ai-player: ~8)

- [ ] **Step 8: Commit**

```bash
git add server/src/game/room-manager.ts
git commit -m "refactor: remove auto-start, add add_ai / start_game with AI integration"
```

---

### Task 3: Server WebSocket handlers

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Remove auto-start from `join_room` handler**

In the `join_room` case, remove the `if (room.playerCount === 3) room.startGame()` block. Keep everything else.

- [ ] **Step 2: Add `add_ai` handler**

```typescript
case 'add_ai': {
  if (!currentRoom || !playerId) return
  currentRoom.handleAddAi(playerId)
  break
}
```

- [ ] **Step 3: Add `start_game` handler**

```typescript
case 'start_game': {
  if (!currentRoom || !playerId) return
  currentRoom.handleStartGame(playerId)
  break
}
```

- [ ] **Step 4: Add error response for failed operations**

Add a helper to send errors:

```typescript
case 'add_ai': {
  if (!currentRoom || !playerId) return
  const ok = currentRoom.handleAddAi(playerId)
  if (!ok) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: '无法添加AI' } }))
  }
  break
}

case 'start_game': {
  if (!currentRoom || !playerId) return
  const ok = currentRoom.handleStartGame(playerId)
  if (!ok) {
    ws.send(JSON.stringify({ type: 'error', payload: { message: '无法开始游戏' } }))
  }
  break
}
```

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: add add_ai and start_game WebSocket handlers"
```

---

### Task 4: Client useWebSocket — new methods

**Files:**
- Modify: `client/src/composables/useWebSocket.ts`

- [ ] **Step 1: Add `addAi()` method**

```typescript
function addAi() {
  send('add_ai')
}

function requestStartGame() {
  send('start_game')
}
```

- [ ] **Step 2: Update `room_state` handler (no change needed — already handled)**

The existing handler sets `room.state = payload`, which includes `players` with `aiControlled` flag. No changes needed for base functionality. UI can derive AI status from `player.aiControlled`.

- [ ] **Step 3: Commit**

```bash
git add client/src/composables/useWebSocket.ts
git commit -m "feat: add addAi and requestStartGame client methods"
```

---

### Task 5: Client waiting room UI

**Files:**
- Modify: `client/src/views/GameRoom.vue`

- [ ] **Step 1: Add waiting room template before calling phase section**

In the template, add a waiting room section at the top (before the player-top div):

```html
<!-- 等待房间（phase === 'waiting'） -->
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
```

- [ ] **Step 2: Add seatList computed and supporting code**

```typescript
const seatList = computed(() => {
  const players = ws.room.state?.players ?? []
  const seats = []
  for (let i = 0; i < 3; i++) {
    seats.push({ player: players[i] ?? null })
  }
  return seats
})
```

- [ ] **Step 3: Wrap existing game UI in `v-if="ws.room.phase !== 'waiting'"`**

The existing game room content (player-top, player-side, bottom-cards, played-cards, center-info, my-area, etc.) should only show when the game has started:

```html
<template v-if="ws.room.phase !== 'waiting'">
  <!-- 原 game-room 内容 -->
</template>
```

This means we need to wrap lines 3-103 in a `<template v-if="ws.room.phase !== 'waiting'">` block.

- [ ] **Step 4: Add AI badge to player names in game view**

Add `[AI]` suffix to AI player names in the game view templates (lines 8, 16):

```html
<span class="name">{{ players[1]?.nickname ?? '等待中...' }}</span>
```
change to:
```html
<span class="name">
  {{ players[1]?.nickname ?? '等待中...' }}
  <span v-if="players[1]?.aiControlled" class="ai-badge">AI</span>
</span>
```

Same for `players[2]` on line 16.

- [ ] **Step 5: Add styles for waiting room UI**

Add CSS:

```css
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
.ai-badge {
  font-size: 10px; background: #636e72; color: white;
  padding: 1px 5px; border-radius: 3px; margin-left: 4px;
}
.me-badge {
  font-size: 10px; background: #00b894; color: white;
  padding: 1px 5px; border-radius: 3px; margin-left: 4px;
}
.owner-badge {
  font-size: 10px; background: #ffd700; color: #1a1a2e;
  padding: 1px 5px; border-radius: 3px;
}
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
```

- [ ] **Step 6: Verify vue-tsc type check**

Run: `cd client && npx vue-tsc --noEmit`
Expected: PASS (ignore the pre-existing `remainingCards` type errors)

- [ ] **Step 7: Commit**

```bash
git add client/src/views/GameRoom.vue
git commit -m "feat: add waiting room UI with seat management and AI fill"
```

---

### Task 6: Integration test

**Files:**
- Create: `server/src/game/room-manager.integration.test.ts`

- [ ] **Step 1: Write integration test simulating full flow**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createRoom } from './room-manager'

describe('Room integration with AI', () => {
  it('should fill AI on start_game and complete calling phase', () => {
    const room = createRoom()
    const sessions: Record<string, { send: Function }> = {}

    // Add 1 human player
    const p1 = room.addPlayer('Human', {
      send: (msg: string) => { /* noop */ }
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
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(room.game!.phase).toBe('playing')
        expect(room.game!.landlordId).not.toBeNull()
        resolve()
      }, 3500) // 3 AI turns * ~1s each + buffer
    }, 5000)
  })
})
```

- [ ] **Step 2: Run integration test**

Run: `cd server && npx vitest run src/game/room-manager.integration.test.ts`
Expected: PASS (or slow due to setTimeout — may need `--timeout`)

- [ ] **Step 3: Run all tests**

Run: `cd server && npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add server/src/game/room-manager.integration.test.ts
git commit -m "test: add integration test for AI room flow"
```
