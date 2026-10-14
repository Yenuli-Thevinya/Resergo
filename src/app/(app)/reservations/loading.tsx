import { PageHeadingSkeleton, Skeleton, TableSkeleton } from '@/components/common/skeletons'

export default function Loading() {
  return (
    <div aria-busy="true">
      <PageHeadingSkeleton />
      <Skeleton w={260} h={34} style={{ borderRadius: 8, marginBottom: 14 }} />
      <TableSkeleton />
    </div>
  )
}
