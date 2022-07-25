<script setup lang="ts">
import { parseDate } from '~/lib/day'
import type { Post } from '~/types'

const router = useRouter()

const tag = ref('')

function choseTag(name: string) {
  if (!tag.value) tag.value = name
  else tag.value = ''
}

const postsRoutes: Post[] = router.getRoutes()
  .filter(i => i.path.match(/^\/posts\/.*$/))
  .sort((a, b) => {
    return parseDate(b.meta.frontmatter.date) - parseDate(a.meta.frontmatter.date)
  })
  .map(i => ({
    ...i.meta.frontmatter,
    path: i.path
  }))

const posts = computed(() => {
  return tag.value ? postsRoutes.filter(i => i.tags.includes(tag.value)) : postsRoutes
})
</script>
<template>
  <div>
    <div v-if="tag" flex>
      <span>Tag: &nbsp;&nbsp;</span>
      <span inline-flex items-center>
        <i-carbon:tag-group hover:cursor-pointer @click="choseTag(tag)"/>
        <span hover:cursor-pointer hover:underline @click="choseTag(tag)">
          {{ tag }}
        </span>
      </span>
    </div>
    <post-item v-for="post in posts" :key="post.path" v-bind="post" @tagClick="choseTag" />
  </div>
</template>

<style scoped>

</style>
