<script setup lang='ts'>
import { useScroll, watchThrottled } from '@vueuse/core'

const toTop = ref(false)

const { y } = useScroll(window)

watchThrottled(y, () => {
  if (y.value > 700) {
    toTop.value = true
  } else {
    toTop.value = false
  }
}, { throttle: 500 })

function backToTop() {
  window.scrollTo({
    behavior: 'smooth',
    top: 0
  })
}

</script>

<template>
  <div v-show="toTop" @click="backToTop" i-emojione-monotone:top-arrow fixed cursor-pointer bottom-8 right-20 color-gray-5 style="font-size: 26px;"></div>
</template>

<style scoped>


</style>
