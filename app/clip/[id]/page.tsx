// /clip/[id] — Clip Brief Editor (server component)

import { notFound } from 'next/navigation'
import { readBrief, clipDirPath } from '@/lib/server/clip-store'
import { ClipInstanceEditor } from '@/components/clip/ClipInstanceEditor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClipDetailPage({ params }: PageProps) {
  const { id } = await params
  const brief = await readBrief(id).catch(() => null)
  if (!brief) notFound()
  return <ClipInstanceEditor brief={brief} clipDir={clipDirPath(id)} />
}
