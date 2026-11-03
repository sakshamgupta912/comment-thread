import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCommentIndex } from '../dist/thread-data.js'
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
  assert.throws(() => createCommentIndex([comment('same', null), comment('same', null)]), /Duplicate/)
  assert.throws(() => createCommentIndex([comment('orphan', 'missing')]), /missing parent/)
  assert.throws(() => createCommentIndex([comment('a', 'b'), comment('b', 'a')]), /circular/)
  assert.throws(() => createCommentIndex([{ ...comment('bad', null), createdAt: 'not-a-date' }]), /invalid date/)
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
