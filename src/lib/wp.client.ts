// src/lib/wp.client.ts  (of waar je huidige WPGraphQL-fetch al staat)
import { PAGE_BY_SLUG_QUERY } from "./wp.queries";

export async function fetchPageBySlug(slug: string) {
  const res = await fetch(import.meta.env.VITE_WP_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: PAGE_BY_SLUG_QUERY,
      variables: { slug },
    }),
  });

  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0]?.message ?? "WPGraphQL error");
  return data.page;
}
