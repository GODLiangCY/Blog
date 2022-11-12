import { ViteSSG } from 'vite-ssg'
import 'uno.css'
import '~/styles/main.css'
import '~/styles/markdown.css'
import '~/styles/prose.css'
import type { RouterScrollBehavior } from 'vue-router'
import App from './App.vue'
import routes from '~pages'

const scrollBehavior: RouterScrollBehavior = (to, from, savedPosition) => {
  if (to.hash) {
    return {
      el: decodeURIComponent(to.hash),
      top: 20,
      behavior: 'smooth',
    }
  }
  else if (savedPosition) {
    return savedPosition
  }
  else {
    return { top: 0, behavior: 'smooth' }
  }
}

export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
)
