import { CalendarDays, ChevronRight, Clock3, Grid2X2, Users } from 'lucide-react'
import { BookingList } from '@/components/common/booking-list'
import { EmptyState } from '@/components/common/empty-state'
import { Metric } from '@/components/common/metric'
import { NavButton } from '@/components/common/nav-button'
import { NextUpCard } from '@/components/common/next-up-card'
import { ResourceCard } from '@/components/common/resource-card'
import { requireUser } from '@/lib/auth'
import { getDashboardStats } from '@/lib/dashboard'

const pad = (n: number) => String(n).padStart(2, '0')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Every number here is calculated from PostgreSQL for the current moment. */
export async function OverviewPage() {
  const user = await requireUser()
  const stats = await getDashboardStats(user)

  return (
    <>
      <section className="hero-strip">
        <div>
          <span className="hero-label">THE RESOURCE PULSE</span>
          <h2>
            Find the right
            <br />
            <em>place to begin.</em>
          </h2>
          <p>
            {stats.availableNow === 0
              ? 'No resources are free right now — check the calendar for the next opening.'
              : `${plural(stats.availableNow, 'resource is', 'resources are')} available across your organization right now.`}
          </p>
          <NavButton href="/resources" className="hero-action">
            Browse resource library <ChevronRight />
          </NavButton>
        </div>
        <div className="pulse-visual">
          <div className="pulse-ring ring-one" />
          <div className="pulse-ring ring-two" />
          <div className="pulse-core">
            <span>{pad(stats.availableNow)}</span>
            <small>
              OPEN
              <br />
              RESOURCES
            </small>
          </div>
          <div className="pulse-label label-one">
            {pad(stats.roomsOpen)} <small>ROOMS</small>
          </div>
          <div className="pulse-label label-two">
            {pad(stats.assetsOpen)} <small>ASSETS</small>
          </div>
        </div>
      </section>

      <div className="metrics">
        <Metric icon={Grid2X2} label="Available now" value={pad(stats.availableNow)} note={`of ${plural(stats.totalResources, 'resource')}`} tone="mint" />
        <Metric
          icon={CalendarDays}
          label="Today's holds"
          value={pad(stats.todaysReservations)}
          note={stats.todaysReservations ? `Across ${plural(stats.todaysDepartments, 'department')}` : 'Nothing booked yet'}
          tone="blue"
        />
        <Metric
          icon={Clock3}
          label="Your upcoming"
          value={pad(stats.yourUpcoming)}
          note={stats.nextStartLabel ? `Next at ${stats.nextStartLabel}` : 'Nothing scheduled'}
          tone="yellow"
        />
        <Metric icon={Users} label="Active teams" value={pad(stats.activeTeams)} note={`${plural(stats.peopleBooking, 'person', 'people')} booking this month`} tone="purple" />
      </div>

      <section className="content-section">
        <div className="section-title">
          <div>
            <span>LIVE INVENTORY</span>
            <h2>Popular right now</h2>
          </div>
          <NavButton href="/resources">
            View all resources <ChevronRight />
          </NavButton>
        </div>
        {stats.popular.length === 0 ? (
          <EmptyState icon={Grid2X2} title="No resources yet" description="An administrator can add rooms and equipment from the resource library." />
        ) : (
          <div className="resources-grid">
            {stats.popular.map((item) => (
              <ResourceCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <NextUpCard reservation={stats.nextUp} />

      <section className="content-section reservations-section">
        <div className="section-title">
          <div>
            <span>ACTIVITY STREAM</span>
            <h2>Today across Resergo</h2>
          </div>
          <NavButton href="/reservations">
            Open reservation log <ChevronRight />
          </NavButton>
        </div>
        <BookingList reservations={stats.today} />
      </section>
    </>
  )
}
