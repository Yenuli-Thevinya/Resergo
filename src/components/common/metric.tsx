import type { LucideIcon } from 'lucide-react'

type MetricProps = {
  label: string
  value: string
  note: string
  icon: LucideIcon
  tone: string
}

export function Metric({ label, value, note, icon: Icon, tone }: MetricProps) {
  return (
    <article className="metric">
      <div className={`metric-icon ${tone}`}>
        <Icon />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
      <div className="metric-line" />
    </article>
  )
}
