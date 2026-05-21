<template>
  <div id="app-root" @click="initOnFirstClick">
    <!-- 断线遮罩 -->
    <div v-if="ws.disconnected.value" class="disconnect-overlay">
      <div class="disconnect-card">
        <div class="disconnect-icon">📡</div>
        <h2>连接已断开</h2>
        <p>你已离开房间，请返回首页重新加入</p>
        <button class="disconnect-btn" @click="goHome">🏠 返回首页</button>
      </div>
    </div>
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

function goHome() {
  ws.leaveRoom()
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

/* 断线遮罩 */
.disconnect-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.disconnect-card {
  background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px 36px;
  text-align: center;
  border: 1px solid rgba(255,215,0,0.15);
  max-width: 320px;
}
.disconnect-icon { font-size: 48px; margin-bottom: 12px; }
.disconnect-card h2 {
  color: #ffd700;
  font-size: 22px;
  margin-bottom: 8px;
}
.disconnect-card p {
  color: rgba(255,255,255,0.5);
  font-size: 14px;
  margin-bottom: 20px;
}
.disconnect-btn {
  padding: 10px 28px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #f7971e, #ffd200);
  color: #3d2000;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
}
.disconnect-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(247,151,30,0.3);
}
</style>
