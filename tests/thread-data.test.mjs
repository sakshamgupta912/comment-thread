import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCommentIndex } from '../dist/thread-data.js'
import { removeComment, updateComment } from '../dist/index.js'
import { CommentThread } from '../dist/CommentThread.js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  getMentionQuery,
  insertMention,
  parseMentions,
  serializeMention,
} from '../dist/mentions.js'
import { formatRelativeTime } from '../dist/relative-time.js'

const author = { id: 'user-1', name: 'A User' }
const comment = (id, parentId, text = id) => ({
  id,
  parentId,
  text,
  author,
  createdAt: '2026-01-01T00:00:00.000Z',
})
const chain = (length) =>
  Array.from({ length }, (_, level) => comment(`c${level}`, level === 0 ? null : `c${level - 1}`))
const render = (props) =>
  renderToStaticMarkup(
    createElement(CommentThread, { currentUser: author, onCreate: async () => {}, ...props }),
  )

test('indexes parents, stable roots, and reply depths', () => {
  const index = createCommentIndex([
    comment('root', null),
    comment('reply', 'root'),
    comment('nested', 'reply'),
  ])
  assert.equal(index.depthById.get('nested'), 2)
  assert.equal(index.rootIdById.get('nested'), 'root')
  assert.equal(index.childrenByParent.get('root')?.[0]?.id, 'reply')
})

test('rejects duplicate IDs, missing parents, cycles, and invalid dates', () => {
  assert.throws(
    () => createCommentIndex([comment('same', null), comment('same', null)]),
    /Duplicate/,
  )
  assert.throws(() => createCommentIndex([comment('orphan', 'missing')]), /missing parent/)
  assert.throws(() => createCommentIndex([comment('a', 'b'), comment('b', 'a')]), /circular/)
  assert.throws(
    () => createCommentIndex([{ ...comment('bad', null), createdAt: 'not-a-date' }]),
    /invalid date/,
  )
})

test('requires timezone-qualified ISO timestamps and rejects normalized invalid calendar dates', () => {
  for (const createdAt of [
    '2026-01-01',
    '01/01/2026',
    '2026-01-01T10:00:00',
    '2026-02-29T00:00:00Z',
    '2026-04-31T00:00:00Z',
    '2026-01-01T24:00:00Z',
  ]) {
    assert.throws(
      () => createCommentIndex([{ ...comment('date', null), createdAt }]),
      /invalid date/,
    )
  }
  for (const createdAt of ['2024-02-29T23:59:59Z', '2026-01-01T10:00:00.1234567+05:30']) {
    assert.equal(createCommentIndex([{ ...comment('date', null), createdAt }]).roots.length, 1)
  }
})

test('invalid comment data can be localized without exposing internal English diagnostics', () => {
  const markup = renderToStaticMarkup(
    createElement(CommentThread, {
      comments: [comment('orphan', 'missing')],
      currentUser: author,
      onCreate: async () => {},
      labels: { invalidComments: () => 'Invalid data (translated)' },
    }),
  )
  assert.ok(markup.includes('Invalid data (translated)'))
  assert.ok(!markup.includes('missing parent'))
})

test('removes a comment subtree without mutating or orphaning other comments', () => {
  const comments = [
    comment('nested', 'reply'),
    comment('root', null),
    comment('reply', 'root'),
    comment('sibling', 'root'),
    comment('other', null),
  ]
  const next = removeComment(comments, 'reply')
  assert.deepEqual(
    next.map((entry) => entry.id),
    ['root', 'sibling', 'other'],
  )
  assert.equal(comments.length, 5)
  assert.equal(createCommentIndex(next).roots.length, 2)
  assert.deepEqual(
    removeComment(comments, 'root').map((entry) => entry.id),
    ['other'],
  )
  assert.deepEqual(removeComment([comment('only', null)], 'only'), [])
  assert.throws(() => removeComment(comments, 'missing'), /no longer exists/)
})

test('delete actions are opt-in, author-only by default, overridable, and hidden in read-only mode', () => {
  const props = {
    comments: [
      comment('own', null),
      { ...comment('other', null), author: { id: 'other', name: 'Other User' } },
    ],
    currentUser: author,
    onCreate: async () => {},
    labels: { delete: 'Remove entry' },
  }
  const countActions = (overrides) => {
    const markup = renderToStaticMarkup(createElement(CommentThread, { ...props, ...overrides }))
    assert.ok(!markup.includes('>Remove entry<'))
    return markup.match(/aria-label="Remove entry"/g)?.length ?? 0
  }
  assert.equal(countActions({}), 0)
  assert.equal(countActions({ onDelete: async () => {} }), 1)
  assert.equal(countActions({ onDelete: async () => {}, canDelete: () => true }), 2)
  assert.equal(countActions({ onDelete: async () => {}, canDelete: () => false }), 0)
  assert.equal(countActions({ onDelete: async () => {}, readOnly: true }), 0)
})

