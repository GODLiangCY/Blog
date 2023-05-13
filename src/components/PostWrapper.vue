<script setup lang="ts">
import { useWindowScroll, watchThrottled } from '@vueuse/core'
import { useHead } from '@vueuse/head'
import type { FrontMatter } from '~/types'
import { getOffsetTop } from '~/utils'

const { frontmatter } = defineProps<{
  frontmatter: FrontMatter
}>()

useHead({ title: frontmatter.title })

const route = useRoute()

// the vite-plugin-vue-markdown plugin will only parse
// native frontmatter of the markdown file
// so I put time on here
const lastUpdateTime = route.meta.frontmatter.lastUpdateTime

const isPostsRoute = route.path.match(/^\/posts\/.+/)

const showProgress = isPostsRoute && frontmatter.withProgress !== false

const articleEl = ref<null | HTMLElement>(null)

onMounted(() => {
  if (isPostsRoute) {
    const toc = document.querySelector('article .table-of-contents')!
    const lists = Array.from(toc.querySelectorAll<HTMLAnchorElement>('li > a'))

    for (const item of lists)
      item.addEventListener('click', handleClick)

    // highlight current title
    const names = lists.map(i => decodeURIComponent(i.hash).slice(1))
    const tops = names.map((name) => {
      const el = document.querySelector<HTMLElement>(`#${name}`)!
      return getOffsetTop(el)
    })

    const { y } = useWindowScroll()
    const windowHeight = window.innerHeight
    const scrollDistance = computed(() => y.value + windowHeight)
    let lastIdx: null | number = null
    let idx = 0

    watchThrottled(
      scrollDistance,
      (scroll) => {
        for (let i = 0; i < tops.length; i++) {
          if (tops[i] + windowHeight * 0.7 < scroll)
            idx = i
        }
        if (idx === lastIdx)
          return
        if (lastIdx !== null)
          lists[lastIdx].classList.toggle('highlight-title')
        lists[idx!].classList.toggle('highlight-title')
        lastIdx = idx
      },
      {
        throttle: 300,
        immediate: true,
      },
    )
  }
})

function handleClick(this: HTMLAnchorElement, e: MouseEvent) {
  e.preventDefault()

  const el = document.querySelector<HTMLElement>(`${decodeURIComponent(this.hash)}`)!
  el.scrollIntoView({
    behavior: 'smooth',
  })
}

onUnmounted(() => {
  if (isPostsRoute) {
    const toc = document.querySelector('article .table-of-contents')!
    const lists = Array.from(toc.querySelectorAll<HTMLAnchorElement>('li > a'))

    for (const item of lists)
      item.removeEventListener('click', handleClick)
  }
})
</script>

<template>
  <div>
    <div v-if="route.path !== '/posts' && frontmatter.title" class="prose m-auto mb-8">
      <h1 class="mb-0">
        {{ frontmatter.title }}
      </h1>
      <p v-if="frontmatter.date" class="opacity-50 !-mt-2">
        {{ frontmatter.date }} <span v-if="frontmatter.duration">· {{ frontmatter.duration }}</span>
      </p>
    </div>
    <article ref="articleEl">
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
      <ProgressBar v-if="showProgress" :el="articleEl" />
    </ClientOnly>
    <FooterBar />
  </div>
</template>

<style>
.highlight-title {
  color: darkgreen !important;
}
</style>
