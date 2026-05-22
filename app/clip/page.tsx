import { listBriefs } from '@/lib/server/clip-store'
import { ClipInstanceList } from '@/components/clip/ClipInstanceList'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ClipPageProps {
  searchParams: Promise<{ include?: string; error?: string }>
}

export default async function ClipListPage({ searchParams }: ClipPageProps) {
  const sp = await searchParams
  const includeArchived = sp.include === 'archived' || sp.include === 'all'
  const initialClips = await listBriefs({ includeArchived })
  return (
    <ClipInstanceList
      initialClips={initialClips}
      initialIncludeArchived={includeArchived}
      flashError={sp.error ?? null}
    />
  )
}
