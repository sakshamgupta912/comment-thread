export type EmoticonMap = Record<string, string>

export const defaultEmoticons: EmoticonMap = {
  '<3': '❤️',
  '</3': '💔',
  ':)': '🙂',
  ':-)': '🙂',
  ':(': '🙁',
  ':-(': '🙁',
  ':D': '😃',
  ':-D': '😃',
  ';)': '😉',
  ';-)': '😉',
  ':P': '😛',
  ':p': '😛',
  ':-P': '😛',
  ':O': '😮',
  ':o': '😮',
  ":'(": '😢',
  ':*': '😘',
  'B)': '😎',
}

export interface EmoticonMatch {
  /** Offset of the emoticon within the text that was searched. */
  start: number
  emoticon: string
  emoji: string
}

const trigger = /[\s.,!?]/

/**
 * Finds an emoticon that the user has just finished typing: the last character of
 * `textBeforeCaret` must be a delimiter, and the emoticon before it must stand alone, so
 * `http://x` and `a:)b` are left untouched.
 */
export function findEmoticon(textBeforeCaret: string, map: EmoticonMap): EmoticonMatch | null {
  if (!trigger.test(textBeforeCaret.at(-1) ?? '')) return null
  const body = textBeforeCaret.slice(0, -1)

  for (const emoticon of Object.keys(map).sort((a, b) => b.length - a.length)) {
    if (!body.endsWith(emoticon)) continue
    const start = body.length - emoticon.length
    if (start === 0 || /\s/.test(body[start - 1])) {
      return { start, emoticon, emoji: map[emoticon] }
    }
  }
  return null
}
