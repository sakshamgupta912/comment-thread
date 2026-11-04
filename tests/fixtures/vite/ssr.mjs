import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { CommentThread, removeComment } from '@fluent/comment-thread'

const user = { id: 'you', name: 'You' }
const comments = [
  {
    id: 'ssr',
    parentId: null,
    author: user,
    text: 'Packed SSR comment',
    createdAt: '2026-01-01T00:00:00Z',
  },
]
assert.equal(typeof window, 'undefined')
assert.equal(typeof document, 'undefined')
const html = renderToStaticMarkup(
  createElement(
    FluentProvider,
    { theme: webLightTheme },
    createElement(CommentThread, { comments, currentUser: user, onCreate: async () => {} }),
  ),
)
assert.ok(html.includes('Packed SSR comment'))
assert.deepEqual(removeComment(comments, 'ssr'), [])
console.log('Packed ESM imports and server rendering passed.')
