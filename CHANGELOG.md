# Changelog

## 0.1.0 - Unreleased

Initial reusable, controlled Fluent UI comment-thread package.

- Typed comment creation, threaded replies, depth limits, and client-side pagination.
- Async mention lookup with cancellation, escaped inline tokens, and plain-text rendering.
- Icon-only deletion with confirmation, consumer-defined permissions, async error handling, and immutable subtree removal.
- Opt-in inline editing (`onEdit`, `canEdit`, edit labels, `edit` error type) with an immutable `updateComment` helper.
- Theme-aware layout, configurable labels, root attributes/styles, and forwarded refs.
- Reset pagination when the page size or pagination mode changes.
- Require timezone-qualified ISO timestamps and reject invalid calendar dates.
- Restore composer focus after successful submission without stealing focus from another control.
- Isolate multiple component instances and support all non-empty comment IDs, including `main`.
- Add packed-consumer, browser, accessibility, StrictMode, SSR, and App Router release checks.
- Add `mentionLimit` and `filterMentionSuggestions` to cap and refine mention suggestions.
- Add `renderError` with the exported `CommentThreadError` and `CommentThreadErrorType` types to replace any built-in error surface; invalid-data and mention-search errors now carry the original `cause`.
- Match @mention queries in any script and for names with hyphens or apostrophes, such as `José` and `O'Brien`.
- Keep the mention popup valid for assistive technology: only a list with options is a listbox, and loading, empty, and error messages are announced as statuses.
- Resolve reply depths and counts and render threads without recursing once per reply level, and add an opt-in `maxNestingDepth` (unlimited by default) that reports deeper comments as invalid data.
- List replies nested deeper than ten levels (or `maxDepth`, if larger) flat under their ancestor, so very deep data keeps a shallow DOM instead of crashing browsers or being silently truncated during server rendering.
- Ignore the Enter that confirms an IME candidate in Safari versions that report it after `compositionend`.
- Describe Reply and bin buttons by their comment's author and time while keeping their short accessible names.
- Add `headingLevel` to place the title in the host page's heading outline.
- Drop `'use client'` from the package entry (the component modules keep it) so `removeComment` can run in Server Components.
- Ignore `undefined` entries in `labels` instead of erasing the default label or throwing.
- Keep a reply target chosen elsewhere when a pending post finishes.
- Stop rendering `header` and `footer` elements that became duplicate page landmarks in hosts without a `main` region.
- Show relative timestamps in weeks, months, and years instead of only days.

The public API remains pre-1.0. Breaking changes require a minor version bump; compatible fixes use patch versions.
