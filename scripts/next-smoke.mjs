import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { chromium, expect } from '@playwright/test'
import { npm, prepareConsumer } from './consumer-utils.mjs'

const { directory } = await prepareConsumer('next')
npm(['exec', '--', 'next', 'build', '--webpack'], directory)
const server = spawn(
  process.execPath,
  [
    join(directory, 'node_modules', 'next', 'dist', 'bin', 'next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '4181',
  ],
  { cwd: directory, stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } },
)
let browser
try {
  let html
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error('Next.js exited before becoming ready.')
    try {
      const response = await fetch('http://127.0.0.1:4181/')
      if (!response.ok) throw new Error(`Next.js returned ${response.status}`)
      html = await response.text()
      break
    } catch (error) {
      if (attempt === 59) throw error
      await setTimeout(500)
    }
  }
  assert.ok(
    html?.includes('Server rendered conversation'),
    'The packed component was not server-rendered.',
  )
  assert.match(html, /data-make-styles-bucket/, 'SSR did not emit Griffel styles.')
  const serverComponent = await (await fetch('http://127.0.0.1:4181/server-check')).text()
  assert.ok(
    serverComponent.includes('0 remaining after removeComment on the server'),
    'A Server Component could not call removeComment from the package entry.',
  )
  browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('http://127.0.0.1:4181/')
  await expect(page.getByText('Server rendered conversation', { exact: true })).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Start a new conversation...' })
    .fill('Posted after hydration')
  await page.getByRole('button', { name: 'Post', exact: true }).click()
  await expect(page.getByText('Posted after hydration', { exact: true })).toBeVisible()
  await page
    .getByRole('article')
    .first()
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByText('Posted after hydration', { exact: true })).toHaveCount(0)
  assert.deepEqual(errors, [], 'The Next.js consumer emitted hydration/runtime errors.')
  console.log(
    'Packed Next.js App Router consumer passed SSR, styles, hydration, posting, deletion, and a Server Component calling removeComment.',
  )
} finally {
  await browser?.close()
  if (server.exitCode === null) {
    const closed = once(server, 'exit')
    server.kill()
    await Promise.race([
      closed,
      setTimeout(10_000, undefined, { ref: false }).then(() => server.kill('SIGKILL')),
    ])
  }
}
