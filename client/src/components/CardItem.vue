<template>
  <div class="card-item" :class="[colorClass, { small, joker: isJoker }]">
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

const props = defineProps<{ card: Card; small?: boolean }>()

const SUIT_SYMBOLS: Record<string, string> = {
  spade: '♠', heart: '♥', club: '♣', diamond: '♦',
}

const isJoker = computed(() => props.card.jokerType === 'small' || props.card.jokerType === 'big')

const colorClass = computed(() => {
  if (isJoker.value) return 'joker'
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
.card-item {
  width: 76px;
  height: 110px;
  background: linear-gradient(145deg, #ffffff, #f5f0e8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  user-select: none;
  border: 2px solid #d4c8a8;
  flex-shrink: 0;
}
.card-item.small { width: 52px; height: 76px; }

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

.item-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.tl { top: 4px; left: 5px; }
.br { bottom: 4px; right: 5px; transform: rotate(180deg); }

.irank {
  font-size: 20px;
  font-weight: bold;
  font-family: 'Georgia', serif;
}
.small .irank { font-size: 14px; }
.isuit { font-size: 12px; line-height: 1; }
.small .isuit { font-size: 9px; }

.i-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.ibig-suit {
  font-size: 38px;
  opacity: 0.85;
}
.small .ibig-suit { font-size: 26px; }
.joker-icon { font-size: 38px; }
.small .joker-icon { font-size: 26px; }

.card-item.red .irank, .card-item.red .isuit, .card-item.red .ibig-suit { color: #c62828; }
.card-item.black .irank, .card-item.black .isuit, .card-item.black .ibig-suit { color: #1a1a2e; }
.card-item.joker .irank, .card-item.joker .isuit { color: #7b1fa2; }
</style>
