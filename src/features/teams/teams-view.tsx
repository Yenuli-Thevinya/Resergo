'use client'

import { useState } from 'react'
import { Building2, CalendarDays, Clock3, UserPlus, Users } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { Metric } from '@/components/common/metric'
import { PageHeading } from '@/components/common/page-heading'
import type { DepartmentOption, TeamsData, UserDTO } from '@/types'
import { UserFormDialog } from './user-form-dialog'

const pad = (n: number) => String(n).padStart(2, '0')

/** "IT Department" -> "IT",  "Human Resources" -> "HR" (keeps the metric card short) */
function shortName(name: string): string {
  const trimmed = name.replace(/\s+Department$/i, '')
  if (trimmed.length <= 10) return trimmed
  return trimmed
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function TeamsView({ teams, departmentOptions, isAdmin }: { teams: TeamsData; departmentOptions: DepartmentOption[]; isAdmin: boolean }) {
  const [dialog, setDialog] = useState<{ user?: UserDTO } | null>(null)
  const activeDepartments = teams.departments.filter((d) => d.activeEmployees > 0).length

  return (
    <section>
      <PageHeading
        kicker="RESERGO / TEAMS & PEOPLE"
        title="People who reserve"
        description="Understand how your organization shares resources."
        action={
          isAdmin ? (
            <button className="reserve-button" onClick={() => setDialog({})}>
              <UserPlus /> Add employee
            </button>
          ) : undefined
        }
      />

      <div className="metrics team-metrics">
        <Metric icon={Building2} label="Departments" value={pad(activeDepartments)} note="With active employees" tone="mint" />
        <Metric icon={Users} label="Active users" value={pad(teams.activeUsers)} note="Ready to reserve" tone="blue" />
        <Metric icon={CalendarDays} label="Reservations this month" value={pad(teams.reservationsThisMonth)} note="Excluding cancelled" tone="yellow" />
        <Metric
          icon={Clock3}
          label="Most active"
          value={teams.mostActive ? shortName(teams.mostActive.name) : '—'}
          note={teams.mostActive ? `${teams.mostActive.count} reservation${teams.mostActive.count === 1 ? '' : 's'}` : 'No reservations yet'}
          tone="purple"
        />
      </div>

      <h3 className="subheading">Departments</h3>
      {teams.departments.length === 0 ? (
        <EmptyState compact icon={Building2} title="No departments yet" />
      ) : (
        <div className="department-grid">
          {teams.departments.map((d) => (
            <article className="department-card" key={d.id}>
              <Building2 />
              <h3>{d.name}</h3>
              <p>
                {d.activeEmployees} {d.activeEmployees === 1 ? 'employee' : 'employees'}
              </p>
              <span>
                {d.reservationsThisMonth} {d.reservationsThisMonth === 1 ? 'reservation' : 'reservations'} this month
              </span>
            </article>
          ))}
        </div>
      )}

      <h3 className="subheading">People directory</h3>
      {teams.users.length === 0 ? (
        <EmptyState compact icon={Users} title="No people yet" description={isAdmin ? 'Add the first employee to get started.' : undefined} />
      ) : (
        <div className="people-grid">
          {teams.users.map((u) => (
            <article className={`person-card ${u.status === 'INACTIVE' ? 'row-muted' : ''}`} key={u.id}>
              <span className="avatar person-avatar">{u.initials}</span>
              <div>
                <h3>{u.fullName}</h3>
                <p>{u.email}</p>
                <span className="department-badge">
                  <Building2 /> {u.departmentName}
                </span>
                {u.status === 'INACTIVE' && <span className="status-tag gray person-status">Inactive</span>}
                {isAdmin && (
                  <button className="table-action person-edit" onClick={() => setDialog({ user: u })}>
                    Edit
                  </button>
                )}
              </div>
              <small>{u.role === 'ADMIN' ? 'Admin' : 'Employee'}</small>
            </article>
          ))}
        </div>
      )}

      {dialog && isAdmin && <UserFormDialog user={dialog.user} departments={departmentOptions} onClose={() => setDialog(null)} />}
    </section>
  )
}
