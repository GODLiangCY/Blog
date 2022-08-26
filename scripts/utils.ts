import { execaCommandSync } from 'execa'
import dayjs from 'dayjs'

export function getLastUpdateTime(filePath: string) {
  if (!/\/posts\/(?!index)/.test(filePath)) return ''
  const { stdout, stderr } = execaCommandSync(`git log ${filePath}`)
  if (stderr) return ''

  const res = stdout.match(/^Date:(.*)/m)
  if (!res) return ''
  
  const rawDate = res[1].trim()
  const date = dayjs(rawDate).format('YYYY-MM-DD, hA')
  return date
}
