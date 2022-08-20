<script setup lang="ts">
import juejinSVG from '~/assets/juejin.svg?url'
</script>

<template>
  <header z-24>
    <router-link
      absolute lg:fixed outline-none no-underline m-6 select-none
      class="text-[2rem]"
      to="/"
      focusable="false"
    >
      ~/
    </router-link>
    <nav class="nav">
      <div class="spacer"></div>
      <div class="right">
        <router-link to="/posts" title="Blog">
          <span class="lt-md:hidden">Blog</span>
          <div i-ri-article-line md:hidden />
        </router-link>
        <a href="https://github.com/GODLiangCY" target="_blank" title="GitHub">
          <div i-uil-github-alt />
        </a>
        <a href="https://juejin.cn/user/4415278906347303" target="_blank" title="JueJin">
          <img class="w-[1.2rem] h-[1.2rem] block" alt="Juejin logo" :src="juejinSVG" />
        </a>
        <a href="/feed.xml" target="_blank" title="RSS" class="lt-md:hidden">
          <div i-la-rss-square style="font-size:1.25rem; margin: 0 -0.125rem;" />
        </a>
        <toggle-theme />
      </div>
    </nav>
  </header>
</template>

<style scoped>
.nav {
  @apply grid p-8 w-full box-border;
  grid-template-columns: auto max-content;
}

.nav > * {
  margin: auto;
}

.nav a {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.2s ease;
  opacity: 0.6;
  outline: none;
}

.nav a:hover {
  opacity: 1;
  text-decoration-color: inherit;
}

.nav .right {
  display: grid;
  grid-gap: 1.2rem;
  grid-auto-flow: column;
}

.nav .right > * {
  margin: auto;
}
</style>
