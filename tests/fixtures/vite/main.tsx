import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { CommentThread, removeComment } from '@fluent/comment-thread'
import type {
  Comment,
  CommentThreadError,
  CommentThreadLabels,
  MentionSuggestion,
} from '@fluent/comment-thread'

const user = { id: 'you', name: 'You' }
const contacts: MentionSuggestion[] = [
  user,
  { id: 'jose', name: 'José Álvarez' },
  { id: 'zoe', name: 'Zoë Müller' },
  { id: 'anne', name: "Anne-Marie O'Brien" },
]
type MentionMode = 'people' | 'empty' | 'fail' | 'hang'
const params = new URLSearchParams(location.search)
const landmarkHost = params.has('landmarks')
const deep = Number(params.get('deep') ?? 0)

const excludeCurrentUser = (suggestion: MentionSuggestion) => suggestion.id !== user.id
function renderCustomError(error: CommentThreadError) {
  const cause = error.cause instanceof Error ? ` (cause: ${error.cause.message})` : ''
  return (
    <div role="alert" data-error-type={error.type}>
      {`Custom ${error.type}: ${error.message}${cause}`}
    </div>
  )
}
const seeds: Comment[] = [
  {
    id: 'main',
    parentId: null,
    author: user,
    text: 'First conversation',
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: 'reply',
    parentId: 'main',
    author: user,
    text: 'First reply',
    createdAt: '2026-01-03T01:00:00Z',
  },
  {
    id: 'second root',
    parentId: null,
    author: { id: 'other', name: 'Other' },
    text: 'Second conversation',
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'third',
    parentId: null,
    author: user,
    text: 'Third conversation',
    createdAt: '2026-01-01T00:00:00Z',
  },
]
// ?deep=N replaces the seeds with one reply chain N comments long.
const deepChain: Comment[] = Array.from({ length: deep }, (_, level) => ({
  id: `deep-${level}`,
  parentId: level === 0 ? null : `deep-${level - 1}`,
  author: user,
  text: level === 0 ? 'Deep root' : `Reply ${level}`,
  createdAt: '2026-01-04T00:00:00Z',
}))

