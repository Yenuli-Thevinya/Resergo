type PageHeadingProps = {
  kicker: string
  title: string
  description: string
  action?: React.ReactNode
}

export function PageHeading({ kicker, title, description, action }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
