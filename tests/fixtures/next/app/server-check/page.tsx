import { removeComment } from '@fluent/comment-thread'

const comments = [
  {
    id: 'a',
    parentId: null,
    author: { id: 'u', name: 'U' },
    text: 't',
    createdAt: '2026-01-01T00:00:00Z',
  },
]

// A Server Component: it has no 'use client', so this only works while the package entry is a
// server module.
export default function Page() {
  return (
    <p>{`${removeComment(comments, 'a').length} remaining after removeComment on the server`}</p>
  )
}