function App() {
  const [comments, setComments] = useState(deep > 0 ? deepChain : seeds)
  const [pageSize, setPageSize] = useState(2)
  const [mode, setMode] = useState('batches')
  const [dark, setDark] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [multiple, setMultiple] = useState(false)
  const [failure, setFailure] = useState(false)
  const [holdDelete, setHoldDelete] = useState(false)
  const releaseDelete = useRef<(() => void) | null>(null)
  const [holdCreate, setHoldCreate] = useState(false)
  const releaseCreate = useRef<(() => void) | null>(null)
  const [mentionMode, setMentionMode] = useState<MentionMode>('people')
  const [limitMentions, setLimitMentions] = useState(false)
  const [filterMentions, setFilterMentions] = useState(false)
  const [customErrors, setCustomErrors] = useState(false)
  const [translated, setTranslated] = useState(false)
  const [creates, setCreates] = useState(0)
  const [deletes, setDeletes] = useState(0)
  const effects = useRef(0)
  const [effectRuns, setEffectRuns] = useState(0)
  useEffect(() => {
    effects.current += 1
    const release = () => releaseDelete.current?.()
    const releasePost = () => releaseCreate.current?.()
    window.addEventListener('release-delete', release)
    window.addEventListener('release-create', releasePost)
    return () => {
      window.removeEventListener('release-delete', release)
      window.removeEventListener('release-create', releasePost)
    }
  }, [])
  const labels: Partial<CommentThreadLabels> | undefined = translated
    ? {
        mentionList: 'People (translated)',
        postFailed: 'Post failed (translated)',
        deleteFailed: 'Delete failed (translated)',
      }
    : undefined
  const thread = (
    <CommentThread
      comments={comments}
      currentUser={user}
      pageSize={pageSize}
      pagination={mode === 'off' ? false : mode === 'all' ? 'show-all' : true}
      readOnly={readOnly}
      labels={labels}
      mentionLimit={limitMentions ? 1 : undefined}
      filterMentionSuggestions={filterMentions ? excludeCurrentUser : undefined}
      renderError={customErrors ? renderCustomError : undefined}
      richText
      emoticons
      onCreate={async (input) => {
        setCreates((count) => count + 1)
        if (holdCreate) {
          await new Promise<void>((resolve) => {
            releaseCreate.current = resolve
          })
        } else {
          await new Promise((resolve) => setTimeout(resolve, 80))
        }
        if (failure) throw new Error('')
        setComments((current) => [
          ...current,
          {
            ...input,
            id: crypto.randomUUID(),
            author: user,
            createdAt: new Date().toISOString(),
          },
        ])
      }}
      onDelete={async (comment) => {
        setDeletes((count) => count + 1)
        if (holdDelete) {
          await new Promise<void>((resolve) => {
            releaseDelete.current = resolve
          })
        }
        if (failure) throw new Error('')
        setComments((current) => removeComment(current, comment.id))
      }}
      contactSearch={async (query, signal) => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        if (mentionMode === 'fail') throw new Error('search backend down')
        if (mentionMode === 'hang') return new Promise<never>(() => {})
        if (mentionMode === 'empty') return []
        return contacts.filter((contact) =>
          contact.name.toLowerCase().includes(query.toLowerCase()),
        )
      }}
    />
  )
  if (landmarkHost) {
    return (
      <FluentProvider theme={webLightTheme}>
        <header>Host banner</header>
        <div data-testid="first">{thread}</div>
        <footer>Host footer</footer>
      </FluentProvider>
    )
  }
  return (
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme}>
      <main style={{ maxWidth: 920, margin: 'auto', padding: 8 }}>
        <h1>Consumer checks</h1>
        <label>
          Page size{' '}
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
            <option>1</option>
            <option>2</option>
            <option>3</option>
          </select>
        </label>
        <label>
          Pagination{' '}
          <select
            aria-label="Pagination"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <option value="batches">Batches</option>
            <option value="all">Show all</option>
            <option value="off">Off</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={dark}
            onChange={(event) => setDark(event.target.checked)}
          />
          Dark theme
        </label>
        <label>
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(event) => setReadOnly(event.target.checked)}
          />
          Read only
        </label>
        <label>
          <input
            type="checkbox"
            checked={multiple}
            onChange={(event) => setMultiple(event.target.checked)}
          />
          Two instances
        </label>
        <label>
          <input
            type="checkbox"
            checked={holdDelete}
            onChange={(event) => setHoldDelete(event.target.checked)}
          />
          Hold deletion
        </label>
        <label>
          <input
            type="checkbox"
            checked={failure}
            onChange={(event) => setFailure(event.target.checked)}
          />
          Fail callbacks
        </label>
        <label>
          <input
            type="checkbox"
            checked={translated}
            onChange={(event) => setTranslated(event.target.checked)}
          />
          Translated labels
        </label>
        <label>
          <input
            type="checkbox"
            checked={holdCreate}
            onChange={(event) => setHoldCreate(event.target.checked)}
          />
          Hold posting
        </label>
        <label>
          <input
            type="checkbox"
            checked={limitMentions}
            onChange={(event) => setLimitMentions(event.target.checked)}
          />
          Limit mentions
        </label>
        <label>
          <input
            type="checkbox"
            checked={filterMentions}
            onChange={(event) => setFilterMentions(event.target.checked)}
          />
          Filter mentions
        </label>
        <label>
          <input
            type="checkbox"
            checked={customErrors}
            onChange={(event) => setCustomErrors(event.target.checked)}
          />
          Custom errors
        </label>
        <label>
          Mention search{' '}
          <select
            aria-label="Mention search"
            value={mentionMode}
            onChange={(event) => setMentionMode(event.target.value as MentionMode)}
          >
            <option value="people">People</option>
            <option value="empty">No results</option>
            <option value="fail">Failure</option>
            <option value="hang">Never finishes</option>
          </select>
        </label>
        <button type="button" onClick={() => setEffectRuns(effects.current)}>
          Refresh counters
        </button>
        <output aria-label="Effect runs">{effectRuns}</output>
        <output aria-label="Create calls">{creates}</output>
        <output aria-label="Delete calls">{deletes}</output>
        <div data-testid="first">{thread}</div>
        {multiple && <div data-testid="second">{thread}</div>}
      </main>
    </FluentProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
