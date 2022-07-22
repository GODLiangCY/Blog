import { ViteSSG } from 'vite-ssg'
import 'uno.css'
import '~/styles/main.css'
import '~/styles/markdown.css'
import '~/styles/prose.css'
import App from './App.vue'

import routes from '~pages'

export const app = ViteSSG(
  App,
  { routes },
)
