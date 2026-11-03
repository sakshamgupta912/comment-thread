# `@fluent/comment-thread`

A reusable, controlled React comment thread built with Fluent UI React Components.

This repository contains the package only. The Vite demo lives in a separate repository. The package is licensed under MIT.

## Install from GitHub

Install the package from the GitHub repository:

```sh
npm install github:sakshamgupta912/comment-thread
```

For reproducible installs, use a version tag after one has been published:

```sh
npm install github:sakshamgupta912/comment-thread#v0.1.0
```

npm runs the package's `prepare` script to build it when installing from Git.

## Requirements

- React and React DOM `>=19.3.1 <20`
- `@fluentui/react-components` `>=9.75.1 <10`

The consuming application must provide a Fluent UI `FluentProvider`. The component uses its theme and updates when the provider's theme changes.

## Basic use

```tsx
import { useState } from 'react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { CommentThread } from '@fluent/comment-thread'
import type { Comment, CreateCommentInput } from '@fluent/comment-thread'

function Example() {
  const [comments, setComments] = useState<Comment[]>([])

  async function onCreate(input: CreateCommentInput) {
    const savedComment = await api.createComment(input)
    setComments((current) => [...current, savedComment])
  }

  return (
    <FluentProvider theme={webLightTheme}>
      <CommentThread
        comments={comments}
        currentUser={{ id: 'user-id', name: 'Current user' }}
        onCreate={onCreate}
      />
    </FluentProvider>
  )
}
```

`onCreate` is the only required callback. It receives `{ text, parentId }` for both new comments (`parentId: null`) and replies. Resolve the promise after the consumer accepts the comment and updates the `comments` prop. The component clears the submitted draft on success and keeps it visible with an error on rejection. The consumer owns authentication, authorization, API calls, and persistence.

The component is controlled-only in v1; it does not keep a second, uncontrolled comment list. For server-confirmed updates, resolve `onCreate` after the saved comment is reflected in `comments`. For optimistic updates, update `comments` before resolving and roll back/reject on failure; the composer draft remains until the promise resolves. If a selected reply target is removed while its thread remains, the draft is preserved and the next submission targets that thread's root comment.

## Mentions

Pass `contactSearch(query, signal)` to enable asynchronous @mention suggestions. Typing `@` opens the picker and calls `contactSearch` with an empty query, so return the initial suggestions for that case. Searches are debounced and stale responses are ignored. The component stores mentions inline as `@[Name](userId)`. In this token format, `\` and `]` in the name are escaped, and the opaque user ID is URI-encoded. Use the exported mention behavior or apply the same token grammar in your application. Comment text is rendered as text, never HTML.

## Optional configuration

`loading`, `error`, `readOnly`, `maxDepth`, `pagination`, `pageSize`, `formatDate`, `labels`, `className`, `style`, standard root `<div>` attributes, and a forwarded root ref are supported.

Pagination is client-side: it controls how many root conversations from `comments` are visible, without fetching additional data.

| Configuration | Behavior |
| --- | --- |
| `pagination={true}` (default) | Show `pageSize` conversations initially and reveal another batch per Show more click. |
| `pagination="show-all"` | Show `pageSize` conversations initially, then reveal all conversations in one click. Show less restores the preview. New conversations remain visible while expanded. |
| `pagination={false}` | Show all conversations without controls; ignore `pageSize`. |

For example, use `pagination="show-all" pageSize={3}` to preview the first three conversations. `pageSize` defaults to 2. Reply expansion remains separate in every mode. Override `labels.loadMore`, `labels.showAll`, and `labels.showLess` to customize the action text.

In the separate demo app, open `/?show-all=1` to try the three-conversation preview mode.

## Development

```sh
npm install
npm run build
npm run lint
npm test
npm pack --dry-run
```

The package emits ESM JavaScript and TypeScript declarations to `dist`.

Server rendering does not require browser globals at import time; Next.js App Router consumers should import the component from a client component.
