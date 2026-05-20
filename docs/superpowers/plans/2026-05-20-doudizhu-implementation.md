# 斗地主联机游戏 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可玩的 Web 斗地主联机游戏，支持好友开房、AI 补位、局内聊天表情

**Architecture:** pnpm monorepo（client/ + server/ + shared/），Vue 3 前端通过 WebSocket 与 Node.js 服务端通信，服务端纯内存管理房间和游戏状态

**Tech Stack:** Vue 3 + TypeScript + Vite (前端) / Node.js + TypeScript + Express + ws (后端) / pnpm workspaces

---

### Task 1: 项目脚手架 — monorepo 初始化

**Files:**
- Create: `package.json` (根目录, workspace 配置)
- Create: `client/package.json`
- Create: `server/package.json`
- Create: `shared/package.json`
- Create: `tsconfig.base.json`
- Create: `client/tsconfig.json`
- Create: `server/tsconfig.json`
- Create: `shared/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/index.html`
- Create: `server/tsconfig.json`

- [ ] **Step 1: 创建根 package.json**

```json
{
  "name": "doudizhu",
  "private": true,
  "scripts": {
    "dev": "concurrently \"pnpm dev:server\" \"pnpm dev:client\"",
    "dev:server": "pnpm --filter server dev",
    "dev:client": "pnpm --filter client dev",
    "build": "pnpm --filter shared build && pnpm --filter server build && pnpm --filter client build"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

- [ ] **Step 2: 创建 shared/package.json**

```json
{
  "name": "@doudizhu/shared",
  "version": "1.0.0",
  "private": true,
  "main": "src/types.ts",
  "types": "src/types.ts",
  "scripts": {}
}
```

- [ ] **Step 3: 创建 server/package.json**

```json
{
  "name": "@doudizhu/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/ws": "^8.5.12",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: 创建 client/package.json**

```json
{
  "name": "@doudizhu/client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.1.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vue-tsc": "^2.1.0"
  }
}
```

- [ ] **Step 5: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 6: 创建 client/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 7: 创建 server/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 8: 创建 shared/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 9: 创建 client/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true
      }
    }
  }
})
```

- [ ] **Step 10: 创建 client/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>斗地主</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 11: 创建 client/src/main.ts**

```typescript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 12: 创建 client/src/App.vue**（最小骨架）

```vue
<template>
  <div id="app-root">
    <Home v-if="!currentRoom" @enter-room="onEnterRoom" />
    <GameRoom v-else :room-id="currentRoom" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Home from './views/Home.vue'
import GameRoom from './views/GameRoom.vue'

const currentRoom = ref<string | null>(null)

function onEnterRoom(roomId: string) {
  currentRoom.value = roomId
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app, #app-root { height: 100%; width: 100%; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>
```

- [ ] **Step 13: 创建 .gitignore**

```
node_modules/
dist/
.superpowers/
```

- [ ] **Step 14: 安装依赖**

Run: `cd /d/H/doudizhu && pnpm install`
Expected: 所有 workspace 包安装成功，node_modules 目录创建完成

- [ ] **Step 15: 提交脚手架**

```bash
git init
git add .
git commit -m "chore: init monorepo with pnpm workspaces"
```

---

### Task 2: 共享类型定义

**Files:**
- Create: `shared/src/types.ts`

这是前后端共享的核心类型，所有后续任务都依赖此文件。

- [ ] **Step 1: 编写共享类型**

```typescript
// ===== 牌相关 =====

/** 牌面点数，2 最大，3 最小 */
export const RANK_VALUES = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  'SMALL_JOKER': 16, 'BIG_JOKER': 17
} as const

export type Rank = keyof typeof RANK_VALUES
export type Suit = 'spade' | 'heart' | 'club' | 'diamond'
export type JokerType = 'small' | 'big'

export interface Card {
  suit?: Suit
  rank: Rank
  jokerType?: JokerType
}

export type CardList = Card[]

// ===== 牌型 =====

export type PatternType =
  | 'single'          // 单张
  | 'pair'            // 对子
  | 'triple'          // 三张
  | 'triple_one'      // 三带一
  | 'triple_pair'     // 三带二
  | 'straight'        // 顺子 >=5张
  | 'double_straight' // 连对 >=3对
  | 'airplane'        // 飞机(不带)
  | 'airplane_single' // 飞机带单
  | 'airplane_pair'   // 飞机带对
  | 'four_two_single' // 四带二单
  | 'four_two_pair'   // 四带二对
  | 'bomb'            // 炸弹
  | 'rocket'          // 火箭

export interface PatternResult {
  type: PatternType
  rank: number        // 主牌点数（用于比较大小）
  length: number      // 主牌长度（用于校验顺子/连对/飞机长度）
}

// ===== 游戏流程 =====

export type GamePhase = 'waiting' | 'calling' | 'playing' | 'ended'

export interface Player {
  id: string
  nickname: string
  cards: CardList
  isLandlord: boolean
  isReady: boolean
}

export interface RoomState {
  id: string
  players: Player[]
  owner: string       // 房主 player id
  phase: GamePhase
  settings: {
    maxPlayers: number
    baseScore: number
  }
}

// ===== WebSocket 消息 =====

export interface WSMessage {
  type: string
  payload: Record<string, unknown>
  timestamp: number
}

export interface JoinRoomPayload {
  roomId: string
  nickname: string
}

export interface CallScorePayload {
  score: 0 | 1 | 2 | 3
}

export interface PlayCardsPayload {
  cards: CardList
}
```

- [ ] **Step 2: 提交**

```bash
git add shared/src/types.ts
git commit -m "feat: add shared type definitions"
```

---

### Task 3: 服务端 — 牌组（洗牌、发牌）

**Files:**
- Create: `server/src/game/types.ts`（继承 shared 扩展服务端专用类型）
- Create: `server/src/game/deck.ts`

- [ ] **Step 1: 创建 server/src/game/types.ts**

```typescript
import type { Card, Player } from '@doudizhu/shared'

export const SUITS = ['spade', 'heart', 'club', 'diamond'] as const
export const NUM_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const

export interface CreatedPlayer extends Player {
  connectionId: string | null
  disconnectedAt: number | null
  aiControlled: boolean
}

export interface GameState {
  deck: Card[]
  bottomCards: Card[]
  players: CreatedPlayer[]
  currentPlayerIndex: number
  phase: import('@doudizhu/shared').GamePhase
  lastPlay: { playerId: string; cards: Card[] } | null
  passCount: number
  callScores: Record<string, number>
  currentCallIndex: number
  bombsPlayed: number
  landlordId: string | null
}
```

- [ ] **Step 2: 创建 server/src/game/deck.ts**

```typescript
import type { Card } from '@doudizhu/shared'
import { SUITS, NUM_RANKS } from './types'

/** 创建一副 54 张新牌 */
export function createDeck(): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (const rank of NUM_RANKS) {
      cards.push({ suit, rank })
    }
  }
  cards.push({ rank: 'SMALL_JOKER', jokerType: 'small' })
  cards.push({ rank: 'BIG_JOKER', jokerType: 'big' })
  return cards
}

/** Fisher-Yates 洗牌 */
export function shuffleDeck(cards: Card[]): Card[] {
  const deck = [...cards]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

/** 发牌：每人 17 张，底牌 3 张 */
export function dealCards(deck: Card[]): {
  hands: [Card[], Card[], Card[]]
  bottomCards: Card[]
} {
  return {
    hands: [
      deck.slice(0, 17),
      deck.slice(17, 34),
      deck.slice(34, 51)
    ],
    bottomCards: deck.slice(51, 54)
  }
}
```

