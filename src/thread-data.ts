import type { Comment } from './types.js'

export interface CommentIndex {
  roots: Comment[]
  byId: Map<string, Comment>
  childrenByParent: Map<string, Comment[]>
  depthById: Map<string, number>
  rootIdById: Map<string, string>
  /** Total replies below each comment, at every level. */
  descendantCountById: Map<string, number>
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isTimestamp(value: string): boolean {
  const match =
    typeof value === 'string' &&
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/,
    )
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
}

/** Returns a new list with the selected comment's text replaced; other comments are untouched. */
export function updateComment(comments: Comment[], commentId: string, text: string): Comment[] {
  if (!comments.some((comment) => comment.id === commentId)) {
    throw new Error('The comment no longer exists.')
  }
  return comments.map((comment) => (comment.id === commentId ? { ...comment, text } : comment))
}

/** Returns a new list without the selected comment or any of its descendants. */
export function removeComment(comments: Comment[], commentId: string): Comment[] {
  const index = createCommentIndex(comments)
  if (!index.byId.has(commentId)) throw new Error('The comment no longer exists.')
  const removed = new Set([commentId])
  const queue = [commentId]
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const child of index.childrenByParent.get(queue[cursor]) ?? []) {
      removed.add(child.id)
      queue.push(child.id)
    }
  }
  return comments.filter((comment) => !removed.has(comment.id))
}

/**
 * Validates the comments and indexes them. Comments nested deeper than `maxNestingDepth` (root
 * comments are depth 0) are rejected as invalid; the default is unlimited.
 */
export function createCommentIndex(comments: Comment[], maxNestingDepth = Infinity): CommentIndex {
  const byId = new Map<string, Comment>()
  for (const comment of comments) {
    if (!isNonEmptyString(comment?.id)) throw new Error('Every comment must have a non-empty ID.')
    if (byId.has(comment.id)) throw new Error(`Duplicate comment ID: ${comment.id}`)
    if (!isNonEmptyString(comment.author?.id) || !isNonEmptyString(comment.author.name)) {
      throw new Error(`Comment "${comment.id}" has an invalid author.`)
    }
    if (!isTimestamp(comment.createdAt)) {
      throw new Error(`Comment "${comment.id}" has an invalid date.`)
    }
    if (typeof comment.text !== 'string') {
      throw new Error(`Comment "${comment.id}" has invalid text.`)
    }
    byId.set(comment.id, comment)
  }

  const childrenByParent = new Map<string, Comment[]>()
  const roots: Comment[] = []
  for (const comment of comments) {
    if (comment.parentId === null) {
      roots.push(comment)
      continue
    }
    if (!byId.has(comment.parentId)) {
      throw new Error(`Comment "${comment.id}" refers to missing parent "${comment.parentId}".`)
    }
    const siblings = childrenByParent.get(comment.parentId) ?? []
    siblings.push(comment)
    childrenByParent.set(comment.parentId, siblings)
  }

  // Depths are resolved iteratively: walk up to the nearest comment with a known depth, then
  // assign depths back down. Recursion here would overflow on long chains listed child-first.
  const depthById = new Map<string, number>()
  const rootIdById = new Map<string, string>()
  for (const comment of comments) {
    const path: Comment[] = []
    let ancestor: Comment | undefined = comment
    while (ancestor && !depthById.has(ancestor.id)) {
      // A walk longer than the number of comments must have revisited one of them.
      if (path.length > byId.size) throw new Error('Comments contain a circular reply.')
      path.push(ancestor)
      ancestor = ancestor.parentId === null ? undefined : byId.get(ancestor.parentId)
    }
    let depth = ancestor ? depthById.get(ancestor.id)! + 1 : 0
    const rootId = ancestor ? rootIdById.get(ancestor.id)! : path[path.length - 1].id
    for (let position = path.length - 1; position >= 0; position--, depth++) {
      if (depth > maxNestingDepth) {
        throw new Error(
          `Comment "${path[position].id}" is nested more than ${maxNestingDepth} replies deep.`,
        )
      }
      depthById.set(path[position].id, depth)
      rootIdById.set(path[position].id, rootId)
    }
  }

  // Counting from the deepest comments upward lets each parent add its children's totals.
  const descendantCountById = new Map<string, number>()
  for (const comment of comments) descendantCountById.set(comment.id, 0)
  const deepestFirst = [...comments].sort((a, b) => depthById.get(b.id)! - depthById.get(a.id)!)
  for (const comment of deepestFirst) {
    if (comment.parentId === null) continue
    descendantCountById.set(
      comment.parentId,
      descendantCountById.get(comment.parentId)! + descendantCountById.get(comment.id)! + 1,
    )
  }

  roots.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  }

  return { roots, byId, childrenByParent, depthById, rootIdById, descendantCountById }
}
