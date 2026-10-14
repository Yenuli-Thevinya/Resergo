'use client'

import { useMemo, useState } from 'react'
import { Grid2X2, Plus, Search } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeading } from '@/components/common/page-heading'
import { ResourceCard } from '@/components/common/resource-card'
import { useResourceDialogs } from '@/context/resource-context'
import type { ResourceAvailability, ResourceDTO } from '@/types'

const AVAILABILITY_FILTERS: Record<string, ResourceAvailability | null> = {
  'All availability': null,
  Available: 'Available',
  'Currently booked': 'Booked',
  Unavailable: 'Unavailable',
  Maintenance: 'Maintenance',
}

export function ResourcesView({ resources, isAdmin }: { resources: ResourceDTO[]; isAdmin: boolean }) {
  const { openForm } = useResourceDialogs()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All resources')
  const [availability, setAvailability] = useState('All availability')

  const categories = useMemo(() => ['All resources', ...Array.from(new Set(resources.map((r) => r.category))).sort()], [resources])

  const visible = useMemo(() => {
    const wanted = AVAILABILITY_FILTERS[availability]
    const q = query.trim().toLowerCase()
    return resources.filter(
      (r) =>
        (!q || `${r.name} ${r.category} ${r.location}`.toLowerCase().includes(q)) &&
        (category === 'All resources' || r.category === category) &&
        (wanted === null || r.availability === wanted),
    )
  }, [resources, query, category, availability])

  const filtering = query.trim() !== '' || category !== 'All resources' || availability !== 'All availability'

  return (
    <section>
      <PageHeading
        kicker="RESERGO / RESOURCE LIBRARY"
        title="Resources"
        description="Find the right room, equipment or shared facility."
        action={
          isAdmin ? (
            <button className="reserve-button" onClick={() => openForm()}>
              <Plus /> Add resource
            </button>
          ) : undefined
        }
      />

      <div className="library-controls">
        <label className="search-field">
          <Search />
          <input placeholder="Search resources..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          {categories.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <select value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label="Availability">
          {Object.keys(AVAILABILITY_FILTERS).map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      {visible.length ? (
        <div className="resources-grid library-grid">
          {visible.map((item) => (
            <ResourceCard key={item.id} item={item} />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={Grid2X2}
          title="No resources yet"
          description={isAdmin ? 'Add your first room or piece of equipment to get started.' : 'An administrator has not added any resources yet.'}
          action={
            isAdmin ? (
              <button className="reserve-button" onClick={() => openForm()}>
                <Plus /> Add resource
              </button>
            ) : undefined
          }
        />
      ) : (
        <EmptyState
          icon={Search}
          title="No resources match these filters."
          description={filtering ? 'Try clearing your search or choosing another category.' : undefined}
        />
      )}
    </section>
  )
}
