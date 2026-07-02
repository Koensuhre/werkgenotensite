// src/components/blocks/BlockRenderer.tsx
import { Hero } from './Hero'
import { Cta } from './Cta'
import { Testimonials } from './Testimonials'

// __typename van WPGraphQL → React component
const REGISTRY = {
  PageBuilderBlocksHeroLayout: Hero,
  PageBuilderBlocksCtaLayout: Cta,
  PageBuilderBlocksTestimonialsLayout: Testimonials,
} as const

type Block = { __typename: keyof typeof REGISTRY } & Record<string, unknown>

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        const Component = REGISTRY[block.__typename]
        if (!Component) {
          if (import.meta.env.DEV) {
            console.warn(`Geen React-component voor blok: ${block.__typename}`)
          }
          return null
        }
        return <Component key={i} {...block} />
      })}
    </>
  )
}