'use client'

import { forwardRef, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import {
  Avatar,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  MessageBar,
  MessageBarBody,
  mergeClasses,
  Spinner,
  Text,
  tokens,
  useRestoreFocusTarget,
} from '@fluentui/react-components'
import { CommentComposer } from './CommentComposer.js'
import { parseMentions } from './mentions.js'
import { formatRelativeTime } from './relative-time.js'
import { createCommentIndex } from './thread-data.js'
import type {
  Comment,
  CommentThreadError,
  CommentThreadLabels,
  CommentThreadProps,
} from './types.js'

const defaultLabels: CommentThreadLabels = {
  title: 'Comment feed',
  empty: 'No comments yet. Start a conversation below.',
  newConversation: 'Start a new conversation...',
  addReply: 'Add a reply...',
  replyTo: (name) => `Reply to ${name}...`,
  replyingTo: 'Replying to',
  cancelReply: 'Cancel reply',
  reply: 'Reply',
  delete: 'Delete',
  deleting: 'Deleting...',
  cancelDelete: 'Cancel',
  deleteTitle: 'Delete comment?',
  deleteConfirmation: (comment, replyCount) =>
    replyCount > 0
      ? `Delete the comment by ${comment.author.name} and its ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}? This cannot be undone.`
      : `Delete the comment by ${comment.author.name}? This cannot be undone.`,
  deleteFailed: 'Could not delete the comment. Please try again.',
  sendReply: 'Send reply',
  post: 'Post',
  posting: 'Posting...',
  postFailed: 'Could not post your comment. Please try again.',
  viewReplies: (count) => `View ${count} ${count === 1 ? 'reply' : 'replies'}`,
  hideReplies: 'Hide',
  loadMore: 'Show more',
  showAll: 'Show all',
  showLess: 'Show less',
  loading: 'Loading...',
  noMentions: 'No people found.',
  mentionSearchFailed: 'Could not load people. Try again.',
  mentionList: 'Mention a person',
  invalidComments: (reason) => reason || 'The comment data is invalid.',
  commentsCount: (count) => `${count} comment ${count === 1 ? 'post' : 'posts'}`,
}

const avatarSize = 32
// Relative times must not differ between the server and the first hydration render.
const subscribeToHydration = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

const useStyles = makeStyles({
  root: {
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
    fontFamily: tokens.fontFamilyBase,
    color: tokens.colorNeutralForeground1,
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalL,
    overflow: 'visible',
    boxShadow: tokens.shadow2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalL,
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    lineHeight: tokens.lineHeightBase500,
  },
  muted: {
    color: tokens.colorNeutralForeground3,
  },
  thread: {
    minWidth: 0,
    marginBottom: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalM,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    transition: 'box-shadow 120ms ease',
    '&:hover': {
      boxShadow: tokens.shadow4,
    },
    '@media (max-width: 480px)': {
      padding: tokens.spacingVerticalS,
    },
  },
  avatarRow: {
    display: 'grid',
    gridTemplateColumns: `${avatarSize}px minmax(0, 1fr)`,
    alignItems: 'start',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
  },
  authorRow: {
    display: 'flex',
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    minHeight: `${avatarSize}px`,
  },
  deleteAction: {
    flexShrink: 0,
    width: `${avatarSize}px`,
    height: `${avatarSize}px`,
    color: tokens.colorNeutralForeground3,
  },
  author: {
    minWidth: 0,
    maxWidth: '100%',
    overflowWrap: 'anywhere',
    padding: `0 ${tokens.spacingHorizontalS}`,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  timestamp: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    overflowWrap: 'anywhere',
  },
  body: {
    marginTop: tokens.spacingVerticalXS,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase400,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    marginTop: tokens.spacingVerticalXS,
  },
  replies: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
    minWidth: 0,
    '&[hidden]': {
      display: 'none',
    },
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  replyReference: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: 'fit-content',
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS}`,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  replyReferenceText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  replyReferenceLabel: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
  },
  composerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
  },
  mainFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `2px solid ${tokens.colorNeutralStroke1}`,
  },
  postRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
    '&::before, &::after': {
      content: '""',
      flex: 1,
      borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    },
  },
  paginationAction: {
    minWidth: 0,
    color: tokens.colorBrandForegroundLink,
    fontWeight: tokens.fontWeightSemibold,
  },
  empty: {
    padding: tokens.spacingVerticalL,
    textAlign: 'center',
  },
  mention: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: '2px 8px 2px 4px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase300,
    verticalAlign: 'middle',
    whiteSpace: 'normal',
  },
  mentionText: {
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  error: {
    marginBottom: tokens.spacingVerticalM,
  },
})

function CommentText({ text }: { text: string }) {
  const styles = useStyles()
  return parseMentions(text).map((part, index) =>
    part.contactId === undefined ? (
      part.text
    ) : (
      <span className={styles.mention} key={`${part.contactId}-${index}`}>
        <Avatar size={20} name={part.text} />
        <span className={styles.mentionText}>{part.text}</span>
      </span>
    ),
  )
}

function ReplyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m8 4-5 5 5 5M3 9h8a5 5 0 0 1 5 5v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 5h14M7 5V3h6v2M5 5l1 12h8l1-12M8 8v6m4-6v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ up = false }: { up?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={up ? 'm6 12 4-4 4 4' : 'm6 8 4 4 4-4'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const CommentThread = forwardRef<HTMLDivElement, CommentThreadProps>(function CommentThread(
  {
    comments,
    currentUser,
    onCreate,
    onDelete,
    canDelete = (comment, user) => comment.author.id === user.id,
    contactSearch,
    mentionLimit,
    filterMentionSuggestions,
    renderError,
    loading = false,
    error = null,
    readOnly = false,
    maxDepth = 3,
    maxNestingDepth = Infinity,
    headingLevel = 2,
    pagination = true,
    pageSize = 2,
    formatDate,
    labels: labelOverrides,
    className,
    ...rootProps
  },
  ref,
) {
  const styles = useStyles()
  const restoreFocusTarget = useRestoreFocusTarget()
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot)
  const instanceId = useId()
  const itemsPerPage = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 2
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [page, setPage] = useState({
    mode: pagination,
    size: itemsPerPage,
    count: itemsPerPage as number | 'all',
  })
  let visibleCount = page.count
  if (page.mode !== pagination || page.size !== itemsPerPage) {
    visibleCount = itemsPerPage
    setPage({ mode: pagination, size: itemsPerPage, count: itemsPerPage })
  }
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
  const [submitErrors, setSubmitErrors] = useState<Record<string, CommentThreadError>>({})
  const pending = useRef(new Set<string>())
  const [deleteDialogMounted, setDeleteDialogMounted] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<CommentThreadError | null>(null)
  const deletePending = useRef(false)
  const deleteTrigger = useRef<HTMLButtonElement | null>(null)
  const deleteSurface = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const labels: CommentThreadLabels = {
    ...defaultLabels,
    // An explicit undefined (for example from a partial translation table) must not erase a default.
    ...(Object.fromEntries(
      Object.entries(labelOverrides ?? {}).filter(
        ([, value]) => value !== undefined && value !== null,
      ),
    ) as Partial<CommentThreadLabels>),
  }
  const depthLimit = Number.isFinite(maxDepth) ? Math.max(0, Math.floor(maxDepth)) : 3
  // Replies nested deeper than this are listed flat under their ancestor instead of indenting
  // further, so the DOM stays shallow however deep the data is.
  const flattenFromDepth = Math.max(10, depthLimit)
  const Heading =
    `h${Number.isInteger(headingLevel) && headingLevel >= 1 && headingLevel <= 6 ? headingLevel : 2}` as
      'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  const nestingLimit = Number.isFinite(maxNestingDepth)
    ? Math.max(0, Math.floor(maxNestingDepth))
    : Infinity
  const indexResult = useMemo(() => {
    try {
      return { index: createCommentIndex(comments, nestingLimit), failure: null }
    } catch (cause) {
      return { index: null, failure: cause }
    }
  }, [comments, nestingLimit])
  const index = indexResult.index
  const roots = index?.roots ?? []
  const visibleRoots =
    !pagination || visibleCount === 'all'
      ? roots
      : roots.slice(0, Math.max(visibleCount, itemsPerPage))
  const globalException: CommentThreadError | null =
    index === null
      ? {
          type: 'invalid-comments',
          message: labels.invalidComments(
            indexResult.failure instanceof Error ? indexResult.failure.message : '',
          ),
          cause: indexResult.failure,
        }
      : error
        ? { type: 'load', message: error }
        : null
  const globalError = globalException?.message ?? null
  const deleteTarget = deleteTargetId === null ? undefined : index?.byId.get(deleteTargetId)
  const deleteAllowed = Boolean(
    onDelete &&
    deleteTarget &&
    !readOnly &&
    !loading &&
    !globalError &&
    canDelete(deleteTarget, currentUser),
  )

  function descendants(id: string): number {
    return index?.descendantCountById.get(id) ?? 0
  }

  function childrenOf(comment: Comment): Comment[] {
    return index?.childrenByParent.get(comment.id) ?? []
  }

  function submit(draftId: string, parentId: string | null, editorId: string) {
    const text = drafts[draftId] ?? ''
    if (
      !text.trim() ||
      readOnly ||
      loading ||
      globalError ||
      deletePending.current ||
      pending.current.has(draftId)
    )
      return

    pending.current.add(draftId)
    const focusedElement = document.activeElement
    setSubmitting((previous) => ({ ...previous, [draftId]: true }))
    setSubmitErrors((previous) => {
      const next = { ...previous }
      delete next[draftId]
      return next
    })

    void Promise.resolve()
      .then(() => onCreate({ text: text.trim(), parentId }))
      .then(() => {
        setDrafts((previous) => ({ ...previous, [draftId]: '' }))
        // Keep a reply target the user picked elsewhere while this request was pending.
        setReplyTargetId((current) => (current === parentId ? null : current))
        window.requestAnimationFrame(() => {
          if (
            document.activeElement === focusedElement ||
            document.activeElement === document.body
          ) {
            document.getElementById(editorId)?.focus()
          }
        })
      })
      .catch((cause: unknown) => {
        setSubmitErrors((previous) => ({
          ...previous,
          [draftId]: {
            type: 'post',
            message: cause instanceof Error && cause.message ? cause.message : labels.postFailed,
            cause,
          },
        }))
      })
      .finally(() => {
        pending.current.delete(draftId)
        setSubmitting((previous) => ({ ...previous, [draftId]: false }))
      })
  }

  function updateDraft(id: string, value: string) {
    setDrafts((previous) => ({ ...previous, [id]: value }))
    if (submitErrors[id]) {
      setSubmitErrors((previous) => {
        const next = { ...previous }
        delete next[id]
        return next
      })
    }
  }

  function closeDeleteDialog() {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && deleteSurface.current?.contains(activeElement)) {
      activeElement.blur()
    }
    setDeleteTargetId(null)
    setDeleteError(null)
  }

  function restoreDeleteFocus() {
    const trigger = deleteTrigger.current
    const target =
      trigger?.isConnected && !trigger.disabled
        ? trigger
        : (document.getElementById(`${instanceId}-main`) ?? titleRef.current)
    target?.focus()
  }

  async function confirmDelete() {
    if (
      !deleteAllowed ||
      !onDelete ||
      !deleteTarget ||
      deletePending.current ||
      pending.current.size > 0
    )
      return
    deletePending.current = true
    setDeleting(true)
    setDeleteError(null)
    try {
      await onDelete(deleteTarget)
      closeDeleteDialog()
    } catch (cause: unknown) {
      setDeleteError({
        type: 'delete',
        message: cause instanceof Error && cause.message ? cause.message : labels.deleteFailed,
        cause,
      })
    } finally {
      deletePending.current = false
      setDeleting(false)
    }
  }

  // Builds a thread deepest-first from a breadth-first ordering, so that no JavaScript call depth
  // grows with the nesting of the replies. Comments from flattenFromDepth down are not nested
  // further: their whole subtree is listed in reading order under the ancestor at that depth.
  function renderThread(root: Comment): ReactNode {
    const order = [root]
    for (let cursor = 0; cursor < order.length; cursor++) {
      const comment = order[cursor]
      if (index!.depthById.get(comment.id)! >= flattenFromDepth) continue
      for (const child of childrenOf(comment)) order.push(child)
    }
    const rendered = new Map<string, ReactNode>()
    for (let position = order.length - 1; position >= 0; position--) {
      const comment = order[position]
      rendered.set(
        comment.id,
        renderComment(
          comment,
          index!.depthById.get(comment.id)! >= flattenFromDepth
            ? renderFlatReplies(comment)
            : childrenOf(comment).map((child) => rendered.get(child.id)),
        ),
      )
    }
    return rendered.get(root.id)
  }

  function renderFlatReplies(ancestor: Comment): ReactNode[] {
    const rows: ReactNode[] = []
    // Popping from the end yields reading order, so children are pushed last-first.
    const pending = [...childrenOf(ancestor)].reverse()
    while (pending.length > 0) {
      const comment = pending.pop()!
      rows.push(renderComment(comment, []))
      const children = childrenOf(comment)
      for (let position = children.length - 1; position >= 0; position--) {
        pending.push(children[position])
      }
    }
    return rows
  }

  function renderComment(comment: Comment, replies: ReactNode[]): ReactNode {
    const depth = index!.depthById.get(comment.id)!
    const name = comment.author.name
    const createdAt = new Date(comment.createdAt)
    const authorId = `${instanceId}-author-${encodeURIComponent(comment.id)}`
    const timeId = `${instanceId}-time-${encodeURIComponent(comment.id)}`
    // The action names stay short; the description tells assistive technology whose comment it is.
    const describedBy = `${authorId} ${timeId}`
    return (
      <div key={comment.id} className={styles.avatarRow}>
        <Avatar
          size={avatarSize}
          name={name}
          image={comment.author.avatarUrl ? { src: comment.author.avatarUrl } : undefined}
        />
        <div className={styles.content}>
          <div className={styles.commentHeader}>
            <div className={styles.authorRow}>
              <Text id={authorId} className={styles.author} weight="semibold">
                {name}
              </Text>
              <time
                id={timeId}
                className={styles.timestamp}
                dateTime={comment.createdAt}
                title={createdAt.toISOString()}
              >
                {formatDate
                  ? formatDate(createdAt)
                  : hydrated
                    ? formatRelativeTime(createdAt)
                    : createdAt.toISOString()}
              </time>
            </div>
            {onDelete && !readOnly && canDelete(comment, currentUser) && (
              <Button
                {...restoreFocusTarget}
                appearance="subtle"
                size="small"
                className={styles.deleteAction}
                icon={<DeleteIcon />}
                aria-label={labels.delete}
                aria-describedby={describedBy}
                title={labels.delete}
                disabled={deleting || Object.values(submitting).some(Boolean)}
                onClick={(event) => {
                  deleteTrigger.current = event.currentTarget
                  event.currentTarget.focus()
                  setDeleteDialogMounted(true)
                  setDeleteError(null)
                  setDeleteTargetId(comment.id)
                }}
              />
            )}
          </div>
          <div className={styles.body}>
            <CommentText text={comment.text} />
          </div>
          <div className={styles.actions}>
            {!readOnly && depth < depthLimit && (
              <Button
                appearance="subtle"
                size="small"
                icon={<ReplyIcon />}
                aria-describedby={describedBy}
                disabled={deleting}
                onClick={() => {
                  setReplyTargetId(comment.id)
                  const rootId = index!.rootIdById.get(comment.id)
                  if (rootId) setExpanded((previous) => new Set(previous).add(rootId))
                }}
              >
                {labels.reply}
              </Button>
            )}
            {depth === 0 && descendants(comment.id) > 0 && (
              <Button
                appearance="subtle"
                size="small"
                aria-expanded={expanded.has(comment.id)}
                aria-controls={`${instanceId}-replies-${encodeURIComponent(comment.id)}`}
                onClick={() =>
                  setExpanded((previous) => {
                    const next = new Set(previous)
                    if (next.has(comment.id)) next.delete(comment.id)
                    else next.add(comment.id)
                    return next
                  })
                }
              >
                {expanded.has(comment.id)
                  ? labels.hideReplies
                  : labels.viewReplies(descendants(comment.id))}
              </Button>
            )}
          </div>
          {replies.length > 0 && (
            <div
              className={styles.replies}
              id={
                depth === 0 ? `${instanceId}-replies-${encodeURIComponent(comment.id)}` : undefined
              }
              hidden={depth === 0 && !expanded.has(comment.id)}
            >
              {replies}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div {...rootProps} ref={ref} className={[styles.root, className].filter(Boolean).join(' ')}>
      {onDelete && deleteDialogMounted && (
        <Dialog
          open={deleteAllowed}
          surfaceMotion={{
            onMotionFinish: (_, { direction }) => {
              if (direction === 'exit') restoreDeleteFocus()
            },
          }}
          onOpenChange={(_, data) => {
            if (!data.open && !deletePending.current) {
              closeDeleteDialog()
            }
          }}
        >
          <DialogSurface ref={deleteSurface} aria-busy={deleting}>
            <DialogBody>
              <DialogTitle>{labels.deleteTitle}</DialogTitle>
              <DialogContent>
                {deleteTarget &&
                  labels.deleteConfirmation(deleteTarget, descendants(deleteTarget.id))}
                {deleteError &&
                  (renderError ? (
                    renderError(deleteError)
                  ) : (
                    <MessageBar intent="error" role="alert">
                      <MessageBarBody>{deleteError.message}</MessageBarBody>
                    </MessageBar>
                  ))}
              </DialogContent>
              <DialogActions>
                <Button disabled={deleting} onClick={closeDeleteDialog}>
                  {labels.cancelDelete}
                </Button>
                <Button
                  appearance="primary"
                  icon={<DeleteIcon />}
                  disabled={deleting}
                  onClick={() => {
                    void confirmDelete()
                  }}
                >
                  {deleting ? labels.deleting : labels.delete}
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      )}
      <Card appearance="outline" className={styles.feed}>
        <div className={styles.header}>
          <Heading ref={titleRef} tabIndex={-1} className={styles.title}>
            {labels.title}
          </Heading>
          <Text className={styles.muted} aria-live="polite">
            {labels.commentsCount(comments.length)}
          </Text>
        </div>

        {globalError &&
          (renderError ? (
            renderError(globalException!)
          ) : (
            <MessageBar intent="error" role="alert" className={styles.error}>
              <MessageBarBody>{globalError}</MessageBarBody>
            </MessageBar>
          ))}

        {loading && (
          <div role="status" className={styles.empty}>
            <Spinner label={labels.loading} />
          </div>
        )}

        {!loading && !globalError && comments.length === 0 && (
          <Text className={mergeClasses(styles.empty, styles.muted)}>{labels.empty}</Text>
        )}

        {!loading &&
          !globalError &&
          visibleRoots.map((root) => {
            const rootId = root.id
            const target =
              replyTargetId && index!.rootIdById.get(replyTargetId) === rootId
                ? (index!.byId.get(replyTargetId) ?? root)
                : root
            const isReplying = replyTargetId === target.id
            const draftId = `thread:${root.id}`
            const editorId = `${instanceId}-editor-${encodeURIComponent(rootId)}`
            const draft = drafts[draftId] ?? ''
            const isSubmitting = Boolean(submitting[draftId])

            return (
              <article
                key={rootId}
                className={styles.thread}
                aria-label={`${labels.title}: ${root.author.name}`}
              >
                {renderThread(root)}
                {!readOnly && (
                  <div className={styles.footer}>
                    <div className={styles.avatarRow}>
                      <Avatar
                        size={avatarSize}
                        name={currentUser.name}
                        image={currentUser.avatarUrl ? { src: currentUser.avatarUrl } : undefined}
                      />
                      <div className={styles.composerContent}>
                        {isReplying && (
                          <div className={styles.replyReference}>
                            <ReplyIcon />
                            <div className={styles.replyReferenceText}>
                              <Text weight="semibold">{target.author.name}</Text>
                              <Text className={styles.replyReferenceLabel}>
                                {labels.replyingTo}
                              </Text>
                            </div>
                            <Button
                              appearance="transparent"
                              size="small"
                              aria-label={labels.cancelReply}
                              onClick={() => {
                                setReplyTargetId(null)
                                window.requestAnimationFrame(() => {
                                  document.getElementById(editorId)?.focus()
                                })
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        )}
                        <CommentComposer
                          id={editorId}
                          value={draft}
                          onChange={(value) => updateDraft(draftId, value)}
                          onSubmit={() => submit(draftId, target.id, editorId)}
                          placeholder={
                            isReplying ? labels.replyTo(target.author.name) : labels.addReply
                          }
                          labels={labels}
                          contactSearch={contactSearch}
                          mentionLimit={mentionLimit}
                          filterMentionSuggestions={filterMentionSuggestions}
                          renderError={renderError}
                          disabled={loading || isSubmitting || deleting || Boolean(globalError)}
                          sendButton
                          focusOnReply={isReplying}
                        />
                      </div>
                    </div>
                    {submitErrors[draftId] &&
                      (renderError ? (
                        renderError(submitErrors[draftId])
                      ) : (
                        <MessageBar intent="error" role="alert">
                          <MessageBarBody>{submitErrors[draftId].message}</MessageBarBody>
                        </MessageBar>
                      ))}
                  </div>
                )}
              </article>
            )
          })}

        {!loading && !globalError && (
          <>
            {pagination &&
              (visibleRoots.length < roots.length || visibleRoots.length > itemsPerPage) && (
                <div className={styles.pagination}>
                  {visibleRoots.length < roots.length && (
                    <Button
                      appearance="transparent"
                      size="small"
                      className={styles.paginationAction}
                      icon={<ChevronIcon />}
                      iconPosition="after"
                      onClick={() =>
                        setPage((current) => ({
                          ...current,
                          count:
                            pagination === 'show-all' || current.count === 'all'
                              ? 'all'
                              : current.count + itemsPerPage,
                        }))
                      }
                    >
                      {pagination === 'show-all' ? labels.showAll : labels.loadMore}
                    </Button>
                  )}
                  {visibleRoots.length > itemsPerPage && (
                    <Button
                      appearance="transparent"
                      size="small"
                      className={styles.paginationAction}
                      icon={<ChevronIcon up />}
                      iconPosition="after"
                      onClick={() =>
                        setPage({ mode: pagination, size: itemsPerPage, count: itemsPerPage })
                      }
                    >
                      {labels.showLess}
                    </Button>
                  )}
                </div>
              )}
            {!readOnly && (
              <div className={styles.mainFooter}>
                <div className={styles.avatarRow}>
                  <Avatar
                    size={avatarSize}
                    name={currentUser.name}
                    image={currentUser.avatarUrl ? { src: currentUser.avatarUrl } : undefined}
                  />
                  <CommentComposer
                    id={`${instanceId}-main`}
                    value={drafts.main ?? ''}
                    onChange={(value) => updateDraft('main', value)}
                    onSubmit={() => submit('main', null, `${instanceId}-main`)}
                    placeholder={labels.newConversation}
                    labels={labels}
                    contactSearch={contactSearch}
                    mentionLimit={mentionLimit}
                    filterMentionSuggestions={filterMentionSuggestions}
                    renderError={renderError}
                    disabled={
                      loading || Boolean(submitting.main) || deleting || Boolean(globalError)
                    }
                  />
                </div>
                {submitErrors.main &&
                  (renderError ? (
                    renderError(submitErrors.main)
                  ) : (
                    <MessageBar intent="error" role="alert">
                      <MessageBarBody>{submitErrors.main.message}</MessageBarBody>
                    </MessageBar>
                  ))}
                <div className={styles.postRow}>
                  <Button
                    appearance="primary"
                    disabled={
                      !drafts.main?.trim() ||
                      Boolean(submitting.main) ||
                      deleting ||
                      loading ||
                      Boolean(globalError)
                    }
                    onClick={() => submit('main', null, `${instanceId}-main`)}
                  >
                    {submitting.main ? labels.posting : labels.post}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
})
