import type { HTMLAttributes } from 'react'

export interface CommentAuthor {
  id: string
  name: string
  avatarUrl?: string
}

export interface Comment {
  id: string
  parentId: string | null
  author: CommentAuthor
  text: string
  createdAt: string
}

export type MentionSuggestion = CommentAuthor

export interface CreateCommentInput {
  text: string
  parentId: string | null
}

export interface CommentThreadLabels {
  title: string
  empty: string
  newConversation: string
  addReply: string
  replyTo: (name: string) => string
  replyingTo: string
  cancelReply: string
  reply: string
  sendReply: string
  post: string
  posting: string
  viewReplies: (count: number) => string
  hideReplies: string
  loadMore: string
  showAll: string
  showLess: string
  loading: string
  noMentions: string
  mentionSearchFailed: string
  commentsCount: (count: number) => string
}

export interface CommentThreadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onError'> {
  comments: Comment[]
  currentUser: CommentAuthor
  onCreate: (input: CreateCommentInput) => Promise<void>
  /** Receives an empty query when the user types @ without a search term. */
  contactSearch?: (query: string, signal: AbortSignal) => Promise<MentionSuggestion[]>
  loading?: boolean
  error?: string | null
  readOnly?: boolean
  maxDepth?: number
  /** Use 'show-all' for a preview that expands fully, or false to show everything without controls. */
  pagination?: boolean | 'show-all'
  pageSize?: number
  formatDate?: (date: Date) => string
  labels?: Partial<CommentThreadLabels>
}
