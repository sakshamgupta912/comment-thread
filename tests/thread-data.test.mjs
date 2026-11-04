import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCommentIndex } from '../dist/thread-data.js'
import { removeComment } from '../dist/index.js'
import { CommentThread } from '../dist/CommentThread.js'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { parseMentions, serializeMention } from '../dist/mentions.js'

const author = { id: 'user-1', name: 'A User' }
const comment = (id, parentId, text = id) => ({
  id,
  parentId,
  text,
  author,
  createdAt: '2026-01-01T00:00:00.000Z',
})

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

test('mention tokens round-trip names and opaque IDs without treating markup as HTML', () => {
  const person = { id: 'id)(<script>', name: 'A ] User\\Name' }
  const token = serializeMention(person)
  assert.deepEqual(parseMentions(`Hello ${token}! <script>`), [
    { text: 'Hello ' },
    { text: person.name, contactId: person.id },
    { text: '! <script>' },
  ])
})
