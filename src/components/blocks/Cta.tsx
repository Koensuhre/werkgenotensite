// src/components/blocks/Cta.tsx
type CtaProps = {
  heading?: string
  subheading?: string
  ctaLabel?: string
  ctaUrl?: string
}

export function Cta({ heading, subheading, ctaLabel, ctaUrl }: CtaProps) {
  return (
    <section className="cta">
      {heading && <h2>{heading}</h2>}
      {subheading && <p>{subheading}</p>}
      {ctaLabel && ctaUrl && <a href={ctaUrl} className="btn-primary">{ctaLabel}</a>}
    </section>
  )
}