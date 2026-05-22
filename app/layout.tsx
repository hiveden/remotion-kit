import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: '@hiveden/remotion-kit',
  description: 'Remotion clip tooling — agent-shaped brief composer + preview.',
}

// Set data-theme before React hydrates so the painted background matches the
// stored preference (no FOUC on reload).
const themeBootstrap = `(function(){try{var t=localStorage.getItem('rk-theme');if(t!=='light'&&t!=='dark')t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
