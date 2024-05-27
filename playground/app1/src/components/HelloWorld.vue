<script setup lang="ts">
import { ref } from 'vue'
import { useCounter } from 'navigator:shared'

const startLazyNavigator = async () => {
  const { lazy } = await import('navigator:lazy')

  lazy()
}

defineProps<{ msg: string }>()

const count = ref(0)

const increase = () => {
  count.value++
}

const counterStore = useCounter()

const rerenderKey = ref(0)

// for reactivity use the same Vue instance
counterStore.$subscribe(() => rerenderKey.value +=1)


</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="increase">count is {{ count }}</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
    <button :key="rerenderKey" type="button" @click="counterStore.update">Shared store count is {{ counterStore.counter }}</button>
    <button @click="startLazyNavigator"> Import lazy navigator</button>
  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Install
    <a href="https://github.com/vuejs/language-tools" target="_blank">Volar</a>
    in your IDE for a better DX
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
