import { defineConfig } from 'vite'
import { resolve } from 'path'
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
import Prism from 'markdown-it-prism'
import Anchor from 'markdown-it-anchor'
import { slugify } from './scripts/slugify'
import LinkAttributes from 'markdown-it-link-attributes'
import TOC from 'markdown-it-table-of-contents'

import 'prismjs/components/prism-javascript.js'
import 'prismjs/components/prism-typescript.js'
import 'prismjs/components/prism-json.js'
import 'prismjs/components/prism-markdown.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Vue({
      include: [/\.vue$/, /\.md$/]
    }),

    Pages({
      extensions: ['vue', 'md'],
      dirs: [
        { dir: './pages', baseRoute: '' },
        { dir: './pages/posts', baseRoute: 'posts' }
      ],
      extendRoute(route) {
        const path = resolve(__dirname, route.component.slice(1))

        const md = fs.readFileSync(path, 'utf8')
        const { data } = matter(md)
        route.meta = Object.assign(route.meta || {}, { frontmatter: data })

        return route
      }
    }),

    AutoImport({
      imports: [
        'vue',
        'vue-router'
      ],
      dts: './src/auto-imports.d.ts',
      resolvers: [
        IconsResolver()
      ],
      eslintrc: {
        enabled: true
      }
    }),

    Components({
      extensions: ['vue', 'md'],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      dts: './src/components.d.ts',
      resolvers: [
        IconsResolver()
      ]
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
        md.use(Prism)

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

      }
    })
  ],
  resolve: {
    alias: {
      '~/': `${resolve(__dirname, './src')}/`,
    }
  },
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      '@vueuse/core',
      'dayjs'
    ]
  }
})
