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
      include: [
        'vue',
        'vue-router'
      ],
      dts: './src/auto-imports.d.ts',
      resolvers: [
        IconsResolver()
      ]
    }),

    Components({
      extensions: ['vue', 'md'],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      dts: './src/components.d.ts'
    }),

    Icons({
      autoInstall: true,
    }),

    Unocss(),

    MarkDown({
      wrapperComponent: 'PostWrapper',
      headEnabled: true,
      markdownItOptions: {
        quotes: '""\'\'',
      },
      markdownItSetup(md) {
        // md
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
    ]
  }
})
