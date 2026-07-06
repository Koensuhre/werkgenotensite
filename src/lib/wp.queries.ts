// src/lib/wp.queries.ts
export const PAGE_BY_SLUG_QUERY = /* GraphQL */ `
  query PageBySlug($slug: ID!) {
    page(id: $slug, idType: URI) {
      title
      content
      pageBuilder {
        blocks {
          __typename
          ... on PageBuilderBlocksHeroLayout {
            heading
            subheading
            ctaLabel
            ctaUrl
            image {
              node {
                sourceUrl
                altText
              }
            }
          }
          ... on PageBuilderBlocksCtaLayout {
            heading
            buttonLabel
            buttonUrl
          }
          ... on PageBuilderBlocksTestimonialsLayout {
            items {
              quote
              author
              role
            }
          }
        }
      }
    }
  }
`;
