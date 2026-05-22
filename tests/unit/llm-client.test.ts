import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import { promises as fs } from 'node:fs'

const { FixtureLLMClient, LLMError, extractTsxCodeBlock } = await import('@/lib/server/llm-client')

describe('extractTsxCodeBlock', () => {
  it('extracts fenced tsx code blocks', () => {
    const text = "intro\n```tsx\nconst x = 1\nexport default x\n```\noutro"
    expect(extractTsxCodeBlock(text)).toBe('const x = 1\nexport default x')
  })

  it('extracts typescript / jsx / javascript fences', () => {
    expect(extractTsxCodeBlock('```typescript\nfoo\n```')).toBe('foo')
    expect(extractTsxCodeBlock('```jsx\nfoo\n```')).toBe('foo')
    expect(extractTsxCodeBlock('```javascript\nfoo\n```')).toBe('foo')
  })

  it('falls back when there is no fence but content looks like tsx', () => {
    const text = "import React from 'react'\nexport default () => null"
    expect(extractTsxCodeBlock(text)).toBe(text)
  })

  it('returns null on plain prose', () => {
    expect(extractTsxCodeBlock('I cannot help with that.')).toBeNull()
  })
})

describe('LLMError', () => {
  it('captures code and retryable flag', () => {
    const e = new LLMError('QUOTA_EXCEEDED', 'rate limited', { retryable: true })
    expect(e.code).toBe('QUOTA_EXCEEDED')
    expect(e.retryable).toBe(true)
    expect(e.message).toBe('rate limited')
    expect(e).toBeInstanceOf(Error)
  })

  it('defaults retryable to false', () => {
    const e = new LLMError('AUTH_API_KEY_INVALID', 'bad key')
    expect(e.retryable).toBe(false)
  })
})

describe('FixtureLLMClient', () => {
  let TMP_DIR: string
  let fixturePath: string

  beforeEach(async () => {
    TMP_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'llm-fixture-'))
    fixturePath = path.join(TMP_DIR, 'seed.json')
  })

  afterEach(async () => {
    await fs.rm(TMP_DIR, { recursive: true, force: true })
  })

  it('matches an entry by scenePromptIncludes substring', async () => {
    const fixture = {
      entries: [
        {
          id: 'sunrise',
          match: { scenePromptIncludes: 'sunrise' },
          response: { text: '```tsx\nexport default () => null\n```', meta: { model: 'gpt-5.5-test' } },
        },
      ],
    }
    await fs.writeFile(fixturePath, JSON.stringify(fixture), 'utf8')
    const client = new FixtureLLMClient(fixturePath)
    const res = await client.chat({
      systemPrompt: 'sys',
      userPrompt: 'Scene prompt: golden sunrise over mountains',
    })
    expect(res.text).toContain('export default')
    expect(res.meta.model).toBe('gpt-5.5-test')
    expect(res.meta.provider).toBe('openai')
  })

  it('falls back to default entry when no match', async () => {
    const fixture = {
      entries: [],
      default: { id: 'noop', response: { text: 'default text' } },
    }
    await fs.writeFile(fixturePath, JSON.stringify(fixture), 'utf8')
    const client = new FixtureLLMClient(fixturePath)
    const res = await client.chat({ systemPrompt: 'sys', userPrompt: 'unmatched' })
    expect(res.text).toBe('default text')
  })

  it('throws SYSTEM_FIXTURE_NO_MATCH when no match + no default', async () => {
    await fs.writeFile(fixturePath, JSON.stringify({ entries: [] }), 'utf8')
    const client = new FixtureLLMClient(fixturePath)
    await expect(client.chat({ systemPrompt: 's', userPrompt: 'u' })).rejects.toMatchObject({
      code: 'SYSTEM_FIXTURE_NO_MATCH',
    })
  })

  it('throws SYSTEM_FIXTURE_MISSING when file missing', async () => {
    const client = new FixtureLLMClient(path.join(TMP_DIR, 'does-not-exist.json'))
    await expect(client.chat({ systemPrompt: 's', userPrompt: 'u' })).rejects.toMatchObject({
      code: 'SYSTEM_FIXTURE_MISSING',
    })
  })

  it('throws SYSTEM_FIXTURE_INVALID on malformed JSON', async () => {
    await fs.writeFile(fixturePath, '{ not: valid json', 'utf8')
    const client = new FixtureLLMClient(fixturePath)
    await expect(client.chat({ systemPrompt: 's', userPrompt: 'u' })).rejects.toMatchObject({
      code: 'SYSTEM_FIXTURE_INVALID',
    })
  })

  it('uses entries in declaration order (first match wins)', async () => {
    const fixture = {
      entries: [
        { id: 'a', match: { scenePromptIncludes: 'foo' }, response: { text: 'A' } },
        { id: 'b', match: { scenePromptIncludes: 'foo' }, response: { text: 'B' } },
      ],
    }
    await fs.writeFile(fixturePath, JSON.stringify(fixture), 'utf8')
    const client = new FixtureLLMClient(fixturePath)
    const res = await client.chat({ systemPrompt: 's', userPrompt: 'foo bar' })
    expect(res.text).toBe('A')
  })
})
