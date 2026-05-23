// scripts/diag-demo.ts
// Reproduces QA's P0: demo page IDB mode with QA's fixture, captures
// console + screenshot + DOM stats.

import { chromium } from 'playwright'

const FIXTURE_TSX = `import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'

const Composition: React.FC = () => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 15, 135, 150], [0, 1, 1, 0])
  return (
    <AbsoluteFill style={{ background: '#000', color: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity, fontSize: 220, fontWeight: 900, letterSpacing: -4 }}>HELLO</div>
    </AbsoluteFill>
  )
}

export default Composition
`

async function main() {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`))
  page.on('pageerror', (e) => console.log(`pageerror: ${e.message}`))
  page.on('requestfailed', (req) => console.log(`REQFAIL: ${req.url()} - ${req.failure()?.errorText}`))
  page.on('response', (r) => {
    if (/esbuild|unpkg|wasm/i.test(r.url())) console.log(`RESP ${r.status()} ${r.url()}`)
  })

  // Intercept the LLM POST so we can inject the QA fixture without waiting 90s.
  await page.route('**/api/llm/raw', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        code: FIXTURE_TSX,
        codeLength: FIXTURE_TSX.length,
        provider: 'diag-mock',
        model: 'hello-title',
        generatedAt: new Date().toISOString(),
      }),
    })
  })

  await page.goto('http://localhost:3202/?storage=client-indexed-db', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  // Drive the L1 toggle + chat dock submit via DOM since dev overlay
  // intercepts pointer events.
  await page.evaluate(() => {
    ;(document.querySelector('button[aria-label="展开右栏"]') as HTMLButtonElement | null)?.click()
  })
  await page.waitForTimeout(500)
  await page.locator('[data-testid="agent-dock-input"]').waitFor({ state: 'visible', timeout: 5_000 })
  await page.focus('[data-testid="agent-dock-input"]')
  await page.keyboard.type('test')
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    ;(document.querySelector('button[aria-label="发送给 AI"]') as HTMLButtonElement | null)?.click()
  })

  // Wait for the demo-player to switch to lazy + give time for bundler.
  await page
    .locator('[data-testid="demo-player"][data-source="lazy"]')
    .waitFor({ state: 'attached', timeout: 30_000 })
  // Wait for the bundler to finish (main-thread esbuild ~5s).
  await page.waitForFunction(
    () => {
      const player = document.querySelector('[data-testid="demo-player"]') as HTMLElement | null
      return player ? player.querySelectorAll('*').length > 10 : false
    },
    { timeout: 90_000 },
  )
  await page.waitForTimeout(1500)

  // Drag the Player's scrubber to frame 60 (2s, opacity=1) so the screenshot
  // captures HELLO, not the cold-open black frame.
  await page.evaluate(() => {
    const scrubber = document.querySelector(
      '[data-testid="demo-player"] input[type="range"]',
    ) as HTMLInputElement | null
    if (!scrubber) {
      console.warn('[smoke] no scrubber found')
      return
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(scrubber, '60')
    scrubber.dispatchEvent(new Event('input', { bubbles: true }))
    scrubber.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForTimeout(1500)

  // Stats.
  const stats = await page.evaluate(() => {
    const player = document.querySelector('[data-testid="demo-player"]') as HTMLElement | null
    if (!player) return null
    const all = player.querySelectorAll('*')
    let nonBlack = 0
    let textCount = 0
    all.forEach((el) => {
      const cs = getComputedStyle(el as HTMLElement)
      if (cs.backgroundColor && !/rgba?\(0,\s*0,\s*0/.test(cs.backgroundColor) && cs.backgroundColor !== 'transparent' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') nonBlack++
      if ((el as HTMLElement).innerText && (el as HTMLElement).childNodes.length > 0) {
        for (const c of (el as HTMLElement).childNodes) {
          if (c.nodeType === 3 && c.textContent?.trim()) textCount++
        }
      }
    })
    return {
      descendants: all.length,
      nonBlackBg: nonBlack,
      textNodes: textCount,
      outerHTMLHead: player.outerHTML.slice(0, 600),
    }
  })
  console.log('=== DEMO PLAYER STATS ===\n' + JSON.stringify(stats, null, 2))

  await page.screenshot({ path: '/tmp/rk-demo-diag.png' })
  console.log('Screenshot: /tmp/rk-demo-diag.png')
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
