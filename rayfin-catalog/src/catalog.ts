import { createDataApi, GraphQLClient } from '@microsoft/rayfin-data';
import { ApiClient } from '@microsoft/rayfin-lib';

export type ProductDetails = { name: string; category: string; description: string };
export type Product = ProductDetails & { id: number };

export function createCatalog(transport: typeof fetch = globalThis.fetch) {
  const client = new ApiClient({
    baseUrl: '/api',
    // The SDK requires a value, but standalone DAB uses the Builder session.
    publishableKey: 'unused-by-dab',
    // The SDK parses application/json, not Hot Chocolate's default GraphQL media type.
    headers: { Accept: 'application/json' },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.delete('X-Publishable-Key');
      const response = await transport(input, { ...init, headers, credentials: 'same-origin', redirect: 'manual' });
      if ([401, 403].includes(response.status) || response.type === 'opaqueredirect') {
        return Response.json({ message: 'Sign in to view the catalog.' }, { status: 401 });
      }
      return response;
    },
  });
  const data = createDataApi<{ Product: Product }>(client);
  const graphql = new GraphQLClient(client);

  return {
    read(after?: string) {
      const query = data.Product.select(['id', 'name', 'category', 'description']).orderBy({ id: 'desc' }).first(12);
      return (after ? query.after(after) : query).executePaginated();
    },
    async save(details: ProductDetails, id?: number) {
      const product = id === undefined
        ? await data.Product.create(details)
        // The fluent update API types all keys as strings, but DAB expects an Int.
        : (await graphql.mutation<{ updateProduct: { id: number } | null }>(
          `mutation UpdateProduct($id: Int!, $name: String!, $category: String!, $description: String!) {
            updateProduct(id: $id, item: {name: $name, category: $category, description: $description}) { id }
          }`,
          { id, ...details },
        )).updateProduct;
      if (!product) throw new Error('The product was not saved.');
    },
  };
}
