<template>
  <div class="home">
    <!-- 音效开关 -->
    <button class="sound-toggle" @click="toggleSound" :title="soundEnabled ? '关闭音效' : '开启音效'">
      {{ soundEnabled ? '🔊' : '🔇' }}
    </button>

    <!-- 浮动装饰 -->
    <div class="floating-deco">
      <span class="deco-icon" style="top:10%;left:5%;animation-delay:0s;">♠</span>
      <span class="deco-icon" style="top:20%;right:8%;animation-delay:1.2s;">♥</span>
      <span class="deco-icon" style="top:55%;left:3%;animation-delay:2.5s;">♣</span>
      <span class="deco-icon" style="top:40%;right:5%;animation-delay:0.8s;">♦</span>
      <span class="deco-icon" style="top:70%;left:10%;animation-delay:3.2s;">♠</span>
      <span class="deco-icon" style="top:15%;right:15%;animation-delay:1.8s;">♥</span>
    </div>

    <div class="home-card">
      <div class="logo-area">
        <div class="logo-icon">🃏</div>
        <h1 class="title">欢乐斗地主</h1>
        <p class="subtitle">三人斗地主，欢乐无穷</p>
      </div>

      <!-- 单人游戏按钮 -->
      <button class="btn-single" @click="startSingle">
        <span class="btn-icon">🎮</span>
        <span class="btn-text">单人开始</span>
        <span class="btn-desc">自动匹配 AI 对手</span>
      </button>

      <div class="divider">
        <span class="divider-text">— 或 —</span>
      </div>

      <div class="tabs">
        <button :class="{ active: tab === 'create' }" @click="tab = 'create'">🏠 创建房间</button>
        <button :class="{ active: tab === 'join' }" @click="tab = 'join'">🔗 加入房间</button>
      </div>

      <div class="form">
        <div class="input-group">
          <span class="input-label">昵称</span>
          <input
            v-model="nickname"
            placeholder="输入你的昵称"
            maxlength="8"
            class="input"
          />
        </div>

        <div v-if="tab === 'join'" class="input-group">
          <span class="input-label">房间号</span>
          <input
            v-model="joinRoomId"
            placeholder="输入6位房间号"
            maxlength="6"
            class="input"
            @input="onRoomIdInput"
          />
        </div>

        <button class="btn primary" @click="handleSubmit">
          {{ tab === 'create' ? '创建房间' : '加入房间' }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, onMounted, onUnmounted } from 'vue'
import { startBgm, stopBgm, setVolume } from '../composables/useSound'

const ws: ReturnType<typeof import('../composables/useWebSocket').useWebSocket> = inject('ws')!

const emit = defineEmits<{
  ready: [{ nickname: string; roomId?: string }]
}>()

const tab = ref<'create' | 'join'>('create')
const nickname = ref('')
const joinRoomId = ref('')
const error = ref('')

function onRoomIdInput() {
  joinRoomId.value = joinRoomId.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)
}

function startSingle() {
  const nick = nickname.value.trim() || '玩家'
  ws.startSinglePlayer(nick)
}

const soundEnabled = ref(true)

onMounted(() => {
  if (soundEnabled.value) startBgm()
})

onUnmounted(() => {
  stopBgm()
})

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  if (soundEnabled.value) {
    setVolume(0.5)
    startBgm()
  } else {
    setVolume(0)
    stopBgm()
  }
}

function handleSubmit() {
  if (!nickname.value.trim()) {
    error.value = '请输入昵称'
    return
  }
  if (tab.value === 'join' && joinRoomId.value.length !== 6) {
    error.value = '请输入6位房间号'
    return
  }
  error.value = ''
  emit('ready', {
    nickname: nickname.value.trim(),
    roomId: tab.value === 'join' ? joinRoomId.value : undefined,
  })
}
</script>

<style scoped>
.home {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #1a3a2a 0%, #0d2818 50%, #06120d 100%);
  position: relative;
  overflow: hidden;
}

/* 音效开关 */
.sound-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,215,0,0.2);
  background: rgba(0,0,0,0.3);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
}
.sound-toggle:hover {
  background: rgba(255,215,0,0.1);
  border-color: rgba(255,215,0,0.4);
}

/* 浮动花色装饰 */
.floating-deco {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.deco-icon {
  position: absolute;
  font-size: 40px;
  opacity: 0.06;
  animation: floatDeco 6s ease-in-out infinite;
}
@keyframes floatDeco {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.06; }
  50% { transform: translateY(-30px) rotate(15deg); opacity: 0.1; }
}

.home-card {
  background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 40px 36px;
  width: 380px;
  text-align: center;
  border: 1px solid rgba(255,215,0,0.15);
  box-shadow: 0 16px 48px rgba(0,0,0,0.4);
  position: relative;
  z-index: 1;
}

/* Logo 区域 */
.logo-area {
  margin-bottom: 24px;
}
.logo-icon {
  font-size: 48px;
  margin-bottom: 4px;
  animation: bounce 2s ease-in-out infinite;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.title {
  font-size: 38px;
  background: linear-gradient(135deg, #ffd700, #ff8c00, #ffd700);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 900;
  letter-spacing: 4px;
  text-shadow: none;
  margin-bottom: 4px;
}
.subtitle {
  color: rgba(255,215,0,0.5);
  font-size: 13px;
  letter-spacing: 2px;
}

/* 单人按钮 */
.btn-single {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 18px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #f7971e, #ffd200);
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(247,151,30,0.3);
  margin-bottom: 8px;
}
.btn-single:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 28px rgba(247,151,30,0.45);
}
.btn-single:active {
  transform: translateY(0);
}
.btn-icon { font-size: 28px; }
.btn-text {
  font-size: 18px;
  font-weight: 800;
  color: #3d2000;
  letter-spacing: 3px;
}
.btn-desc {
  font-size: 11px;
  color: rgba(61,32,0,0.6);
}

.divider {
  display: flex;
  align-items: center;
  margin: 16px 0;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,215,0,0.2), transparent);
}
.divider-text {
  padding: 0 12px;
  color: rgba(255,215,0,0.4);
  font-size: 12px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.tabs button {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}
.tabs button.active {
  background: rgba(255,215,0,0.1);
  color: #ffd700;
  border-color: rgba(255,215,0,0.3);
}
.tabs button:hover:not(.active) {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}
.input-label {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  padding-left: 2px;
}
.input {
  padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  color: white;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input::placeholder { color: rgba(255,255,255,0.2); }
.input:focus {
  border-color: #ffd700;
  box-shadow: 0 0 0 3px rgba(255,215,0,0.08);
}

.btn {
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s;
}
.btn.primary {
  background: linear-gradient(135deg, #ffd700, #f5a623);
  color: #1a1a2e;
}
.btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255,215,0,0.25);
}

.error {
  margin-top: 12px;
  color: #ff6b6b;
  font-size: 13px;
}
</style>
