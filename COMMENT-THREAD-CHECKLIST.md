# Reusable CommentThread Component: Final Checklist

Checklist for turning the Fluent UI comment-feed prototype into an npm package.

**Audit status (2026-11-03): not ready to publish.** The standalone package has an MIT license, but registry access, pagination issues, compatibility, accessibility, and CI checks remain open.

Verified after the repository split: a clean demo install and build, lint, 8 unit tests, 17 Chromium browser tests, a 15-file package, and packed, local-Git, and GitHub ESM consumers installed through the internal registry and rendered on the server. The packed consumer also rendered and posted a comment in Chromium. An earlier publish dry run warned that registry login is required. Partial items remain unchecked.

## Goal and scope

Turn the Fluent UI comment-feed prototype into an npm package. The consuming app owns auth, persistence, authorization, and API calls. The component receives data and reports changes through its public API.

Done when: a consumer can npm i the package, pass props and callbacks, and use it without editing source.

## 1. Prototype status

- [x] Fluent UI comment-feed UI built
- [x] Nested replies, depth limit, expand/collapse
- [x] @mentions with demo contacts
- [x] Pagination and responsive layout
- [x] Build, lint, unit tests, browser tests passing
- [x] Demo data, localStorage, and demo-only UI moved out of the library into the demo app

## 2. Public API design

- [x] Standalone package separate from the Vite demo app
- [x] Typed CommentThread export plus exported public types (Comment, Author, CommentThreadProps, etc.)
- [x] Data via props (comments, currentUser); no hardcoded users or seed data
- [ ] Stable types for comment ID, parent ID, author, ISO timestamp — IDs and author are typed, but `createdAt` is a string validated with `Date.parse`, not specifically as ISO.
- [x] Controlled usage as the primary mode (comments + onCreate); decide whether to also offer uncontrolled (defaultComments) — controlled-only in v1.
- [x] One required async callback, onCreate({ text, parentId }), for both new comments (parentId: null) and replies (parentId: parent comment ID)
- [ ] Consumer updates comments after onCreate resolves; clear the draft on success and preserve it with an error on rejection — draft handling is implemented, but the demo and README update comments before the callback resolves. Confirm the intended ordering.
- [x] Loading, empty, error, and read-only states
- [ ] Configurable nesting depth and page size with sensible defaults — reducing `pageSize` at runtime can leave too many conversations visible.
- [ ] Pagination supports batches, show-all, and disabled modes — switching from an expanded show-all view back to batches can retain the expanded state.
- [ ] Configurable labels, placeholders, date formatting, localization — overrides exist, but some accessibility and error strings remain hard-coded.
- [x] ref forwarding to the root element, className/style support, remaining props spread on root
- [x] Defined behavior for duplicate IDs, missing parents, invalid dates, stale data
- [x] Works with minimal props (only comments, currentUser, onCreate required)
- [x] Every export treated as a public promise (keep internals unexported)

## 3. Consumer integrations

- [x] Auth, authorization, API calls, persistence stay in the consumer
- [x] No localStorage in the library
- [x] Optional async contact-search callback for @mentions, with loading, no-results, and failure states
- [x] Mention format decision: store inline tokens as `@[Name](userId)`, reusing the prototype format and keeping each comment self-contained
- [x] Document the token grammar and parse tokens as plain text; treat `userId` as an opaque stable identifier, never render comment content as HTML
- [x] Debounce async mention searches and ignore stale responses using cancellation or request IDs
- [x] Documented optimistic vs server-confirmed update patterns
- [x] Verified: consumer data changes re-render the feed correctly
- [x] No hard dependency on any data-fetching library (consumers wire in their own, e.g. via callbacks)

## 4. UI, theming, accessibility

- [x] Uses host Fluent theme; no global styles imposed
- [x] Documented whether consumer must wrap in FluentProvider
- [ ] Griffel styles scoped, no collisions with host styles; renderer/SSR setup documented — styles are scoped, but collision testing and renderer/SSR setup documentation are incomplete.
- [x] Responsive, light/dark themes verified
- [ ] Customization points defined (class names, slots, render props) — root className/style are supported; slots and render props are not provided.
- [x] Keyboard support for thread controls, replies, mention suggestions
- [ ] Focus management after submit, reply, cancel — reply/cancel paths exist; post-submit focus has not been verified.
- [x] Loading and submission errors announced accessibly
- [ ] Multiline input, paste, IME composition verified — handlers exist, but these paths lack dedicated verification.
- [ ] Screen reader, contrast, zoom, mobile checked — narrow-screen browser checks exist; the other checks are pending.
- [x] User text rendered as text only; no dangerouslySetInnerHTML on comment or mention content

## 5. Package setup and compatibility

