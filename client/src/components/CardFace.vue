<template>
  <div class="card-face" :class="[colorClass, size, { joker: isJoker }]">
    <div class="card-pattern"></div>
    <div class="corner top-left">
      <span class="rank-text">{{ displayRank }}</span>
      <span class="suit-text">{{ displaySuit }}</span>
    </div>
    <div class="center-suit">{{ centerDisplay }}</div>
    <div class="corner bottom-right">
      <span class="rank-text">{{ displayRank }}</span>
      <span class="suit-text">{{ displaySuit }}</span>
    </div>
    <div v-if="isJoker" class="joker-deco">
      {{ card.jokerType === 'big' ? '👑' : '🃏' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@doudizhu/shared'

const props = withDefaults(defineProps<{
  card: Card
  /** lg=100×144(桌面手牌) md=68×98(底牌) sm=44×64(手机手牌) */
  size?: 'lg' | 'md' | 'sm'
}>(), {
  size: 'lg'
})

const SUIT_SYMBOLS: Record<string, string> = {
  spade: '♠', heart: '♥', club: '♣', diamond: '♦',
}

const isJoker = computed(() => props.card.jokerType === 'small' || props.card.jokerType === 'big')

const colorClass = computed(() => {
  if (isJoker.value) return 'red' // joker 也用红色系，靠 isJoker class 区分配色
  if (props.card.suit === 'heart' || props.card.suit === 'diamond') return 'red'
  return 'black'
})

const displayRank = computed(() => {
  const r = props.card.rank
  if (r === 'SMALL_JOKER') return '小'
  if (r === 'BIG_JOKER') return '大'
  return r
})

const displaySuit = computed(() => {
  if (props.card.jokerType === 'small') return '☆'
  if (props.card.jokerType === 'big') return '★'
  return props.card.suit ? SUIT_SYMBOLS[props.card.suit] ?? '' : ''
})

const centerDisplay = computed(() => {
  if (isJoker.value) return ''
  return displaySuit.value
})
</script>

<style scoped>
/* ===== 尺寸体系（CSS 变量驱动，无 scale hack）===== */
.card-face {
  /* lg: 桌面手牌（默认） */
  --cf-w: 100px;
  --cf-h: 144px;
  --cf-radius: 10px;
  --cf-border: 2px;
  --cf-rank: 20px;
  --cf-suit: 13px;
  --cf-center: 50px;
  --cf-joker: 56px;
  --cf-pattern-inset: 5px;

  width: var(--cf-w);
  height: var(--cf-h);
  background: linear-gradient(145deg, #ffffff, #f5f0e8);
  border-radius: var(--cf-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow:
    0 3px 12px rgba(0,0,0,0.25),
    inset 0 1px 0 rgba(255,255,255,0.8);
  user-select: none;
  border: var(--cf-border) solid #d4c8a8;
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
}

/* md: 底牌桌面 / 中等尺寸 */
.card-face.md {
  --cf-w: 68px;
  --cf-h: 98px;
  --cf-radius: 8px;
  --cf-border: 1.5px;
  --cf-rank: 18px;
  --cf-suit: 11px;
  --cf-center: 36px;
  --cf-joker: 38px;
  --cf-pattern-inset: 4px;
}

/* sm: 手机手牌 */
.card-face.sm {
  --cf-w: 44px;
  --cf-h: 64px;
  --cf-radius: 6px;
  --cf-border: 1px;
  --cf-rank: 13px;
  --cf-suit: 8px;
  --cf-center: 24px;
  --cf-joker: 28px;
  --cf-pattern-inset: 2px;
}

/* ===== 配色 ===== */
.card-face.red {
  border-color: #e8b4b4;
  background: linear-gradient(145deg, #fff8f8, #fde8e8);
}
.card-face.red .suit-text { color: #c62828; }
.card-face.red .rank-text { color: #c62828; }
.card-face.red .center-suit { color: #c62828; text-shadow: 0 2px 6px rgba(198,40,40,0.2); }

.card-face.black {
  border-color: #c0c0c8;
  background: linear-gradient(145deg, #ffffff, #f0f0f5);
}
.card-face.black .suit-text { color: #1a1a2e; }
.card-face.black .rank-text { color: #1a1a2e; }
.card-face.black .center-suit { color: #1a1a2e; text-shadow: 0 2px 6px rgba(26,26,46,0.15); }

/* joker 特殊配色 */
.card-face.joker {
  border-color: #d4a0d4;
  background: linear-gradient(145deg, #fff8ff, #f8e8ff);
}
.card-face.joker .suit-text { color: #7b1fa2; }
.card-face.joker .rank-text { color: #7b1fa2; }
.card-face.joker .center-suit { color: #7b1fa2; }

/* joker 同时有 red class 时不覆盖 color，joker 优先级更高 */
.card-face.joker .rank-text, .card-face.joker .suit-text, .card-face.joker .center-suit {
  color: #7b1fa2;
}

/* ===== 共同元素 ===== */
.card-pattern {
  position: absolute;
  inset: var(--cf-pattern-inset, 5px);
  border-radius: calc(var(--cf-radius, 10px) - 2px);
  border: 1px solid rgba(0,0,0,0.04);
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 6px,
    rgba(0,0,0,0.008) 6px,
    rgba(0,0,0,0.008) 7px
  );
  pointer-events: none;
}

.corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.top-left { top: var(--cf-pattern-inset, 5px); left: var(--cf-pattern-inset, 5px); }
.bottom-right { bottom: var(--cf-pattern-inset, 5px); right: var(--cf-pattern-inset, 5px); transform: rotate(180deg); }

.rank-text {
  font-size: var(--cf-rank, 20px);
  font-weight: bold;
  font-family: 'Georgia', serif;
}
.suit-text {
  font-size: var(--cf-suit, 13px);
  line-height: 1;
  margin-top: 1px;
}

.center-suit {
  font-size: var(--cf-center, 50px);
  line-height: 1;
  font-weight: normal;
  opacity: 0.85;
}

.joker-deco {
  font-size: var(--cf-joker, 56px);
  line-height: 1;
  z-index: 1;
}
</style>
