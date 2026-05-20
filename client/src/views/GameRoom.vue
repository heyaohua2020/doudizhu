<template>
  <div class="game-room">
    <p>游戏房间 {{ roomId }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ roomId: string }>()
</script>

<style scoped>
.game-room {
  height: 100%;
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
