'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Avatar, Button, makeStyles, Spinner, tokens } from '@fluentui/react-components'
import { getMentionQuery, insertMention, parseMentions, serializeMention } from './mentions.js'
import { defaultEmoticons, findEmoticon } from './emoticons.js'
import type { EmoticonMap } from './emoticons.js'
import type { CommentThreadError, CommentThreadLabels, MentionSuggestion } from './types.js'

const useStyles = makeStyles({
  composer: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    flex: 1,
    minWidth: 0,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    borderBottomColor: tokens.colorNeutralStrokeAccessible,
    '&:focus-within': {
      outline: `2px solid ${tokens.colorBrandStroke1}`,
      outlineOffset: '-1px',
    },
  },
  editor: {
    boxSizing: 'border-box',
    flex: 1,
    minWidth: 0,
    minHeight: '36px',
    maxHeight: '120px',
    padding: '8px 12px',
    overflowY: 'auto',
    overflowX: 'hidden',
    outline: 'none',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground1,
    '&[data-placeholder]:empty::before': {
      content: 'attr(data-placeholder)',
      color: tokens.colorNeutralForeground4,
      pointerEvents: 'none',
    },
    '&[contenteditable="false"]': {
      cursor: 'not-allowed',
    },
  },
  mention: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    borderRadius: tokens.borderRadiusCircular,
    padding: '0 6px',
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase300,
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  suggestionList: {
    position: 'absolute',
    zIndex: 10,
    bottom: 'calc(100% + 6px)',
    left: 0,
    width: '100%',
    maxHeight: '200px',
    overflowY: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
  },
  suggestion: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    border: 0,
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground1,
    textAlign: 'start',
    cursor: 'pointer',
    '&:hover, &[aria-selected="true"]': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  suggestionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    color: tokens.colorNeutralForeground3,
  },
})

interface CommentComposerProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  labels: CommentThreadLabels
  contactSearch?: (query: string, signal: AbortSignal) => Promise<MentionSuggestion[]>
  mentionLimit?: number
  filterMentionSuggestions?: (suggestion: MentionSuggestion, query: string) => boolean
  renderError?: (error: CommentThreadError) => ReactNode
  emoticons?: boolean | EmoticonMap
  richText?: boolean
  disabled?: boolean
  sendButton?: boolean
  focusOnReply?: boolean
}

const formatShortcuts: Record<string, string> = { b: '**', i: '*', e: '`' }

function readEditor(element: Node): string {
  if (element.nodeType === Node.TEXT_NODE) return element.textContent ?? ''
  if (element instanceof HTMLElement) {
    if (element.dataset.contactId) {
      return serializeMention({
        id: element.dataset.contactId,
        name: element.dataset.name ?? element.textContent ?? '',
      })
    }
    if (element.tagName === 'BR') return '\n'
  }
  return Array.from(element.childNodes, (child, index) => {
    const isNewLine = index > 0 && child instanceof HTMLElement && child.tagName === 'DIV'
    return `${isNewLine ? '\n' : ''}${readEditor(child)}`
  }).join('')
}