- [ ] **Step 3: 创建 server/src/game/deck.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, dealCards } from './deck'
import type { Card } from '@doudizhu/shared'

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
```

- [ ] **Step 4: 运行测试**

Run: `cd /d/H/doudizhu && pnpm --filter server exec vitest run`
Expected: 3 test files (all passing)

- [ ] **Step 5: 提交**

```bash
git add server/src/game/
git commit -m "feat: add deck creation, shuffle and dealing"
```

---

### Task 4: 服务端 — 牌型识别（card-patterns）

**Files:**
- Create: `server/src/game/card-patterns.ts`
- Create: `server/src/game/card-patterns.test.ts`

这是整个项目最复杂的逻辑。实现全部 14 种牌型的识别和比较。

- [ ] **Step 1: 创建 card-patterns.ts — 辅助函数和单张/对子/三张**

```typescript
import type { Card, PatternResult, PatternType } from '@doudizhu/shared'
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

  // 飞机（不带）：>=2 个连续三张
  const tripleValues = [...rankCounts.entries()].filter(([, c]) => c === 3).map(([v]) => v).sort((a, b) => a - b)
  if (tripleValues.length >= 2) {
    // 检查三张是否连续
    for (let i = 1; i < tripleValues.length; i++) {
      if (tripleValues[i] !== tripleValues[i - 1] + 1) break
    }
    // 尝试找到最长的连续三张序列
    const consecutive = findLongestConsecutive(tripleValues)
    if (consecutive.length >= 2) {
      const tripleCount = consecutive.length
      const remainingCount = n - tripleCount * 3

      if (remainingCount === 0) {
        return { type: 'airplane', rank: Math.max(...consecutive), length: tripleCount }
      }
      // 飞机带单：每个三张带一张
      if (remainingCount === tripleCount) {
        return { type: 'airplane_single', rank: Math.max(...consecutive), length: tripleCount }
      }
      // 飞机带对：每个三张带一对
      if (remainingCount === tripleCount * 2) {
        const pairValues = [...rankCounts.entries()].filter(([v, c]) => c === 2 && !consecutive.includes(v))
        const singleCards = [...rankCounts.entries()].filter(([v, c]) => c === 1)
        if (pairValues.length + singleCards.length / 2 >= tripleCount) {
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
      // 也可能是四带两个单张（都在一张手上）
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
  // 火箭能打过一切
  if (hand.type === 'rocket') return true
  // 炸弹能打过非火箭的一切
  if (hand.type === 'bomb') {
    if (previous.type === 'rocket') return false
    if (previous.type === 'bomb') return hand.rank > previous.rank
    return true
  }
  // 同类型比较：类型相同、长度相同、点数更大
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
```

- [ ] **Step 2: 编写 card-patterns.test.ts — 全部牌型测试**

```typescript
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
```

- [ ] **Step 3: 运行测试**

Run: `cd /d/H/doudizhu && pnpm --filter server exec vitest run`
Expected: all tests pass

- [ ] **Step 4: 提交**

```bash
git add server/src/game/card-patterns.ts server/src/game/card-patterns.test.ts
git commit -m "feat: add card pattern recognition and comparison"
```

---

### Task 5: 服务端 — 游戏规则（叫地主、出牌、胜负结算）

**Files:**
- Create: `server/src/game/rules.ts`
- Create: `server/src/game/rules.test.ts`

- [ ] **Step 1: 创建 rules.ts**

```typescript
import type { Card } from '@doudizhu/shared'
import type { GameState } from './types'
import { identifyPattern, canBeat } from './card-patterns'

/** 确定叫地主顺序的起始玩家（随机） */
export function getStartingCaller(): number {
  return Math.floor(Math.random() * 3)
}

/** 检查叫分是否有效（必须大于当前最高分） */
export function isValidCall(currentScore: number, newScore: number): boolean {
  return newScore === 0 || (newScore >= 1 && newScore <= 3 && newScore > currentScore)
}

/** 检查出牌是否有效 */
export function isValidPlay(state: GameState, playerIndex: number, cards: Card[]): boolean {
  const player = state.players[playerIndex]
  if (!player) return false

  // 检查所有出的牌是否在手牌中
  const handCopy = [...player.cards]
  for (const card of cards) {
    const idx = handCopy.findIndex(c =>
      c.rank === card.rank && c.suit === card.suit &&
      c.jokerType === card.jokerType
    )
    if (idx === -1) return false
    handCopy.splice(idx, 1)
  }

  const pattern = identifyPattern(cards)
  if (!pattern) return false

  // 如果是第一个出牌的人，任何合法牌型都可以
  if (!state.lastPlay || state.lastPlay.playerId === player.id) {
    return true
  }

  // 否则必须能打过上家
  return canBeat(pattern, identifyPattern(state.lastPlay.cards)!)
}

/** 检查出牌是否完（某人出完所有牌） */
export function checkGameOver(state: GameState): string | null {
  for (const player of state.players) {
    if (player.cards.length === 0) return player.id
  }
  return null
}

/** 计算结算分数 */
export function calculateScore(state: GameState): Record<string, number> {
  const winnerId = checkGameOver(state)
  if (!winnerId) return {}

  const landlordId = state.landlordId!
  const isLandlordWin = winnerId === landlordId
  const baseScore = state.callScores[landlordId] || 1
  const multiplier = Math.pow(2, state.bombsPlayed)

  const scores: Record<string, number> = {}

  for (const player of state.players) {
    if (player.id === landlordId) {
      scores[player.id] = isLandlordWin ? baseScore * multiplier * 2 : -baseScore * multiplier * 2
    } else {
      scores[player.id] = isLandlordWin ? -baseScore * multiplier : baseScore * multiplier
    }
  }

  return scores
}
```

- [ ] **Step 2: 编写 rules.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { isValidCall, calculateScore } from './rules'
import type { GameState } from './types'
import type { Card } from '@doudizhu/shared'

describe('isValidCall', () => {
  it('0 (不叫) is always valid', () => {
    expect(isValidCall(0, 0)).toBe(true)
    expect(isValidCall(3, 0)).toBe(true)
  })

  it('must be higher than current score', () => {
    expect(isValidCall(0, 1)).toBe(true)
    expect(isValidCall(1, 2)).toBe(true)
    expect(isValidCall(2, 3)).toBe(true)
    expect(isValidCall(3, 1)).toBe(false)
    expect(isValidCall(2, 2)).toBe(false)
  })

  it('score must be between 0-3', () => {
    expect(isValidCall(0, 4)).toBe(false)
    expect(isValidCall(0, -1)).toBe(false)
  })
})

describe('calculateScore', () => {
  const baseState = {
    landlordId: 'p1',
    callScores: { p1: 2 },
    bombsPlayed: 0
  } as any

  it('landlord win: landlord gets base*2, each farmer loses base', () => {
    const state = {
      ...baseState,
      players: [
        { id: 'p1', cards: [] },
        { id: 'p2', cards: [{}] },
        { id: 'p3', cards: [{}] }
      ]
    } as GameState
    const scores = calculateScore(state)
    expect(scores.p1).toBe(4)
    expect(scores.p2).toBe(-2)
    expect(scores.p3).toBe(-2)
  })

  it('farmer win: landlord loses base*2', () => {
    const state = {
      ...baseState,
      players: [
        { id: 'p1', cards: [{}] },
        { id: 'p2', cards: [] },
        { id: 'p3', cards: [{}] }
      ]
    } as GameState
    const scores = calculateScore(state)
    expect(scores.p1).toBe(-4)
    expect(scores.p2).toBe(2)
    expect(scores.p3).toBe(2)
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `cd /d/H/doudizhu && pnpm --filter server exec vitest run`
Expected: all tests pass

- [ ] **Step 4: 提交**

```bash
git add server/src/game/rules.ts server/src/game/rules.test.ts
git commit -m "feat: add game rules (calling, playing, scoring)"
```

---

### Task 6: 服务端 — 游戏引擎（状态机）

**Files:**
- Create: `server/src/game/engine.ts`
- Create: `server/src/game/engine.test.ts`

- [ ] **Step 1: 创建 engine.ts**

```typescript
import type { Card, GamePhase } from '@doudizhu/shared'
import type { GameState, CreatedPlayer } from './types'
import { createDeck, shuffleDeck, dealCards } from './deck'
import { identifyPattern, canBeat } from './card-patterns'
import { getStartingCaller, isValidCall, isValidPlay, checkGameOver, calculateScore } from './rules'

export function createGame(players: CreatedPlayer[]): GameState {
  const deck = shuffleDeck(createDeck())
  const { hands, bottomCards } = dealCards(deck)

  return {
    deck,
    bottomCards,
    players: players.map((p, i) => ({
      ...p,
      cards: hands[i],
      isLandlord: false
    })),
    currentPlayerIndex: getStartingCaller(),
    phase: 'calling',
    lastPlay: null,
    passCount: 0,
    callScores: {},
    currentCallIndex: getStartingCaller(),
    bombsPlayed: 0,
    landlordId: null
  }
}

export function handleCall(state: GameState, playerIndex: number, score: 0 | 1 | 2 | 3): string | null {
  if (state.phase !== 'calling') return '当前不是叫地主阶段'
  if (playerIndex !== state.currentCallIndex) return '还没轮到你叫分'

  const currentHighest = Math.max(0, ...Object.values(state.callScores))
  if (!isValidCall(currentHighest, score)) return '无效的叫分'

  state.callScores[state.players[playerIndex].id] = score

  // 如果有人叫 3 分，直接锁定
  if (score === 3) {
    finishCalling(state)
    return null
  }

  // 下一个人叫分
  const nextIndex = (playerIndex + 1) % 3
  const nextId = state.players[nextIndex].id

  if (nextId in state.callScores) {
    // 所有人都叫过一轮
    const maxScore = Math.max(...Object.values(state.callScores))
    if (maxScore === 0) {
      // 没人叫地主，重新发牌（实际上由 room 层处理重开）
      state.phase = 'ended'
      return null
    }
    finishCalling(state)
    return null
  }

  state.currentCallIndex = nextIndex
  return null
}

function finishCalling(state: GameState): void {
  const entries = Object.entries(state.callScores)
  const maxEntry = entries.reduce((a, b) => a[1] >= b[1] ? a : b)
  const landlordId = maxEntry[0]
  const landlordIndex = state.players.findIndex(p => p.id === landlordId)

  state.landlordId = landlordId
  state.players[landlordIndex].isLandlord = true
  state.players[landlordIndex].cards.push(...state.bottomCards)
  state.currentPlayerIndex = landlordIndex
  state.phase = 'playing'
  state.lastPlay = null
  state.passCount = 0
}

export function handlePlay(state: GameState, playerIndex: number, cards: Card[]): string | null {
  if (state.phase !== 'playing') return '当前不是出牌阶段'
  if (playerIndex !== state.currentPlayerIndex) return '还没轮到你出牌'

  const player = state.players[playerIndex]
  const isFirstPlay = !state.lastPlay || state.lastPlay.playerId === player.id

  // 如果选择过牌且不是第一个出牌者
  if (cards.length === 0) {
    if (isFirstPlay) return '你必须出牌'
    state.passCount++
    advanceTurn(state)
    return null
  }

  // 验证出牌有效性
  if (!isValidPlay(state, playerIndex, cards)) return '无效的出牌'

  // 从手牌中移除出的牌
  for (const card of cards) {
    const idx = player.cards.findIndex(c =>
      c.rank === card.rank && c.suit === card.suit && c.jokerType === card.jokerType
    )
    if (idx !== -1) player.cards.splice(idx, 1)
  }

  // 统计炸弹
  const pattern = identifyPattern(cards)!
  if (pattern.type === 'bomb' || pattern.type === 'rocket') {
    state.bombsPlayed++
  }

  state.lastPlay = { playerId: player.id, cards }
  state.passCount = 0

  // 检查游戏是否结束
  const winnerId = checkGameOver(state)
  if (winnerId) {
    state.phase = 'ended'
    return null
  }

  advanceTurn(state)
  return null
}

function advanceTurn(state: GameState): void {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 3
  // 如果连续 2 人 pass，回到出牌人
  if (state.passCount >= 2 && state.lastPlay && state.lastPlay.playerId !== state.players[state.currentPlayerIndex].id) {
    // 重置：出牌人可以自由出牌
    state.passCount = 0
  }
}
```

- [ ] **Step 2: 编写 engine.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { createGame, handleCall, handlePlay } from './engine'
import type { CreatedPlayer } from './types'

function createPlayers(): CreatedPlayer[] {
  return [
    { id: 'p1', nickname: '玩家1', cards: [], isLandlord: false, isReady: true, connectionId: 'c1', disconnectedAt: null, aiControlled: false },
    { id: 'p2', nickname: '玩家2', cards: [], isLandlord: false, isReady: true, connectionId: 'c2', disconnectedAt: null, aiControlled: false },
    { id: 'p3', nickname: '玩家3', cards: [], isLandlord: false, isReady: true, connectionId: 'c3', disconnectedAt: null, aiControlled: false }
  ]
}

describe('createGame', () => {
  it('should create game in calling phase', () => {
    const game = createGame(createPlayers())
    expect(game.phase).toBe('calling')
    expect(game.players).toHaveLength(3)
    game.players.forEach(p => expect(p.cards).toHaveLength(17))
    expect(game.bottomCards).toHaveLength(3)
  })
})

describe('handleCall', () => {
  it('should reject out-of-turn call', () => {
    const game = createGame(createPlayers())
    const wrongPlayer = (game.currentCallIndex + 1) % 3
    const error = handleCall(game, wrongPlayer, 1)
    expect(error).toBe('还没轮到你叫分')
  })

  it('should accept valid call', () => {
    const game = createGame(createPlayers())
    const playerIdx = game.currentCallIndex
    const error = handleCall(game, playerIdx, 1)
    expect(error).toBeNull()
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `cd /d/H/doudizhu && pnpm --filter server exec vitest run`
Expected: all tests pass

- [ ] **Step 4: 提交**

```bash
git add server/src/game/engine.ts server/src/game/engine.test.ts
git commit -m "feat: add game engine with state machine"
```

---

### Task 7: 服务端 — AI 出牌逻辑

**Files:**
- Create: `server/src/ai/index.ts`
- Create: `server/src/ai/ai.test.ts`

- [ ] **Step 1: 创建 AI 模块**

```typescript
import type { Card, PatternResult } from '@doudizhu/shared'
import { identifyPattern, canBeat } from '../game/card-patterns'

/** 简单 AI：找出最小的可出的牌 */
export function findPlay(hand: Card[], lastPlay: { playerId: string; cards: Card[] } | null, myId: string): Card[] | null {
  // 如果是自由出牌（我是第一个或上家是我自己），出最小的单张或对子
  if (!lastPlay || lastPlay.playerId === myId) {
    return playSmallest(hand)
  }

  // 否则尝试打过上家
  return beatPrevious(hand, lastPlay.cards)
}

function playSmallest(hand: Card[]): Card[] | null {
  // 优先出单张
  const ranked = [...hand].sort((a, b) => {
    const va = 'rank' in a ? getRankValue(a.rank) : (a.jokerType === 'big' ? 17 : 16)
    const vb = 'rank' in b ? getRankValue(b.rank) : (b.jokerType === 'big' ? 17 : 16)
    return va - vb
  })

  // 找单张（不是对子/三张的一部分）
  const rankCounts = new Map<string, number>()
  for (const card of ranked) {
    const key = card.rank
    rankCounts.set(key, (rankCounts.get(key) || 0) + 1)
  }

  // 出最小的单牌
  for (const card of ranked) {
    if (rankCounts.get(card.rank) === 1) {
      return [card]
    }
  }

  // 出最小的对子
  for (const [rank, count] of rankCounts) {
    if (count === 2) {
      const pair = ranked.filter(c => c.rank === rank).slice(0, 2)
      if (pair.length === 2) return pair
    }
  }

  // 出最小的单张
  return [ranked[0]]
}

function beatPrevious(hand: Card[], prevCards: Card[]): Card[] | null {
  const prevPattern = identifyPattern(prevCards)
  if (!prevPattern) return null

  // 按点数排序
  const sorted = [...hand].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank))

  // 尝试所有可能的组合
  for (let len = prevCards.length; len <= Math.min(prevCards.length + 2, sorted.length); len++) {
    if (len === 0) continue
    const combos = getCombinations(sorted, len)
    for (const combo of combos) {
      const pattern = identifyPattern(combo)
      if (pattern && canBeat(pattern, prevPattern)) {
        return combo
      }
    }
  }

  return null // 打不过，过牌
}

function getRankValue(rank: string): number {
  const values: Record<string, number> = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
    'SMALL_JOKER': 16, 'BIG_JOKER': 17
  }
  return values[rank] || 0
}

function getCombinations(arr: Card[], k: number): Card[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const result: Card[][] = []
  const first = arr[0]
  const rest = arr.slice(1)
  for (const combo of getCombinations(rest, k - 1)) {
    result.push([first, ...combo])
  }
  result.push(...getCombinations(rest, k))
  return result
}

/** AI 叫分策略：根据手牌质量决定叫分 */
export function aiCallScore(hand: Card[]): 0 | 1 | 2 | 3 {
  const bombCount = countBombs(hand)
  const hasJokerPair = hand.some(c => c.jokerType === 'small') && hand.some(c => c.jokerType === 'big')
  const twoCount = hand.filter(c => c.rank === '2').length

  const score = bombCount * 2 + (hasJokerPair ? 2 : 0) + twoCount
  if (score >= 4) return 3
  if (score >= 2) return 2
  if (score >= 1) return 1
  return 0
}

function countBombs(hand: Card[]): number {
  const rankCounts = new Map<string, number>()
  for (const card of hand) rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1)
  let bombs = 0
  for (const count of rankCounts.values()) {
    if (count === 4) bombs++
  }
  return bombs
}
```

- [ ] **Step 2: 编写 AI 测试**

```typescript
import { describe, it, expect } from 'vitest'
import { aiCallScore } from './index'
import type { Card } from '@doudizhu/shared'

