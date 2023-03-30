import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import fs from 'fs-extra'
import matter from 'gray-matter'
import Vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Pages from 'vite-plugin-pages'
import Components from 'unplugin-vue-components/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Unocss from 'unocss/vite'
import MarkDown from 'vite-plugin-vue-markdown'
import Anchor from 'markdown-it-anchor'
import LinkAttributes from 'markdown-it-link-attributes'
import TOC from 'markdown-it-table-of-contents'
import Shiki from 'markdown-it-shiki-extra'
import { slugify } from './scripts/slugify'
import { getLastUpdateTime } from './scripts/utils'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/],
    }),

    Pages({
      extensions: ['vue', 'md'],
      dirs: [
        { dir: './pages', baseRoute: '' },
        { dir: './pages/posts', baseRoute: 'posts' },
      ],
      extendRoute(route) {
        const path = resolve(__dirname, route.component.slice(1))

        const md = fs.readFileSync(path, 'utf8')
        const { data } = matter(md)
        route.meta = Object.assign(route.meta || {}, { frontmatter: { ...data, lastUpdateTime: getLastUpdateTime(path) } })

        return route
      },
    }),

    AutoImport({
      imports: [
        'vue',
        'vue-router',
      ],
      resolvers: [
        IconsResolver(),
      ],
    }),

    Components({
      extensions: ['vue', 'md'],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [
        IconsResolver(),
      ],
      dts: true,
    }),

    Icons(),

    Unocss(),

    MarkDown({
      wrapperComponent: 'PostWrapper',
      wrapperClasses: 'prose m-auto',
      headEnabled: true,
      markdownItOptions: {
        quotes: '""\'\'',
      },
      markdownItSetup(md) {
        md.use(Anchor, {
          slugify,
          permalink: Anchor.permalink.linkInsideHeader({
            symbol: '#',
            renderAttrs: () => ({ 'aria-hidden': 'true' }),
          }),
        })

        md.use(LinkAttributes, {
          matcher: (link: string) => /^https?:\/\//.test(link),
          attrs: {
            target: '_blank',
            rel: 'noopener',
          },
        })

        md.use(TOC, {
          includeLevel: [1, 2, 3],
          slugify,
        })

        md.use(Shiki, {
          theme: {
            dark: 'github-dark',
            light: 'github-light',
          },
        })
      },
    }),
  ],
  resolve: {
    alias: {
      '~/': `${resolve(__dirname, './src')}/`,
    },
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@vueuse/core',
      'dayjs',
      'dayjs/plugin/customParseFormat',
    ],
  },
})
