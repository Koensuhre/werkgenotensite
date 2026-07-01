const WP_GRAPHQL_URL = import.meta.env.VITE_WP_GRAPHQL_URL

export async function wpFetch(
  query: string,
  variables = {}
) {
  const response = await fetch(WP_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  const json = await response.json()

  if (json.errors) {
    console.error(json.errors)
    throw new Error("WordPress GraphQL fout")
  }

  return json.data
}