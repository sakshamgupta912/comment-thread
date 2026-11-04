import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('changing page size and pagination modes resets the preview without losing drafts', async ({
  page,
}) => {
  const thread = page.getByTestId('first')
  const composer = thread.getByRole('combobox', { name: 'Start a new conversation...' })
  await composer.fill('Keep this draft')
  await page.getByLabel('Page size').selectOption('1')
  await expect(thread.getByRole('article')).toHaveCount(1)
  await thread.getByRole('button', { name: 'Show more', exact: true }).click()
  await expect(thread.getByRole('article')).toHaveCount(2)
  await page.getByLabel('Page size').selectOption('2')
  await page.getByLabel('Pagination', { exact: true }).selectOption('all')
  await thread.getByRole('button', { name: 'Show all', exact: true }).click()
  await expect(thread.getByRole('article')).toHaveCount(3)
  await page.getByLabel('Pagination', { exact: true }).selectOption('batches')
  await expect(thread.getByRole('article')).toHaveCount(2)
  await expect(thread.getByRole('button', { name: 'Show more', exact: true })).toBeVisible()
  await page.getByLabel('Pagination', { exact: true }).selectOption('off')
  await expect(thread.getByRole('article')).toHaveCount(3)
  await page.getByLabel('Pagination', { exact: true }).selectOption('batches')
  await expect(thread.getByRole('article')).toHaveCount(2)
  await expect(composer).toHaveText('Keep this draft')
})

test('a root named main has an independent reply draft and submission restores focus', async ({
  page,
}) => {
  const thread = page.getByTestId('first')
  const root = thread.getByRole('article').first()
  const reply = root.getByRole('combobox')
  const main = thread.getByRole('combobox', { name: 'Start a new conversation...' })
  await reply.fill('Reply draft')
  await main.fill('New conversation')
  await expect(reply).toHaveText('Reply draft')
  await thread.getByRole('button', { name: 'Post', exact: true }).click()
  await expect(
    thread.getByRole('article').first().getByText('New conversation', { exact: true }),
  ).toBeVisible()
  await expect(main).toBeFocused()
  const original = thread.getByRole('article').filter({ hasText: 'First conversation' })
  await original.getByRole('button', { name: 'Send reply' }).click()
  await expect(original.getByRole('combobox')).toBeFocused()
  await expect(original.getByRole('combobox')).toHaveText('')
  await original.getByRole('button', { name: /View \d+ replies/ }).click()
  await expect(original.getByText('Reply draft', { exact: true })).toBeVisible()
})

test('multiple instances have unique relationship IDs and focus stays in the selected instance', async ({
  page,
}) => {
  await page.getByLabel('Two instances').check()
  const first = page.getByTestId('first')
  const second = page.getByTestId('second')
  const firstExpander = first.getByRole('button', { name: 'View 1 reply' })
  const secondExpander = second.getByRole('button', { name: 'View 1 reply' })
  expect(await firstExpander.getAttribute('aria-controls')).not.toBe(
    await secondExpander.getAttribute('aria-controls'),
  )
  await second.getByRole('button', { name: 'Reply', exact: true }).first().click()
  await second.getByRole('button', { name: 'Cancel reply' }).click()
  await expect(second.getByRole('article').first().getByRole('combobox')).toBeFocused()
  const ids = await page
    .locator('[id]')
    .evaluateAll((elements) => elements.map((element) => element.id))
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids.every((id) => !/\s/.test(id))).toBe(true)
})

test('confirmed deletion removes its subtree, traps dialog focus, and restores composer focus', async ({
  page,
}) => {
  const thread = page.getByTestId('first')
  const bin = thread
    .getByRole('article')
    .first()
    .getByRole('button', { name: 'Delete', exact: true })
  await bin.focus()
  await bin.press('Enter')
  const dialog = page.getByRole('dialog')
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
  const confirm = dialog.getByRole('button', { name: 'Delete', exact: true })
  await expect(cancel).toBeFocused()
  await cancel.press('Shift+Tab')
  await expect(confirm).toBeFocused()
  await confirm.press('Tab')
  await expect(cancel).toBeFocused()
  await confirm.click()
  await expect(dialog).toHaveCount(0)
  await expect(thread.getByText('2 comment posts')).toBeVisible()
  await expect(thread.getByText('First conversation', { exact: true })).toHaveCount(0)
  await expect(thread.getByText('First reply', { exact: true })).toHaveCount(0)
  await expect(thread.getByRole('combobox', { name: 'Start a new conversation...' })).toBeFocused()
})

