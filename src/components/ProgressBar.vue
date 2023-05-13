<script setup lang="ts">
import { useWindowScroll } from '@vueuse/core'

const props = defineProps<{
  el: HTMLElement
}>()

const { y } = useWindowScroll()

const windowHeight = window.innerHeight
const top = props.el.offsetTop
const elHeight = ref(props.el.clientHeight)
const scrollTotal = computed(() => y.value + windowHeight)

// I do this because an issue:
// the height of the images should be added to
// the true height of a component processed by vite-plugin-vue-markdown
// and you can't do it using onMounted and nextTick
const id = setInterval(() => {
  const val = props.el.clientHeight
  if (val !== elHeight.value) {
    elHeight.value = val
    clearInterval(id)
  }
}, 30)

const read = computed(() => {
  const val = scrollTotal.value - top
  return val < 0 ? 0 : val > elHeight.value ? elHeight.value : val
})

const progress = computed(() => {
  return (read.value / elHeight.value * 100).toFixed(2)
})
</script>

<template>
  <div class="prose m-auto" fixed bottom-8 left-12 op50 text-ellipsis>
    {{ progress }} %
  </div>
</template>

<style scoped>

</style>
