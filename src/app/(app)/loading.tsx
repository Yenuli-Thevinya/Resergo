import { BookingListSkeleton, MetricsSkeleton, ResourceGridSkeleton, Skeleton } from '@/components/common/skeletons'

/** Dashboard skeleton (shown while the overview page loads). */
export default function Loading() {
  return (
    <div aria-busy="true">
      <Skeleton h={190} style={{ borderRadius: 14, marginTop: 14 }} />
      <MetricsSkeleton />
      <div style={{ marginTop: 28 }}>
        <ResourceGridSkeleton />
      </div>
      <Skeleton h={70} style={{ borderRadius: 12, margin: '24px 0' }} />
      <BookingListSkeleton />
    </div>
  )
}
