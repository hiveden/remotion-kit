// scripts/smoke-t26.ts
//
// T26 reload-restore Playwright smoke. For each storage mode:
//   1. fresh page → generate (mock /api/llm/raw with hello-title fixture)
//      → verify Player renders LLM output + chip shows "AI generated"
//   2. reload same page → verify chip shows "AI generated (restored from
//      {browser|server})" + Player auto-renders the same LLM output
//   3. click reset (↩ 重置) → verify Player returns to default + chip gone
//
// Run with: bun run scripts/smoke-t26.ts (dev server must be on 3202)

import { chromium, type BrowserContext, type Page } from 'playwright'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'

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

interface ModeConfig {
  label: string
  url: string
  expectedRestoredText: string
  /**
   * 'browser' → drive the chat dock to submit, which writes the fixture into
   * IDB via the mocked /api/llm/raw route.
   * 'server'  → write the fixture (+ last-generate.json meta) directly to
   * disk so the exists endpoint sees an entry without running the real LLM.
   */
  seed: 'browser' | 'server'
}

const MODES: ModeConfig[] = [
  {
    label: 'client-indexed-db',
    url: 'http://localhost:3202/?storage=client-indexed-db',
    expectedRestoredText: 'restored from browser',
    seed: 'browser',
  },
  {
    label: 'server-fixed-session',
    url: 'http://localhost:3202/?storage=server-fixed-session',
    expectedRestoredText: 'restored from server',
    seed: 'server',
  },
]

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '..', '.workspace', 'clips')

async function seedServerFixture(clipId: string): Promise<void> {
  const clipDir = path.join(WORKSPACE_ROOT, clipId)
  const srcDir = path.join(clipDir, 'src')
  const metaDir = path.join(clipDir, '.meta')
  await mkdir(srcDir, { recursive: true })
  await mkdir(metaDir, { recursive: true })
  await writeFile(path.join(srcDir, 'Composition.tsx'), FIXTURE_TSX)
  await writeFile(
    path.join(metaDir, 'last-generate.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        codeLength: FIXTURE_TSX.length,
        provider: 'diag-mock',
        model: 'hello-title',
        errorCode: null,
      },
      null,
      2,
    ),
  )
}

async function unseedServerFixture(clipId: string): Promise<void> {
  await rm(path.join(WORKSPACE_ROOT, clipId), { recursive: true, force: true })
}

async function installLlmMock(ctx: BrowserContext): Promise<void> {
  await ctx.route('**/api/llm/raw', async (route) => {
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
  await ctx.route('**/api/clips/*/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        generatedAt: new Date().toISOString(),
        codeLength: FIXTURE_TSX.length,
      }),
    })
  })
}

async function submitGenerate(page: Page): Promise<void> {
  await page.evaluate(() => {
    ;(document.querySelector('button[aria-label="展开右栏"]') as HTMLButtonElement | null)?.click()
  })
  await page.locator('[data-testid="agent-dock-input"]').waitFor({ state: 'visible', timeout: 5_000 })
  await page.focus('[data-testid="agent-dock-input"]')
  await page.keyboard.type('test')
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    ;(document.querySelector('button[aria-label="发送给 AI"]') as HTMLButtonElement | null)?.click()
  })
}

async function waitForLazy(page: Page, timeout = 30_000): Promise<void> {
  await page.locator('[data-testid="demo-player"][data-source="lazy"]').waitFor({ state: 'attached', timeout })
  await page.waitForFunction(
    () => {
      const player = document.querySelector('[data-testid="demo-player"]') as HTMLElement | null
      return player ? player.querySelectorAll('*').length > 10 : false
    },
    { timeout: 30_000 },
  )
}

async function snapStats(page: Page): Promise<{
  descendants: number
  source: string | null
  chip: { present: boolean; state: string | null; text: string }
}> {
  return page.evaluate(() => {
    const player = document.querySelector('[data-testid="demo-player"]') as HTMLElement | null
    const chip = document.querySelector('[data-testid="topbar-ai-generated-chip"]') as HTMLElement | null
    return {
      descendants: player ? player.querySelectorAll('*').length : 0,
      source: player?.getAttribute('data-source') ?? null,
      chip: {
        present: !!chip,
        state: chip?.getAttribute('data-state') ?? null,
        text: chip?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      },
    }
  })
}

