type PageStateProps = {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function PageState({ title, description, action }: PageStateProps) {
  return (
    <section className="page-state">
      <h2 className="page-state__title">{title}</h2>
      <p className="page-state__description">{description}</p>
      {action ? (
        <button className="button" type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </section>
  )
}
