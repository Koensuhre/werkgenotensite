// src/components/blocks/Cta.tsx
type CtaProps = {
  heading?: string
  subheading?: string
  ctaLabel?: string
  ctaUrl?: string
  image?: { node?: { sourceUrl: string; altText?: string } }
}

export function Cta({ heading, subheading, ctaLabel, ctaUrl, image }: CtaProps) {
  return (
    <section className="hero">
      {image?.node?.sourceUrl && (
        <img src={image.node.sourceUrl} alt={image.node.altText ?? ''} />
      )}
      {heading && <h1>{heading}</h1>}
      {subheading && <p>{subheading}</p>}
      {ctaLabel && ctaUrl && <a href={ctaUrl} className="btn-primary">{ctaLabel}</a>}
    </section>
  )
}
