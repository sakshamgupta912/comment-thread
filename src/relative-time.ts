const minute = 60
const hour = 60 * minute
const day = 24 * hour

let formatter: Intl.RelativeTimeFormat | undefined

/** Compact relative time such as "5 min. ago", "yesterday", or "2 yr. ago". */
export function formatRelativeTime(date: Date, now = Date.now()): string {
  formatter ??= new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000))
  const days = Math.floor(seconds / day)
  if (days >= 365) return formatter.format(-Math.floor(days / 365), 'year')
  if (days >= 30) return formatter.format(-Math.min(11, Math.floor(days / 30)), 'month')
  if (days >= 7) return formatter.format(-Math.floor(days / 7), 'week')
  if (days >= 1) return formatter.format(-days, 'day')
  if (seconds >= hour) return formatter.format(-Math.floor(seconds / hour), 'hour')
  if (seconds >= minute) return formatter.format(-Math.floor(seconds / minute), 'minute')
  return formatter.format(-seconds, 'second')
}
