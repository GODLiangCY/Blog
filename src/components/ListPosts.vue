<script setup lang="ts">
import { parseDate } from '~/lib/day'
import type { Post } from '~/types'

const router = useRouter()

const postsRoutes: Post[] = router.getRoutes()
  .filter(i => i.path.match(/^\/posts\/.*$/))
  .sort((a, b) => {
    return parseDate(b.meta.frontmatter.date) - parseDate(a.meta.frontmatter.date)
  })
  .map(i => ({
    ...i.meta.frontmatter,
    path: i.path
  }))

const posts = postsRoutes
</script>
<template>
  <div>
    <post-item v-for="post in posts" :key="post.path" v-bind="post" />
  </div>
</template>

<style scoped>

</style>
