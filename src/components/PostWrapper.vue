<script setup lang="ts">
import type { FrontMatter } from '~/types'

// eslint-disable-next-line vue/no-setup-props-destructure
const { frontmatter } = defineProps<{
  frontmatter: FrontMatter
}>()

const route = useRoute()

</script>

<template>
  <div>
    <div v-if="frontmatter.title" class="prose m-auto mb-8">
      <h1 class="mb-0">
        {{ frontmatter.title }}
      </h1>
      <p v-if="frontmatter.date" class="opacity-50 !-mt-2">
        {{ frontmatter.date }} <span v-if="frontmatter.duration">· {{ frontmatter.duration }}</span>
      </p>
    </div>
    <article>
      <slot />
    </article>
    <div v-if="route.path !== '/'" class="prose m-auto mt-8 mb-8">
      <router-link
        :to="route.path.split('/').slice(0, -1).join('/') || '/'"
        class="font-mono no-underline opacity-50 hover:opacity-75"
      >
        cd ..
      </router-link>
    </div>
    <BackToTop />
  </div>
</template>

<style scoped>

</style>
