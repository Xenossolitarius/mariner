<script setup lang="ts">
import DifferentName from './components/DifferentName.vue';
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <div class="bg-red-400">
    <div>APP 2</div> 
    <div>AJME111111</div>
    <img src="./assets/Mariner.png"/>
    <a href="https://vitejs.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <DifferentName />
  <HelloWorld msg="Vite + Vue" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
