'use client'

// app/diag/page.tsx
//
// Block 6 hotfix diagnostic page. Bypasses the LLM call (~90s) and the
// full demo UI to isolate the bundler → Player path. Writes a fixture
// tsx straight into IndexedDB, then renders it via @remotion/player
// lazyComponent + ClientIndexedDBProvider.composition().
//
// /diag → loads fixture → renders Player. Inspect browser console for
// [rk-bundler] logs and any render errors.

import React from 'react'
import { Player } from '@remotion/player'
import { ClientIndexedDBProvider } from '@/lib/storage/client-indexed-db'
import '@/lib/storage/host-globals'

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

const DB_NAME = 'remotion-kit'
const STORE = 'compositions'
const CLIP_ID = 'client-session'

async function seedFixture(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clipId' })
      }
    }
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({
        clipId: CLIP_ID,
        tsx: FIXTURE_TSX,
        generatedAt: new Date().toISOString(),
        codeLength: FIXTURE_TSX.length,
        provider: 'diag-fixture',
        model: 'hello-title',
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    req.onerror = () => reject(req.error)
  })
}

export default function DiagPage() {
  const [ready, setReady] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  const lazyComponent = React.useMemo(() => {
    const provider = new ClientIndexedDBProvider()
    return provider.composition(CLIP_ID)
  }, [])

  React.useEffect(() => {
    seedFixture()
      .then(() => setReady(true))
      .catch((e: unknown) => setErr(String(e)))
  }, [])

  if (err) return <pre style={{ color: 'red', padding: 24 }}>{err}</pre>
  if (!ready) return <div style={{ padding: 24 }}>seeding fixture…</div>

  return (
    <div style={{ padding: 24, background: '#222', minHeight: '100vh', color: 'white' }}>
      <h1>Block 6 diag</h1>
      <p>fixture seeded: hello-title @ {CLIP_ID}</p>
      <div
        data-testid="diag-player"
        style={{ width: 360, height: 640, background: '#111', margin: '24px 0' }}
      >
        <Player
          lazyComponent={lazyComponent}
          durationInFrames={150}
          fps={30}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{ width: '100%', height: '100%' }}
          controls
          autoPlay
          loop
          acknowledgeRemotionLicense
        />
      </div>
    </div>
  )
}
