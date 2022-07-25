import { ViteSSG } from 'vite-ssg'
import 'uno.css'
import '~/styles/main.css'
import '~/styles/markdown.css'
import '~/styles/prose.css'
import App from './App.vue'
import routes from '~pages'
import type { RouterScrollBehavior } from 'vue-router'

const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (to.hash) {
    return {
      el: decodeURIComponent(to.hash),
      top: 20,
      behavior: 'smooth',
    }
  } else if (savedPosition) {
    return savedPosition
  } else {
    return { top: 0, behavior: 'smooth' }
  }
}

export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
)
