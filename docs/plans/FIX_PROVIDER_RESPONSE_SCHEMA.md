# Fix: `/config/providers` response schema (providers is an array, not an object)

## Error under investigation

```
provider_isolation_violated: Invalid providers response schema: providers expected object, received array
  at MimoServeProvider.checkForReady()  (backend/src/providers/MimoServeProvider.ts:268)
```

Thrown from `MimoLocalClient.getProviders()` (`backend/src/mimo/client.ts:113`) when
`MimoProvidersResponseSchema.safeParse()` fails, and re-wrapped by the isolation
`catch` in `checkForReady()`.

## Root cause (confirmed against live serve)

Project-local MiMo Code `0.1.10` returns `GET /config/providers` with `providers`
as an **array**, but `MimoProvidersResponseSchema` declares it as a `z.record`
(object/map). zod rejects the array → `getProviders()` throws → isolation check
fails before it can even run.

A **second, latent** mismatch is masked by the first: zod short-circuits at
`providers`, so it never reaches per-model `cost`. Once `providers` is fixed, the
next parse failure is `cost.cache` — the schema expects a `number`, but every model
returns an **object** `{ read, write }`.

### Actual response shape (verified live)

```jsonc
{
  "providers": [                         // ARRAY (was expected as object/map)
    {
      "id": "anthropic",
      "source": "config",                // "config" | "auth" | "none" | ... (never "env")
      "name": "Anthropic",
      "env": ["ANTHROPIC_API_KEY"],
      "options": { /* ... */ },
      "models": {                         // OBJECT keyed by modelId (schema already correct)
        "claude-...": {
          "id": "claude-...",
          "providerID": "anthropic",
          "name": "...",
          "family": "...",
          "status": "...",
          "cost": { "input": 3, "output": 15, "cache": { "read": 0.3, "write": 3.75 } }, // cache is an OBJECT
          "limit": { "context": 200000, "output": 8192 },
          "capabilities": { /* ... */ }
          // extra keys (api, headers, release_date, variants, ...) are ignored — schema is non-strict
        }
      }
    }
    /* ...len 3... */
  ],
  "default": { "<providerId>": "<modelId>" }   // OBJECT (schema already correct)
}
```

## Exact changes required

### 1. `backend/src/mimo/client.ts` — the schema (primary fix)

**a) `providers`: `z.record(...)` → `z.array(...)`** (lines 29–42). Keep the inner
provider object schema unchanged, including `models: z.record(...)`:

```ts
export const MimoProvidersResponseSchema = z.object({
  providers: z.array(                     // was: z.record(z.string(), z.object({ ... }))
    z.object({
      id: z.string(),
      name: z.string(),
      env: z.array(z.string()).default([]),
      options: z.record(z.string(), z.unknown()).default({}),
      source: z.string(),
      models: z.record(z.string(), MimoModelSchema),   // unchanged — models IS an object
    })
  ),
  default: z.record(z.string(), z.string()),           // unchanged — default IS an object
});
```

**b) `MimoModelSchema.cost.cache`: accept the object form** (lines 12–16), so parsing
does not fail on the next field once (a) is applied:

```ts
cost: z.object({
  input: z.number().optional(),
  output: z.number().optional(),
  cache: z.union([
    z.number(),
    z.object({ read: z.number().optional(), write: z.number().optional() }),
  ]).optional(),                          // was: z.number().optional()
}).optional(),
```

`MimoProvidersResponse` (the `z.infer` type on line 44) updates automatically:
`providers` becomes an array type and `cost.cache` becomes `number | { read?, write? }`.

### 2. `backend/src/providers/MimoServeProvider.ts` — isolation loop (line 253)

`Object.entries(array)` yields index keys (`"0"`, `"1"`, …), so the provider id in
the error message would be wrong. Iterate the array directly:

```ts
// was: for (const [id, prov] of Object.entries(providersRes.providers)) {
for (const prov of providersRes.providers) {
  if (prov.source === 'env' || prov.source === 'environment') {
    throw new Error(`Provider ${prov.id} has environment-derived source: ${prov.source}`);
  }
}
```

Isolation semantics are **unchanged** — it still fetches the catalog and rejects any
`source` of `env`/`environment`; only the iteration form and the id used in the
message change.

### 3. `backend/src/services/modelService.ts` — `getCatalog()` loop (line 90) + `ModelInfo.cost` type

**a)** `Object.entries(raw.providers)` on an array would set `provId` to `"0"`, `"1"`,
… — producing wrong canonical model ids like `0/claude-...` and wrong `providerID`.
This is a **real functional bug** after the array fix, not cosmetic. Iterate the array
and derive `provId` from the element:

```ts
// was: for (const [provId, provData] of Object.entries(raw.providers)) {
for (const provData of raw.providers) {
  const provId = provData.id;
  // ...rest of the loop body is unchanged (canonicalId, providerID, push, etc.)...
}
```

**b)** Widen the local `ModelInfo.cost` type (lines 31–35) so the `cost: modVal.cost`
assignment (line 106) still type-checks after change 1b:

```ts
cost?: {
  input?: number;
  output?: number;
  cache?: number | { read?: number; write?: number };   // was: cache?: number
};
```

## Affected call sites (complete list — grep for `.providers` / `getProviders`)

| File | Site | Impact | Action |
|---|---|---|---|
| `backend/src/mimo/client.ts` | `MimoProvidersResponseSchema`, `getProviders()` | schema is the bug | fix (1a, 1b) |
| `backend/src/providers/MimoServeProvider.ts:253` | isolation loop | index-key iteration | fix (2) |
| `backend/src/services/modelService.ts:90` | `getCatalog()` loop | wrong provId from array | fix (3a) |
| `backend/src/services/modelService.ts:31` | `ModelInfo.cost` type | TS compile break from 1b | fix (3b) |
| `backend/src/services/providerService.ts:26,109` | `listProviders()`, `refreshCatalog()` | consumes normalized `catalog.providers` (already `ProviderWithModels[]`) | **none** — fixed transitively via modelService |
| `backend/src/services/modelService.ts:161,188` | resolve/lookup helpers | iterate normalized `catalog.providers` | **none** — downstream of getCatalog |

Out of scope (not part of this error): `providerService.setCredential()` calling the
non-existent `provider.runCommand` (line 70) — pre-existing, unrelated bug.

## Frontend note (optional, not required to clear the error)

`frontend/src/api.ts:256–260` declares `ModelInfo.cost.cache?: number`. Backend now
may emit the object form. It is a separate compilation unit, so it does **not** block
the backend fix; widen it the same way (`number | { read?: number; write?: number }`)
only if the UI needs to display cache cost accurately.

## Verification

1. **Schema unit check** — parse a captured real `/config/providers` payload with the
   updated `MimoProvidersResponseSchema.safeParse()`; expect `success: true`
   (previously failed at `["providers"]`). Confirmed manually during investigation.
2. **`tsc` build** — `npm run build --prefix backend` (or existing typecheck script);
   confirm change 3b resolves the `cost` assignment error.
3. **Boot backend** — start the app; confirm `MimoServeProvider.checkForReady()`
   logs `Isolated mimo serve is ready and verified` instead of
   `PROVIDER_ISOLATION_VIOLATED`.
4. **Catalog populates** — `GET /api/models` returns providers (len 3) with correct
   canonical model ids (`<providerId>/<modelId>`, e.g. `anthropic/claude-...`, **not**
   `0/claude-...`) and `GET /api/providers` lists the providers with model counts.
5. **Isolation still enforced** — no provider reports `source: "env"`; the loop still
   throws if one ever does.
