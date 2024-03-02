<template>
  <div>
    HEAL ME, REAL? now works?asd
  </div>
  <div>
    {{ test }}
  </div>
  <div>
    {{ MARINER_GLOBAL_VARIABLE }}
  </div>
</template>

<script setup lang="ts">
import {MARINER_GLOBAL_VARIABLE} from 'navigator:envs'
const test = import.meta.env.MARINER_LOCAL_KEY
console.log(test)
console.log(MARINER_GLOBAL_VARIABLE)
</script>

<style scoped>

</style>