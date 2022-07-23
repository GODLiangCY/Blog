import type { FrontMatter } from './matter'

export interface Post extends FrontMatter {
  path: string
}
