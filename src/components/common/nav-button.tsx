'use client'

import { useRouter } from 'next/navigation'

type NavButtonProps = {
  href: string
  className?: string
  children: React.ReactNode
}

/** A <button> that navigates (keeps the original button styling from the design). */
export function NavButton({ href, className, children }: NavButtonProps) {
  const router = useRouter()
  return (
    <button type="button" className={className} onClick={() => router.push(href)}>
      {children}
    </button>
  )
}
