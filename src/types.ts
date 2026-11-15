import type { HTMLAttributes, ReactNode } from 'react'

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
  /** ISO 8601 date-time with seconds and an explicit Z or numeric offset. */
  createdAt: string
}

export type MentionSuggestion = CommentAuthor

export type CommentThreadErrorType =
  'load' | 'invalid-comments' | 'post' | 'delete' | 'mention-search'

export interface CommentThreadError {
  type: CommentThreadErrorType
  message: string
  cause?: unknown
}

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
  delete: string
  deleting: string
  cancelDelete: string
  deleteTitle: string
  deleteConfirmation: (comment: Comment, replyCount: number) => string
  deleteFailed: string
  sendReply: string
  post: string
  posting: string
  postFailed: string
  viewReplies: (count: number) => string
  hideReplies: string
  loadMore: string
  showAll: string
  showLess: string
  loading: string
  noMentions: string
  mentionSearchFailed: string
  mentionList: string
  invalidComments: (reason: string) => string
  commentsCount: (count: number) => string
}

export interface CommentThreadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onError'> {
  comments: Comment[]
  currentUser: CommentAuthor
  onCreate: (input: CreateCommentInput) => Promise<void>
  /** Delete the comment and its descendants, then update comments before resolving. */
  onDelete?: (comment: Comment) => Promise<void>
  /** Controls action visibility, not server authorization. Defaults to author-only. */
  canDelete?: (comment: Comment, currentUser: CommentAuthor) => boolean
  /** Receives an empty query when the user types @ without a search term. */
  contactSearch?: (query: string, signal: AbortSignal) => Promise<MentionSuggestion[]>
  /** Maximum number of mention suggestions rendered. Omit to render all returned suggestions. */
  mentionLimit?: number
  /** Additional consumer-defined criteria applied to returned mention suggestions. */
  filterMentionSuggestions?: (suggestion: MentionSuggestion, query: string) => boolean
  /** Replaces the default error surface for any component-handled exception. */
  renderError?: (error: CommentThreadError) => ReactNode
  loading?: boolean
  error?: string | null
  readOnly?: boolean
  maxDepth?: number
  /**
   * Comments nested deeper than this (root comments are depth 0) are rejected as invalid data.
   * Unlimited by default: replies nested deeper than ten levels (or `maxDepth`, if larger) are
   * listed flat under their ancestor, so deep data stays safe to render. Set this to reject it.
   */
  maxNestingDepth?: number
  /** Level of the title heading, so it fits the host page's outline. Defaults to 2. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  /** Use 'show-all' for a preview that expands fully, or false to show everything without controls. */
  pagination?: boolean | 'show-all'
  pageSize?: number
  formatDate?: (date: Date) => string
  labels?: Partial<CommentThreadLabels>
}
