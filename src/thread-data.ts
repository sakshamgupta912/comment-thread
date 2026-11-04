import type { Comment } from './types.js'

export interface CommentIndex {
  roots: Comment[]
  byId: Map<string, Comment>
  childrenByParent: Map<string, Comment[]>
  depthById: Map<string, number>
  rootIdById: Map<string, string>
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

export function createCommentIndex(comments: Comment[]): CommentIndex {
  const byId = new Map<string, Comment>()
  for (const comment of comments) {
    if (!comment.id.trim()) throw new Error('Every comment must have a non-empty ID.')
    if (byId.has(comment.id)) throw new Error(`Duplicate comment ID: ${comment.id}`)
    if (!comment.author.id.trim() || !comment.author.name.trim()) {
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

  const depthById = new Map<string, number>()
  const rootIdById = new Map<string, string>()
  const resolving = new Set<string>()
  function getDepth(id: string): number {
    const knownDepth = depthById.get(id)
    if (knownDepth !== undefined) return knownDepth
    if (resolving.has(id)) throw new Error('Comments contain a circular reply.')
    resolving.add(id)
    const parentId = byId.get(id)!.parentId
    const depth = parentId === null ? 0 : getDepth(parentId) + 1
    rootIdById.set(id, parentId === null ? id : rootIdById.get(parentId)!)
    resolving.delete(id)
    depthById.set(id, depth)
    return depth
  }

  for (const comment of comments) getDepth(comment.id)

  roots.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  }

  return { roots, byId, childrenByParent, depthById, rootIdById }
}
