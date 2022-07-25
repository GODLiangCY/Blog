import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export function parseDate(date: string, format?: string): number {
  const _format = format || 'YYYY-MM-DD'
  return dayjs(date, _format).valueOf()
}
