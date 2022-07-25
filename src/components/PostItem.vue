<script setup lang="ts">
import type { Post } from '~/types'
import it from 'markdown-it'

const props: Readonly<Post> = defineProps<{
  categories: string[],
  date: string,
  duration: string,
  path: string,
  title: string,
  description: string,
  tags: string[],
  words: number,
}>()

const md = new it()
const desc = md.render(props.description)

</script>

<template>
  <div>
    <router-link
      :to="props.path"
      block font-normal mb-6 mt-2 no-underline
    >
      <h2>{{ props.title }}</h2>
    </router-link>
    <div flex items-center justify-between>
      <span flex items-center><i-ant-design:calendar-twotone mr-3 />{{ props.date }}</span>
      <span flex items-center><i-bi:book mr-3 />{{ props.words }}</span>
      <span flex items-center><i-fluent:timer-24-filled mr-3 />{{ props.duration }}</span>
    </div>
    <div v-html="desc" class="prose mt-1">
    </div>
  </div>
</template>

<style scoped>

</style>