describe('aiCallScore', () => {
  it('should bid 3 with good cards (bomb + jokers)', () => {
    const hand: Card[] = [
      { rank: '3', suit: 'spade' }, { rank: '3', suit: 'heart' }, { rank: '3', suit: 'diamond' }, { rank: '3', suit: 'club' },
      { rank: 'SMALL_JOKER', jokerType: 'small' }, { rank: 'BIG_JOKER', jokerType: 'big' },
      { rank: '5', suit: 'spade' }, { rank: '6', suit: 'spade' }, { rank: '7', suit: 'spade' },
      { rank: '8', suit: 'spade' }, { rank: '9', suit: 'spade' }, { rank: '10', suit: 'spade' },
      { rank: 'J', suit: 'spade' }, { rank: 'Q', suit: 'spade' }, { rank: 'K', suit: 'spade' },
      { rank: 'A', suit: 'spade' }, { rank: '2', suit: 'spade' }
    ]
    expect(aiCallScore(hand)).toBe(3)
  })

  it('should not bid with bad cards', () => {
    const hand: Card[] = [
      { rank: '3', suit: 'spade' }, { rank: '4', suit: 'spade' }, { rank: '5', suit: 'spade' },
      { rank: '6', suit: 'spade' }, { rank: '7', suit: 'spade' }, { rank: '8', suit: 'spade' },
      { rank: '9', suit: 'spade' }, { rank: '10', suit: 'spade' }, { rank: 'J', suit: 'spade' },
      { rank: 'Q', suit: 'spade' }, { rank: 'K', suit: 'spade' }, { rank: 'A', suit: 'spade' },
      { rank: '4', suit: 'heart' }, { rank: '6', suit: 'heart' }, { rank: '8', suit: 'heart' },
      { rank: '9', suit: 'heart' }, { rank: '10', suit: 'heart' }
    ]
    expect(aiCallScore(hand)).toBe(0)
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `cd /d/H/doudizhu && pnpm --filter server exec vitest run`
Expected: all tests pass

- [ ] **Step 4: 提交**

```bash
git add server/src/ai/
git commit -m "feat: add AI player logic"
```

---

### Task 8: 服务端 — 房间管理

**Files:**
- Create: `server/src/room/index.ts`
- Create: `server/src/room/room.test.ts`

- [ ] **Step 1: 创建房间管理模块**

```typescript
import type { RoomState, Player, GamePhase } from '@doudizhu/shared'
import type { CreatedPlayer } from '../game/types'
import { createGame, handleCall, handlePlay } from '../game/engine'
import type { GameState } from '../game/types'
import { findPlay, aiCallScore } from '../ai/index'

interface Room {
  state: RoomState
  gameState: GameState | null
  connections: Map<string, import('ws').WebSocket>
}

const rooms = new Map<string, Room>()

function generateRoomId(): string {
  const chars = '0123456789'
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

export function createRoom(ownerId: string, ownerNickname: string): RoomState {
  const id = generateRoomId()
  const player: Player = { id: ownerId, nickname: ownerNickname, cards: [], isLandlord: false, isReady: false }
  const createdPlayer: CreatedPlayer = { ...player, connectionId: null, disconnectedAt: null, aiControlled: false }

  const roomState: RoomState = {
    id,
    players: [player],
    owner: ownerId,
    phase: 'waiting',
    settings: { maxPlayers: 3, baseScore: 1 }
  }

  rooms.set(id, {
    state: roomState,
    gameState: null,
    connections: new Map()
  })

  return roomState
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId)
}

export function joinRoom(roomId: string, playerId: string, nickname: string): RoomState | null {
  const room = rooms.get(roomId)
  if (!room) return null
  if (room.state.players.length >= 3) return null
  if (room.state.phase !== 'waiting') return null

  const player: Player = { id: playerId, nickname, cards: [], isLandlord: false, isReady: false }
  room.state.players.push(player)
  return room.state
}

export function leaveRoom(roomId: string, playerId: string): RoomState | null {
  const room = rooms.get(roomId)
  if (!room) return null

  room.state.players = room.state.players.filter(p => p.id !== playerId)
  if (room.state.owner === playerId && room.state.players.length > 0) {
    room.state.owner = room.state.players[0].id
  }

  if (room.state.players.length === 0) {
    rooms.delete(roomId)
    return null
  }

  return room.state
}

export function startGame(roomId: string): RoomState | null {
  const room = rooms.get(roomId)
  if (!room) return null
  if (room.state.players.length < 2) return null // 至少 2 人才开始（第三人 AI 补位）

  // 补齐 AI
  while (room.state.players.length < 3) {
    const aiId = `ai_${Date.now()}_${room.state.players.length}`
    room.state.players.push({
      id: aiId, nickname: `AI 玩家${room.state.players.length + 1}`,
      cards: [], isLandlord: false, isReady: true
    })
  }

  const createdPlayers: CreatedPlayer[] = room.state.players.map(p => ({
    ...p,
    connectionId: p.id.startsWith('ai_') ? null : p.id,
    disconnectedAt: null,
    aiControlled: p.id.startsWith('ai_')
  }))

  room.gameState = createGame(createdPlayers)
  room.state.phase = 'calling'

  return room.state
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId)
}
```

- [ ] **Step 2: 提交**

```bash
git add server/src/room/
git commit -m "feat: add room management"
```

---

### Task 9: 服务端 — WebSocket 消息处理

**Files:**
- Create: `server/src/ws/types.ts`
- Create: `server/src/ws/handler.ts`

- [ ] **Step 1: 创建 WS 消息类型**

```typescript
import type { WSMessage } from '@doudizhu/shared'

export interface ServerToClientMessages {
  room_joined: { roomId: string; playerId: string; players: any[] }
  room_updated: { players: any[]; owner: string }
  game_start: { hand: any[]; currentPlayerIndex: number }
  phase_call: { currentCallerId: string }
  call_result: { playerId: string; score: number }
  dizhu_confirmed: { landlordId: string; bottomCards: any[] }
  your_turn: { lastPlay: any | null }
  player_played: { playerId: string; cards: any[] }
  player_passed: { playerId: string }
  game_over: { winnerId: string; scores: Record<string, number> }
  chat_broadcast: { playerId: string; nickname: string; message: string }
  emote_broadcast: { playerId: string; emoteId: string }
  error: { message: string }
}
```

- [ ] **Step 2: 创建 WS handler**

```typescript
import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import type { WSMessage, GamePhase } from '@doudizhu/shared'
import { createRoom, getRoom, joinRoom, leaveRoom, startGame, deleteRoom } from '../room/index'
import { handleCall, handlePlay } from '../game/engine'
import { findPlay, aiCallScore } from '../ai/index'
import type { CreatedPlayer } from '../game/types'

interface WSClient {
  ws: WebSocket
  playerId: string
  nickname: string
  roomId: string | null
}

const clients = new Map<string, WSClient>()

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws) => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const client: WSClient = { ws, playerId, nickname: '', roomId: null }
    clients.set(playerId, client)

    ws.on('message', (data) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString())
        handleMessage(client, msg)
      } catch (e) {
        sendTo(ws, 'error', { message: '消息格式错误' })
      }
    })

    ws.on('close', () => {
      handleDisconnect(client)
      clients.delete(playerId)
    })
  })

  return wss
}

function handleMessage(client: WSClient, msg: WSMessage): void {
  switch (msg.type) {
    case 'join_room': {
      const { roomId, nickname } = msg.payload as any
      client.nickname = nickname

      let roomState
      if (roomId === 'create') {
        roomState = createRoom(client.playerId, nickname)
      } else {
        const existing = getRoom(roomId)
        if (!existing) {
          sendTo(client.ws, 'error', { message: '房间不存在' })
          return
        }
        roomState = joinRoom(roomId, client.playerId, nickname)
        if (!roomState) {
          sendTo(client.ws, 'error', { message: '房间已满或游戏已开始' })
          return
        }
      }

      client.roomId = roomState.id
      const room = getRoom(roomState.id)!
      room.connections.set(client.playerId, client.ws)
      sendTo(client.ws, 'room_joined', { roomId: roomState.id, playerId: client.playerId, players: roomState.players })
      broadcastToRoom(roomState.id, 'room_updated', { players: roomState.players, owner: roomState.owner }, client.playerId)
      break
    }

    case 'start_game': {
      if (!client.roomId) return
      const room = getRoom(client.roomId)
      if (!room) return
      if (room.state.owner !== client.playerId) {
        sendTo(client.ws, 'error', { message: '只有房主可以开始游戏' })
        return
      }

      const updatedState = startGame(client.roomId)
      if (!updatedState) return

      // 通知所有玩家游戏开始（每人单独发手牌）
      for (let i = 0; i < updatedState.players.length; i++) {
        const player = updatedState.players[i]
        const playerWs = room.connections.get(player.id)
        const isAI = player.id.startsWith('ai_')

        if (playerWs || isAI) {
          const hand = room.gameState!.players[i].cards
          const msg = {
            hand,
            currentPlayerIndex: room.gameState!.currentPlayerIndex,
            landlordId: null,
            players: updatedState.players.map((p, j) => ({
              id: p.id, nickname: p.nickname, cardCount: j === i ? hand.length : room.gameState!.players[j].cards.length,
              isLandlord: p.isLandlord
            }))
          }

          if (isAI) {
            // AI 自动叫分
            setTimeout(() => handleAICall(room.gameState!, i, client.roomId!), 500)
          } else {
            sendTo(playerWs!, 'game_start', msg)
          }
        }
      }
      break
    }

    case 'call_score': {
      if (!client.roomId) return
      const room = getRoom(client.roomId)
      if (!room || !room.gameState) return

      const playerIdx = room.gameState.players.findIndex(p => p.id === client.playerId)
      const score = (msg.payload as any).score as 0 | 1 | 2 | 3
      const error = handleCall(room.gameState, playerIdx, score)

      if (error) {
        sendTo(client.ws, 'error', { message: error })
        return
      }

      broadcastToRoom(client.roomId, 'call_result', { playerId: client.playerId, score })

      if (room.gameState.phase === 'ended') {
        // 没人叫地主，重新开始
        broadcastToRoom(client.roomId, 'game_over', { winnerId: null, scores: {}, restart: true })
        return
      }

      if (room.gameState.phase === 'playing') {
        const landlordId = room.gameState.landlordId!
        broadcastToRoom(client.roomId, 'dizhu_confirmed', {
          landlordId,
          bottomCards: room.gameState.bottomCards
        })

        // 通知当前出牌人
        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
        if (currentPlayer.id.startsWith('ai_')) {
          const aiIndex = room.gameState.currentPlayerIndex
          setTimeout(() => handleAIPlay(room.gameState!, aiIndex, client.roomId!), 1000)
        } else {
          const playerWs = room.connections.get(currentPlayer.id)
          if (playerWs) {
            sendTo(playerWs, 'your_turn', { lastPlay: null })
          }
        }
        return
      }

      // 通知下一个人叫分
      const nextPlayer = room.gameState.players[room.gameState.currentCallIndex]
      if (nextPlayer.id.startsWith('ai_')) {
        const aiIndex = room.gameState.currentCallIndex
        setTimeout(() => handleAICall(room.gameState!, aiIndex, client.roomId!), 500)
      } else {
        broadcastToRoom(client.roomId, 'phase_call', { currentCallerId: nextPlayer.id })
      }
      break
    }

    case 'play_cards': {
      if (!client.roomId) return
      const room = getRoom(client.roomId)
      if (!room || !room.gameState) return

      const playerIdx = room.gameState.players.findIndex(p => p.id === client.playerId)
      const cards = (msg.payload as any).cards || []
      const error = handlePlay(room.gameState, playerIdx, cards)

      if (error) {
        sendTo(client.ws, 'error', { message: error })
        return
      }

      if (cards.length === 0) {
        broadcastToRoom(client.roomId, 'player_passed', { playerId: client.playerId })
      } else {
        broadcastToRoom(client.roomId, 'player_played', { playerId: client.playerId, cards })
      }

      if (room.gameState.phase === 'ended') {
        const scores = {}
        broadcastToRoom(client.roomId, 'game_over', { winnerId: client.playerId, scores, restart: false })
        return
      }

      // 通知下一个玩家
      const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex]
      if (currentPlayer.id.startsWith('ai_')) {
        const aiIndex = room.gameState.currentPlayerIndex
        setTimeout(() => handleAIPlay(room.gameState!, aiIndex, client.roomId!), 1000)
      } else {
        const playerWs = room.connections.get(currentPlayer.id)
        if (playerWs) {
          const lastPlayMsg = room.gameState!.lastPlay &&
            room.gameState!.lastPlay.playerId !== currentPlayer.id &&
            room.gameState!.passCount < 2
            ? { playerId: room.gameState.lastPlay.playerId, cards: room.gameState.lastPlay.cards }
            : null
          sendTo(playerWs, 'your_turn', { lastPlay: lastPlayMsg })
        }
      }
      break
    }

    case 'pass': {
      if (!client.roomId) return
      const room = getRoom(client.roomId)
      if (!room || !room.gameState) return
      const playerIdx = room.gameState.players.findIndex(p => p.id === client.playerId)
      const error = handlePlay(room.gameState, playerIdx, [])

      if (error) {
        sendTo(client.ws, 'error', { message: error })
        return
      }

      broadcastToRoom(client.roomId, 'player_passed', { playerId: client.playerId })

      if (room.gameState.phase !== 'ended') {
        const p = room.gameState.players[room.gameState.currentPlayerIndex]
        if (p.id.startsWith('ai_')) {
          setTimeout(() => handleAIPlay(room.gameState!, room.gameState.currentPlayerIndex, client.roomId!), 1000)
        } else {
          const pw = room.connections.get(p.id)
          if (pw) sendTo(pw, 'your_turn', { lastPlay: room.gameState.lastPlay })
        }
      }
      break
    }

    case 'chat': {
      if (!client.roomId) return
      broadcastToRoom(client.roomId, 'chat_broadcast', {
        playerId: client.playerId,
        nickname: client.nickname,
        message: (msg.payload as any).message
      })
      break
    }

    case 'emote': {
      if (!client.roomId) return
      broadcastToRoom(client.roomId, 'emote_broadcast', {
        playerId: client.playerId,
        emoteId: (msg.payload as any).emoteId
      })
      break
    }
  }
}

function handleAICall(gameState: any, aiIndex: number, roomId: string): void {
  const hand = gameState.players[aiIndex].cards
  const score = aiCallScore(hand)
  handleCall(gameState, aiIndex, score as 0 | 1 | 2 | 3)
  broadcastToRoom(roomId, 'call_result', { playerId: gameState.players[aiIndex].id, score })

  if (gameState.phase === 'ended') {
    broadcastToRoom(roomId, 'game_over', { winnerId: null, scores: {}, restart: true })
    return
  }

  if (gameState.phase === 'playing') {
    broadcastToRoom(roomId, 'dizhu_confirmed', {
      landlordId: gameState.landlordId,
      bottomCards: gameState.bottomCards
    })
    // 触发第一个出牌
    const firstPlayer = gameState.players[gameState.currentPlayerIndex]
    if (firstPlayer.id.startsWith('ai_')) {
      setTimeout(() => handleAIPlay(gameState, gameState.currentPlayerIndex, roomId), 1000)
    } else {
      const playerWs = getRoom(roomId)?.connections.get(firstPlayer.id)
      if (playerWs) sendTo(playerWs, 'your_turn', { lastPlay: null })
    }
    return
  }

  // 通知下一个 AI 或人类
  const nextIndex = gameState.currentCallIndex
  const nextPlayer = gameState.players[nextIndex]
  if (nextPlayer.id.startsWith('ai_')) {
    setTimeout(() => handleAICall(gameState, nextIndex, roomId), 500)
  } else {
    broadcastToRoom(roomId, 'phase_call', { currentCallerId: nextPlayer.id })
  }
}

function handleAIPlay(gameState: any, aiIndex: number, roomId: string): void {
  const hand = gameState.players[aiIndex].cards
  const lastPlay = gameState.lastPlay
  const cards = findPlay(hand, lastPlay, gameState.players[aiIndex].id)

  if (!cards || cards.length === 0) {
    handlePlay(gameState, aiIndex, [])
    broadcastToRoom(roomId, 'player_passed', { playerId: gameState.players[aiIndex].id })
  } else {
    handlePlay(gameState, aiIndex, cards)
    broadcastToRoom(roomId, 'player_played', { playerId: gameState.players[aiIndex].id, cards })
  }

  if (gameState.phase === 'ended') {
    const scores = {}
    broadcastToRoom(roomId, 'game_over', { winnerId: gameState.players[aiIndex].id, scores, restart: false })
    return
  }

  // 通知下一家
  const nextPlayer = gameState.players[gameState.currentPlayerIndex]
  if (nextPlayer.id.startsWith('ai_')) {
    setTimeout(() => handleAIPlay(gameState, gameState.currentPlayerIndex, roomId), 1000)
  } else {
    const playerWs = getRoom(roomId)?.connections.get(nextPlayer.id)
    if (playerWs) {
      sendTo(playerWs, 'your_turn', { lastPlay: gameState.lastPlay })
    }
  }
}

function handleDisconnect(client: WSClient): void {
  if (!client.roomId) return
  const room = getRoom(client.roomId)
  if (!room) return

  room.connections.delete(client.playerId)
  // 如果游戏中，交给 AI 接管
  if (room.gameState && room.state.phase !== 'ended') {
    const playerIdx = room.gameState.players.findIndex(p => p.id === client.playerId)
    if (playerIdx !== -1) {
      room.gameState.players[playerIdx].aiControlled = true
    }
  }
}

function sendTo(ws: WebSocket, type: string, payload: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }))
  }
}

function broadcastToRoom(roomId: string, type: string, payload: any, excludePlayerId?: string): void {
  const room = getRoom(roomId)
  if (!room) return
  for (const [pid, ws] of room.connections) {
    if (pid !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }))
    }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add server/src/ws/
git commit -m "feat: add WebSocket message handler"
```

---

### Task 10: 服务端入口

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: 创建服务端入口**

```typescript
import express from 'express'
import { createServer } from 'http'
import { setupWebSocket } from './ws/handler'

const PORT = parseInt(process.env.PORT || '3000', 10)

const app = express()
app.use(express.json())

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const server = createServer(app)
setupWebSocket(server)

server.listen(PORT, () => {
  console.log(`斗地主服务器启动在 http://localhost:${PORT}`)
})
```

- [ ] **Step 2: 提交**

```bash
git add server/src/index.ts
git commit -m "feat: add server entry point"
```

---

### Task 11: 前端 — 类型与常量

**Files:**
- Create: `client/src/game/types.ts`
- Create: `client/src/game/constants.ts`

- [ ] **Step 1: 创建 types.ts**

```typescript
export interface GamePlayer {
  id: string
  nickname: string
  cardCount: number
  isLandlord: boolean
}

export interface WSClientConfig {
  onMessage: (msg: any) => void
  onOpen?: () => void
  onClose?: () => void
}
```

- [ ] **Step 2: 创建 constants.ts**

```typescript
/** 花色符号 */
export const SUIT_SYMBOLS = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦'
}

/** 花色颜色 */
export const SUIT_COLORS = {
  spade: '#1a1a2e',
  heart: '#e63946',
  club: '#1a1a2e',
  diamond: '#e63946'
}

/** 牌面文字 */
export const RANK_DISPLAY: Record<string, string> = {
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8',
  '9': '9', '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A', '2': '2',
  'SMALL_JOKER': '小王', 'BIG_JOKER': '大王'
}

/** 出牌倒计时（秒） */
export const TURN_TIMEOUT = 30
```

- [ ] **Step 3: 提交**

```bash
git add client/src/game/
git commit -m "feat: add client game types and constants"
```

---

### Task 12: 前端 — WebSocket 服务

**Files:**
- Create: `client/src/services/ws.ts`

- [ ] **Step 1: 创建 WebSocket 客户端封装**

```typescript
import type { WSMessage } from '@doudizhu/shared'

type MessageHandler = (msg: WSMessage) => void

class WSClient {
  private ws: WebSocket | null = null
  private handlers: Map<string, MessageHandler[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000

  connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.emit('_open', null as any)
    }

    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data)
        this.emit(msg.type, msg)
      } catch {}
    }

    this.ws.onclose = () => {
      this.emit('_close', null as any)
      this.tryReconnect()
    }

    this.ws.onerror = () => {}
  }

  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    this.reconnectAttempts++
    setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts)
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }))
    }
  }

  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) this.handlers.set(type, [])
    this.handlers.get(type)!.push(handler)
  }

  once(type: string, handler: MessageHandler): void {
    const wrapper = (msg: WSMessage) => {
      handler(msg)
      this.off(type, wrapper)
    }
    this.on(type, wrapper)
  }

  off(type: string, handler: MessageHandler): void {
    const hs = this.handlers.get(type)
    if (hs) {
      const idx = hs.indexOf(handler)
      if (idx !== -1) hs.splice(idx, 1)
    }
  }

  private emit(type: string, msg: WSMessage): void {
    const hs = this.handlers.get(type)
    if (hs) hs.forEach(h => h(msg))
    // 通配 handler
    const all = this.handlers.get('*')
    if (all) all.forEach(h => h(msg))
  }

  disconnect(): void {
    this.ws?.close()
    this.handlers.clear()
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsClient = new WSClient()
```

-

 [ ] **Step 2: 提交**

```bash
git add client/src/services/ws.ts
git commit -m "feat: add WebSocket client service with reconnection"
```

---

### Task 13: 前端 — 首页（昵称 + 创建/加入房间）

**Files:**
- Create: `client/src/views/Home.vue`

- [ ] **Step 1: 创建 Home.vue**

```vue
<template>
  <div class="home">
    <div class="home-card">
      <h1 class="title">斗 地 主</h1>
      <p class="subtitle">联机开房，跟朋友一起玩</p>

      <div class="form">
        <input
          v-model="nickname"
          placeholder="输入你的昵称"
          class="input"
          maxlength="8"
          @keyup.enter="handleEnter"
        />

        <div class="actions">
          <button class="btn btn-primary" :disabled="!canAction" @click="createRoom">
            创建房间
          </button>
          <div class="divider">或者</div>
          <div class="join-row">
            <input
              v-model="roomId"
              placeholder="输入房间号"
              class="input join-input"
              maxlength="6"
              @keyup.enter="joinRoom"
            />
            <button class="btn btn-secondary" :disabled="!canAction || !roomId" @click="joinRoom">
              加入
            </button>
          </div>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { wsClient } from '../services/ws'

const emit = defineEmits<{
  enterRoom: [roomId: string, playerId: string, nickname: string]
}>()

const nickname = ref('')
const roomId = ref('')
const error = ref('')

const canAction = computed(() => nickname.value.trim().length >= 1)

function handleEnter() {
  if (roomId.value) joinRoom()
  else createRoom()
}

function createRoom() {
  if (!canAction.value) return
  error.value = ''

  wsClient.once('room_joined', (msg: any) => {
    emit('enterRoom', msg.payload.roomId, msg.payload.playerId, nickname.value.trim())
  })

  wsClient.once('error', (msg: any) => {
    error.value = msg.payload.message
  })

  wsClient.send('join_room', { roomId: 'create', nickname: nickname.value.trim() })
}

function joinRoom() {
  if (!canAction.value || !roomId.value.trim()) return
  error.value = ''

  wsClient.once('room_joined', (msg: any) => {
    emit('enterRoom', msg.payload.roomId, msg.payload.playerId, nickname.value.trim())
  })

  wsClient.once('error', (msg: any) => {
    error.value = msg.payload.message
  })

  wsClient.send('join_room', { roomId: roomId.value.trim(), nickname: nickname.value.trim() })
}
</script>

<style scoped>
.home {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
}
.home-card {
  background: rgba(255,255,255,0.95);
  border-radius: 16px;
  padding: 40px;
  width: 380px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.title {
  font-size: 36px;
  color: #1a1a2e;
  letter-spacing: 8px;
  margin-bottom: 8px;
}
.subtitle {
  color: #666;
  margin-bottom: 28px;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.input {
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}
.input:focus {
  border-color: #2c5364;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: #2c5364;
  color: white;
}
.btn-secondary {
  background: #e0e0e0;
  color: #333;
}
.divider {
  color: #999;
  font-size: 14px;
}
.join-row {
  display: flex;
  gap: 8px;
}
.join-input {
  flex: 1;
}
.error {
  color: #e63946;
  font-size: 14px;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add client/src/views/Home.vue
git commit -m "feat: add home page with nickname and room create/join"
```

---

### Task 14: 前端 — 扑克牌组件

**Files:**
- Create: `client/src/components/PokerCard.vue`

- [ ] **Step 1: 创建 PokerCard.vue**

```vue
<template>
  <div
    class="poker-card"
    :class="{
      'poker-card--selected': selected,
      'poker-card--hidden': hidden,
      'poker-card--joker': card.jokerType,
      'poker-card--red': !card.jokerType && (card.suit === 'heart' || card.suit === 'diamond'),
      'poker-card--small': card.jokerType === 'small'
    }"
    @click="$emit('select', card)"
  >
    <div v-if="hidden" class="card-back">
      <div class="card-back-pattern">&#9830;</div>
    </div>
    <template v-else>
      <div class="card-corner card-corner--top">
        <span class="card-rank">{{ displayRank }}</span>
        <span class="card-suit">{{ displaySuit }}</span>
      </div>
      <div class="card-center">
        <span class="card-suit-large">{{ displaySuit }}</span>
      </div>
      <div class="card-corner card-corner--bottom">
        <span class="card-rank">{{ displayRank }}</span>
        <span class="card-suit">{{ displaySuit }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@doudizhu/shared'
import { SUIT_SYMBOLS, RANK_DISPLAY } from '../game/constants'

const props = defineProps<{
  card: Card
  selected?: boolean
  hidden?: boolean
}>()

defineEmits<{ select: [card: Card] }>()

const displayRank = computed(() => RANK_DISPLAY[props.card.rank] || props.card.rank)
const displaySuit = computed(() => {
  if (props.card.jokerType === 'small') return '&#9830;'
  if (props.card.jokerType === 'big') return '&#9830;'
  return SUIT_SYMBOLS[props.card.suit!]
})
</script>

<style scoped>
.poker-card {
  display: inline-flex;
  width: 56px;
  height: 80px;
  border-radius: 6px;
  background: white;
  border: 2px solid #ccc;
  cursor: pointer;
  position: relative;
  user-select: none;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 1px 1px 3px rgba(0,0,0,0.15);
}
.poker-card:hover {
  transform: translateY(-4px);
  box-shadow: 2px 2px 8px rgba(0,0,0,0.2);
}
.poker-card--selected {
  transform: translateY(-16px);
  border-color: #f0c040;
  box-shadow: 0 0 12px rgba(240, 192, 64, 0.4);
}
.poker-card--hidden {
  cursor: default;
}
.poker-card--hidden:hover {
  transform: none;
}
.poker-card--red {
  color: #e63946;
}
.poker-card--small, .poker-card--joker {
  color: #1a1a2e;
}
.card-back {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2c3e50;
  border-radius: 4px;
}
.card-back-pattern {
  color: white;
  font-size: 28px;
  opacity: 0.4;
}
.card-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.card-corner--top { top: 4px; left: 4px; }
.card-corner--bottom { bottom: 4px; right: 4px; transform: rotate(180deg); }
.card-rank { font-size: 13px; font-weight: bold; }
.card-suit { font-size: 10px; }
.card-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.card-suit-large { font-size: 24px; }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add client/src/components/PokerCard.vue
git commit -m "feat: add PokerCard component"
```

---

### Task 15: 前端 — 牌桌组件

**Files:**
- Create: `client/src/components/PlayerHand.vue`
- Create: `client/src/components/OtherPlayer.vue`
- Create: `client/src/components/GameBoard.vue`
- Create: `client/src/components/ChatBox.vue`
- Create: `client/src/components/EmotePanel.vue`
- Create: `client/src/components/TimerBar.vue`

- [ ] **Step 1: 创建 PlayerHand.vue — 玩家手牌（可选择）**

```vue
<template>
  <div class="player-hand">
    <div class="hand-cards">
      <PokerCard
        v-for="(card, i) in sortedCards"
        :key="`${card.rank}-${card.suit || card.jokerType}-${i}`"
        :card="card"
        :selected="selectedCards.includes(card)"
        :hidden="false"
        @select="toggleCard"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@doudizhu/shared'
import PokerCard from './PokerCard.vue'

const props = defineProps<{
  cards: Card[]
  selectable?: boolean
}>()

const selectedCards = defineModel<Card[]>('selectedCards', { default: [] })

const sortedCards = computed(() => {
  const rankOrder: Record<string, number> = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
    'SMALL_JOKER': 16, 'BIG_JOKER': 17
  }
  return [...props.cards].sort((a, b) => rankOrder[a.rank] - rankOrder[b.rank])
})

function toggleCard(card: Card) {
  if (!props.selectable) return
  const current = [...selectedCards.value]
  const idx = current.findIndex(c =>
    c.rank === card.rank && c.suit === card.suit && c.jokerType === card.jokerType
  )
  if (idx === -1) {
    current.push(card)
  } else {
    current.splice(idx, 1)
  }
  selectedCards.value = current
}
</script>

<style scoped>
.player-hand {
  display: flex;
  justify-content: center;
}
.hand-cards {
  display: flex;
  gap: -16px;
}
.hand-cards > * {
  margin-left: -16px;
}
.hand-cards > *:first-child {
  margin-left: 0;
}
</style>
```

- [ ] **Step 2: 创建 OtherPlayer.vue**

```vue
<template>
  <div class="other-player" :class="{ 'other-player--active': isActive }">
    <div class="player-info">
      <span class="player-name">{{ nickname }}</span>
      <span v-if="isLandlord" class="landlord-badge">地主</span>
    </div>
    <div class="card-count">
      <div
        v-for="i in cardCount"
        :key="i"
        class="card-back-mini"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  nickname: string
  cardCount: number
  isLandlord: boolean
  isActive: boolean
}>()
</script>

<style scoped>
.other-player {
  text-align: center;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  transition: background 0.2s;
}
.other-player--active {
  background: rgba(255,255,255,0.25);
  box-shadow: 0 0 12px rgba(255,255,255,0.1);
}
.player-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 6px;
}
.player-name {
  color: white;
  font-size: 14px;
  font-weight: 500;
}
.landlord-badge {
  background: #f0c040;
  color: #1a1a2e;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}
.card-count {
  display: flex;
  justify-content: center;
  gap: 2px;
}
.card-back-mini {
  width: 12px;
  height: 18px;
  background: linear-gradient(135deg, #2c3e50, #34495e);
  border-radius: 2px;
  border: 1px solid rgba(255,255,255,0.1);
}
</style>
```

- [ ] **Step 3: 创建 TimerBar.vue**

```vue
<template>
  <div class="timer-bar" v-if="visible">
    <div class="timer-fill" :style="{ width: percentage + '%' }" :class="{ 'timer-warning': remaining <= 10 }" />
    <span class="timer-text">{{ remaining }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  duration?: number
}>()

const emit = defineEmits<{ timeout: [] }>()

const remaining = ref(props.duration || 30)
const percentage = computed(() => (remaining.value / (props.duration || 30)) * 100)

let interval: ReturnType<typeof setInterval> | null = null

watch(() => props.visible, (val) => {
  if (interval) clearInterval(interval)
  if (val) {
    remaining.value = props.duration || 30
    interval = setInterval(() => {
      remaining.value--
      if (remaining.value <= 0) {
        clearInterval(interval!)
        emit('timeout')
      }
    }, 1000)
  }
})
</script>

<style scoped>
.timer-bar {
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}
.timer-fill {
  height: 100%;
  background: #4caf50;
  border-radius: 3px;
  transition: width 1s linear;
}
.timer-warning {
  background: #e63946;
}
.timer-text {
  position: absolute;
  top: -14px;
  right: 0;
  color: white;
  font-size: 12px;
}
</style>
```

- [ ] **Step 4: 创建 ChatBox.vue**

```vue
<template>
  <div class="chat-box">
    <div class="chat-messages" ref="msgList">
      <div v-for="(msg, i) in messages" :key="i" class="chat-msg">
        <span class="chat-name">{{ msg.nickname }}: </span>
        <span class="chat-text">{{ msg.text }}</span>
      </div>
    </div>
    <div class="chat-input-row">
      <input
        v-model="text"
        class="chat-input"
        placeholder="聊天..."
        maxlength="30"
        @keyup.enter="send"
      />
      <button class="chat-send" @click="send">发送</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

const emit = defineEmits<{ send: [text: string] }>()

const text = ref('')
const messages = ref<{ nickname: string; text: string }[]>([])
const msgList = ref<HTMLElement | null>(null)

function send() {
  if (!text.value.trim()) return
  emit('send', text.value.trim())
  text.value = ''
}

function addMessage(nickname: string, text: string) {
  messages.value.push({ nickname, text })
  nextTick(() => {
    if (msgList.value) msgList.value.scrollTop = msgList.value.scrollHeight
  })
}

defineExpose({ addMessage })
</script>

<style scoped>
.chat-box {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.chat-msg {
  color: #e0e0e0;
  font-size: 13px;
}
.chat-name {
  color: #f0c040;
  font-weight: 500;
}
.chat-input-row {
  display: flex;
  gap: 4px;
  padding: 4px;
}
.chat-input {
  flex: 1;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.15);
  color: white;
  outline: none;
}
.chat-input::placeholder { color: #999; }
.chat-send {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #f0c040;
  color: #1a1a2e;
  cursor: pointer;
  font-weight: bold;
}
</style>
```

- [ ] **Step 5: 提交**

```bash
git add client/src/components/
git commit -m "feat: add game board components (hand, players, timer, chat)"
```

---

### Task 16: 前端 — 游戏房间主界面

**Files:**
- Create: `client/src/views/GameRoom.vue`

- [ ] **Step 1: 创建 GameRoom.vue**

```vue
<template>
  <div class="game-room">
    <!-- 顶部: 房间号 + 对手信息 -->
    <div class="game-top">
      <div class="room-info">房间号: {{ roomId }}</div>
      <div class="opponents">
        <OtherPlayer
          v-for="p in otherPlayers"
          :key="p.id"
          :nickname="p.nickname"
          :card-count="p.cardCount"
          :is-landlord="p.isLandlord"
          :is-active="currentPlayerId === p.id"
        />
      </div>
    </div>

    <!-- 中间: 牌桌 -->
    <div class="game-center">
      <div class="last-play-area">
        <div v-if="lastPlayCards.length" class="played-cards">
          <PokerCard
            v-for="(card, i) in lastPlayCards"
            :key="i"
            :card="card"
            :hidden="false"
          />
        </div>
        <div v-else-if="phase === 'playing' && isMyTurn" class="play-hint">请出牌</div>
      </div>
    </div>

    <!-- 底部: 我的手牌 -->
    <div class="game-bottom">
      <TimerBar :visible="isMyTurn && phase === 'playing'" @timeout="onTimeout" />

      <div class="call-area" v-if="phase === 'calling' && isMyTurn">
        <button
          v-for="s in availableScores"
          :key="s"
          class="btn"
          :class="{ 'btn-primary': s > 0, 'btn-secondary': s === 0 }"
          @click="callScore(s)"
        >
          {{ s === 0 ? '不叫' : s + '分' }}
        </button>
      </div>

      <PlayerHand
        :cards="myCards"
        :selectable="phase === 'playing' && isMyTurn"
        v-model:selectedCards="selectedCards"
      />

      <div class="action-bar" v-if="phase === 'playing' && isMyTurn">
        <button class="btn btn-secondary" @click="passCards" :disabled="!canPass">不要</button>
        <button class="btn btn-primary" @click="playCards" :disabled="!canPlay">出牌</button>
      </div>

      <div class="phase-info" v-if="phase === 'ended'">
        <div class="result-overlay">
          <div class="result-card">
            <h2>{{ isWinner ? '你赢了!' : '你输了' }}</h2>
            <div class="scores">
              <div v-for="(score, pid) in scores" :key="pid" class="score-item">
                {{ playerNames[pid] || pid }}: {{ score > 0 ? '+' : '' }}{{ score }}
              </div>
            </div>
            <div class="result-actions">
              <button class="btn btn-primary" @click="playAgain">再来一局</button>
              <button class="btn btn-secondary" @click="backToLobby">返回大厅</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右下: 聊天 -->
    <div class="chat-panel">
      <ChatBox ref="chatBoxRef" @send="onChatSend" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { Card, WSMessage } from '@doudizhu/shared'
import { wsClient } from '../services/ws'
import PokerCard from '../components/PokerCard.vue'
import PlayerHand from '../components/PlayerHand.vue'
import OtherPlayer from '../components/OtherPlayer.vue'
import TimerBar from '../components/TimerBar.vue'
import ChatBox from '../components/ChatBox.vue'
import { TURN_TIMEOUT } from '../game/constants'

const props = defineProps<{ roomId: string }>()

const myPlayerId = ref('')
const myNickname = ref('')
const myCards = ref<Card[]>([])
const selectedCards = ref<Card[]>([])
const phase = ref<'waiting' | 'calling' | 'playing' | 'ended'>('waiting')
const currentPlayerId = ref('')
const lastPlayCards = ref<Card[]>([])
const players = ref<any[]>([])
const scores = ref<Record<string, number>>({})
const winnerId = ref('')

const chatBoxRef = ref<InstanceType<typeof ChatBox> | null>(null)

const myPlayer = computed(() => players.value.find(p => p.id === myPlayerId.value))
const otherPlayers = computed(() => players.value.filter(p => p.id !== myPlayerId.value))
const isMyTurn = computed(() => currentPlayerId.value === myPlayerId.value)
const playerNames = computed(() => {
  const map: Record<string, string> = {}
  players.value.forEach(p => { map[p.id] = p.nickname })
  return map
})

const canPass = computed(() => {
  return phase.value === 'playing' && isMyTurn.value && lastPlayCards.value.length > 0
})
const canPlay = computed(() => {
  return phase.value === 'playing' && isMyTurn.value && selectedCards.value.length > 0
})

const availableScores = computed(() => {
  // 根据当前叫分情况返回可选分数
  return [0, 1, 2, 3]
})

const isWinner = computed(() => winnerId.value === myPlayerId.value)

const handlers: Record<string, (msg: WSMessage) => void> = {
  room_joined(msg) {
    myPlayerId.value = msg.payload.playerId
    players.value = msg.payload.players
  },
  room_updated(msg) {
    players.value = msg.payload.players
  },
  game_start(msg) {
    myCards.value = msg.payload.hand
    players.value = msg.payload.players.map((p: any) =>
      p.id === myPlayerId.value ? { ...p, cardCount: myCards.value.length } : p
    )
    phase.value = 'calling'
  },
  phase_call(msg) {
    currentPlayerId.value = msg.payload.currentCallerId
  },
  call_result(msg) {},
  dizhu_confirmed(msg) {
    phase.value = 'playing'
    // 显示底牌
    lastPlayCards.value = msg.payload.bottomCards
    // 更新地主标记
    players.value = players.value.map(p => ({
      ...p,
      isLandlord: p.id === msg.payload.landlordId
    }))
  },
  your_turn(msg) {
    currentPlayerId.value = msg.payload.lastPlay
      ? players.value.find(p => p.id === msg.payload.lastPlay.playerId)?.id || ''
      : myPlayerId.value
    if (msg.payload.lastPlay) {
      lastPlayCards.value = msg.payload.lastPlay.cards
    }
    selectedCards.value = []
  },
  player_played(msg) {
    lastPlayCards.value = msg.payload.cards
    currentPlayerId.value = ''
    // 更新出牌人的手牌数量
    players.value = players.value.map(p =>
      p.id === msg.payload.playerId
        ? { ...p, cardCount: Math.max(0, p.cardCount - msg.payload.cards.length) }
        : p
    )
  },
  player_passed(msg) {
    currentPlayerId.value = ''
  },
  game_over(msg) {
    phase.value = 'ended'
    scores.value = msg.payload.scores
    winnerId.value = msg.payload.winnerId
  },
  chat_broadcast(msg) {
    chatBoxRef.value?.addMessage(msg.payload.nickname, msg.payload.message)
  },
  emote_broadcast(msg) {}
}

onMounted(() => {
  Object.entries(handlers).forEach(([type, handler]) => {
    wsClient.on(type, handler)
  })
})

onUnmounted(() => {
  Object.entries(handlers).forEach(([type, handler]) => {
    wsClient.off(type, handler)
  })
})

function callScore(score: number) {
  wsClient.send('call_score', { score })
}

function playCards() {
  if (!canPlay.value) return
  wsClient.send('play_cards', { cards: selectedCards.value })
  selectedCards.value = []
}

function passCards() {
  wsClient.send('pass', {})
}

function onTimeout() {
  if (phase.value === 'calling') {
    wsClient.send('call_score', { score: 0 })
  } else if (phase.value === 'playing') {
    wsClient.send('pass', {})
  }
}

function playAgain() {
  // 重置状态
  phase.value = 'waiting'
  myCards.value = []
  selectedCards.value = []
  lastPlayCards.value = []
  scores.value = {}
  // 请求房主开始新游戏
  wsClient.send('start_game', {})
}

function backToLobby() {
  window.location.reload()
}

function onChatSend(text: string) {
  wsClient.send('chat', { message: text })
}
</script>

<style scoped>
.game-room {
  height: 100%;
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  display: flex;
  flex-direction: column;
  position: relative;
  color: white;
}
.game-top {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.room-info {
  font-size: 14px;
  color: rgba(255,255,255,0.6);
}
.opponents {
  display: flex;
  gap: 16px;
}
.game-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.last-play-area {
  text-align: center;
}
.played-cards {
  display: flex;
  gap: 4px;
}
.played-cards > * {
  width: 48px;
  height: 68px;
}
.play-hint {
  color: rgba(255,255,255,0.5);
  font-size: 18px;
}
.game-bottom {
  padding: 8px 20px 20px;
  text-align: center;
}
.call-area {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 12px;
}
.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-primary {
  background: #f0c040;
  color: #1a1a2e;
}
.btn-secondary {
  background: rgba(255,255,255,0.2);
  color: white;
}
.action-bar {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 8px;
}
.phase-info {
  margin-top: 8px;
  font-size: 14px;
}
.result-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.result-card {
  background: white;
  border-radius: 16px;
  padding: 32px 48px;
  text-align: center;
  min-width: 300px;
  color: #1a1a2e;
}
.result-card h2 {
  font-size: 28px;
  margin-bottom: 16px;
}
.scores {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}
.score-item {
  font-size: 16px;
}
.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.chat-panel {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 220px;
  height: 200px;
  background: rgba(0,0,0,0.4);
  border-radius: 8px;
  overflow: hidden;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add client/src/views/GameRoom.vue
git commit -m "feat: add game room view with full gameplay UI"
```

---

### Task 17: 端到端调试与验证

- [ ] **Step 1: 启动服务端**

Run: `cd /d/H/doudizhu && pnpm dev:server`
Expected: server starting on port 3000

- [ ] **Step 2: 启动前端**

Run: `cd /d/H/doudizhu && pnpm dev:client`
Expected: Vite dev server starting on port 5173

- [ ] **Step 3: 测试基本流程**

1. 打开 http://localhost:5173
2. 输入昵称，点"创建房间"
3. 复制房间号，新开一个标签页输入不同昵称和房间号加入
4. 第三个标签页加入
5. 房主点"开始"
6. 测试叫地主 → 出牌 → 结算流程
7. 测试聊天功能

- [ ] **Step 4: 修复发现的问题并提交最终版本**

```bash
git add -A
git commit -m "feat: complete doudizhu game implementation"
```
