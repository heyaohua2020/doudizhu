<template>
  <div class="card-face" :class="[colorClass, { joker: isJoker }]">
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

const props = defineProps<{ card: Card }>()

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

const centerDisplay = computed(() => {
  if (isJoker.value) return ''
  return displaySuit.value
})
</script>

<style scoped>
.card-face {
  width: 100px;
  height: 144px;
  background: linear-gradient(145deg, #ffffff, #f5f0e8);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow:
    0 3px 12px rgba(0,0,0,0.25),
    inset 0 1px 0 rgba(255,255,255,0.8);
  user-select: none;
  border: 2px solid #d4c8a8;
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}

.card-face:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
}

.card-pattern {
  position: absolute;
  inset: 5px;
  border-radius: 6px;
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

.card-face.joker {
  border-color: #d4a0d4;
  background: linear-gradient(145deg, #fff8ff, #f8e8ff);
}
.card-face.joker .suit-text { color: #7b1fa2; }
.card-face.joker .rank-text { color: #7b1fa2; }
.card-face.joker .center-suit { color: #7b1fa2; }

.corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.top-left { top: 6px; left: 6px; }
.bottom-right { bottom: 6px; right: 6px; transform: rotate(180deg); }

.rank-text {
  font-size: 20px;
  font-weight: bold;
  font-family: 'Georgia', serif;
}
.suit-text {
  font-size: 13px;
  line-height: 1;
  margin-top: 2px;
}

.center-suit {
  font-size: 50px;
  line-height: 1;
  font-weight: normal;
  opacity: 0.85;
}

.joker-deco {
  font-size: 56px;
  line-height: 1;
  z-index: 1;
}
</style>
