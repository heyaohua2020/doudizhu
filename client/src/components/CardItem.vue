<template>
  <div class="card-item" :class="[colorClass, size, { joker: isJoker }]">
    <div class="item-corner tl">
      <span class="irank">{{ displayRank }}</span>
      <span class="isuit">{{ displaySuit }}</span>
    </div>
    <div class="i-center">
      <span v-if="isJoker" class="joker-icon">{{ card.jokerType === 'big' ? '👑' : '🃏' }}</span>
      <span v-else class="ibig-suit">{{ displaySuit }}</span>
    </div>
    <div class="item-corner br">
      <span class="irank">{{ displayRank }}</span>
      <span class="isuit">{{ displaySuit }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@doudizhu/shared'

const props = withDefaults(defineProps<{
  card: Card
  /** lg=76×110(桌面出牌)  sm=52×76(小号)  xs=40×58(手机出牌) */
  size?: 'lg' | 'sm' | 'xs'
}>(), {
  size: 'lg'
})

const SUIT_SYMBOLS: Record<string, string> = {
  spade: '♠', heart: '♥', club: '♣', diamond: '♦',
}

const isJoker = computed(() => props.card.jokerType === 'small' || props.card.jokerType === 'big')

const colorClass = computed(() => {
  if (isJoker.value) return 'red'
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
</script>

<style scoped>
/* ===== 尺寸体系 ===== */
.card-item {
  /* lg: 桌面出牌（默认） */
  --ci-w: 76px;
  --ci-h: 110px;
  --ci-radius: 8px;
  --ci-border: 2px;
  --ci-rank: 20px;
  --ci-suit: 12px;
  --ci-center: 38px;
  --ci-corner-offset: 5px;

  width: var(--ci-w);
  height: var(--ci-h);
  background: linear-gradient(145deg, #ffffff, #f5f0e8);
  border-radius: var(--ci-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  user-select: none;
  border: var(--ci-border) solid #d4c8a8;
  flex-shrink: 0;
}

/* sm: 小号（备用） */
.card-item.sm {
  --ci-w: 52px;
  --ci-h: 76px;
  --ci-radius: 6px;
  --ci-border: 1.5px;
  --ci-rank: 14px;
  --ci-suit: 9px;
  --ci-center: 26px;
  --ci-corner-offset: 3px;
}

/* xs: 手机出牌 */
.card-item.xs {
  --ci-w: 40px;
  --ci-h: 58px;
  --ci-radius: 5px;
  --ci-border: 1px;
  --ci-rank: 11px;
  --ci-suit: 7px;
  --ci-center: 18px;
  --ci-corner-offset: 2px;
}

/* ===== 配色 ===== */
.card-item.red {
  border-color: #e0a0a0;
  background: linear-gradient(145deg, #fff5f5, #fce0e0);
}
.card-item.black {
  border-color: #b8b8c0;
  background: linear-gradient(145deg, #ffffff, #ececf0);
}
.card-item.joker {
  border-color: #c8a0d0;
  background: linear-gradient(145deg, #fefaff, #f5e5ff);
}

/* joker 文字色 */
.card-item.joker .irank, .card-item.joker .isuit { color: #7b1fa2; }

/* ===== 共同元素 ===== */
.item-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.tl { top: var(--ci-corner-offset, 4px); left: var(--ci-corner-offset, 4px); }
.br { bottom: var(--ci-corner-offset, 4px); right: var(--ci-corner-offset, 4px); transform: rotate(180deg); }

.irank {
  font-size: var(--ci-rank, 20px);
  font-weight: bold;
  font-family: 'Georgia', serif;
}
.isuit {
  font-size: var(--ci-suit, 12px);
  line-height: 1;
}

.i-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibig-suit {
  font-size: var(--ci-center, 38px);
  opacity: 0.85;
}
.joker-icon { font-size: var(--ci-center, 38px); }

.card-item.red .irank, .card-item.red .isuit, .card-item.red .ibig-suit { color: #c62828; }
.card-item.black .irank, .card-item.black .isuit, .card-item.black .ibig-suit { color: #1a1a2e; }
.card-item.joker .irank, .card-item.joker .isuit, .card-item.joker .ibig-suit, .card-item.joker .joker-icon { color: #7b1fa2; }
</style>
