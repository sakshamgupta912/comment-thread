import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'
import { cache, npm, prepareConsumer } from './consumer-utils.mjs'

const { directory, packed } = await prepareConsumer('vite')
const ssr = spawnSync(process.execPath, ['ssr.mjs'], { cwd: directory, stdio: 'inherit' })
if (ssr.error) throw ssr.error
assert.equal(ssr.status, 0, 'Packed ESM server rendering failed.')
npm(['exec', '--', 'tsc', '--noEmit'], directory)
npm(['exec', '--', 'vite', 'build'], directory)
assert.ok(packed.size < 30 * 1024, `Tarball exceeds 30 KiB: ${packed.size}`)
assert.ok(
  packed.files.every(
    ({ path }) =>
      path.startsWith('dist/') ||
      ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md'].includes(path),
  ),
  'The packed artifact contains unintended files.',
)

const sizes = {}
for (const [name, budget] of [
  ['helper', 4 * 1024],
  ['component', 20 * 1024],
]) {
  const result = await build({
    root: directory,
    configFile: false,
    logLevel: 'error',
    build: {
      write: false,
      minify: true,
      lib: { entry: join(directory, `${name}.ts`), formats: ['es'], fileName: name },
      rolldownOptions: {
        external: (id) =>
          ['react', 'react-dom', '@fluentui/react-components'].some(
            (peer) => id === peer || id.startsWith(`${peer}/`),
          ),
      },
    },
  })
  const chunks = (Array.isArray(result) ? result : [result])
    .flatMap((bundle) => bundle.output)
    .filter((item) => item.type === 'chunk')
  const size = gzipSync(chunks.map((chunk) => chunk.code).join('\n')).length
  sizes[name] = size
  assert.ok(size <= budget, `${name} bundle exceeds its gzip budget: ${size} > ${budget}`)
  if (name === 'helper') {
    const modules = chunks.flatMap((chunk) => Object.keys(chunk.modules))
    assert.ok(
      !modules.some((id) => /CommentThread|CommentComposer|[/\\]react[/\\]/.test(id)),
      'Importing removeComment retained unused React UI.',
    )
  }
}
await writeFile(join(cache, 'bundle-size.json'), `${JSON.stringify(sizes, null, 2)}\n`)
const entry = await readFile(
  join(directory, 'node_modules', '@fluent', 'comment-thread', 'dist', 'index.js'),
  'utf8',
)
assert.match(entry, /^['"]use client['"]/)
console.log(`Packed consumer verified; gzip bytes: ${JSON.stringify(sizes)}`)
