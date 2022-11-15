import { join } from 'node:path'
import type MarkdownIt from 'markdown-it'
import type { HtmlRendererOptions, ILanguageRegistration, IThemeRegistration } from 'shiki'
import { createSyncFn } from 'synckit'
import type { TypeSyncRun } from './workers/highlightWorker'

interface Options {
  theme: {
    dark: IThemeRegistration
    light: IThemeRegistration
  }
  langs: ILanguageRegistration[]
}

interface HightlightCodeOptions {
  theme?: IThemeRegistration
  lineOptions?: HtmlRendererOptions['lineOptions']
}

type HighlightCodeFn = (code: string, lang: string, options?: HightlightCodeOptions) => string

const linesRE = /{(.+)}/

// copied from vitepress's source code
const attrsToLines = (attrs: string): HtmlRendererOptions['lineOptions'] => {
  const result: number[] = []
  if (!attrs.trim())
    return []

  attrs
    .split(',')
    .map(v => v.split('-').map(v => parseInt(v, 10)))
    .forEach(([start, end]) => {
      if (start && end) {
        result.push(
          ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
        )
      }
      else {
        result.push(start)
      }
    })
  return result.map(v => ({
    line: v,
    classes: ['highlighted'],
  }))
}

const syncRun: TypeSyncRun = createSyncFn(join(__dirname, './workers/highlightWorker.ts'), { tsRunner: 'ts-node' })

export const highlightPlugin: MarkdownIt.PluginWithOptions<Options> = (md, options) => {
  const { theme, langs } = options
  const themes: IThemeRegistration[] = []
  for (const key in theme)
    themes.push(theme[key])
  syncRun('getHighlighter', { themes, langs })

  const highlightCode: HighlightCodeFn = (code, lang, options) => {
    const { lineOptions, theme } = options ?? {}
    return syncRun('codeToHtml', {
      code,
      lang,
      lineOptions,
      theme,
    }) as unknown as string
  }

  md.options.highlight = (code, lang, attrs) => {
    // simple code block
    if (!attrs || !linesRE.test(attrs)) {
      const dark = highlightCode(code, lang, { theme: theme.dark })
        .replace('<pre class="shiki"', '<pre class="shiki shiki-dark"')
      const light = highlightCode(code, lang, { theme: theme.light })
        .replace('<pre class="shiki"', '<pre class="shiki shiki-light"')
      return `<div class="shiki-container">${dark}${light}</div>`
    }

    // with highlight, like ```js {4, 5-8}
    const lines = linesRE.exec(attrs)[1]
    const lineOptions = attrsToLines(lines)

    const dark = highlightCode(code, lang, { theme: theme.dark, lineOptions })
      .replace('<pre class="shiki"', '<pre class="shiki shiki-dark"')
      .replace(/<span class="line highlighted"/gm, '<span class="line highlighted-dark"')
    const light = highlightCode(code, lang, { theme: theme.light, lineOptions })
      .replace('<pre class="shiki"', '<pre class="shiki shiki-light"')
      .replace(/<span class="line highlighted"/gm, '<span class="line highlighted-light"')
    return `<div class="shiki-container">${dark}${light}</div>`
  }
}