test('edit actions are opt-in, author-only by default, overridable, and hidden in read-only mode', () => {
  const props = {
    comments: [
      comment('own', null),
      { ...comment('other', null), author: { id: 'other', name: 'Other User' } },
    ],
    currentUser: author,
    onCreate: async () => {},
    labels: { edit: 'Modify entry' },
  }
  const countActions = (overrides) =>
    renderToStaticMarkup(createElement(CommentThread, { ...props, ...overrides })).match(
      /aria-label="Modify entry"/g,
    )?.length ?? 0
  assert.equal(countActions({}), 0)
  assert.equal(countActions({ onEdit: async () => {} }), 1)
  assert.equal(countActions({ onEdit: async () => {}, canEdit: () => true }), 2)
  assert.equal(countActions({ onEdit: async () => {}, canEdit: () => false }), 0)
  assert.equal(countActions({ onEdit: async () => {}, readOnly: true }), 0)
})

test('updates one comment text without mutating the list', () => {
  const comments = [comment('a', null, 'old'), comment('b', null, 'keep')]
  const next = updateComment(comments, 'a', 'new')
  assert.deepEqual(
    next.map((entry) => entry.text),
    ['new', 'keep'],
  )
  assert.equal(comments[0].text, 'old')
  assert.throws(() => updateComment(comments, 'missing', 'x'), /no longer exists/)
})

test('mention tokens round-trip names and opaque IDs without treating markup as HTML', () => {
  const person = { id: 'id)(<script>', name: 'A ] User\\Name' }
  const token = serializeMention(person)
  assert.deepEqual(parseMentions(`Hello ${token}! <script>`), [
    { text: 'Hello ' },
    { text: person.name, contactId: person.id },
    { text: '! <script>' },
  ])
})

test('mention queries accept names in any script and common name punctuation', () => {
  for (const [text, query] of [
    ['@', ''],
    ['hi @Jo', 'Jo'],
    ['@José', 'José'],
    ['@Zoë', 'Zoë'],
    ['@李雷', '李雷'],
    ["@O'Brien", "O'Brien"],
    ['@Anne-Marie', 'Anne-Marie'],
    ['first line\n@Åsa', 'Åsa'],
  ]) {
    assert.equal(getMentionQuery(text), query, text)
  }
  for (const text of ['no mention', 'a@b', 'Hi @Alex.', 'Hi @Alex hello', '@[Alex](alex)']) {
    assert.equal(getMentionQuery(text), null, text)
  }
})

test('inserting a mention replaces only the query being typed', () => {
  const person = { id: 'jose', name: 'José Álvarez' }
  const token = serializeMention(person)
  assert.equal(insertMention('Thanks @Jos', person), `Thanks ${token} `)
  assert.equal(insertMention('@', person), `${token} `)
  assert.equal(insertMention('line one\n@Zo', person), `line one\n${token} `)
  assert.equal(insertMention('@Alex @Jo', person), `@Alex ${token} `)
  assert.deepEqual(parseMentions(insertMention('@José', person)), [
    { text: person.name, contactId: person.id },
    { text: ' ' },
  ])
})

test('reply chains are indexed without recursion, whatever order they are listed in', () => {
  // Listing children before parents used to recurse once per level and overflow the stack.
  const index = createCommentIndex(chain(50_000).reverse())
  assert.equal(index.depthById.get('c49999'), 49_999)
  assert.equal(index.rootIdById.get('c49999'), 'c0')
  assert.equal(index.descendantCountById.get('c0'), 49_999)
})

test('maxNestingDepth rejects deeper comments and is unlimited by default', () => {
  assert.equal(createCommentIndex(chain(101), 100).depthById.get('c100'), 100)
  assert.throws(() => createCommentIndex(chain(102), 100), /nested more than 100/)
  assert.throws(() => createCommentIndex(chain(50_000).reverse(), 100), /nested more than 100/)
  for (const unlimited of [undefined, Infinity]) {
    assert.equal(createCommentIndex(chain(500), unlimited).depthById.get('c499'), 499)
  }

  assert.ok(render({ comments: chain(8), maxNestingDepth: 7 }).includes('View 7 replies'))
  assert.ok(render({ comments: chain(8), maxNestingDepth: 6 }).includes('nested more than 6'))
  assert.ok(render({ comments: chain(2), maxNestingDepth: -1 }).includes('nested more than 0'))
  for (const unlimited of [undefined, Infinity, NaN]) {
    assert.ok(render({ comments: chain(8), maxNestingDepth: unlimited }).includes('View 7 replies'))
  }
})

