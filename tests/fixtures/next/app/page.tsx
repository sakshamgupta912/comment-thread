'use client'

import { useState } from 'react'
import { CommentThread, removeComment } from '@fluent/comment-thread'
import type { Comment } from '@fluent/comment-thread'

const user = { id: 'you', name: 'You' }
export default function Page() {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'initial',
      parentId: null,
      author: user,
      text: 'Server rendered conversation',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ])
  return (
    <main>
      <h1>Next.js packed consumer</h1>
      <CommentThread
        comments={comments}
        currentUser={user}
        onCreate={async (input) => {
          setComments((current) => [
            ...current,
            {
              ...input,
              id: crypto.randomUUID(),
              author: user,
              createdAt: new Date().toISOString(),
            },
          ])
        }}
        onDelete={async (comment) => {
          setComments((current) => removeComment(current, comment.id))
        }}
      />
    </main>
  )
}
