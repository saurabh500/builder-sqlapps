import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalog } from './src/catalog.ts';

test('Rayfin reads DAB products and sends the next cursor with the Builder session', async () => {
  const row = { id: 1, name: 'Notebook', category: 'Office', description: 'Pocket size' };
  const queries = [];
  const read = createCatalog(async (url, init) => {
    assert.equal(url, '/api/graphql');
    assert.equal(init.method, 'POST');
    assert.equal(init.credentials, 'same-origin');
    assert.equal(init.redirect, 'manual');
    assert.equal(init.headers.has('X-Publishable-Key'), false);
    assert.equal(init.headers.has('Authorization'), false);
    assert.equal(init.headers.get('Accept'), 'application/json');
    queries.push(JSON.parse(init.body).query);
    return Response.json({ data: { products: { items: [row], endCursor: 'next-page', hasNextPage: true } } });
  });
  const page = await read.read();
  assert.deepEqual(page.items, [row]);
  assert.equal(page.hasNextPage, true);
  await read.read(page.endCursor);
  assert.match(queries[0], /products\s*\(/);
  assert.doesNotMatch(queries[0], /\bafter:/);
  assert.match(queries[1], /after:\s*"next-page"/);
});

test('access denial is not displayed as an empty catalog', async () => {
  const read = createCatalog(async () => new Response(null, { status: 403 }));
  await assert.rejects(read.read(), { status: 401 });
});

test('a GraphQL authorization error in an HTTP 200 response is not an empty catalog', async () => {
  const read = createCatalog(async () => Response.json({
    errors: [{ message: 'Not authorized', extensions: { code: 'AUTH_NOT_AUTHENTICATED' } }],
  }));
  await assert.rejects(read.read(), /Not authorized/);
});

test('Rayfin creates without a client-generated ID and edits by ID without changing the key', async () => {
  const details = { name: 'Notebook', category: 'Office', description: 'Pocket size' };
  const queries = [];
  const catalog = createCatalog(async (_url, init) => {
    const { query, variables } = JSON.parse(init.body);
    queries.push({ query, variables });
    const field = query.includes('createProduct') ? 'createProduct' : 'updateProduct';
    return Response.json({ data: { [field]: { id: 13, ...details } } });
  });
  await catalog.save(details);
  await catalog.save(details, 13);
  assert.match(queries[0].query, /createProduct\(item:\s*\{[^}]*name:\s*"Notebook"/);
  assert.doesNotMatch(queries[0].query, /\bid:/);
  assert.match(queries[1].query, /updateProduct\(\s*id:\s*\$id,\s*item:\s*\{/);
  assert.doesNotMatch(queries[1].query, /item:\s*\{[^}]*\bid:/);
  assert.deepEqual(queries[1].variables, { id: 13, ...details });
});
