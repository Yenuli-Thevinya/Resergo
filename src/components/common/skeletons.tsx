/** Loading placeholders that reuse the real layout classes so nothing jumps when data arrives. */

export const Skeleton = ({ w, h, style }: { w?: number | string; h?: number | string; style?: React.CSSProperties }) => (
  <div className="skeleton" style={{ width: w ?? '100%', height: h ?? 14, ...style }} aria-hidden />
)

export function PageHeadingSkeleton() {
  return (
    <div className="page-heading" aria-hidden>
      <div style={{ display: 'grid', gap: 10 }}>
        <Skeleton w={150} h={9} />
        <Skeleton w={220} h={26} />
        <Skeleton w={300} h={11} />
      </div>
    </div>
  )
}

export function MetricsSkeleton() {
  return (
    <div className="metrics" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div className="metric" key={i} style={{ gap: 12 }}>
          <Skeleton w={32} h={32} />
          <div style={{ display: 'grid', gap: 8, flex: 1 }}>
            <Skeleton w="60%" h={9} />
            <Skeleton w="35%" h={24} />
            <Skeleton w="70%" h={9} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ResourceCardSkeleton() {
  return (
    <div className="resource-card" aria-hidden>
      <Skeleton h={93} style={{ borderRadius: 0 }} />
      <div className="resource-copy" style={{ display: 'grid', gap: 10 }}>
        <Skeleton w="55%" h={14} />
        <Skeleton w="40%" h={10} />
        <Skeleton w="70%" h={10} style={{ marginTop: 14 }} />
      </div>
    </div>
  )
}

export function ResourceGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="resources-grid" aria-label="Loading resources">
      {Array.from({ length: count }, (_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function BookingListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="booking-list" aria-label="Loading reservations">
      {Array.from({ length: rows }, (_, i) => (
        <div className="booking-row" key={i} style={{ gap: 16 }}>
          <Skeleton w={52} h={18} />
          <div style={{ display: 'grid', gap: 8, flex: 1 }}>
            <Skeleton w="35%" h={12} />
            <Skeleton w="50%" h={9} />
          </div>
          <Skeleton w={60} h={20} />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="reservation-table-wrap" aria-label="Loading reservations">
      <div style={{ display: 'grid', gap: 0 }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} style={{ display: 'flex', gap: 18, padding: '17px 18px', borderBottom: '1px solid var(--line)' }}>
            <Skeleton w={90} h={12} />
            <Skeleton w={140} h={12} />
            <Skeleton w={110} h={12} />
            <Skeleton w={100} h={12} />
            <Skeleton w="20%" h={12} />
            <Skeleton w={70} h={12} style={{ marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
