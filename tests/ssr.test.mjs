import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  createDOMRenderer,
  FluentProvider,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
  webLightTheme,
} from '@fluentui/react-components'
import { CommentThread } from '../dist/index.js'

test('SSR is browser-global-free, uses a request-scoped renderer and deterministic timestamps', () => {
  assert.equal(typeof window, 'undefined')
  assert.equal(typeof document, 'undefined')
  const renderer = createDOMRenderer()
  const createdAt = '2026-01-01T00:00:00.000Z'
  const html = renderToStaticMarkup(
    createElement(
      RendererProvider,
      { renderer },
      createElement(
        SSRProvider,
        null,
        createElement(
          FluentProvider,
          { theme: webLightTheme },
          createElement(CommentThread, {
            comments: [
              {
                id: 'ssr',
                parentId: null,
                author: { id: 'you', name: 'You' },
                text: '<script>plain</script>',
                createdAt,
              },
            ],
            currentUser: { id: 'you', name: 'You' },
            onCreate: async () => {},
          }),
        ),
      ),
    ),
  )
  assert.ok(html.includes('&lt;script&gt;plain&lt;/script&gt;'))
  assert.ok(html.includes(`>${createdAt}</time>`))
  const styles = renderToStaticMarkup(createElement('head', null, renderToStyleElements(renderer)))
  assert.match(styles, /data-make-styles-bucket/)
})
