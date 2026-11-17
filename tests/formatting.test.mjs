import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { CommentThread } from '../dist/CommentThread.js'
import { defaultEmoticons, findEmoticon } from '../dist/emoticons.js'
import { parseInlineMarkdown } from '../dist/rich-text.js'

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

test('parseInlineMarkdown parses code, bold, italic, links, and nesting', () => {
  assert.deepEqual(parseInlineMarkdown('a **b *c* d** `d` [e](https://x.test)'), [
    { type: 'text', text: 'a ' },
    {
      type: 'bold',
      children: [
        { type: 'text', text: 'b ' },
        { type: 'italic', children: [{ type: 'text', text: 'c' }] },
        { type: 'text', text: ' d' },
      ],
    },
    { type: 'text', text: ' ' },
    { type: 'code', text: 'd' },
    { type: 'text', text: ' ' },
    { type: 'link', href: 'https://x.test', children: [{ type: 'text', text: 'e' }] },
  ])
})

test('parseInlineMarkdown leaves unsafe links, arithmetic, and stray markers as text', () => {
  for (const text of ['[x](javascript:alert(1))', '2*3*4', '**open', '* spaced *']) {
    assert.deepEqual(parseInlineMarkdown(text), [{ type: 'text', text }])
  }
})

test('richText renders formatting only when enabled, and never as HTML', () => {
  const comments = [
    {
      id: '1',
      parentId: null,
      author: { id: 'u', name: 'U' },
      text: '**bold** <b>raw</b> @[Ann](a1)',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ]
  const render = (richText) =>
    renderToStaticMarkup(
      createElement(
        FluentProvider,
        { theme: webLightTheme },
        createElement(CommentThread, {
          comments,
          currentUser: { id: 'u', name: 'U' },
          onCreate: async () => {},
          richText,
        }),
      ),
    )

  assert.ok(!render(false).includes('<strong>'))
  const html = render(true)
  assert.ok(html.includes('<strong>bold</strong>'))
  assert.ok(html.includes('&lt;b&gt;raw&lt;/b&gt;'))
  assert.ok(html.includes('Ann'))
})
