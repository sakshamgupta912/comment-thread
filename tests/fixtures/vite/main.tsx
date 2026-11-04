import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components'
import { CommentThread, removeComment } from '@fluent/comment-thread'
import type { Comment, CommentThreadLabels } from '@fluent/comment-thread'

const user = { id: 'you', name: 'You' }
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

function App() {
  const [comments, setComments] = useState(seeds)
  const [pageSize, setPageSize] = useState(2)
  const [mode, setMode] = useState('batches')
  const [dark, setDark] = useState(false)
  const [readOnly, setReadOnly] = useState(false)
  const [multiple, setMultiple] = useState(false)
  const [failure, setFailure] = useState(false)
  const [holdDelete, setHoldDelete] = useState(false)
  const releaseDelete = useRef<(() => void) | null>(null)
  const [translated, setTranslated] = useState(false)
  const [creates, setCreates] = useState(0)
  const [deletes, setDeletes] = useState(0)
  const effects = useRef(0)
  const [effectRuns, setEffectRuns] = useState(0)
  useEffect(() => {
    effects.current += 1
    const release = () => releaseDelete.current?.()
    window.addEventListener('release-delete', release)
    return () => window.removeEventListener('release-delete', release)
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
      onCreate={async (input) => {
        setCreates((count) => count + 1)
        await new Promise((resolve) => setTimeout(resolve, 80))
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
      contactSearch={async (_query, signal) => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        return [user]
      }}
    />
  )
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
