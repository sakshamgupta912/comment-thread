import type { MentionSuggestion } from './types.js'

export interface MentionPart {
  text: string
  contactId?: string
}

const mentionPattern = /@\[((?:\\.|[^\]\\])+)\]\(([^)\s]+)\)/g

export function serializeMention(suggestion: MentionSuggestion): string {
  const name = suggestion.name.replaceAll('\\', '\\\\').replaceAll(']', '\\]')
  const encodedId = encodeURIComponent(suggestion.id).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
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
  return text.match(/(?:^|\s)@([\w]*)$/)?.[1] ?? null
}