export function CommentComposer({
  id,
  value,
  onChange,
  onSubmit,
  placeholder,
  labels,
  contactSearch,
  mentionLimit,
  filterMentionSuggestions,
  renderError,
  emoticons = false,
  richText = false,
  disabled = false,
  sendButton = false,
  focusOnReply = false,
}: CommentComposerProps) {
  const styles = useStyles()
  const editor = useRef<HTMLDivElement>(null)
  const lastEmoticon = useRef<{
    node: Text
    start: number
    emoticon: string
    emoji: string
  } | null>(null)
  const emoticonMap =
    emoticons === false ? undefined : emoticons === true ? defaultEmoticons : emoticons
  const listId = useId()
  const [focused, setFocused] = useState(false)
  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null)
  const [selected, setSelected] = useState(0)
  const [searchResult, setSearchResult] = useState<{
    query: string | null
    suggestions: MentionSuggestion[]
    loading: boolean
    failed: boolean
    cause?: unknown
  }>({ query: null, suggestions: [], loading: false, failed: false })
  const query = getMentionQuery(value)
  const showSuggestions =
    focused && query !== null && query !== dismissedQuery && contactSearch !== undefined
  const hasCurrentSearch = query !== null && searchResult.query === query
  const suggestions = hasCurrentSearch ? searchResult.suggestions : []
  const searching = showSuggestions && (!hasCurrentSearch || searchResult.loading)
  const searchFailed = hasCurrentSearch && searchResult.failed
  const activeIndex = Math.min(selected, Math.max(0, suggestions.length - 1))
  const suggestionLimit =
    mentionLimit === undefined || !Number.isFinite(mentionLimit)
      ? undefined
      : Math.max(0, Math.floor(mentionLimit))

  useEffect(() => {
    if (!showSuggestions || query === null || !contactSearch) return

    const controller = new AbortController()
    let active = true
    const timeout = window.setTimeout(async () => {
      setSearchResult({ query, suggestions: [], loading: true, failed: false })
      try {
        const results = await contactSearch(query, controller.signal)
        if (active && !controller.signal.aborted) {
          const validResults = results
            .filter((item) => item.id.trim() && item.name.trim())
            .filter((item) => filterMentionSuggestions?.(item, query) ?? true)
          setSearchResult({
            query,
            suggestions:
              suggestionLimit === undefined ? validResults : validResults.slice(0, suggestionLimit),
            loading: false,
            failed: false,
          })
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setSearchResult({ query, suggestions: [], loading: false, failed: true, cause })
        }
      }
    }, 200)

    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [contactSearch, filterMentionSuggestions, query, showSuggestions, suggestionLimit])

  useEffect(() => {
    if (focusOnReply) editor.current?.focus()
  }, [focusOnReply])

  useEffect(() => {
    const element = editor.current
    if (!element || readEditor(element) === value) return

    const nodes = parseMentions(value).map((part) => {
      if (part.contactId === undefined) return document.createTextNode(part.text)
      const span = document.createElement('span')
      span.className = styles.mention
      span.contentEditable = 'false'
      span.dataset.contactId = part.contactId
      span.dataset.name = part.text
      span.textContent = part.text
      return span
    })
    element.replaceChildren(...nodes)
    if (document.activeElement === element) {
      const range = document.createRange()
      range.selectNodeContents(element)
      range.collapse(false)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [styles.mention, value])

  function replaceEmoticon() {
    lastEmoticon.current = null
    const selection = window.getSelection()
    const node = selection?.anchorNode
    if (!emoticonMap || !selection?.isCollapsed || node?.nodeType !== Node.TEXT_NODE) return
    if (node.parentElement !== editor.current) return

    const text = node as Text
    const caret = selection.anchorOffset
    const match = findEmoticon(text.data.slice(0, caret), emoticonMap)
    if (!match) return
    text.replaceData(match.start, match.emoticon.length, match.emoji)
    selection.collapse(text, caret - match.emoticon.length + match.emoji.length)
    lastEmoticon.current = { node: text, ...match }
  }

  // Backspace or Ctrl/Cmd+Z right after a replacement restores the typed emoticon. Native undo
  // cannot do this because the replacement was a programmatic edit.
  function revertEmoticon(): boolean {
    const last = lastEmoticon.current
    const selection = window.getSelection()
    if (!last || !selection?.isCollapsed || selection.anchorNode !== last.node) return false
    const end = last.start + last.emoji.length + 1
    if (
      selection.anchorOffset !== end ||
      last.node.data.slice(last.start, end - 1) !== last.emoji
    ) {
      return false
    }
    last.node.replaceData(last.start, last.emoji.length, last.emoticon)
    selection.collapse(last.node, last.start + last.emoticon.length + 1)
    lastEmoticon.current = null
    return true
  }

  // Wraps the selection (or inserts an empty pair at the caret) in Markdown markers, or removes
  // them when the selection is already wrapped. Selections that cross a mention are left alone.
  function toggleMarker(marker: string) {
    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null
    const node = range?.startContainer
    if (!selection || !range || node !== range.endContainer) return
    if (node.nodeType !== Node.TEXT_NODE || node.parentElement !== editor.current) return

    const text = node as Text
    const { startOffset: start, endOffset: end } = range
    const before = text.data.slice(0, start)
    const selected = text.data.slice(start, end)
    const after = text.data.slice(end)
    const size = marker.length
    const wrapped =
      before.endsWith(marker) &&
      after.startsWith(marker) &&
      !(marker === '*' && before.endsWith('**') && after.startsWith('**'))

    if (wrapped) {
      text.data = before.slice(0, -size) + selected + after.slice(size)
      selection.setBaseAndExtent(text, start - size, text, end - size)
    } else {
      text.data = before + marker + selected + marker + after
      selection.setBaseAndExtent(text, start + size, text, end + size)
    }
    onChange(readEditor(editor.current!))
  }

  function chooseSuggestion(index: number) {
    const suggestion = suggestions[index]
    if (!suggestion || query === null) return
    onChange(insertMention(value, suggestion))
    setSelected(0)
    setDismissedQuery(null)
    editor.current?.focus()
  }

  const listOpen =
    showSuggestions &&
    (searching ||
      searchFailed ||
      suggestions.length > 0 ||
      (hasCurrentSearch && !searchResult.loading))
  // Only a list that actually has options is a listbox; loading, empty, and error messages are
  // announced as statuses beside it because a listbox may not contain anything but options.
  const optionsOpen = listOpen && suggestions.length > 0

  return (
    <div className={styles.composer}>
      {listOpen && (
        <div className={styles.suggestionList}>
          {searching && (
            <div className={styles.suggestionStatus} role="status">
              <Spinner size="tiny" aria-hidden="true" />
              {labels.loading}
            </div>
          )}
          {!searching &&
            searchFailed &&
            (renderError ? (
              renderError({
                type: 'mention-search',
                message: labels.mentionSearchFailed,
                cause: searchResult.cause,
              })
            ) : (
              <div className={styles.suggestionStatus} role="status">
                {labels.mentionSearchFailed}
              </div>
            ))}
          {!searching && !searchFailed && suggestions.length === 0 && (
            <div className={styles.suggestionStatus} role="status">
              {labels.noMentions}
            </div>
          )}
          {optionsOpen && (
            <div id={listId} role="listbox" aria-label={labels.mentionList}>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={styles.suggestion}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(index)}
                >
                  <Avatar
                    size={24}
                    name={suggestion.name}
                    image={suggestion.avatarUrl ? { src: suggestion.avatarUrl } : undefined}
                  />
                  {suggestion.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div
        ref={editor}
        id={id}
        className={styles.editor}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={placeholder}
        aria-autocomplete="list"
        aria-expanded={optionsOpen}
        aria-controls={optionsOpen ? listId : undefined}
        aria-activedescendant={optionsOpen ? `${listId}-${activeIndex}` : undefined}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={(event) => {
          const native = event.nativeEvent as InputEvent
          if (native.inputType === 'insertText' && !native.isComposing) replaceEmoticon()
          else lastEmoticon.current = null
          onChange(readEditor(event.currentTarget))
          setSelected(0)
          setDismissedQuery(null)
        }}
        onPaste={(event) => {
          event.preventDefault()
          const selection = window.getSelection()
          const element = event.currentTarget
          const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null
          const range =
            selectedRange && element.contains(selectedRange.commonAncestorContainer)
              ? selectedRange
              : document.createRange()
          if (range !== selectedRange) {
            range.selectNodeContents(element)
            range.collapse(false)
          }
          range.deleteContents()
          const text = document.createTextNode(event.clipboardData.getData('text/plain'))
          range.insertNode(text)
          range.setStartAfter(text)
          range.collapse(true)
          selection?.removeAllRanges()
          selection?.addRange(range)
          onChange(readEditor(event.currentTarget))
        }}
        onKeyDown={(event) => {
          // Safari fires compositionend before the keydown that confirms an IME candidate, so
          // isComposing is already false there; keyCode 229 still marks it as IME input.
          if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
          const modifier = event.ctrlKey || event.metaKey
          if (
            (event.key === 'Backspace' ||
              (modifier && !event.shiftKey && event.key.toLowerCase() === 'z')) &&
            revertEmoticon()
          ) {
            event.preventDefault()
            onChange(readEditor(event.currentTarget))
            return
          }
          if (richText && modifier && !event.altKey && !event.shiftKey) {
            const marker = formatShortcuts[event.key.toLowerCase()]
            if (marker) {
              event.preventDefault()
              toggleMarker(marker)
              return
            }
          }
          if (
            listOpen &&
            suggestions.length &&
            (event.key === 'ArrowDown' || event.key === 'ArrowUp')
          ) {
            event.preventDefault()
            setSelected(
              (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) %
                suggestions.length,
            )
          } else if (listOpen && event.key === 'Escape') {
            event.preventDefault()
            setDismissedQuery(query)
          } else if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if (listOpen && suggestions.length) chooseSuggestion(activeIndex)
            else if (!searching && !disabled && value.trim()) onSubmit()
          }
        }}
      />
      {sendButton && (
        <Button
          appearance="transparent"
          size="small"
          aria-label={labels.sendReply}
          disabled={disabled || !value.trim()}
          onClick={onSubmit}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="m3 3 14 7-14 7 2-7-2-7Zm2 7h12"
                stroke="currentColor"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      )}
    </div>
  )
}
