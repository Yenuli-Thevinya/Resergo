import { PageHeadingSkeleton, ResourceGridSkeleton, Skeleton } from '@/components/common/skeletons'

export default function Loading() {
  return (
    <div aria-busy="true">
      <PageHeadingSkeleton />
      <Skeleton h={40} style={{ borderRadius: 8, marginBottom: 16 }} />
      <ResourceGridSkeleton count={6} />
    </div>
  )
}
