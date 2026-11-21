# Rayfin GraphQL catalog

An independent catalog with browsing, product creation, and editing. React/Vite uses `@microsoft/rayfin-data` to call official Data API builder (DAB) 2.1.5. Builder hosts the frontend at `/` and DAB at `/api/graphql` on the same origin. No Fabric item or Rayfin sign-in is required; the client uses the Builder browser session and strips the Rayfin-specific key header.

## Local checks

From this folder, run `npm ci`, `npm test`, `npm run build`, and `builder manifest validate --json`. The frontend dev command (`npm run dev`) proxies `/api/graphql` to DAB on `127.0.0.1:8080`. The shipped DAB config expects a Builder-verified principal, so Vite alone won't return catalog data. For local SQL development, use a disposable database and a **separate** loopback-only DAB config; never upload a config that grants the anonymous role access.

DAB checks the REST path prefix even if REST is disabled. Keep the disabled REST path (`/rest`) separate from `/api/graphql`.
The Linux launcher runs the packaged DAB assembly through `dotnet` on `PATH` so it uses Builder's selected .NET runtime instead of the tool shim's default runtime location.

## App Service Builder setup

1. Use `rayfin-catalog` as the GitHub app source directory, or package this folder's source with `builder.yaml` at the ZIP root. Exclude `node_modules`, `dist`, local config and credentials. Create a **separate** development/test Builder app. Set required Microsoft Entra sign-in with a tester allowlist before deploying; do not expose the DAB compute directly. Confirm Builder's build environment can download from the npm feed recorded in `package-lock.json`.
2. In a new development/test Azure SQL database, apply [`sql/catalog.sql`](sql/catalog.sql) as an administrator. Then apply [`sql/enable-catalog-editing.sql`](sql/enable-catalog-editing.sql) to new or existing catalogs to let SQL allocate product IDs. Set up an Azure SQL connection using the Builder app's system-assigned managed identity, with runtime setting `SQL_CONNECTION_STRING`. Use SqlClient's `Authentication=Active Directory Managed Identity;Encrypt=True;TrustServerCertificate=False;` and point the setting at the test database. Once required Entra ingress is enabled, set `WEBSITE_AUTH_ENABLED=true` in Builder Variables to satisfy DAB's startup check. The variable by itself does not enable or enforce sign-in.
3. For the contained SQL user mapped to that identity, grant `SELECT, INSERT, VIEW DEFINITION ON OBJECT::dbo.CatalogProduct` and `UPDATE ON OBJECT::dbo.CatalogProduct (name, category, description)`. DAB needs table metadata visibility at startup to recognize the SQL default for the product ID. Do not grant delete, ID updates, or a database-wide writer role. Keep the Builder allowlist restricted to catalog editors: every visitor admitted by that policy can add and edit products.
4. Verify a signed-in editor can browse, add, and edit products via `POST /api/graphql`. A signed-out request must not read or write products. Verify there is no delete mutation and that the SQL identity cannot delete or change an existing product ID.
