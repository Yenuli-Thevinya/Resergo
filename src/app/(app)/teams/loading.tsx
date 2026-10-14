import { MetricsSkeleton, PageHeadingSkeleton, Skeleton } from '@/components/common/skeletons'

export default function Loading() {
  return (
    <div aria-busy="true">
      <PageHeadingSkeleton />
      <MetricsSkeleton />
      <Skeleton w={110} h={10} style={{ margin: '28px 0 13px' }} />
      <div className="department-grid">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} h={110} style={{ borderRadius: 10 }} />
        ))}
      </div>
      <Skeleton w={130} h={10} style={{ margin: '28px 0 13px' }} />
      <div className="people-grid">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} h={80} style={{ borderRadius: 10 }} />
        ))}
      </div>
    </div>
  )
}
