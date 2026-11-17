export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'bold' | 'italic'; children: InlineNode[] }
  | { type: 'link'; href: string; children: InlineNode[] }

// Alternatives, in priority order: `code`, **bold**, *italic*, [label](https://url). Quantifiers
// are bounded so unterminated markers in long text cannot cause slow backtracking.
const inlinePattern =
  /`([^`\n]{1,500})`|\*\*([^\s*][^\n]{0,500}?\S)\*\*|\*([^\s*](?:[^*\n]{0,500}?[^\s*])?)\*|\[([^\]\n]{1,500})\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g

/** Parses the inline Markdown subset (code, bold, italic, links) into a safe node tree. */
export function parseInlineMarkdown(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let start = 0

  for (const match of text.matchAll(inlinePattern)) {
    const index = match.index
    const [raw, code, bold, italic, label, href] = match
    // `2*3*4` is arithmetic, not emphasis.
    if (italic !== undefined && /[\p{L}\p{N}]/u.test(text[index - 1] ?? '')) continue

    if (index > start) nodes.push({ type: 'text', text: text.slice(start, index) })
    if (code !== undefined) nodes.push({ type: 'code', text: code })
    else if (bold !== undefined) {
      nodes.push({ type: 'bold', children: parseInlineMarkdown(bold) })
    } else if (italic !== undefined) {
      nodes.push({ type: 'italic', children: parseInlineMarkdown(italic) })
    } else {
      nodes.push({ type: 'link', href, children: parseInlineMarkdown(label) })
    }
    start = index + raw.length
  }

  if (start < text.length) nodes.push({ type: 'text', text: text.slice(start) })
  return nodes
}