- [ ] Name (scoped, e.g. @scope/comment-thread), license, repository, version, publish ownership — MIT and the GitHub repository are declared; package name and publishing ownership are not confirmed.
- [ ] Bundler: tsup or Vite library mode — the current build uses TypeScript to emit unbundled ESM; decide whether a bundler is required.
- [x] Output ESM + .d.ts; ship CJS only if its smoke test passes — CJS is not shipped.
- [x] exports map (with types first), main, module, types
- [x] Files whitelist includes only intended component build artifacts, documentation, and license.
- [ ] sideEffects set correctly for tree-shaking — set to false, but consumer tree-shaking has not been independently verified.
- [ ] react, react-dom, @fluentui/react-components as peerDependencies; advertise only version ranges tested in CI — peers are declared, but the ranges are provisional and no CI matrix exists.
- [x] react, react-dom, react/jsx-runtime, Fluent externalized in the build (no duplicate runtimes)
- [x] Modern JSX runtime (consumers don't need import React)
- [x] Confirm the "use client" directive is preserved in the built dist files for Next.js App Router compatibility
- [x] SSR-safe: no window/document at import or render time — built ESM imported and rendered on the server without browser globals.
- [x] No unintended runtime dependencies; build tools in devDependencies
- [ ] Bundle size checked (size-limit or bundlephobia) — the package tarball is approximately 13 kB; a consumer bundle-size check is still needed.
- [x] LICENSE file, .gitignore

## 6. Tests and quality gates

- [x] Unit tests: nested replies, depth limits, invalid operations
- [x] Unit tests: mention parsing, invalid saved data
- [x] Browser tests: posting, mention selection, pagination, narrow screen
- [ ] Test runtime reductions of `pageSize` and switching from expanded show-all back to batches
- [x] Tests for the controlled API and consumer callbacks
- [x] Tests for loading, empty, error, read-only, async mention-search states
- [ ] StrictMode compatibility test (effects run twice in dev) — the demo uses StrictMode, but there is no dedicated double-effect assertion.
- [ ] eslint-plugin-react-hooks and jsx-a11y enabled; Prettier configured — react-hooks is enabled; jsx-a11y and Prettier are not configured.
- [ ] npx publint clean
- [ ] npx @arethetypeswrong/cli --pack . clean (types resolve for every shipped module format)
- [x] Package smoke test using the packed .tgz (not npm link) in a clean consumer app, ideally Vite and Next.js — verified with Vite/Chromium and server rendering; Next.js remains a separate open item.
- [x] Install from a local Git URL and GitHub using the internal registry — `prepare` built the package and the installed ESM rendered on the server in both cases.
- [x] Smoke-test every shipped module format, including CJS if provided — ESM is the only shipped format.
- [ ] Smoke-test the packed package in a Next.js App Router app
- [ ] CI matrix covers each supported React version
- [ ] CI runs build, type-check, lint, unit, browser, and smoke tests on every PR

## 7. Documentation

- [ ] README: install command, supported React/Fluent/browser versions, peer deps — peer ranges are listed; install and browser support remain incomplete.
- [ ] Minimal working example with consumer data and callbacks — the example requires a consumer-supplied `api`.
- [ ] Props table: types, defaults, callback semantics
- [ ] Fluent provider, theme, and customization requirements — provider and theme are documented; customization limits need fuller documentation.
- [ ] How to connect an API, handle errors, implement mentions — callback and token behavior are described; complete integration examples are still needed.
- [ ] Accessibility behavior and consumer responsibilities
- [x] SSR / Next.js usage note
- [x] Demo app (or Storybook) that consumes the package like an npm user — the separate demo imports the sibling package as a local dependency.
- [ ] CHANGELOG.md
- [ ] Build, test, pack, publish workflow documented (optionally CONTRIBUTING.md) — build, test, and pack commands are documented; publishing is not.

## 8. Release

- [ ] npm account with 2FA; package name availability checked (npm view <name>)
- [ ] Changesets (or equivalent) set up; semver followed
- [x] npm pack --dry-run: confirm contents
- [x] Install the packed artifact in a clean app and run it — the isolated Vite consumer rendered and submitted a comment.
- [ ] Review license, dependency metadata, README, published file list
- [ ] npm publish --dry-run, then npm publish --access public (required for scoped public packages) — an earlier dry run of the combined layout warned that registry login is required; repeat it for the standalone package. No publication was attempted.
- [ ] Automated release via GitHub Actions, with --provenance
- [ ] Publish only after every check above passes

## Suggested order of attack

1. Section 1: decouple demo code from the library
2. Sections 2 and 3: settle the public API and consumer boundary
3. Section 5: build and packaging setup
4. Section 6: run npm pack and the smoke test early, since it surfaces most packaging bugs
5. Sections 4, 7, 8: theming and accessibility polish, documentation, release