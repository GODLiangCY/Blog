<script setup lang="ts">
import type { Post } from '~/types'
import it from 'markdown-it'

defineEmits<{
  (e: 'tagClick', name: string): void
}>()

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
      <span flex items-center><i-ep:timer mr-3 />{{ props.duration }}</span>
    </div>
    <div v-html="desc" class="prose mt-1">
    </div>
    <div flex items-center flex-wrap>
      <div v-for="tag of props.tags" :key="tag" flex items-center mt-4 class="basis-1/4">
        <i-carbon:tag-group hover:cursor-pointer @click="$emit('tagClick', tag)" />
        <span hover:cursor-pointer hover:underline @click="$emit('tagClick', tag)" >{{ tag }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