test('rendering a very deep chain does not overflow the call stack', () => {
  // Rendering used to recurse once per reply level and threw at roughly 2,000 levels.
  assert.ok(render({ comments: chain(3_000) }).includes('View 2999 replies'))
})

test('the index counts every descendant of each comment', () => {
  const index = createCommentIndex([
    comment('nested', 'reply'),
    comment('reply', 'root'),
    comment('sibling', 'root'),
    comment('root', null),
    comment('other', null),
  ])
  assert.deepEqual(
    ['root', 'reply', 'nested', 'sibling', 'other'].map((id) => index.descendantCountById.get(id)),
    [3, 1, 0, 0, 0],
  )
})

test('malformed comments produce clear data errors instead of runtime exceptions', () => {
  assert.throws(() => createCommentIndex([null]), /non-empty ID/)
  assert.throws(() => createCommentIndex([{ ...comment('x', null), id: 42 }]), /non-empty ID/)
  assert.throws(
    () => createCommentIndex([{ ...comment('x', null), author: undefined }]),
    /invalid author/,
  )
  assert.throws(
    () => createCommentIndex([{ ...comment('x', null), author: { id: 'user' } }]),
    /invalid author/,
  )
})

test('undefined label overrides keep the default labels', () => {
  const markup = render({
    comments: [comment('a', null), comment('b', 'a')],
    labels: {
      title: undefined,
      viewReplies: undefined,
      commentsCount: undefined,
      replyTo: undefined,
      post: 'Send',
    },
  })
  assert.ok(markup.includes('>Comment feed<'))
  assert.ok(markup.includes('View 1 reply'))
  assert.ok(markup.includes('2 comment posts'))
  assert.ok(markup.includes('>Send<'))
})

test('renderError receives typed errors that keep the original cause', () => {
  const received = []
  const renderError = (error) => {
    received.push(error)
    return createElement('p', null, `custom ${error.type}`)
  }

  const invalid = render({ comments: [comment('orphan', 'missing')], renderError })
  const load = render({ comments: [], error: 'Backend offline', renderError })
  assert.ok(invalid.includes('custom invalid-comments'))
  assert.ok(load.includes('custom load'))
  assert.deepEqual(
    received.map(({ type }) => type),
    ['invalid-comments', 'load'],
  )
  assert.ok(received[0].cause instanceof Error)
  assert.match(received[0].cause.message, /missing parent/)
  assert.equal(received[1].message, 'Backend offline')
})

test('the title heading level is configurable and falls back to 2', () => {
  const level = (headingLevel) => render({ comments: [], headingLevel }).match(/<h(\d)\b/)?.[1]
  assert.equal(level(undefined), '2')
  assert.equal(level(3), '3')
  assert.equal(level(6), '6')
  for (const invalid of [0, 7, 2.5, Number.NaN, '3']) assert.equal(level(invalid), '2')
})

test('Reply and Delete buttons are described by their comment author and time', () => {
  const markup = render({
    comments: [comment('a', null), comment('b', 'a')],
    onDelete: async () => {},
    canDelete: () => true,
  })
  const descriptions = [...markup.matchAll(/aria-describedby="([^"]+)"/g)]
  assert.equal(descriptions.length, 4)
  for (const [, ids] of descriptions) {
    for (const id of ids.split(' ')) assert.ok(markup.includes(`id="${id}"`), `Missing ${id}`)
  }
  assert.ok(markup.includes('aria-label="Delete"'))
  assert.ok(markup.includes('>Reply<'))
})

test('the component adds no sectioning landmarks to its host page', () => {
  const markup = render({ comments: [comment('a', null)] })
  assert.ok(!/<(header|footer|nav|aside|main|section)\b/.test(markup))
})

test('relative times scale from seconds to years', () => {
  const now = Date.parse('2026-06-15T12:00:00Z')
  const ago = (seconds) => formatRelativeTime(new Date(now - seconds * 1000), now)
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })
  const day = 86_400
  assert.equal(ago(30), format.format(-30, 'second'))
  assert.equal(ago(5 * 60), format.format(-5, 'minute'))
  assert.equal(ago(3 * 3600), format.format(-3, 'hour'))
  assert.equal(ago(2 * day), format.format(-2, 'day'))
  assert.equal(ago(15 * day), format.format(-2, 'week'))
  assert.equal(ago(75 * day), format.format(-2, 'month'))
  assert.equal(ago(364 * day), format.format(-11, 'month'))
  assert.equal(ago(3 * 365 * day), format.format(-3, 'year'))
  assert.equal(ago(-3600), format.format(-0, 'second'))
})
