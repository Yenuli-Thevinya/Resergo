import { PageHeadingSkeleton, Skeleton } from '@/components/common/skeletons'

export default function Loading() {
  return (
    <div aria-busy="true">
      <PageHeadingSkeleton />
      <Skeleton h={50} style={{ borderRadius: 10, marginBottom: 15 }} />
      <Skeleton h={330} style={{ borderRadius: 12 }} />
    </div>
  )
}
