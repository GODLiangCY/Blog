<script setup lang="ts">
import { useDark } from '@vueuse/core'

const isDark = useDark()

function toggleDark() {
  isDark.value = !isDark.value
}
</script>

<template>
  <a class="select-none" title="Toggle Color Scheme" @click="toggleDark">
    <div i-ri-moon-line v-show="isDark" />
    <div i-ri-sun-line v-show="!isDark" />
  </a>
</template>

<style scoped>

</style>
