import type { MentionSuggestion } from './types.js'

export interface MentionPart {
  text: string
  contactId?: string
}

const mentionPattern = /@\[((?:\\.|[^\]\\])+)\]\(([^)\s]+)\)/g
// The query being typed: letters, marks, and digits in any script, plus the hyphen and apostrophes
// that appear in personal names. Punctuation such as a sentence-ending period closes the picker.
const mentionQueryPattern = /(?:^|\s)@([\p{L}\p{M}\p{N}_'’-]*)$/u

export function serializeMention(suggestion: MentionSuggestion): string {
  const name = suggestion.name.replaceAll('\\', '\\\\').replaceAll(']', '\\]')
  const encodedId = encodeURIComponent(suggestion.id).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )
  return `@[${name}](${encodedId})`
}

export function parseMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = []
  let start = 0

  for (const match of text.matchAll(mentionPattern)) {
    const index = match.index
    if (index > start) parts.push({ text: text.slice(start, index) })

    let contactId = match[2]
    try {
      contactId = decodeURIComponent(contactId)
    } catch {
      parts.push({ text: match[0] })
      start = index + match[0].length
      continue
    }

    parts.push({
      text: match[1].replace(/\\([\\\]])/g, '$1'),
      contactId,
    })
    start = index + match[0].length
  }

  if (start < text.length) parts.push({ text: text.slice(start) })
  return parts
}

export function getMentionQuery(text: string): string | null {
  return text.match(mentionQueryPattern)?.[1] ?? null
}

/** Replaces the trailing `@query` with a serialized mention followed by a space. */
export function insertMention(text: string, suggestion: MentionSuggestion): string {
  return text.replace(mentionQueryPattern, (match) => {
    const prefix = match.startsWith('@') ? '' : match.slice(0, match.lastIndexOf('@'))
    return `${prefix}${serializeMention(suggestion)} `
  })
}
