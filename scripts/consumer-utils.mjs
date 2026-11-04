import { spawnSync } from 'node:child_process'
import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('..', import.meta.url))
export const cache = join(root, '.consumer-tests')

export function npm(args, cwd = root, capture = false) {
  if (!process.env.npm_execpath) throw new Error('Run consumer checks through an npm script.')
  const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    timeout: 600_000,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`npm ${args.join(' ')} failed.\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
  }
  return result.stdout
}

export async function prepareConsumer(kind) {
  npm(['run', 'build'])
  const packDirectory = join(cache, 'artifacts', kind)
  await mkdir(packDirectory, { recursive: true })
  console.log(`Packing the ${kind} consumer artifact...`)
  const output = npm(['pack', '--json', '--pack-destination', packDirectory], root, true)
  const json = output.match(/\[\s*\{[\s\S]*\]\s*$/)
  if (!json) throw new Error(`npm pack did not return package metadata:\n${output}`)
  const [packed] = JSON.parse(json[0])
  const artifact = join(cache, `${packed.shasum}.tgz`)
  await copyFile(join(packDirectory, packed.filename), artifact)
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  const directory = join(cache, kind)
  await mkdir(directory, { recursive: true })
  await cp(join(root, 'tests', 'fixtures', kind), directory, { recursive: true })
  const react = process.env.TEST_REACT_VERSION ?? '19.3.1'
  const typesMajor = react.startsWith('18') ? '18' : '19'
  const manifest = {
    name: `comment-thread-${kind}-consumer`,
    private: true,
    version: '0.0.0',
    type: 'module',
    dependencies: {
      [metadata.name]: `file:${artifact}`,
      '@fluentui/react-components': process.env.TEST_FLUENT_VERSION ?? '9.75.1',
      react,
      'react-dom': react,
    },
    devDependencies: {
      '@types/node': '^24.19.2',
      '@types/react': `^${typesMajor}`,
      '@types/react-dom': `^${typesMajor}`,
      typescript: metadata.devDependencies.typescript,
      ...(kind === 'vite'
        ? { vite: metadata.devDependencies.vite, '@vitejs/plugin-react': '^6.1.2' }
        : { next: '16.4.3' }),
    },
  }
  await writeFile(join(directory, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(
    `Installing the ${kind} consumer with React ${react} (${packed.shasum.slice(0, 8)})...`,
  )
  npm(['install', '--prefer-offline', '--no-fund'], directory)
  return { directory, packed }
}
