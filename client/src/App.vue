<template>
  <div id="app-root" @click="initOnFirstClick">
    <template v-if="!ws.roomId.value">
      <Home @ready="onReady" />
    </template>
    <template v-else>
      <GameRoom />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, provide } from 'vue'
import Home from './views/Home.vue'
import GameRoom from './views/GameRoom.vue'
import { useWebSocket } from './composables/useWebSocket'
import { initAudio } from './composables/useSound'

const ws = useWebSocket()

provide('ws', ws)

let audioInitialized = false

onMounted(() => {
  ws.connect()
})

function onReady(data: { nickname: string; roomId?: string }) {
  if (data.roomId) {
    ws.joinRoom(data.roomId, data.nickname)
  } else {
    ws.createRoom(data.nickname)
  }
}

function initOnFirstClick() {
  if (!audioInitialized) {
    initAudio()
    audioInitialized = true
  }
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app, #app-root { height: 100%; width: 100%; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
</style>
