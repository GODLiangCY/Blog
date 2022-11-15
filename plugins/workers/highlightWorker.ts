import type { Highlighter, HtmlRendererOptions, ILanguageRegistration, IThemeRegistration } from 'shiki'
import { getHighlighter as _get } from 'shiki'
import { runAsWorker } from 'synckit'

let highlighter: Highlighter

function getHighlighter(command: 'getHighlighter', options?: {
  themes: IThemeRegistration[]
  langs: ILanguageRegistration[]
}): void

function getHighlighter(command: 'codeToHtml', options: {
  code: string
  lang: string
  lineOptions?: HtmlRendererOptions['lineOptions']
  theme?: IThemeRegistration
}): Promise<string>

async function getHighlighter(command: 'getHighlighter' | 'codeToHtml', options: any) {
  if (command === 'getHighlighter') { highlighter = await _get(options ?? {}) }
  else {
    const { code, lang, lineOptions, theme } = options
    return highlighter.codeToHtml(code, {
      lang,
      lineOptions: lineOptions ?? [],
      theme,
    })
  }
}

export type TypeSyncRun = typeof getHighlighter

runAsWorker(getHighlighter)
