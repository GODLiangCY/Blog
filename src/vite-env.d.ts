/// <reference types="vite/client" />
/// <reference types="vite-plugin-pages/client" />
import 'vue-router'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.md' {
  import type { ComponentOptions } from 'vue'
  const Component: ComponentOptions
  export default Component
}

declare module 'vue-router' {
  export interface FrontMatter {
    title: string
    date: string
    tags: string[]
    categories?: string[]
    description: string
    words: number
    duration: string
    lastUpdateTime: string
  }
  interface RouteMeta {
    frontmatter: FrontMatter
  }
}
