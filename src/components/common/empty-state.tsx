import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className="empty-state" style={compact ? { minHeight: 150, padding: 20 } : undefined}>
      <div>
        <Icon />
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {action && <div style={{ marginTop: 14 }}>{action}</div>}
      </div>
    </div>
  )
}
