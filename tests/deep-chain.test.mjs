import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CommentThread } from '../dist/CommentThread.js'

// Keep these in their own file: React's server renderer silently drops deeply nested content while
// the process is still cold (unoptimized stack frames are larger), and node --test gives each file
// a fresh process, so the first render here is the one that exposes it.
const author = { id: 'user', name: 'A User' }
const reply = (id, parentId, day = 1) => ({
  id,
  parentId,
  author,
  text: `body-${id}`,
  createdAt: `2026-01-0${day}T00:00:00Z`,
})
const chain = (length) =>
  Array.from({ length }, (_, level) => reply(String(level), level === 0 ? null : String(level - 1)))
const render = (comments, props) =>
  renderToStaticMarkup(
    createElement(CommentThread, {
      comments,
      currentUser: author,
      onCreate: async () => {},
      ...props,
    }),
  )
const divDepth = (markup) => {
  let depth = 0
  let deepest = 0
  for (const [tag] of markup.matchAll(/<\/?div\b[^>]*>/g)) {
    depth += tag.startsWith('</') ? -1 : 1
    deepest = Math.max(deepest, depth)
  }
  return deepest
}

test('a very deep reply chain renders completely, in order, with bounded DOM depth', () => {
  const markup = render(chain(300))
  assert.deepEqual(
    markup.match(/body-\d+/g),
    Array.from({ length: 300 }, (_, level) => `body-${level}`),
  )
  assert.equal(divDepth(markup), divDepth(render(chain(30))))
})

test('replies below the flatten depth keep their reading order in branching threads', () => {
  // Comment 10 is the first one that is listed flat; everything under it follows in reading order.
  const markup = render([
    ...chain(11),
    reply('A', '10', 2),
    reply('A1', 'A', 3),
    reply('B', '10', 4),
    reply('B1', 'B', 5),
  ])
  assert.deepEqual(markup.match(/body-[A-Z]\d?/g), ['body-A', 'body-A1', 'body-B', 'body-B1'])
})

test('maxDepth raises the depth at which replies stop nesting', () => {
  assert.ok(divDepth(render(chain(60), { maxDepth: 30 })) > divDepth(render(chain(60))))
})
