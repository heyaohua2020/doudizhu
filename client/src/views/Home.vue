<template>
  <div class="home">
    <h1>斗地主</h1>
    <p>加载中...</p>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ enterRoom: [roomId: string] }>()
</script>

<style scoped>
.home {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  color: white;
}
</style>
