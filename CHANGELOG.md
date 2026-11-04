# Changelog

## 0.1.0 - Unreleased

Initial reusable, controlled Fluent UI comment-thread package.

- Typed comment creation, threaded replies, depth limits, and client-side pagination.
- Async mention lookup with cancellation, escaped inline tokens, and plain-text rendering.
- Icon-only deletion with confirmation, consumer-defined permissions, async error handling, and immutable subtree removal.
- Theme-aware layout, configurable labels, root attributes/styles, and forwarded refs.
- Reset pagination when the page size or pagination mode changes.
- Require timezone-qualified ISO timestamps and reject invalid calendar dates.
- Restore composer focus after successful submission without stealing focus from another control.
- Isolate multiple component instances and support all non-empty comment IDs, including `main`.
- Add packed-consumer, browser, accessibility, StrictMode, SSR, and App Router release checks.

The public API remains pre-1.0. Breaking changes require a minor version bump; compatible fixes use patch versions.
