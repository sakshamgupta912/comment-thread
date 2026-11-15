# Contributing and releasing

## Development

Use Node.js 22.12 or newer and npm. The library emits unbundled ES2022 ESM and declarations using TypeScript. A bundler is intentionally not required: the consumer's bundler handles Fluent/React peer imports and tree shaking. CommonJS is not advertised.

```sh
npm ci
npm run check
npx playwright install chromium firefox webkit
npm run test:browser
npm run test:next
```

`check` runs lint (including React Hooks and JSX accessibility), Prettier, unit/SSR tests, publint, and Are the Types Wrong using its ESM-only profile. The exports map deliberately has no CommonJS resolution; the profile matches that public contract rather than suppressing a shipped-format error. `test:browser` packs the real artifact, installs it in an isolated Vite consumer, type-checks and builds that consumer, checks package contents/tree shaking/size, then exercises it in Chromium, Firefox, and WebKit. It does not import library source or depend on the sibling demo.

Generated consumers and tarballs live under `.consumer-tests`. Browser results are ignored. Ports 4180 and 4181 must be free. `test:next` builds and runs a production App Router consumer with the packed artifact and tests SSR styles, hydration, posting, deletion, and a Server Component calling `removeComment`. It closes the server afterward.

To check the minimum React major locally:

```powershell
$env:TEST_REACT_VERSION = '18.3.1'
npm run test:browser
Remove-Item Env:TEST_REACT_VERSION
```

CI checks React 18.3.1 and 19.3.1 on Node 22 and 24. Fluent 9.75.1 is the tested minimum. The package is intended for modern evergreen browsers; the CI browser engines are the executable compatibility contract, not a claim about all historical browsers. Changes to peer ranges require corresponding matrix coverage.

The helper-only bundle must remain under 4 KiB gzip, the component-only ESM bundle (React/Fluent external) under 20 KiB gzip, and the tarball under 40 KiB. These are separate from an application's React/Fluent bundle size. Metrics are written to `.consumer-tests/bundle-size.json`.

The current development-tool dependency audit reports 13 moderate findings from minimatch <11.0.1. These tools are not shipped as runtime dependencies. Review upstream fixes before release; do not force a major minimatch override into ESLint/plugins that depend on its older API. The isolated Vite and patched Next.js consumer installations reported no advisories.

## Manual accessibility acceptance

Automated axe checks are necessary, not proof of complete accessibility. Before a release, a maintainer must record:

- NVDA with Chrome or Edge on Windows: feed order, author/time/body, reply target, mention options, loading/errors, and delete confirmation.
- VoiceOver with Safari on macOS or iOS, including touch exploration.
- Keyboard-only operation, visible focus, Escape/cancel restoration, and focus after deleting the currently focused comment.
- Browser zoom at 200% and 400%, OS text scaling, high-contrast/forced-colors mode, and a real mobile device.
- Native IME composition using a real input method; the automated composition-event test does not replace this.

Do not mark these checks complete without performing them. Consumer-supplied themes, labels, author images, and surrounding layouts need separate accessibility validation.

## Versioning and publication

Use the changelog plus npm version/tag workflow (Changesets is not necessary for this single package). Follow SemVer: while below 1.0, bump minor for breaking API/behavior changes, patch for compatible fixes. Once stable, use major versions for breaking changes.

Publication is intentionally disabled until the repository variable `NPM_RELEASE_APPROVED` is set to `true`. A maintainer must first:

1. Confirm ownership and availability of the npm scope/name. `@fluent/comment-thread` is provisional; the GitHub repository does not establish npm scope ownership. If renamed, update the manifest, README, lockfile, consumer scripts/imports, and demo together.
2. Verify license and dependency metadata and complete the manual acceptance checks.
3. Configure the repository's `npm` environment with required reviewers and an npm trusted publisher pointing to `.github/workflows/release.yml`. Configure npm account 2FA in the npm account UI. No token belongs in source control.
4. Confirm public npm registry access. Run `npm view @fluent/comment-thread --registry=https://registry.npmjs.org` and `npm publish --dry-run`. A missing package is not evidence that you own its scope.
5. Commit reviewed changes, run the full validation matrix, update the changelog, and create the matching version commit/tag using `npm version patch` (or `minor`/`major`).
6. Push the reviewed commit and version tag. The release workflow re-runs CI, verifies the tag equals `v` plus the package version, and publishes with npm provenance through OIDC.

Never bypass a failed validation or registry certificate/network restriction. Leave publishing disabled if the ownership, manual checks, or credentials are incomplete. An unavailable npm registry does not prevent building/testing the asset locally or distributing the reviewed tarball through an approved internal registry.
