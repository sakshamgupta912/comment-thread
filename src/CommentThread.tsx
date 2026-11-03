'use client'

import { forwardRef, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Avatar,
  Button,
  Card,
  makeStyles,
  MessageBar,
  MessageBarBody,
  mergeClasses,
  Spinner,
  Text,
  tokens,
} from '@fluentui/react-components'
import { CommentComposer } from './CommentComposer.js'
import { parseMentions } from './mentions.js'
import { createCommentIndex } from './thread-data.js'
import type { Comment, CommentThreadLabels, CommentThreadProps } from './types.js'

const defaultLabels: CommentThreadLabels = {
  title: 'Comment feed',
  empty: 'No comments yet. Start a conversation below.',
  newConversation: 'Start a new conversation...',
  addReply: 'Add a reply...',
  replyTo: (name) => `Reply to ${name}...`,
  replyingTo: 'Replying to',
  cancelReply: 'Cancel reply',
  reply: 'Reply',
  sendReply: 'Send reply',
  post: 'Post',
  posting: 'Posting...',
  viewReplies: (count) => `View ${count} ${count === 1 ? 'reply' : 'replies'}`,
  hideReplies: 'Hide',
  loadMore: 'Show more',
  showAll: 'Show all',
  showLess: 'Show less',
  loading: 'Loading...',
  noMentions: 'No people found.',
  mentionSearchFailed: 'Could not load people. Try again.',
  commentsCount: (count) => `${count} comment ${count === 1 ? 'post' : 'posts'}`,
}

const avatarSize = 32

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
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    minHeight: `${avatarSize}px`,
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
    marginTop: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalM,
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

function formatRelativeTime(date: Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })
  if (seconds >= 86400) return relative.format(-Math.floor(seconds / 86400), 'day')
  if (seconds >= 3600) return relative.format(-Math.floor(seconds / 3600), 'hour')
  if (seconds >= 60) return relative.format(-Math.floor(seconds / 60), 'minute')
  return relative.format(-seconds, 'second')
}

function CommentText({ text }: { text: string }) {
  const styles = useStyles()
  return parseMentions(text).map((part, index) => part.contactId === undefined ? (
    part.text
  ) : (
    <span className={styles.mention} key={`${part.contactId}-${index}`}>
      <Avatar
        size={20}
        name={part.text}
      />
      <span className={styles.mentionText}>{part.text}</span>
    </span>
  ))
}

function ReplyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m8 4-5 5 5 5M3 9h8a5 5 0 0 1 5 5v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronIcon({ up = false }: { up?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d={up ? 'm6 12 4-4 4 4' : 'm6 8 4 4 4-4'} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const CommentThread = forwardRef<HTMLDivElement, CommentThreadProps>(
  function CommentThread(
    {
      comments,
      currentUser,
      onCreate,
      contactSearch,
      loading = false,
      error = null,
      readOnly = false,
      maxDepth = 3,
      pagination = true,
      pageSize = 2,
      formatDate = formatRelativeTime,
      labels: labelOverrides,
      className,
      ...rootProps
    },
    ref,
  ) {
    const styles = useStyles()
    const itemsPerPage = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 2
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
    const [visibleCount, setVisibleCount] = useState<number | 'all'>(itemsPerPage)
    const [drafts, setDrafts] = useState<Record<string, string>>({})
    const [replyTargetId, setReplyTargetId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState<Record<string, boolean>>({})
    const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({})
    const pending = useRef(new Set<string>())
    const labels = { ...defaultLabels, ...labelOverrides }
    const depthLimit = Number.isFinite(maxDepth) ? Math.max(0, Math.floor(maxDepth)) : 3
    const indexResult = useMemo(() => {
      try {
        return { index: createCommentIndex(comments), error: null }
      } catch (cause) {
        return {
          index: null,
          error: cause instanceof Error ? cause.message : 'The comment data is invalid.',
        }
      }
    }, [comments])
    const index = indexResult.index
    const roots = index?.roots ?? []
    const visibleRoots = !pagination || visibleCount === 'all'
      ? roots
      : roots.slice(0, Math.max(visibleCount, itemsPerPage))
    const globalError = indexResult.error ?? error

    function descendants(id: string): number {
      return (index?.childrenByParent.get(id) ?? []).reduce(
        (total, child) => total + 1 + descendants(child.id),
        0,
      )
    }

    function submit(draftId: string, parentId: string | null) {
      const text = drafts[draftId] ?? ''
      if (!text.trim() || readOnly || loading || globalError || pending.current.has(draftId)) return

      pending.current.add(draftId)
      setSubmitting((previous) => ({ ...previous, [draftId]: true }))
      setSubmitErrors((previous) => ({ ...previous, [draftId]: '' }))

      void Promise.resolve()
        .then(() => onCreate({ text: text.trim(), parentId }))
        .then(() => {
          setDrafts((previous) => ({ ...previous, [draftId]: '' }))
          setReplyTargetId(null)
        })
        .catch((cause: unknown) => {
          setSubmitErrors((previous) => ({
            ...previous,
            [draftId]: cause instanceof Error ? cause.message : 'Could not post your comment. Please try again.',
          }))
        })
        .finally(() => {
          pending.current.delete(draftId)
          setSubmitting((previous) => ({ ...previous, [draftId]: false }))
        })
    }

    function updateDraft(id: string, value: string) {
      setDrafts((previous) => ({ ...previous, [id]: value }))
      if (submitErrors[id]) setSubmitErrors((previous) => ({ ...previous, [id]: '' }))
    }

    function renderComment(comment: Comment): ReactNode {
      const depth = index!.depthById.get(comment.id)!
      const children = index!.childrenByParent.get(comment.id) ?? []
      const name = comment.author.name
      return (
        <div
          key={comment.id}
          className={styles.avatarRow}
        >
          <Avatar
            size={avatarSize}
            name={name}
            image={comment.author.avatarUrl ? { src: comment.author.avatarUrl } : undefined}
          />
          <div className={styles.content}>
            <div className={styles.authorRow}>
              <Text className={styles.author} weight="semibold">{name}</Text>
              <time
                className={styles.timestamp}
                dateTime={comment.createdAt}
                title={new Date(comment.createdAt).toISOString()}
              >
                {formatDate(new Date(comment.createdAt))}
              </time>
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
                  aria-controls={`comment-replies-${comment.id}`}
                  onClick={() => setExpanded((previous) => {
                    const next = new Set(previous)
                    if (next.has(comment.id)) next.delete(comment.id)
                    else next.add(comment.id)
                    return next
                  })}
                >
                  {expanded.has(comment.id) ? labels.hideReplies : labels.viewReplies(descendants(comment.id))}
                </Button>
              )}
            </div>
            {children.length > 0 && (
              <div
                className={styles.replies}
                id={depth === 0 ? `comment-replies-${comment.id}` : undefined}
                hidden={depth === 0 && !expanded.has(comment.id)}
              >
                {children.map(renderComment)}
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div
        {...rootProps}
        ref={ref}
        className={[styles.root, className].filter(Boolean).join(' ')}
      >
        <Card appearance="outline" className={styles.feed}>
          <header className={styles.header}>
            <h2 className={styles.title}>{labels.title}</h2>
            <Text className={styles.muted} aria-live="polite">
              {labels.commentsCount(comments.length)}
            </Text>
          </header>

          {globalError && (
            <MessageBar intent="error" role="alert" className={styles.error}>
              <MessageBarBody>{globalError}</MessageBarBody>
            </MessageBar>
          )}

          {loading && (
            <div role="status" className={styles.empty}>
              <Spinner label={labels.loading} />
            </div>
          )}

          {!loading && !globalError && comments.length === 0 && (
            <Text className={mergeClasses(styles.empty, styles.muted)}>{labels.empty}</Text>
          )}

          {!loading && !globalError && visibleRoots.map((root) => {
            const rootId = root.id
            const target = replyTargetId && index!.rootIdById.get(replyTargetId) === rootId
              ? index!.byId.get(replyTargetId) ?? root
              : root
            const isReplying = replyTargetId === target.id
            const draftId = root.id
            const draft = drafts[draftId] ?? ''
            const isSubmitting = Boolean(submitting[draftId])

            return (
              <article
                key={rootId}
                className={styles.thread}
                aria-label={`${labels.title}: ${root.author.name}`}
              >
                {renderComment(root)}
                {!readOnly && (
                  <footer className={styles.footer}>
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
                              <Text className={styles.replyReferenceLabel}>{labels.replyingTo}</Text>
                            </div>
                            <Button
                              appearance="transparent"
                              size="small"
                              aria-label={labels.cancelReply}
                              onClick={() => {
                                setReplyTargetId(null)
                                window.requestAnimationFrame(() => {
                                  document.getElementById(`comment-editor-${rootId}`)?.focus()
                                })
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        )}
                        <CommentComposer
                          id={`comment-editor-${rootId}`}
                          value={draft}
                          onChange={(value) => updateDraft(draftId, value)}
                          onSubmit={() => submit(draftId, target.id)}
                          placeholder={isReplying ? labels.replyTo(target.author.name) : labels.addReply}
                          labels={labels}
                          contactSearch={contactSearch}
                          disabled={loading || isSubmitting || Boolean(globalError)}
                          sendButton
                          autoFocus={isReplying}
                        />
                      </div>
                    </div>
                    {submitErrors[draftId] && (
                      <MessageBar intent="error" role="alert">
                        <MessageBarBody>{submitErrors[draftId]}</MessageBarBody>
                      </MessageBar>
                    )}
                  </footer>
                )}
              </article>
            )
          })}

          {!loading && !globalError && (
            <>
              {pagination && (visibleRoots.length < roots.length || visibleRoots.length > itemsPerPage) && (
                <div className={styles.pagination}>
                  {visibleRoots.length < roots.length && (
                    <Button
                      appearance="transparent"
                      size="small"
                      className={styles.paginationAction}
                      icon={<ChevronIcon />}
                      iconPosition="after"
                      onClick={() => setVisibleCount((count) =>
                        pagination === 'show-all' || count === 'all' ? 'all' : count + itemsPerPage,
                      )}
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
                      onClick={() => setVisibleCount(itemsPerPage)}
                    >
                      {labels.showLess}
                    </Button>
                  )}
                </div>
              )}
              {!readOnly && (
                <footer className={styles.mainFooter}>
                  <div className={styles.avatarRow}>
                    <Avatar
                      size={avatarSize}
                      name={currentUser.name}
                      image={currentUser.avatarUrl ? { src: currentUser.avatarUrl } : undefined}
                    />
                    <CommentComposer
                      value={drafts.main ?? ''}
                      onChange={(value) => updateDraft('main', value)}
                      onSubmit={() => submit('main', null)}
                      placeholder={labels.newConversation}
                      labels={labels}
                      contactSearch={contactSearch}
                      disabled={loading || Boolean(submitting.main) || Boolean(globalError)}
                    />
                  </div>
                  {submitErrors.main && (
                    <MessageBar intent="error" role="alert">
                      <MessageBarBody>{submitErrors.main}</MessageBarBody>
                    </MessageBar>
                  )}
                  <div className={styles.postRow}>
                    <Button
                      appearance="primary"
                      disabled={!drafts.main?.trim() || Boolean(submitting.main) || loading || Boolean(globalError)}
                      onClick={() => submit('main', null)}
                    >
                      {submitting.main ? labels.posting : labels.post}
                    </Button>
                  </div>
                </footer>
              )}
            </>
          )}
        </Card>
      </div>
    )
  },
)
