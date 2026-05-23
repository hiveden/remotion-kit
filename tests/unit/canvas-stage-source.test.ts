import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const canvasStageSource = readFileSync('components/demo/CanvasStage.tsx', 'utf8')
const useAgentGenerateSource = readFileSync('components/demo/useAgentGenerate.ts', 'utf8')

describe('T26 reload restore visual guardrails', () => {
  it('starts restored lazy Player past the cold-open fade-in', () => {
    expect(canvasStageSource).toContain('const RESTORED_INITIAL_FRAME = 30')
    expect(canvasStageSource).toContain(
      "initialFrame={aiGenerated === 'restored' ? RESTORED_INITIAL_FRAME : 0}",
    )
  })

  it('bumps reloadKey when peek restores static source to lazy source', () => {
    const restoreBranch = useAgentGenerateSource.slice(
      useAgentGenerateSource.indexOf('if (result.exists)'),
      useAgentGenerateSource.indexOf('} else {', useAgentGenerateSource.indexOf('if (result.exists)')),
    )
    expect(restoreBranch).toContain("source: { kind: 'lazy', clipId }")
    expect(restoreBranch).toContain('reloadKey: s.reloadKey + 1')
    expect(restoreBranch).toContain("aiGenerated: 'restored'")
  })
})
