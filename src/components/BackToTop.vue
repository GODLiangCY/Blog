<script setup lang='ts'>
import { useWindowScroll, watchThrottled } from '@vueuse/core'

const toTop = ref(false)

const { y } = useWindowScroll()

watchThrottled(
  y,
  (val) => {
    if (val > 0)
      toTop.value = true
    else
      toTop.value = false
  },
  { throttle: 500 },
)

function backToTop() {
  window.scrollTo({
    behavior: 'smooth',
    top: 0,
  })
}
</script>

<template>
  <div v-show="toTop" i-emojione-monotone:top-arrow fixed cursor-pointer bottom-8 right-20 color-gray-5 style="font-size: 26px;" @click="backToTop" />
</template>

<style scoped>

</style>
