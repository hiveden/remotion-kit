import Link from 'next/link'

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', margin: 0 }}>@hiveden/remotion-kit</h1>
      <p style={{ color: '#666', margin: 0 }}>
        Scaffold ready. Clip module will land in T2.
      </p>
      <p style={{ color: '#999', fontSize: '0.875rem', margin: 0 }}>
        See <code>README.md</code> for the 30-second hello clip path.
      </p>
      <Link
        href="/clip"
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          border: '1px solid #ccc',
          borderRadius: '0.25rem',
          textDecoration: 'none',
          color: '#333',
        }}
      >
        Open clip workspace (T2)
      </Link>
    </main>
  )
}
