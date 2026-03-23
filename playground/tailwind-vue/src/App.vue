<script setup lang="ts">
import { ref } from 'vue'
import { useCounter } from 'navigator:shared'

const count = ref(0)
const sharedStore = useCounter()

const sharedRerenderKey = ref(0)
sharedStore.$subscribe(() => (sharedRerenderKey.value += 1))
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
    <div class="text-center space-y-6">
      <h1 class="text-4xl font-bold text-blue-400" data-testid="tw-heading">Tailwind Vue</h1>
      <p class="text-gray-400" data-testid="tw-subtitle">A microfrontend powered by Tailwind CSS 4</p>

      <div class="flex gap-4 justify-center">
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          data-testid="tw-counter"
          @click="count++"
        >
          Count is {{ count }}
        </button>
        <button
          :key="sharedRerenderKey"
          class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
          data-testid="tw-shared-counter"
          @click="sharedStore.update"
        >
          Shared count is {{ sharedStore.counter }}
        </button>
        <span class="px-4 py-2 bg-red-400 text-white rounded-lg font-medium" data-testid="tw-badge"> Red Badge </span>
      </div>

      <div class="mt-8 grid grid-cols-3 gap-4">
        <div class="p-4 bg-emerald-600 rounded-lg" data-testid="tw-card-1">Card 1</div>
        <div class="p-4 bg-amber-500 rounded-lg" data-testid="tw-card-2">Card 2</div>
        <div class="p-4 bg-purple-600 rounded-lg" data-testid="tw-card-3">Card 3</div>
      </div>
    </div>
  </div>
</template>
