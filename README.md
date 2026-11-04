# `@fluent/comment-thread`

A reusable, controlled React comment thread built with Fluent UI React Components.
<img width="1085" height="876" alt="image" src="https://github.com/user-attachments/assets/97a4c8f0-dedb-4888-b85b-ed16ea3ac63e" />

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

- React and React DOM `>=18.3.1 <20`
- `@fluentui/react-components` `>=9.75.1 <10`
- Node.js 22.12+ for installation from Git and development

The CI compatibility matrix is configured to test React 18.3.1 and 19.3.1 with Fluent 9.75.1 on Node 22 and 24. Chromium, Firefox, and WebKit are exercised through Playwright; modern evergreen browsers are the target. Older browsers, React 17, CommonJS, and server-side rendering of user interactions are not supported. The exact browser revisions are pinned by the Playwright lockfile, not a promise about historical browser versions.

The consuming application must provide a Fluent UI `FluentProvider`. The component uses its theme and updates when the provider's theme changes.

## Basic use

```tsx
import { useState } from 'react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { CommentThread } from '@fluent/comment-thread'
import type { Comment, CreateCommentInput } from '@fluent/comment-thread'

function Example() {
  const currentUser = { id: 'you', name: 'You' }
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'thread-1',
      parentId: null,
      author: { id: 'alex', name: 'Alex Morgan' },
      text: 'Can we confirm the updated delivery timeline?',
      createdAt: '2026-02-20T09:00:00.000Z',
    },
    {
      id: 'reply-1',
      parentId: 'thread-1',
      author: { id: 'jordan', name: 'Jordan Lee' },
      text: 'The revised schedule is ready for review.',
      createdAt: '2026-02-20T09:15:00.000Z',
    },
    {
      id: 'thread-2',
      parentId: null,
      author: { id: 'taylor', name: 'Taylor Reed' },
      text: 'I added the notes from our last meeting.',
      createdAt: '2026-02-20T10:00:00.000Z',
    },
  ])

  async function onCreate(input: CreateCommentInput) {
    setComments((current) => [
      ...current,
      {
        id: `comment-${current.length + 1}`,
        parentId: input.parentId,
        author: currentUser,
        text: input.text,
        createdAt: new Date().toISOString(),
      },
    ])
  }

  return (
    <FluentProvider theme={webLightTheme}>
      <CommentThread comments={comments} currentUser={currentUser} onCreate={onCreate} />
    </FluentProvider>
  )
}
```

`onCreate` is the only required callback. It receives `{ text, parentId }` for both new comments (`parentId: null`) and replies. Accept/persist the comment and request the `comments` state update before resolving; you do not need to wait for React to commit that update. The component clears the submitted draft on success and keeps it visible with an error on rejection. The consumer owns authentication, authorization, API calls, and persistence.

The example starts with two conversations and a reply, then appends new comments to in-memory React state. Replace that state update with your API call and persisted comment in an application.

The component is controlled-only in v1; it does not keep a second, uncontrolled comment list. For server-confirmed updates, resolve `onCreate` after the saved comment is reflected in `comments`. For optimistic updates, update `comments` before resolving and roll back/reject on failure; the composer draft remains until the promise resolves. If a selected reply target is removed while its thread remains, the draft is preserved and the next submission targets that thread's root comment.

## Mentions

Pass `contactSearch(query, signal)` to enable asynchronous @mention suggestions. Typing `@` opens the picker and calls `contactSearch` with an empty query, so return the initial suggestions for that case. Searches are debounced by 200 ms and stale responses are ignored. The component stores mentions inline as `@[Name](userId)`. In this token format, `\` and `]` in the name are backslash-escaped, and the opaque user ID is URI-encoded, including parentheses. Apply the same token grammar in your application; mention parsing helpers are intentionally internal. Comment text is rendered as text, never HTML.

## Deleting comments

Pass `onDelete(comment): Promise<void>` to enable the icon-only bin action in the top-right of each eligible comment's header. Its accessible name and hover title use `labels.delete`; the confirmation dialog retains an explicit Delete button. Without this callback, no delete actions appear. By default, users can delete only their own comments. Override `canDelete(comment, currentUser)` for application-specific rules, such as moderator permissions. Read-only mode always hides deletion actions.

The component asks for confirmation, including the number of descendant replies. Deleting a comment deletes its entire subtree, including replies by other authors; account for this when defining permissions. The callback owns authorization, API calls, persistence, and updating `comments`; the component never removes controlled data itself. Validate permissions on the server, not just with `canDelete`.

```tsx
import { removeComment } from '@fluent/comment-thread'
import type { Comment } from '@fluent/comment-thread'

async function onDelete(comment: Comment) {
  await api.deleteComment(comment.id) // The API must also remove descendant replies.
  setComments((current) => removeComment(current, comment.id))
}

;<CommentThread
  comments={comments}
  currentUser={currentUser}
  onCreate={onCreate}
  onDelete={onDelete}
  canDelete={(comment, user) => comment.author.id === user.id || isModerator}
