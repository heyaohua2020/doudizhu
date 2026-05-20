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
