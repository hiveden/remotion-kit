// scripts/smoke-idb.ts
//
// Headless browser smoke for the ClientIndexedDB StorageProvider in v0.2.
// Opens the demo with ?storage=client-indexed-db, presses the generate
// button, and asserts the Remotion Player ends up rendering a real LLM
// component (not the bundler-pending fallback or an error panel).
//
// Run with: bun run scripts/smoke-idb.ts (dev server must be on 3202)

import { chromium } from 'playwright'

const URL = process.env.SMOKE_URL ?? 'http://localhost:3202/?storage=client-indexed-db'
const OUT = process.env.SMOKE_OUT ?? '/tmp/rk-idb-smoke.png'
const TIMEOUT = Number(process.env.SMOKE_TIMEOUT ?? 180_000)

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

  const consoleMsgs: string[] = []
  const errors: string[] = []
  page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

  console.log(`→ Navigating ${URL}`)
  await page.goto(URL, { waitUntil: 'domcontentloaded' })

  // Next dev overlay covers fixed-positioned chrome (toggle, dock send
  // button) — playwright's pointer hit-test gets blocked. Drive everything
  // through DOM directly so the smoke test isn't fighting dev tooling.
  await page.evaluate(() => {
    const click = (sel: string) => {
      const el = document.querySelector(sel) as HTMLButtonElement | null
      if (!el) throw new Error(`missing: ${sel}`)
      el.click()
    }
    click('button[aria-label="展开右栏"]')
  })
  await page.waitForTimeout(300)

  await page.locator('[data-testid="agent-dock-input"]').waitFor({ state: 'visible', timeout: 5_000 })
  await page.focus('[data-testid="agent-dock-input"]')
  await page.keyboard.type('a glowing logo zooming on a starry sky', { delay: 5 })
  await page.waitForTimeout(300)
  const val = await page.locator('[data-testid="agent-dock-input"]').inputValue()
  console.log('→ prompt value after type:', JSON.stringify(val))

  const t0 = Date.now()
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="发送给 AI"]') as HTMLButtonElement | null
    if (!btn) throw new Error('missing send button')
    if (btn.disabled) throw new Error('send button disabled (prompt did not propagate)')
    btn.click()
  })
  console.log('→ Submitted prompt; waiting for Player mount + frame paint')

  // CanvasStage switches its [data-testid=demo-player] data-source to "lazy"
  // once the generated clipId is set in state. That's the canonical signal
  // that callGenerate + state propagation succeeded.
  const playerOk = await Promise.race([
    page
      .locator('[data-testid="demo-player"][data-source="lazy"]')
      .waitFor({ state: 'attached', timeout: TIMEOUT })
      .then(() => 'mounted')
      .catch(() => 'timeout'),
    page
      .locator('[data-testid="composition-error-fallback"]')
      .waitFor({ state: 'visible', timeout: TIMEOUT })
      .then(() => 'error-panel')
      .catch(() => 'timeout'),
  ])
  const elapsed = Date.now() - t0
  console.log(`→ Outcome: ${playerOk} (${elapsed}ms)`)

  await page.waitForTimeout(1500)
  await page.screenshot({ path: OUT, fullPage: false })
  console.log(`→ Frame-0 screenshot saved: ${OUT}`)

  // Drive the Remotion Player past frame 0 so the screenshot captures real
  // LLM-rendered content, not a faded-in cold open. Spring animations on
  // the generated tsx make the first ~6 frames near-black.
  if (playerOk === 'mounted') {
    const playerSrc = await page
      .locator('[data-testid="demo-player"]')
      .first()
      .getAttribute('data-source')
    console.log(`→ Player data-source: ${playerSrc}`)

    // clickToPlay is enabled — focus the container and press Space to play.
    await page.locator('[data-testid="demo-player"]').first().click({ force: true })
    await page.keyboard.press('Space')
    await page.waitForTimeout(2500)
    const mid = OUT.replace(/\.png$/, '-mid.png')
    await page.screenshot({ path: mid, fullPage: false })
    console.log(`→ Mid-frame screenshot saved: ${mid}`)

    // Read IndexedDB directly to prove the bundler operated on the real LLM
    // tsx that came back from /api/llm/raw, not on a fixture or a stub.
    const stored = await page.evaluate(async () => {
      return await new Promise<{
        clipId: string
        codeLength: number
        head: string
        provider: string
        model: string
      } | null>((resolve) => {
        const req = indexedDB.open('remotion-kit', 1)
        req.onerror = () => resolve(null)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('compositions', 'readonly')
          const store = tx.objectStore('compositions')
          const get = store.get('client-session')
          get.onsuccess = () => {
            const v = get.result as
              | {
                  clipId: string
                  tsx: string
                  codeLength: number
                  provider: string
                  model: string
                }
              | undefined
            if (!v) return resolve(null)
            resolve({
              clipId: v.clipId,
              codeLength: v.codeLength,
              head: v.tsx.slice(0, 120),
              provider: v.provider,
              model: v.model,
            })
          }
          get.onerror = () => resolve(null)
        }
      })
    })
    console.log('→ IDB stored composition:', JSON.stringify(stored, null, 2))
  }

  if (errors.length) console.log(`PAGE ERRORS:\n  ${errors.join('\n  ')}`)
  const interesting = consoleMsgs.filter((l) =>
    /error|warn|STORAGE|esbuild|bundle|composition/i.test(l),
  )
  if (interesting.length) console.log(`INTERESTING CONSOLE:\n  ${interesting.join('\n  ')}`)

  await browser.close()
  if (playerOk !== 'mounted') {
    console.error(`SMOKE FAIL: outcome=${playerOk}`)
    process.exit(1)
  }
  console.log('SMOKE OK')
}

main().catch((e) => {
  console.error('SMOKE THROW:', e)
  process.exit(1)
})