/>
```

The exported `removeComment(comments, commentId)` helper returns a new array without the comment and all descendants, preserving the remaining order and leaving the input unchanged. It validates the tree and throws if the target is missing.

Request the updated `comments` state before resolving `onDelete`. While pending, duplicate deletion and new submissions are blocked. Reject with an `Error` to show a retryable error in the confirmation dialog; keep or restore the original comments on failure. If a selected reply is deleted but its root survives, its draft is retained and retargeted to the root.

Customize the dialog and action through `labels.delete`, `labels.deleting`, `labels.cancelDelete`, `labels.deleteTitle`, `labels.deleteConfirmation(comment, replyCount)`, and `labels.deleteFailed` (the fallback for rejections without an error message).

## Optional configuration

`loading`, `error`, `readOnly`, `maxDepth`, `pagination`, `pageSize`, `formatDate`, `labels`, `className`, `style`, standard root `<div>` attributes, and a forwarded root ref are supported.

| Prop                 | Type                                                                   | Default / contract                                                                     |
| -------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `comments`           | `Comment[]`                                                            | Required; immutable updates, complete parent chains, unique non-empty IDs.             |
| `currentUser`        | `CommentAuthor`                                                        | Required; the identity used for composers and default delete permissions.              |
| `onCreate`           | `(input: CreateCommentInput) => Promise<void>`                         | Required; handles both root comments and replies.                                      |
| `onDelete`           | `(comment: Comment) => Promise<void>`                                  | Omitted; deletion is hidden until provided. Remove the entire subtree.                 |
| `canDelete`          | `(comment: Comment, user: CommentAuthor) => boolean`                   | Author ID equals current-user ID. UI policy, not authorization.                        |
| `contactSearch`      | `(query: string, signal: AbortSignal) => Promise<MentionSuggestion[]>` | Omitted; enables mentions when provided.                                               |
| `loading`            | `boolean`                                                              | `false`; replaces the feed with a loading status.                                      |
| `error`              | `string \| null`                                                       | `null`; displays an external loading/data error.                                       |
| `readOnly`           | `boolean`                                                              | `false`; hides create/reply/delete, but still allows expanding conversations.          |
| `maxDepth`           | `number`                                                               | `3`; root depth is 0. Limits new reply actions, not rendering existing deeper replies. |
| `pagination`         | `boolean \| 'show-all'`                                                | `true`; client-side root pagination only.                                              |
| `pageSize`           | `number`                                                               | `2`; finite values are floored and clamped to at least 1.                              |
| `formatDate`         | `(date: Date) => string`                                               | Relative time in the browser; deterministic ISO during SSR/initial hydration.          |
| `labels`             | `Partial<CommentThreadLabels>`                                         | English defaults; override individual strings/functions.                               |
| `className`, `style` | Standard root attributes                                               | Applied to the outer `<div>`.                                                          |
| `ref`                | `Ref<HTMLDivElement>`                                                  | Forwarded to the outer `<div>`.                                                        |

`Comment` contains `id: string`, `parentId: string | null`, `author: CommentAuthor`, `text: string`, and `createdAt: string`. `CommentAuthor` contains `id`, `name`, and optional `avatarUrl`. `MentionSuggestion` uses the same author shape. `CreateCommentInput` contains `text` and `parentId`.

IDs are opaque, case-sensitive strings; no values are reserved. Timestamps must use a four-digit-year ISO 8601 date-time with seconds, a `Z` or `+/-HH:MM` offset, and optional 1-9 fractional digits, for example `2026-01-03T14:00:00Z` or `2026-01-03T14:00:00.123+05:30`. Date-only, timezone-less, invalid calendar dates, and leap seconds are rejected. Precision beyond milliseconds is not retained when formatting JavaScript dates.

Invalid comment trees produce a visible error instead of silently hiding data. `removeComment` throws on invalid trees or missing targets. Its exceptions are developer-facing English diagnostics; translate errors at your API boundary when appropriate.

Pagination is client-side: it controls how many root conversations from `comments` are visible, without fetching additional data.

| Configuration                 | Behavior                                                                                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pagination={true}` (default) | Show `pageSize` conversations initially and reveal another batch per Show more click.                                                                                 |
| `pagination="show-all"`       | Show `pageSize` conversations initially, then reveal all conversations in one click. Show less restores the preview. New conversations remain visible while expanded. |
| `pagination={false}`          | Show all conversations without controls; ignore `pageSize`.                                                                                                           |

For example, use `pagination="show-all" pageSize={3}` to preview the first three conversations. `pageSize` defaults to 2. Reply expansion remains separate in every mode. Override `labels.loadMore`, `labels.showAll`, and `labels.showLess` to customize the action text.

Changing `pageSize` or `pagination` resets the visible root preview to the new page size. Drafts and expanded replies survive. Adding comments while a show-all view is expanded keeps that view expanded.

In the separate demo app, open `/?show-all=1` to try the three-conversation preview mode.

