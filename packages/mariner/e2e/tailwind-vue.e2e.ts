import { test, expect } from './setup'
import { mountPage } from './helpers'

const DEV = 'http://localhost:3001/shared-vue'

const twMount = () => mountPage([{ id: 'tw-app', url: `${DEV}/tailwind-vue/navigator.js` }])

test.describe('tailwind-vue — navigator serving', () => {
  test('serves tailwind-vue navigator.js as ESM', async ({ request }) => {
    const response = await request.get(`${DEV}/tailwind-vue/navigator.js`)
    expect(response.ok()).toBe(true)

    const body = await response.text()
    expect(body).toContain('export')
    expect(body).toContain('createVueNavigator')
  })

  test('navigator.js response has correct content-type', async ({ request }) => {
    const response = await request.get(`${DEV}/tailwind-vue/navigator.js`)
    const contentType = response.headers()['content-type']
    expect(contentType).toContain('javascript')
  })
})

test.describe('tailwind-vue — Vue app in browser', () => {
  test('mounts and renders heading', async ({ page }) => {
    await page.setContent(twMount())

    await expect(page.locator('[data-testid="tw-heading"]')).toContainText('Tailwind Vue', { timeout: 15000 })
    await expect(page.locator('[data-testid="tw-subtitle"]')).toContainText('Tailwind CSS 4')
  })

  test('counter button increments on click', async ({ page }) => {
    await page.setContent(twMount())

    const button = page.locator('[data-testid="tw-counter"]')
    await expect(button).toContainText('Count is 0', { timeout: 15000 })

    await button.click()
    await expect(button).toContainText('Count is 1')

    await button.click()
    await expect(button).toContainText('Count is 2')
  })

  test('all three cards render', async ({ page }) => {
    await page.setContent(twMount())

    await expect(page.locator('[data-testid="tw-card-1"]')).toContainText('Card 1', { timeout: 15000 })
    await expect(page.locator('[data-testid="tw-card-2"]')).toContainText('Card 2')
    await expect(page.locator('[data-testid="tw-card-3"]')).toContainText('Card 3')
  })
})

test.describe('tailwind-vue — shared navigator integration', () => {
  test('shared pinia store is accessible and functional', async ({ page }) => {
    await page.setContent(twMount())

    const sharedButton = page.locator('[data-testid="tw-shared-counter"]')
    await expect(sharedButton).toContainText('Shared count is 0', { timeout: 15000 })

    await sharedButton.click()
    await expect(sharedButton).toContainText('Shared count is 1')

    await sharedButton.click()
    await expect(sharedButton).toContainText('Shared count is 2')
  })

  test('local and shared counters are independent', async ({ page }) => {
    await page.setContent(twMount())

    const localButton = page.locator('[data-testid="tw-counter"]')
    const sharedButton = page.locator('[data-testid="tw-shared-counter"]')

    await expect(localButton).toContainText('Count is 0', { timeout: 15000 })
    await expect(sharedButton).toContainText('Shared count is 0')

    await localButton.click()
    await localButton.click()
    await localButton.click()

    await sharedButton.click()

    await expect(localButton).toContainText('Count is 3')
    await expect(sharedButton).toContainText('Shared count is 1')
  })

  test('shared store state persists across navigators on same page', async ({ page }) => {
    await page.setContent(
      mountPage([
        { id: 'tw-app', url: `${DEV}/tailwind-vue/navigator.js` },
        { id: 'app1', url: `${DEV}/app1/navigator.js` },
      ]),
    )

    const twSharedButton = page.locator('[data-testid="tw-shared-counter"]')
    await expect(twSharedButton).toBeVisible({ timeout: 15000 })

    await twSharedButton.click()
    await twSharedButton.click()

    const app1SharedButton = page.locator('#app1 button', { hasText: 'Shared store count is' })
    await expect(app1SharedButton).toContainText('Shared store count is 2')
  })
})

test.describe('tailwind-vue — Tailwind CSS 4 styles', () => {
  test('CSS is injected and Tailwind classes are applied', async ({ page }) => {
    await page.setContent(twMount())

    const heading = page.locator('[data-testid="tw-heading"]')
    await expect(heading).toBeVisible({ timeout: 15000 })

    const fontSize = await heading.evaluate((el) => getComputedStyle(el).fontSize)
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(28)

    const fontWeight = await heading.evaluate((el) => getComputedStyle(el).fontWeight)
    expect(Number(fontWeight)).toBeGreaterThanOrEqual(700)
  })

  test('bg-red-400 badge has non-transparent background', async ({ page }) => {
    await page.setContent(twMount())

    const badge = page.locator('[data-testid="tw-badge"]')
    await expect(badge).toBeVisible({ timeout: 15000 })

    // Tailwind 4 uses oklch colors — verify the badge has a non-transparent background
    const bg = await badge.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe('rgba(0, 0, 0, 0)')
    expect(bg).not.toBe('transparent')
    expect(bg.length).toBeGreaterThan(0)
  })

  test('grid layout is applied to cards', async ({ page }) => {
    await page.setContent(twMount())

    const card1 = page.locator('[data-testid="tw-card-1"]')
    await expect(card1).toBeVisible({ timeout: 15000 })

    const parentDisplay = await card1.evaluate((el) => getComputedStyle(el.parentElement!).display)
    expect(parentDisplay).toBe('grid')
  })

  test('rounded-lg is applied to buttons', async ({ page }) => {
    await page.setContent(twMount())

    const button = page.locator('[data-testid="tw-counter"]')
    await expect(button).toBeVisible({ timeout: 15000 })

    const borderRadius = await button.evaluate((el) => getComputedStyle(el).borderRadius)
    expect(parseFloat(borderRadius)).toBeGreaterThanOrEqual(8)
  })
})
