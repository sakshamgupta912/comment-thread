import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { CommentThread } from '../dist/CommentThread.js'
import { defaultEmoticons, findEmoticon } from '../dist/emoticons.js'

test('findEmoticon replaces standalone emoticons after a delimiter', () => {
  assert.deepEqual(findEmoticon('I <3 ', defaultEmoticons), {
    start: 2,
    emoticon: '<3',
    emoji: '❤️',
  })
  assert.equal(findEmoticon(':)!', defaultEmoticons)?.emoji, '🙂')
  assert.equal(findEmoticon('</3 ', defaultEmoticons)?.emoji, '💔')
})

test('findEmoticon ignores unfinished, embedded, and unknown emoticons', () => {
  assert.equal(findEmoticon('I <3', defaultEmoticons), null)
  assert.equal(findEmoticon('see http://x ', defaultEmoticons), null)
  assert.equal(findEmoticon('a:) ', defaultEmoticons), null)
  assert.equal(findEmoticon('<3 ', {}), null)
})

test('comments render Markdown and HTML literally while preserving mentions', () => {
  const comments = [
    {
      id: '1',
      parentId: null,
      author: { id: 'u', name: 'U' },
      text: '**bold** *italic* `code` [link](https://x.test) <b>raw</b> @[Ann](a1)',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ]
  const html = renderToStaticMarkup(
    createElement(
      FluentProvider,
      { theme: webLightTheme },
      createElement(CommentThread, {
        comments,
        currentUser: { id: 'u', name: 'U' },
        onCreate: async () => {},
      }),
    ),
  )

  assert.ok(!/<(?:strong|em|code|a|b)\b/.test(html))
  assert.ok(html.includes('**bold** *italic* `code` [link](https://x.test)'))
  assert.ok(html.includes('&lt;b&gt;raw&lt;/b&gt;'))
  assert.ok(html.includes('Ann'))
})
