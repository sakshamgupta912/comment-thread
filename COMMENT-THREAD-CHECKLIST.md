# Reusable CommentThread Component: Release Checklist

**Audit date: 2026-11-04. Publication remains gated.**

The package and its automated release gates have been upgraded. Unchecked items are deliberately not represented as complete: npm ownership/account setup, manual accessibility acceptance, dependency-advisory review, and running the new workflows on GitHub require maintainer follow-through.

The consuming application owns authentication, authorization, data visibility, persistence, API calls, and complete comment-tree updates.

## 1. Prototype and consumer boundary

- [x] Standalone package, separate from the Vite demo.
- [x] No seed users, localStorage, or demo-only role/pagination controls in the library.
- [x] Controlled-only API; no duplicate internal comment store.
- [x] Nested replies, depth limit, expansion, plain-text mentions, responsive layout, and Fluent light/dark themes.
- [x] Consumer-owned async creation and deletion, explicit failures, draft preservation, and retry.
- [x] Client-side batch, show-all, and disabled pagination modes.

## 2. Public API decisions

- [x] Typed `CommentThread`, public types, and immutable `removeComment` subtree helper.
- [x] Only `comments`, `currentUser`, and `onCreate` are required.
- [x] Opaque non-empty string IDs, including `main` and IDs containing spaces; generated DOM IDs are encoded and instance-scoped.
- [x] Four-digit-year ISO date-times with seconds and explicit timezone; invalid calendar dates, date-only strings, and timezone-less values are rejected.
- [x] Consumer accepts/persists data and requests the controlled state update before resolving callbacks; React need not have committed the update yet.
- [x] Successful creation clears the draft; failures retain it with an alert.
- [x] Page-size and pagination-mode changes reset the root preview without discarding drafts.
- [x] `onDelete` is opt-in; `canDelete` defaults to author-only and allows application-specific role policies.
- [x] Deletion confirmation identifies the descendant count; the consumer removes the entire subtree, including replies by other authors.
- [x] Pending deletion prevents duplicate callbacks and new submissions.
- [x] Loading, empty, external error, and read-only states.
- [x] Root HTML attributes, className/style, and forwarded ref.
- [x] Root-only styling and provider tokens are the intentional customization contract; no unstable internal CSS selectors, slots, or render props are promised.
- [x] All component-owned UI strings are configurable; supplied API errors remain the consumer's localization responsibility.
- [x] Invalid trees fail explicitly; internal helpers remain inaccessible through package subpaths.

## 3. Consumer integrations

- [x] Optional debounced asynchronous mention search with cancellation, stale-response protection, loading, no-results, and failure states.
- [x] Escaped inline mention-token grammar documented; user IDs remain opaque; user content is never interpreted as HTML.
- [x] No dependency on a fetching library.
- [x] Server-confirmed and optimistic update responsibilities documented.
- [x] API creation/deletion/search examples, including explicit failed-response handling.
- [x] Demo wires persisted deletion, icon-only bins, and an admin-mode override without pretending to provide authentication.
- [x] Authorization, subtree-deletion policy, and comment-content visibility remain consumer/server responsibilities.

## 4. UI, accessibility, SSR

- [x] Scoped Griffel styles, host FluentProvider/theme, and no global reset.
- [x] Renderer-per-request SSR and Next.js App Router provider setup documented.
- [x] Import/server-render safety without browser globals.
- [x] Deterministic default timestamps during SSR/hydration; browser-relative formatting afterward.
- [x] Multiple component instances have distinct editor/listbox/reply relationships.
- [x] Keyboard replies, mention navigation, Escape/cancel, dialog focus trapping, and accessible icon labels.
- [x] Successful submission restores composer focus unless the user moved elsewhere.
- [x] Fluent-native restore-focus targets handle dialog cancellation; deletion restores a surviving composer/title.
- [x] Plain-text paste, multiline submission, synthetic IME composition, and StrictMode callback assertions.
- [x] Automated WCAG A/AA axe checks include light/dark themes, open dialog, and post-cancel state; no rules are disabled or dependency nodes excluded.
- [x] Narrow-container layout, 200% zoom/reflow, and a host-style isolation check.
- [ ] Native IME acceptance using a real input method.
- [ ] NVDA and VoiceOver, real mobile devices, 400% browser zoom, OS text scaling, and forced-colors acceptance.
- [ ] Consumer-specific themes, host resets, layouts, and screen-reader combinations validated by the consuming application.

## 5. Packaging and compatibility