async function runMode(mode: ModeConfig): Promise<void> {
  console.log(`\n===== mode: ${mode.label} =====`)
  if (mode.seed === 'server') {
    // Seed before opening the browser so the first peek sees the entry on
    // mount — we skip the chat-dock generate step for server mode since the
    // real /api/clips/:id/generate calls the real LLM (90s).
    await seedServerFixture('demo-session')
  }
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await installLlmMock(ctx)
  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error' || /STORAGE_|rk-bundler|CanvasStage|idb-provider/.test(m.text())) {
      console.log(`[${m.type()}] ${m.text()}`)
    }
  })

  let s: Awaited<ReturnType<typeof snapStats>>
  if (mode.seed === 'browser') {
    // Phase 1: fresh page + generate (writes IDB via mocked /api/llm/raw)
    await page.goto(mode.url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    s = await snapStats(page)
    console.log(`  fresh: source=${s.source} chip=${s.chip.present ? s.chip.state : 'none'}`)

    await submitGenerate(page)
    await waitForLazy(page)
    await page.waitForTimeout(2000)
    s = await snapStats(page)
    console.log(`  generated: source=${s.source} chip=${s.chip.state} text="${s.chip.text}"`)
    if (s.chip.state !== 'fresh') throw new Error(`expected chip state 'fresh', got ${s.chip.state}`)
    await page.screenshot({ path: `/tmp/rk-t26-${mode.label}-01-generated.png` })
  } else {
    // Server mode: fixture already on disk. Open page fresh — we expect the
    // mount peek to find the entry and auto-restore to lazy without any
    // chat-dock interaction.
    await page.goto(mode.url, { waitUntil: 'domcontentloaded' })
    // Skip the "fresh page" assertion since the restore should fire on
    // first mount; just wait for the player to settle.
    try {
      await waitForLazy(page, 15_000)
    } catch {
      // surface state for debugging if the restore didn't happen
      const debug = await snapStats(page)
      throw new Error(
        `server mode: did not restore on mount (source=${debug.source}, chip=${debug.chip.state})`,
      )
    }
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `/tmp/rk-t26-${mode.label}-01-generated.png` })
  }

  // Phase 2: reload → verify auto-restore
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  // The skeleton should briefly appear, then resolve to lazy.
  await waitForLazy(page)
  await page.waitForTimeout(2000)
  s = await snapStats(page)
  console.log(`  reloaded: source=${s.source} chip=${s.chip.state} text="${s.chip.text}"`)
  if (s.chip.state !== 'restored') throw new Error(`expected chip state 'restored', got ${s.chip.state}`)
  if (!s.chip.text.includes(mode.expectedRestoredText)) {
    throw new Error(`expected chip text to include "${mode.expectedRestoredText}", got "${s.chip.text}"`)
  }
  if (s.source !== 'lazy') throw new Error(`expected source=lazy after reload, got ${s.source}`)
  if (s.descendants < 20) throw new Error(`expected >20 player descendants, got ${s.descendants}`)

  // Scrub to a mid-frame and snapshot.
  await page.evaluate(() => {
    const scrubber = document.querySelector('[data-testid="demo-player"] input[type="range"]') as HTMLInputElement | null
    if (!scrubber) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(scrubber, '60')
    scrubber.dispatchEvent(new Event('input', { bubbles: true }))
    scrubber.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `/tmp/rk-t26-${mode.label}-02-restored.png` })

  // Phase 3: reset → verify back to static
  await page.evaluate(() => {
    ;(document.querySelector('[data-testid="topbar-ai-undo"]') as HTMLButtonElement | null)?.click()
  })
  await page.waitForTimeout(1500)
  s = await snapStats(page)
  console.log(`  reset:    source=${s.source} chip=${s.chip.present ? s.chip.state : 'none'}`)
  if (s.source !== 'static') throw new Error(`expected source=static after reset, got ${s.source}`)
  if (s.chip.present) throw new Error(`expected chip to be gone after reset`)

  await page.screenshot({ path: `/tmp/rk-t26-${mode.label}-03-reset.png` })

  await browser.close()
  if (mode.seed === 'server') {
    await unseedServerFixture('demo-session')
  }
  console.log(`  ✓ ${mode.label} passed`)
}

async function main(): Promise<void> {
  for (const mode of MODES) {
    try {
      await runMode(mode)
    } catch (e) {
      if (mode.seed === 'server') {
        await unseedServerFixture('demo-session').catch(() => {
          /* best-effort cleanup */
        })
      }
      throw e
    }
  }
  console.log('\nSMOKE T26 OK')
}

main().catch((e: unknown) => {
  console.error('SMOKE T26 FAIL:', e)
  process.exit(1)
})
