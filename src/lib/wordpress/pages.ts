import { wpFetch } from "./client";

export async function getWpPage(uri: string) {
  const query = `
    query GetPage($uri: String!) {
      nodeByUri(uri: $uri) {
        __typename
        ... on Page {
          title
          content
        }
      }
    }
  `;

  const data = await wpFetch(query, {
    uri,
  });

  console.log("WORDPRESS RESPONSE:", data);

  return data.nodeByUri;
}