## Localization and customization

Every built-in UI string is configurable through `labels`: title/empty state, composer placeholders, reply references/actions, submission and deletion actions/errors, reply counts, pagination, loading, mention results/search errors/listbox name, and the total count. `replyTo`, `viewReplies`, `commentsCount`, `deleteConfirmation`, and `invalidComments` are functions. `invalidComments(reason)` lets you translate or replace internal validation diagnostics. `postFailed` and `deleteFailed` apply when a rejected callback provides no message. Localize non-empty callback errors yourself: the component displays those messages unchanged.

```tsx
<CommentThread
  comments={comments}
  currentUser={currentUser}
  onCreate={onCreate}
  labels={{
    mentionList: t('mentions.label'),
    postFailed: t('comments.postFailed'),
    invalidComments: () => t('comments.invalidData'),
    commentsCount: (count) => t('comments.count', { count }),
  }}
  formatDate={(date) =>
    new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(date)
  }
/>
```

The host `FluentProvider` owns theme tokens, including high-contrast and RTL settings. Customization is intentionally limited to documented props, root attributes/style/className/ref, labels, and provider tokens. Internal Griffel class names are not stable selectors; slots and render props are not part of this release's API. The package does not install a global reset or require the demo stylesheet.

## Connecting an API

Use the basic example's state and replace its callbacks with your persistence layer. The following assumes your API returns a validated `Comment` and that DELETE atomically removes the subtree. Treat the response as untrusted at the API boundary, and enforce user/role permissions on the server.

```tsx
async function onCreate(input: CreateCommentInput) {
  const response = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error('Could not save your comment.')
  const saved: Comment = await response.json()
  setComments((current) => [...current, saved])
}

async function onDelete(comment: Comment) {
  const response = await fetch(`/api/comments/${encodeURIComponent(comment.id)}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Could not delete the comment.')
  setComments((current) => removeComment(current, comment.id))
}

async function contactSearch(query: string, signal: AbortSignal) {
  const response = await fetch(`/api/people?q=${encodeURIComponent(query)}`, { signal })
  if (!response.ok) throw new Error('Could not load people.')
  return response.json()
}
```

Do not resolve after a failed request: reject so the component retains the draft or confirmation dialog. For optimistic updates, keep a rollback snapshot or refetch the authoritative tree on failure. Keep callbacks stable where practical to avoid restarting a pending mention search unnecessarily.

## Accessibility

Editors are keyboard-focusable editable comboboxes with named mention listboxes, active option relationships, and disabled states. Enter submits, Shift+Enter adds a line, Arrow Up/Down selects suggestions, Enter accepts a suggestion, and Escape dismisses it. IME composition Enter does not submit. Paste inserts plain text only.

Reply selects and focuses the thread composer; cancel returns focus to that composer. Successful submissions restore composer focus unless the user has moved to another control. The delete dialog initially focuses Cancel, traps focus, and restores the trigger on cancellation. Loading/count changes use live statuses; errors use alerts. The bin icon always has a localized accessible name and hover title.

Automated axe checks cover light/dark themes and the confirmation dialog, including contrast. Reflow, keyboard, synthetic composition, and StrictMode callbacks are tested. Real screen-reader, native IME, OS contrast/text-scaling, and real-device acceptance still require maintainer testing; see CONTRIBUTING.md. Consumers must supply accessible themes, meaningful labels, localized errors, and author names, and validate accessibility inside their own page.

## SSR and Next.js App Router

Imports and server rendering do not access browser globals. The build preserves `'use client'`; import the thread from a client component in App Router. The host must also configure Fluent/Griffel SSR styles, not just wrap in a `FluentProvider`.

```tsx
'use client'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import {
  createDOMRenderer,
  RendererProvider,
  renderToStyleElements,
  SSRProvider,
  FluentProvider,
  webLightTheme,
} from '@fluentui/react-components'

export function Providers({ children }: { children: ReactNode }) {
  const [renderer] = useState(() => createDOMRenderer())
  useServerInsertedHTML(() => <>{renderToStyleElements(renderer)}</>)
  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
      </SSRProvider>
    </RendererProvider>
  )
}
```

Wrap the root layout's body content with `Providers`. For other SSR frameworks, create a renderer per request, wrap with `RendererProvider`/`SSRProvider`, and insert `renderToStyleElements(renderer)` into that request's HTML head. Never share a server renderer between requests. Supply identical initial comments, theme, locale, and custom `formatDate` output on the server and client. The default timestamp is deterministic ISO during SSR and switches to relative time after hydration.

## Development

```sh
npm install
npm run build
npm run lint
npm test
npm run check
npm run test:browser
npm run test:next
npm pack --dry-run
```

The package emits ESM JavaScript and TypeScript declarations to `dist`.

See CONTRIBUTING.md for browser setup, size budgets, compatibility gates, manual accessibility acceptance, versioning, and protected publishing. The npm scope/name and publishing ownership must be confirmed before a registry release; GitHub installation is the currently documented distribution path.
