// The barrel has no 'use client' directive: CommentThread.tsx and CommentComposer.tsx carry their
// own, so helpers such as removeComment stay callable from Server Components.
export { CommentThread } from './CommentThread.js'
export { removeComment } from './thread-data.js'
export type {
  Comment,
  CommentAuthor,
  CommentThreadError,
  CommentThreadErrorType,
  CommentThreadLabels,
  CommentThreadProps,
  CreateCommentInput,
  MentionSuggestion,
} from './types.js'
