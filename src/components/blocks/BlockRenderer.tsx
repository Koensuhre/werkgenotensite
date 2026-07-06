// src/components/blocks/BlockRenderer.tsx
import { Hero } from "./Hero";
import { Cta } from "./Cta";
import { Testimonials } from "./Testimonials";

// __typename van WPGraphQL → React component
const REGISTRY = {
  PageBuilderBlocksHeroLayout: Hero,
  PageBuilderBlocksCtaLayout: Cta,
  PageBuilderBlocksTestimonialsLayout: Testimonials,
} as const;

type Block = { __typename: string } & Record<string, unknown>;

export function BlockRenderer({ blocks }: { blocks: readonly Block[] | readonly unknown[] }) {
  return (
    <>
      {(blocks as Block[]).map((block, i) => {
        const Component = REGISTRY[block.__typename as keyof typeof REGISTRY];
        if (!Component) {
          if (import.meta.env.DEV) {
            console.warn(`Geen React-component voor blok: ${block.__typename}`);
          }
          return null;
        }
        return <Component key={i} {...(block as any)} />;
      })}
    </>
  );
}
