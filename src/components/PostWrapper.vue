<script setup lang="ts">
import type { FrontMatter } from '~/types'

const { frontmatter } = defineProps<{
  frontmatter: FrontMatter
}>()

const route = useRoute()

// the vite-plugin-vue-markdown plugin will only parse
// native frontmatter of the markdown file
// so I put time on here
const lastUpdateTime = route.meta.frontmatter.lastUpdateTime
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
    <div v-if="lastUpdateTime" class="prose m-auto mt-12 opacity-50">
      上次修改时间: {{ lastUpdateTime }}
    </div>
    <div v-if="route.path !== '/'" class="prose m-auto mt-8 mb-8">
      <router-link
        :to="route.path.split('/').slice(0, -1).join('/') || '/'"
        class="font-mono no-underline opacity-50 hover:opacity-75"
      >
        cd ..
      </router-link>
    </div>
    <ClientOnly>
      <BackToTop />
    </ClientOnly>
    <FooterBar />
  </div>
</template>

<style scoped>

</style>
