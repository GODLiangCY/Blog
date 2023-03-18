<script setup lang="ts">
import { parseDate } from '~/lib/day'
import type { Post } from '~/types'
import { vInfiniteScroll } from '~/directives'

const router = useRouter()

const tag = ref('')
const initialNum = ref(4)

function choseTag(name: string) {
  if (!tag.value)
    tag.value = name
  else tag.value = ''
}

const allPostsRoutes: Post[] = router.getRoutes()
  .filter(i => i.path.match(/^\/posts\/.*$/))
  .sort((a, b) => {
    return parseDate(b.meta.frontmatter.date) - parseDate(a.meta.frontmatter.date)
  })
  .map(i => ({
    ...i.meta.frontmatter,
    path: i.path,
  }))

const allPostsNum = allPostsRoutes.length

function load() {
  initialNum.value + 2 <= allPostsNum
    ? initialNum.value += 2
    : initialNum.value = allPostsNum
}

const posts = computed(() => {
  return tag.value ? allPostsRoutes.filter(i => i.tags.includes(tag.value)).slice(0, initialNum.value) : allPostsRoutes.slice(0, initialNum.value)
})
</script>

<template>
  <div>
    <div v-if="tag" flex>
      <span>Tag: &nbsp;&nbsp;</span>
      <span inline-flex items-center>
        <i-carbon:tag-group hover:cursor-pointer @click="choseTag(tag)" />
        <span hover:cursor-pointer hover:underline @click="choseTag(tag)">
          {{ tag }}
        </span>
      </span>
    </div>
    <main v-infinite-scroll="load" overflow-auto>
      <post-item v-for="post in posts" :key="post.path" v-bind="post" @tag-click="choseTag" />
    </main>
  </div>
</template>

<style scoped>

</style>
