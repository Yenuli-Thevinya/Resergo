'use client'

import { ChevronRight, DoorOpen } from 'lucide-react'
import { useReservation } from '@/context/reservation-context'
import { useResourceDialogs } from '@/context/resource-context'
import { useCurrentUser } from '@/context/user-context'
import type { ResourceDTO } from '@/types'
import { availabilityTone } from './status'

export function ResourceCard({ item }: { item: ResourceDTO }) {
  const user = useCurrentUser()
  const { openCreate } = useReservation()
  const { openDetails, openForm } = useResourceDialogs()
  const reservable = item.availability === 'Available' || item.availability === 'Booked'

  return (
    <article className="resource-card">
      <div className={`resource-art ${item.tone}`}>
        <DoorOpen />
        <span>{item.category}</span>
        <button type="button" aria-label={`View ${item.name}`} onClick={() => openDetails(item.id)}>
          <ChevronRight />
        </button>
      </div>
      <div className="resource-copy">
        <div className="resource-name">
          <div>
            <h3>{item.name}</h3>
            <p>{[item.location, item.capacity].filter(Boolean).join(' · ')}</p>
          </div>
          <span className={`availability ${availabilityTone[item.availability]}`}>{item.availability}</span>
        </div>
        <div className="resource-foot">
          <span>{item.nextText}</span>
          <div className="foot-actions">
            {user.role === 'ADMIN' && (
              <button type="button" onClick={() => openForm(item)}>
                Edit
              </button>
            )}
            {reservable && (
              <button type="button" onClick={() => openCreate({ resourceId: item.id })}>
                Reserve <ChevronRight />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