test('multiline and plain-text paste preserve text without inserting HTML', async ({ page }) => {
  const composer = page.getByRole('combobox', { name: 'Start a new conversation...' })
  await composer.fill('First line')
  await composer.press('Shift+Enter')
  await composer.press('x')
  await expect(composer).toContainText('First line')
  await expect(composer).toContainText('x')
  await composer.press('Enter')
  const multiline = page.getByRole('article').first().getByText('First line x', { exact: true })
  await expect(multiline).toBeVisible()
  expect(await multiline.textContent()).toBe('First line\nx')
  await composer.fill('')
  await composer.focus()
  await composer.evaluate((element) => {
    const clipboard = new DataTransfer()
    clipboard.setData('text/plain', 'Plain <b>text</b>\nSecond line')
    clipboard.setData('text/html', '<b>HTML must not be inserted</b>')
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: clipboard })
    element.dispatchEvent(event)
  })
  await expect(composer).toHaveText('Plain <b>text</b>\nSecond line')
  await expect(composer.locator('b')).toHaveCount(0)
  await composer.press('Enter')
  await expect(
    page.getByRole('article').first().getByText('Plain <b>text</b>\nSecond line', { exact: true }),
  ).toBeVisible()
})

test('IME composition Enter does not submit; normal Enter submits once under StrictMode', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Refresh counters' }).click()
  await expect(page.getByLabel('Effect runs')).toHaveText('2')
  const composer = page.getByRole('combobox', { name: 'Start a new conversation...' })
  await composer.fill('Composition draft')
  await composer.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true })
  await page.getByRole('button', { name: 'Refresh counters' }).click()
  await expect(page.getByLabel('Create calls')).toHaveText('0')
  await expect(composer).toHaveText('Composition draft')
  await composer.press('Enter')
  await expect(page.getByText('5 comment posts')).toBeVisible()
  await page.getByRole('button', { name: 'Refresh counters' }).click()
  await expect(page.getByLabel('Create calls')).toHaveText('1')
})

test('pending deletion is not duplicated and failures use translated labels', async ({ page }) => {
  await page.getByLabel('Translated labels').check()
  await page.getByLabel('Fail callbacks').check()
  await page.getByLabel('Hold deletion').check()
  const composer = page.getByRole('combobox', { name: 'Start a new conversation...' })
  await composer.fill('@')
  await expect(page.getByRole('listbox', { name: 'People (translated)' })).toBeVisible()
  await composer.press('Escape')
  await composer.fill('Keep on failure')
  await composer.press('Enter')
  await expect(page.getByRole('alert')).toHaveText('Post failed (translated)')
  await expect(composer).toHaveText('Keep on failure')
  const bin = page.getByRole('article').first().getByRole('button', { name: 'Delete', exact: true })
  await expect(bin).toHaveText('')
  await bin.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Deleting...' }).dispatchEvent('click')
  await page.evaluate(() => window.dispatchEvent(new Event('release-delete')))
  await expect(dialog.getByRole('alert')).toHaveText('Delete failed (translated)')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(bin).toBeFocused()
  await page.getByRole('button', { name: 'Refresh counters' }).click()
  await expect(page.getByLabel('Delete calls')).toHaveText('1')
  await page.getByLabel('Read only').check()
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0)
})

for (const dark of [false, true]) {
  test(`accessible controls, contrast, and deletion dialog in ${dark ? 'dark' : 'light'} theme`, async ({
    page,
  }) => {
    if (dark) await page.getByLabel('Dark theme').check()
    await page.getByRole('button', { name: 'View 1 reply' }).click()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
    await page
      .getByRole('article')
      .first()
      .getByRole('button', { name: 'Delete', exact: true })
      .first()
      .click()
    await page.getByRole('dialog').evaluate(async (element) => {
      await Promise.all(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      )
    })
    const dialogResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(dialogResults.violations).toEqual([])
    await page.getByRole('dialog').press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(
      page
        .getByRole('article')
        .first()
        .getByRole('button', { name: 'Delete', exact: true })
        .first(),
    ).toBeFocused()
    const restored = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(restored.violations).toEqual([])
  })
}

test('reflows at 200 percent text zoom and does not change host styles', async ({ page }) => {
  const before = await page.locator('h1').evaluate((element) => getComputedStyle(element).fontSize)
  await page.getByLabel('Dark theme').check()
  await expect
    .poll(() => page.locator('h1').evaluate((element) => getComputedStyle(element).fontSize))
    .toBe(before)
  await page.setViewportSize({ width: 320, height: 900 })
  await page.addStyleTag({ content: 'html { font-size: 200%; } [data-testid] { zoom: 2; }' })
  await expect(page.getByRole('button', { name: 'Delete', exact: true }).first()).toBeVisible()
  expect(
    await page
      .getByTestId('first')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true)
})