- [x] MIT license, repository metadata, and version declared.
- [x] Intentional unbundled TypeScript ESM build; no unnecessary bundler or duplicated React/Fluent runtime.
- [x] Import-only exports with nested types-first resolution, declarations, main/module/types metadata, and preserved `use client`.
- [x] ESM is the only supported module format; CommonJS is not advertised.
- [x] Explicit artifact allowlist includes dist, README, changelog, contributor/release documentation, license, and manifest.
- [x] Side-effect-free helper import independently verified to exclude the React UI.
- [x] React/React DOM and Fluent are peers; tooling remains in devDependencies.
- [x] Clean Vite consumers use actual content-addressed tarballs, never source aliases or npm link.
- [x] Packed ESM import, server render, public-type check, and production Vite build.
- [x] Packed production Next.js 16.4.3 App Router consumer: SSR, Griffel styles, hydration, posting, deletion.
- [x] Executable gzip budgets: helper 4 KiB, component with peers external 20 KiB; package tarball budget 30 KiB.
- [ ] Confirm legal/npm ownership and package-name availability. `@fluent/comment-thread` is provisional; GitHub repository ownership does not confer ownership of the npm scope.

## 6. Automated quality gates

- [x] Unit/SSR tests for indexing, invalid trees, timestamps, mention escaping, deletion, permissions, localization, and browser-global-free rendering.
- [x] Browser regression tests for runtime page-size reductions and expanded show-all to batches.
- [x] Controlled callbacks, pending states, failures, draft independence, focus, multi-instance IDs, paste, composition, and StrictMode.
- [x] Chromium, Firefox, and WebKit projects use an isolated packed consumer.
- [x] React Hooks and JSX accessibility ESLint rules plus Prettier configuration.
- [x] publint and Are the Types Wrong for the declared ESM-only resolution profile.
- [x] Standalone CI configuration covers Node 22/24 and React 18.3.1/19.3.1, with packed Next.js on the React 19 job.
- [ ] Execute the new CI workflow on GitHub after reviewed changes are committed and pushed.
- [ ] Review remaining development-tool advisories. npm reports 13 moderate findings stemming from minimatch <11.0.1; do not force incompatible major overrides into ESLint's older minimatch APIs.

## 7. Documentation

- [x] Install instructions, peers, tested runtimes/browser policy, and minimal self-contained example.
- [x] Props/types/defaults table, callback timing, timestamp/ID validation, and stale-target behavior.
- [x] Mention grammar and full create/delete/search integration examples.
- [x] Theme, root-only customization, SSR renderer setup, and App Router provider.
- [x] Keyboard behavior, focus, announcements, and consumer accessibility responsibilities.
- [x] Changelog and single-package SemVer/version-tag policy.
- [x] Build, check, browser, packed-consumer, Next.js, size-budget, and protected release instructions.
- [x] Manual accessibility and publication blockers explicitly documented rather than checked off.

## 8. Release

- [x] Automated artifact/size/content checks and npm pack dry-run path.
- [x] Guarded GitHub Actions publication configuration with provenance, validated version tag, and prerequisite CI.
- [x] Publishing disabled unless `NPM_RELEASE_APPROVED` is explicitly enabled.
- [ ] Confirm npm account/scope access and configure 2FA in npm.
- [ ] Configure trusted publishing and a protected GitHub `npm` environment with required reviewers.
- [ ] Verify public-registry access. A direct npmjs query failed TLS negotiation in this environment; the approved internal proxy was used for dependency installation.
- [ ] Complete legal, dependency-advisory, manual accessibility, and CI-run acceptance.
- [x] Run standalone pack and public-registry publish dry runs. The unauthenticated dry run passed with npm's login warning; this does not establish scope access or account readiness.
- [ ] Approve the release, commit/tag the reviewed version, and publish. No real publication, credentials, permissions, repository settings, or releases were created by this task.

## Validation evidence

Locally verified on Windows with Node 26.13.0 and Fluent 9.75.1:

| Gate                               | Result                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Library unit/SSR tests             | 8 passed                                                                |
| Packed React 19.3.1 consumer       | 30 passed across Chromium, Firefox, and WebKit                          |
| Packed React 18.3.1 consumer       | 30 passed across Chromium, Firefox, and WebKit                          |
| Light/dark axe scans               | Passed before, during, and after the delete dialog in all three engines |
| Next.js 16.4.3 production consumer | SSR, styles, hydration, posting, and deletion passed                    |
| Demo regression suite              | 5 unit tests and 21 browser tests passed; build and lint passed         |
| Library quality gates              | ESLint, Prettier, publint, ESM-only ATTW, and build passed              |
| Manifest/lockfile metadata         | Name, version, dependencies, peers, and engines agree                   |
| Helper/component gzip size         | 1,033 / 8,883 bytes; both below budget                                  |
| Tarball dry run                    | 17 intended files, approximately 22.3 kB compressed; below 30 KiB       |
| Publication dry run                | Passed; no real publication or authenticated registry check             |

Use the executable gates instead of treating this document as a substitute for tests:

```sh
npm run check
npm run test:browser
npm run test:next
npm pack --dry-run
```

The compatibility CI and release workflow are configuration until they have run on GitHub. Human/credential-dependent checks above must remain open until an authorized maintainer performs them.
