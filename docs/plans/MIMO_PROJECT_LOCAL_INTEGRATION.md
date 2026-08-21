# MiMo Project-Local Integration — Implementation Specification

**Status:** authoritative. Implement exactly this. Do not invent architecture or deviate from it.
**Audience:** the coding agent that will implement it.
**Repository:** `C:\Users\Atrin ay\Desktop\mimoo`
**Written against:** `@mimo-ai/cli` **0.1.10** (`mimocode-windows-x64`), backend Express 4 + better-sqlite3, frontend React 19 + Vite 6.

---

## 0. How to read this document

Section 1 is **verified fact** — every claim was produced by running the real MiMo binary or reading the real repository file. Section 2 contains the **binding decisions** (the answers to the 14 architectural questions). Section 3 is the **target data flow**. Section 4 is the **file-by-file change list** — this is the part you implement. Sections 5–10 are order, verification, failure handling, security, and migration.

If you find a conflict between this document and the code, the code has changed since inspection: stop and report the conflict rather than improvising.

### 0.1 Terminology assumption (read this first)

The request refers to **`mimo-desktop`**. **No directory of that name exists in this repository.** The repository contains exactly two packages:

- `backend/` — package name `mimo-backend`, Express API on port 3001
- `frontend/` — package name `react-example` (misnamed; see Step 14), Vite dev server on port 3000

Throughout this document **"mimo-desktop" means the `backend/` + `frontend/` pair as one product.** There is no Electron/Tauri shell in this repository and this plan does not add one. If a desktop shell is intended later, the architecture below is what it would wrap; nothing here blocks it.

### 0.2 Non-negotiables

1. The project must run its **own** MiMo Code instance with its **own** config, credentials, and database.
2. It must **never** read, write, or authenticate against the user's global MiMo Code environment.
3. Reuse MiMo Code's real provider/model/auth system. **Do not build a parallel one.**
4. The existing streaming/agent/tool architecture stays. Do not rewrite the SSE pipeline.

---

## 1. Verified facts (the evidence base)

Everything in this section was empirically confirmed. Do not re-litigate it; build on it.

### 1.1 Where the user's global MiMo Code state actually lives

| What | Path | Confirmed by |
|---|---|---|
| Global credentials | `C:\Users\Atrin ay\.local\share\mimocode\auth.json` | `mimo providers list` prints this path |
| Global config | `C:\Users\Atrin ay\.config\mimocode\mimocode.jsonc` | file read |
| Global plugin/data dir | `C:\Users\Atrin ay\.mimocode\` | directory listing |
| Global CLI package | `C:\Users\Atrin ay\AppData\Roaming\npm\node_modules\@mimo-ai\cli` | directory listing |
| Real binary (130 MB) | `…\@mimo-ai\cli\node_modules\@mimo-ai\mimocode-windows-x64\bin\mimo.exe` | executed directly |

`mimo providers list` against the global environment reports **3 stored credentials** (`openrouter`, `xiaomi`, `google`) **plus 1 environment-derived provider** (`anthropic` via `ANTHROPIC_API_KEY`).

`auth.json` shape (values redacted, structure verified):

```json
{
  "openrouter": { "type": "api", "key": "<73 chars>" },
  "xiaomi":     { "type": "api", "key": "<51 chars>",
                  "metadata": { "uid": "<10 chars>", "base_url": "<29 chars>" } },
  "google":     { "type": "api", "key": "<53 chars>" }
}
```

**The global config is currently malformed.** In `mimocode.jsonc`, under `provider.xiaomi.models`, an `sk-…` API key is used *both* as the model key *and* as its `name`. This is an independent reason the project must not inherit it — inheriting it means inheriting a broken model map and leaking a secret into a model label.

### 1.2 The isolation mechanism — what works and what does not

Confirmed by running `mimo providers list` under different environments:

| Attempt | Result |
|---|---|
| `MIMOCODE_CONFIG_DIR=<temp>` | ❌ **Did not isolate.** Still showed all 3 global credentials. Credentials are not under `MIMOCODE_CONFIG_DIR`. |
| `XDG_DATA_HOME=<temp>\data` + `XDG_CONFIG_HOME=<temp>\cfg` | ✅ Credentials path moved to `<temp>\data\mimocode\auth.json`, **0 credentials**. Still showed `anthropic` from `ANTHROPIC_API_KEY`. |
| … + `MIMOCODE_DISABLE_PROVIDER_ENV=1` | ❌ **Did not suppress** the env-derived provider. `anthropic` still listed. |
| … + `ANTHROPIC_API_KEY` **removed from the child env** | ✅ **0 credentials, 0 environment providers. Full isolation.** |

**Therefore isolation requires two independent mechanisms, both mandatory:**

1. **`XDG_DATA_HOME` and `XDG_CONFIG_HOME`** pointed at project-owned directories. These *do* work on Windows despite the XDG name.
2. **Explicit removal of provider API-key variables from the child process environment.** `MIMOCODE_DISABLE_PROVIDER_ENV` is not a substitute — it did not work. You must build the child env with an allowlist.

Setting `XDG_DATA_HOME` relocates all of: `mimocode/auth.json`, `mimocode/mimocode.db` (+ `-shm`/`-wal`), and `mimocode/log/`.

### 1.3 Credential injection without touching disk

`MIMOCODE_AUTH_CONTENT='{"openrouter":{"type":"api","key":"…"}}'` — verified: the provider appears in `providers list` (`1 credentials`) and **no `auth.json` is written to disk**. This is a viable in-memory credential channel. See Decision Q5 for how it is used (as an optional hardening mode, not the default).

### 1.4 The HTTP API of `mimo serve` — the correct integration surface

`mimo serve --port 47714 --hostname 127.0.0.1` prints exactly:

```
mimocode server listening on http://127.0.0.1:47714
```

Verified endpoints (HTTP Basic, user `mimocode`, password from `MIMOCODE_SERVER_PASSWORD`):

**`GET /config/providers`** → the authoritative provider+model catalog.

```
top-level keys: [ "providers", "default" ]
providers: xiaomi(3 models, source=config), mimo(1 models, source=config)
default: { "xiaomi": "mimo-v2.5-pro-ultraspeed", "mimo": "mimo-auto" }
```

Each provider is `{ id, name, env: string[], options: {}, source: "config", models: { <modelId>: {…} } }`. Each model carries full metadata: `id`, `providerID`, `name`, `family`, `api: {id, url, npm}`, `status` (`active`/`beta`), `cost: {input, output, cache}`, `limit: {context, output}`, `capabilities: {temperature, reasoning, attachment, toolcall, input{…}, output{…}}`, `release_date`, `variants`.

**`PUT /auth/:providerId`** with body `{"type":"api","key":"…"}` → returns `true`, and **writes the credential into the isolated `auth.json`**. Verified end-to-end against a project-owned `XDG_DATA_HOME`. This is how providers get added programmatically.

**`GET /app`** → returns `{"error":"Web UI is temporarily unavailable."}` in 0.1.10. Do not depend on it.

**`GET /event`** → SSE stream. Already consumed by `MimoServeProvider`.

### 1.5 The model list is credential-driven — this is the root cause of the "hardcoded models" problem

| Environment | `mimo models` line count |
|---|---|
| Global (3 credentials + `ANTHROPIC_API_KEY`) | **396** |
| Fully isolated, no credentials | **4** |
| Isolated, after adding one OpenRouter key + `--refresh` | **344** (339 of them `openrouter/…`) |

The 4 models present with zero credentials are:

```
mimo/mimo-auto
xiaomi/mimo-v2.5
xiaomi/mimo-v2.5-pro
xiaomi/mimo-v2.5-pro-ultraspeed
```

**These are exactly the four models hardcoded in `backend/src/services/modelService.ts:75-82` and in `frontend/src/hooks/useModels.ts:9-14`.** The "hardcoded model list" is not an arbitrary invention — it is a frozen snapshot of the *zero-credential* built-in set. Once credentials are configured through the project-local instance, the real list is 340+. The fix is not to edit the hardcoded list; it is to delete it and read `GET /config/providers`.

A fresh, isolated data directory has **no models.dev catalog cache**, so it starts at 4 models. `mimo models --refresh` populates it. The catalog must be warmed after the first credential is added.

### 1.6 `mimo models` text output is not safely parseable

```
mimo/mimo-auto — window 1M, compacts at 960K
xiaomi/mimo-v2.5 — window 1.05M, compacts at 1.01M
```

The current parser (`modelService.ts:37-47`) takes the whole trimmed line as the model `id`. Even if it ran, every id would be `"xiaomi/mimo-v2.5 — window 1.05M, compacts at 1.01M"`. `--verbose` interleaves a header line with a pretty-printed multi-line JSON block per model — parseable only with a stateful parser. **Use `GET /config/providers` instead.** `mimo models --refresh` is used only for its side effect (warming the catalog), never for its stdout.

### 1.7 Verified CLI surface (0.1.10)

Commands: `completion, acp, mcp, [project], attach <url>, run, debug, providers|auth, agent, upgrade, uninstall, serve, models [provider], stats, export, import, github, pr, session, plugin, db`.

- `mimo providers` → `list|ls`, `login [url]`, `logout`, `whoami`. `login` accepts `-p/--provider` and `-m/--method` to skip selection **but still prompts interactively for the key** — unusable from a server process. This is why Decision Q4 uses `PUT /auth/:providerId`.
- `mimo models [provider]` → `--verbose`, `--refresh`.
- `mimo serve` → `--port` (default 0), `--hostname` (default 127.0.0.1), `--mdns`, `--mdns-domain`, `--cors`, `--no-auth`. **There is no `--dir`/cwd flag.**
- `mimo run` → `--format default|json`, `-m/--model`, `--agent`, `--dir`, `--port`, `-p/--password`, `-s/--session`, `-c/--continue`, `--dangerously-skip-permissions`, others.
- **`mimo config` does not exist.** `MimoCliProvider.getConfig()` calls `['config','--json']`; the word `config` is swallowed as the `[project]` positional and the TUI help is printed. That method is dead code (see Step 12).

### 1.8 Relevant `MIMOCODE_*` environment variables (extracted from the binary)

Isolation / control: `MIMOCODE_CONFIG_DIR`, `MIMOCODE_CONFIG`, `MIMOCODE_CONFIG_CONTENT`, `MIMOCODE_AUTH_CONTENT`, `MIMOCODE_DB`, `MIMOCODE_DISABLE_PROJECT_CONFIG`, `MIMOCODE_DISABLE_PROVIDER_ENV`, `MIMOCODE_DISABLE_AUTOUPDATE`, `MIMOCODE_DISABLE_MODELS_FETCH`, `MIMOCODE_MODELS_PATH`, `MIMOCODE_MODELS_URL`, `MIMOCODE_SERVER_PASSWORD`, `MIMOCODE_SERVER_USERNAME`, `MIMOCODE_BIN_PATH` (honoured by the `bin/mimo` launcher), `MIMOCODE_DISABLE_CRON`, `MIMOCODE_DISABLE_LSP_DOWNLOAD`, `MIMOCODE_DISABLE_EMBEDDED_WEB_UI`, `MIMOCODE_SKIP_MIGRATIONS`, `MIMOCODE_PURE`.

XDG variables the binary reads: `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME`, `XDG_STATE_HOME`, `XDG_RUNTIME_DIR`, `XDG_CONFIG_DIRS`, `XDG_DATA_DIRS`.

### 1.9 First-run cost

A fresh isolated data directory triggers:

```
Performing one time database migration, may take a few minutes...
sqlite-migration:done
Database migration complete.
```

Observed ~20 s. **`MimoServeProvider.start()` currently times out at 15 000 ms (`MimoServeProvider.ts:210-215`) — that is shorter than a first run and will fail on the very first launch after this change.** Step 4 raises it.

### 1.10 Current repository state relevant to this work

- **No root `package.json`** — there is no workspace orchestration; `backend` and `frontend` are started independently.
- **No root `.gitignore`.**
- `backend/admin.json` and `backend/session.json` are tracked in git.
- `backend/data/` holds `mimo.db`, `admin.token`, `admin-overrides.json`, `project-brain/`.
- Repo root contains a `.mimocode/` directory: `{"dependencies":{"@mimo-ai/plugin":"0.1.5"}}` plus `node_modules/@mimo-ai/{plugin,sdk}` and a nested `.mimocode/`. **This is the plugin directory, not a config root. Leave it alone.** Do not repurpose it as the runtime dir — a nested `.mimocode/.mimocode` already indicates confusion here.
- Binary discovery (`MimoServeProvider.ts:44-80`) is Windows-only and searches, in order: `%APPDATA%\npm\node_modules\@mimo-ai`, `%NVM_SYMLINK%`, then `npm root -g` via **`execFileSync` at module import time**. Every path leads to the user's *global* install.
- Both providers spawn MiMo with **`cwd: process.env.USERPROFILE || process.env.HOME || '.'`** (`MimoServeProvider.ts:165`, `MimoCliProvider` `cliCwd()`), i.e. the user's home directory — not the project.

---

## 2. The 14 architectural decisions (binding)

### Q1 — What exactly is the "project-local MiMo Code" instance?

It is **the same `@mimo-ai/cli` program, pinned as a project dependency, run as a child process whose entire MiMo-visible environment is owned by this repository.** Three parts:

1. **A pinned binary.** Add `@mimo-ai/cli@0.1.10` to `backend/package.json` `dependencies`. The binary is then resolved from `backend/node_modules/@mimo-ai/cli/node_modules/@mimo-ai/mimocode-<platform>-<arch>/bin/mimo[.exe]`. The global install is no longer a resolution target.
2. **A project-owned runtime root** at `<repoRoot>/.mimo-runtime/` (Q2) supplying config, credentials, and database.
3. **A scrubbed child environment** (Q9) so nothing leaks in from the user's shell.

It is **not** a fork, a vendored copy, or a reimplementation. It is the real MiMo Code, sandboxed.

### Q2 — Where should its configuration live?

```
<repoRoot>/.mimo-runtime/
├── config/
│   └── mimocode/
│       └── mimocode.jsonc      ← XDG_CONFIG_HOME=<repoRoot>/.mimo-runtime/config
└── data/
    └── mimocode/
        ├── auth.json           ← XDG_DATA_HOME=<repoRoot>/.mimo-runtime/data
        ├── mimocode.db
        └── log/
```

Rules:
- `.mimo-runtime/` is **gitignored in its entirety**.
- The `mimocode/` subdirectory name is created by MiMo itself — do not create it manually, only the two parents.
- **Do not** use `backend/data/` (that is the application's own SQLite + brain storage) and **do not** use the existing root `.mimocode/` (plugin dir, §1.10).
- Resolve `<repoRoot>` explicitly as `path.resolve(__dirname, '../../..')` from `backend/src/config/`, and validate it — do not rely on `process.cwd()`, which differs between `npm run dev` (cwd = `backend/`) and a packaged launch.

### Q3 — How should the project invoke it?

**One channel: `mimo serve`, managed by `MimoServeProvider`, with everything else going over its HTTP API.**

- Spawn `mimo serve --port <explicitPort> --hostname 127.0.0.1`.
- Choose the port in Node (bind-and-release a free port) and pass it explicitly. Keep the readiness check, but match the **strict** line from §1.4, not the current loose URL regex.
- Set `cwd` to the **project root**, not the user's home.
- Provider/model/auth queries go to that same running instance over HTTP. **Do not spawn one-off `mimo` processes for reads.** The single exception is `mimo models --refresh`, invoked for its catalog-warming side effect only (Q6).
- The `mimo run` code path (`MimoCliProvider`) stops being a chat transport (Step 12).

### Q4 — How should providers be added?

**`PUT /auth/:providerId` on the project-local serve instance**, body `{"type":"api","key":"<key>"}` (§1.4, verified).

`mimo providers login` is rejected: it prompts interactively even with `-p`/`-m` and cannot be driven from a server process.

For a custom OpenAI-compatible endpoint (a base URL, not a known provider id), write a `provider.<id>` entry into `.mimo-runtime/config/mimocode/mimocode.jsonc` and restart the serve child. Use MiMo's real schema — `$schema: "https://mimo.xiaomi.com/mimocode/config.json"`, shape `provider.<id>.models.<modelId>.name`. **Never** write an API key into a model key or a `name` field; that is the exact corruption present in the user's global config (§1.1).

### Q5 — How should API keys be stored safely?

**The backend does not store API keys. MiMo's isolated `auth.json` is the single source of truth.**

Flow: UI → `POST /api/providers/:id/credential` (admin-authenticated) → backend forwards to `PUT /auth/:id` on the project-local serve → MiMo writes `.mimo-runtime/data/mimocode/auth.json`.

Requirements:
- The backend holds the key in a local variable for the duration of the request. It is never assigned to `process.env`, never written to `admin-overrides.json`, never returned by any `GET`.
- `chmod 0o600` on `auth.json` after the first write (best-effort on Windows; still correct on POSIX).
- Logging: log `providerId` and a **sha256 prefix** only. The existing `keyHash()` in `adminController.ts:28-30` is the right idea — keep that shape, drop everything around it.
- Readback endpoints report **presence only**: `{ id, name, hasCredential: true, source: "auth" }`.
- Optional hardened mode (`MIMO_AUTH_IN_MEMORY=true`): keys are held in backend memory and passed to the serve child via `MIMOCODE_AUTH_CONTENT` (§1.3), so nothing is written to disk at all. Keys must then be re-entered after a restart. **Default is off** (disk-backed `auth.json`).
- Delete the `MIMO_API_KEY` persistence path in `adminController.ts` (Step 9). Writing a provider key into a JSON file that a boot-time loader splats into `process.env` is exactly the leak this replaces.

### Q6 — How should model discovery be integrated?

**`GET /config/providers` on the project-local serve is the only source.** (§1.4)

- Replace `fetchModelsFromCli()` entirely. No text parsing.
- Keep the existing 5-minute TTL cache; add explicit invalidation after any credential mutation.
- After a successful credential write, run `mimo models --refresh` **once**, in the isolated env, discarding stdout, to warm the models.dev catalog (§1.5). Then invalidate the cache and re-read `GET /config/providers`.
- If the serve instance is not ready, return **HTTP 503 with code `provider_not_ready`**. **Do not** fall back to a hardcoded list — the hardcoded list is what made the bug invisible.

### Q7 — How should the frontend receive the provider/model list?

`GET /api/models` returns providers **grouped**, preserving MiMo's real metadata:

```json
{ "data": {
    "providers": [
      { "id": "xiaomi", "name": "Xiaomi", "hasCredential": true, "source": "config",
        "models": [
          { "id": "xiaomi/mimo-v2.5", "providerID": "xiaomi", "modelID": "mimo-v2.5",
            "name": "MiMo-V2.5", "status": "active",
            "contextLimit": 1048576, "outputLimit": 131072,
            "capabilities": { "reasoning": true, "toolcall": true, "attachment": false },
            "cost": { "input": 0.14, "output": 0.55 } } ] } ],
    "default": { "xiaomi": "mimo-v2.5-pro-ultraspeed", "mimo": "mimo-auto" } } }
```

`id` is the canonical `"<providerID>/<modelID>"` string the UI passes back. `providerID`/`modelID` are carried separately so no consumer has to re-split. Keep the flat `GET /api/models` shape available as `GET /api/models/flat` **only if** an existing consumer needs it — otherwise migrate `useModels` to the grouped shape and delete the flat one.

### Q8 — How should the selected provider/model reach the execution pipeline?

**Through the path that already exists — do not add a new one.** `MimoServeProvider` already posts `{ agent, model: { providerID, modelID }, parts: [...] }`. The change is only in *where the value comes from* and *how it is split*:

- Split the canonical id at the **first** `/`: `const i = id.indexOf('/'); providerID = id.slice(0, i); modelID = id.slice(i + 1);`. Model ids contain further slashes (e.g. `openrouter/qwen/qwen3-8b`) — never use `split('/')` with destructuring.
- Validate the pair against the cached catalog before dispatch. Unknown pair → **HTTP 400 `unknown_model`**, not a silent fallback.
- Persist the selected model. `modelService.currentModel` is currently an in-memory module variable (`modelService.ts:85`) that resets on restart. Store it in the existing SQLite database as a settings row.

### Q9 — How do we guarantee the project never uses the user's global MiMo Code config?

**Four layers. All four are mandatory. Layers 1–2 are the mechanism; 3–4 are the proof.**

**Layer 1 — Own the config/data roots.** Set on the child process:
```
XDG_CONFIG_HOME = <repoRoot>/.mimo-runtime/config
XDG_DATA_HOME   = <repoRoot>/.mimo-runtime/data
XDG_CACHE_HOME  = <repoRoot>/.mimo-runtime/cache
XDG_STATE_HOME  = <repoRoot>/.mimo-runtime/state
MIMOCODE_CONFIG_DIR = <repoRoot>/.mimo-runtime/config/mimocode
MIMOCODE_DISABLE_AUTOUPDATE = 1
```
`XDG_DATA_HOME` is the one that actually moves credentials (§1.2). `MIMOCODE_CONFIG_DIR` is set for completeness — **it is not sufficient on its own and must not be relied on**.

**Layer 2 — Build the child environment from an allowlist, not by spreading `process.env`.** This is the layer that stops `ANTHROPIC_API_KEY`-style inheritance, which `MIMOCODE_DISABLE_PROVIDER_ENV` failed to stop (§1.2).

Copy through only: `PATH`/`Path`, `SystemRoot`, `windir`, `COMSPEC`, `TEMP`, `TMP`, `USERPROFILE`, `HOME`, `HOMEDRIVE`, `HOMEPATH`, `APPDATA`, `LOCALAPPDATA`, `PROGRAMFILES`, `PROGRAMFILES(X86)`, `PROGRAMDATA`, `NUMBER_OF_PROCESSORS`, `PROCESSOR_ARCHITECTURE`, `OS`, `PATHEXT`, `TZ`, `SHELL`, `LANG`, `LC_ALL`. Then add the MiMo variables this project sets deliberately.

Deny by construction — everything else, and explicitly assert-absent: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_API_KEY`, `XIAOMI_API_KEY`, `OPENCODE_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `TOGETHER_API_KEY`, `AZURE_*`, `AWS_*`, `MIMO_API_KEY`, and any variable matching `/(_API_KEY|_TOKEN|_SECRET)$/`.

`USERPROFILE`/`HOME` are deliberately kept — some tooling breaks without them — which is precisely why Layer 1 must set the XDG variables explicitly rather than hoping the home directory is unreachable.

**Layer 3 — Fail-fast startup assertion.** Before the provider is considered ready, `GET /config/providers` and assert:
- the resolved credentials path is inside `<repoRoot>/.mimo-runtime/` (compare `path.resolve`d, case-insensitively on Windows);
- no provider has `source` indicating an environment-derived credential;
- the process refuses to serve chat if either check fails — `provider_isolation_violated`, logged at `fatal`.

Never *repair* a violation silently. Refuse.

**Layer 4 — A test that would catch a regression.** See Verification V3: set a canary `ANTHROPIC_API_KEY` in the parent, boot, and assert the child sees zero credentials and zero environment providers.

### Q10 — What to reuse, what to delete

**Reuse unchanged (do not rewrite):**
- `MimoServeProvider`'s SSE consumption, `translateEvent()`, session mapping, `waitForCompletion()`
- `chatController`'s SSE writing; `frontend/src/api.ts streamChat()`; `streamEventReducer`; `useChat`'s rendering path
- `AIProvider` registry pattern in `providers/index.ts`
- `adminAuth` bearer-token middleware (`middleware/adminAuth.ts`) — reuse it for the new provider routes
- The existing SQLite database and repositories
- `keyHash()`'s sha256-prefix logging idea

**Delete / replace (hardcoded or dead logic):**

| Location | What it is | Action |
|---|---|---|
| `modelService.ts:75-82` `getDefaultModels()` | 4 hardcoded models | **Delete.** No fallback list. |
| `modelService.ts:25-52` `fetchModelsFromCli()` | broken `runCommand(['models'])` + unsafe line parse | **Replace** with `GET /config/providers` |
| `modelService.ts:63-72` `getModelDescription()` | hardcoded descriptions for 4 ids | **Delete.** Use real metadata. |
| `modelService.ts:14` `DEFAULT_MODEL` | `'mimo/mimo-auto'` constant | **Replace** with the catalog's `default` map |
| `modelService.ts:85` `currentModel` | in-memory, resets on restart | **Persist** to SQLite |
| `useModels.ts:9-14` `DEFAULT_MODELS` | 4 hardcoded models (frontend copy) | **Delete**, incl. the `catch` fallback at `:40-44` |
| `useModels.ts:25` `useState('mimo/mimo-auto')` | hardcoded default | **Replace** with server default |
| `MimoServeProvider.ts:44-80` `findMimoBinary()` | global-only, `execFileSync` at import | **Replace** with local-first resolution |
| `MimoServeProvider.ts:165` `cwd: USERPROFILE` | runs MiMo in the user's home | **Replace** with project root |
| `MimoServeProvider.ts:167-173` `env: {...process.env}` | inherits everything | **Replace** with allowlist |
| `MimoServeProvider.ts:244` loose URL regex | matches any URL, incl. inside errors | **Replace** with the strict `listening on` match |
| `MimoCliProvider.getConfig()` | calls non-existent `mimo config --json` | **Delete** (dead) |
| `adminController.ts:46-95` | mutates `process.env`, `@ts-ignore`-mutates `env`, persists key | **Delete**; replace with provider-credential route |
| `controllers/mimoController.ts:44-75` `runCommand` | unauthenticated arbitrary CLI exec | **Delete the route** (Security S1) |
| `MimoCliProvider.ts` debug `console.log`s (incl. `:285`) | leak args/prompts to stdout | **Delete** |

### Q11 — Exact files created and modified

**Created (7):**
1. `backend/src/mimo/runtime.ts` — paths, port picking, child-env construction
2. `backend/src/mimo/client.ts` — typed HTTP client for the local serve instance
3. `backend/src/services/providerService.ts` — provider/credential orchestration
4. `backend/src/routes/providerRoutes.ts` — provider REST surface
5. `backend/src/controllers/providerController.ts` — provider handlers
6. `frontend/src/hooks/useProviders.ts` — provider/credential UI state
7. `.gitignore` (repo root)

**Modified (12):** `backend/src/providers/MimoServeProvider.ts`, `backend/src/services/modelService.ts`, `backend/src/routes/modelRoutes.ts`, `backend/src/config/env.ts`, `backend/src/index.ts`, `backend/src/routes/adminRoutes.ts`, `backend/src/controllers/adminController.ts`, `backend/src/routes/mimoRoutes.ts`, `backend/src/providers/MimoCliProvider.ts`, `backend/package.json`, `frontend/src/hooks/useModels.ts`, `frontend/src/api.ts`, `frontend/src/components/SettingsSection.tsx`, `backend/.env.example`.

**Deleted (0 files).** Only functions and routes are removed.

### Q12 — Exact functions/classes/routes/components that change

See §4 — every one is specified there with current behaviour, new responsibility, inputs, outputs, edge cases, and what must not change.

### Q13 — The data flow

```
Add a provider credential
  SettingsSection → useProviders.addCredential(id, key)
  → POST /api/providers/:id/credential   (Authorization: Bearer <admin token>)
  → providerController.putCredential → providerService.setCredential
  → mimoClient.putAuth(id, {type:'api', key})
  → PUT http://127.0.0.1:<port>/auth/:id  (Basic mimocode:<generated>)
  → MiMo writes <repoRoot>/.mimo-runtime/data/mimocode/auth.json  (0600)
  → providerService: run `mimo models --refresh` (isolated env, stdout discarded)
  → modelService.invalidate()
  → 200 { data: { id, hasCredential: true } }        ← key never echoed back

List models
  useModels → GET /api/models → modelService.getCatalog()
  → (cache miss) mimoClient.getProviders() → GET /config/providers
  → group + normalise → { providers:[…], default:{…} }
  → not ready → 503 provider_not_ready   (never a hardcoded list)

Send a message
  ChatInput → useChat → POST /api/chat/stream { sessionId, message, agent, model:"prov/model" }
  → chatController → validate against catalog (400 unknown_model if absent)
  → MimoServeProvider.sendMessageStream
  → POST /session/:id/prompt_async { agent, model:{providerID, modelID}, parts:[…] }
  → MiMo resolves the provider from the ISOLATED auth.json → calls the provider API
  → SSE /event → translateEvent() → res.write("data: …")
  → api.ts streamChat() → streamEventReducer → React state → UI
```

The second half of the send path is **unchanged** — that is the point.

### Q14 — What must NOT be changed

1. The SSE event vocabulary and `translateEvent()` mapping.
2. `frontend/src/lib/streamEventReducer.ts` — untouched by this plan. (Its missing `fatal_error` case is Plan 02's scope, not this one.)
3. `frontend/src/api.ts streamChat()` generator mechanics.
4. The SQLite schema for sessions/messages, and `initSchema()`'s existing tables. Add one settings table; alter nothing existing.
5. `MimoServeProvider.sessionMap` / `waitForCompletion()` semantics.
6. The `AIProvider` registry shape in `providers/index.ts` (add nothing new to the map).
7. The context/brain/memory subsystem — out of scope here.
8. The user's global MiMo Code environment: `~/.config/mimocode/`, `~/.local/share/mimocode/`, `~/.mimocode/`, and the global npm install. **Never read, write, migrate, or "fix" them** — including the malformed global config from §1.1. Not even to copy credentials into the project.
9. The three existing plans in `docs/plans/` (01/02/03). This document is additive; §10.3 notes the overlaps.

---

## 3. Target architecture

```
┌────────────────────────────────────────────────────────────────┐
│ frontend (React 19, :3000)                                     │
│   SettingsSection ─ useProviders ─┐                            │
│   ChatInput ─ useChat ─ useModels ─┤ api.ts                    │
└───────────────────────────────────┼────────────────────────────┘
                                    │ HTTP + SSE
┌───────────────────────────────────▼────────────────────────────┐
│ backend (Express, :3001)                                       │
│   providerRoutes ─ providerService ─┐                          │
│   modelRoutes    ─ modelService    ─┤ mimo/client.ts           │
│   chatRoutes     ─ MimoServeProvider┘                          │
│                     ▲                                          │
│                     └── mimo/runtime.ts (paths, env, port)     │
└───────────────────────────────────┬────────────────────────────┘
                                    │ spawn + HTTP/SSE on 127.0.0.1
┌───────────────────────────────────▼────────────────────────────┐
│ PROJECT-LOCAL MiMo Code  (backend/node_modules/@mimo-ai/cli)    │
│   XDG_CONFIG_HOME = <repo>/.mimo-runtime/config                │
│   XDG_DATA_HOME   = <repo>/.mimo-runtime/data                  │
│   auth.json · mimocode.db · mimocode.jsonc   ← project-owned    │
│   provider system → provider API key → selected model → agent   │
└────────────────────────────────────────────────────────────────┘

           ╳ NO PATH to ~/.config/mimocode, ~/.local/share/mimocode,
             ~/.mimocode, or the global npm @mimo-ai/cli
```

---

## 4. File-by-file change specification

### Step 1 — `backend/src/mimo/runtime.ts` **(new)**

**Responsibility:** the single place that knows where the project-local MiMo lives and how to launch it safely. Nothing else in the codebase may compute these paths.

**Exports:**

```ts
export interface MimoRuntimePaths {
  repoRoot: string; runtimeRoot: string;
  configHome: string; dataHome: string; cacheHome: string; stateHome: string;
  configDir: string; configFile: string;   // …/config/mimocode[/mimocode.jsonc]
  dataDir: string;  authFile: string;      // …/data/mimocode[/auth.json]
}
export function getRuntimePaths(): MimoRuntimePaths;
export function ensureRuntimeDirs(): void;
export function resolveMimoBinary(): string;
export function buildChildEnv(extra?: Record<string, string>): NodeJS.ProcessEnv;
export function pickFreePort(): Promise<number>;
export function generateServePassword(): string;
export function assertPathInsideRuntime(p: string): void;
```

**Details:**

- `getRuntimePaths()` — `repoRoot = path.resolve(__dirname, '../../..')`. Verify `backend/package.json` and `frontend/package.json` both exist under it; if not, throw `MimoRuntimeError('repo root detection failed')`. Memoise. Allow override via `MIMO_RUNTIME_DIR` (absolute path only; reject relative).
- `ensureRuntimeDirs()` — `mkdirSync(..., {recursive:true})` for `configHome`, `dataHome`, `cacheHome`, `stateHome` **only**. Do not create the `mimocode/` children; MiMo does that.
- `resolveMimoBinary()` — resolution order, first hit wins:
  1. `process.env.MIMO_BINARY_PATH` (explicit escape hatch; must exist on disk)
  2. `backend/node_modules/@mimo-ai/cli/node_modules/@mimo-ai/mimocode-${platform}-${arch}/bin/mimo${ext}`
  3. `<repoRoot>/node_modules/@mimo-ai/cli/node_modules/…` (hoisted layout)
  
  `platform` ∈ `windows|darwin|linux` from `process.platform` (`win32→windows`); `arch` from `process.arch` (`x64`, `arm64`); `ext` = `.exe` on Windows else empty.
  
  **If none resolve, throw** `MimoBinaryNotFoundError` with the remediation string `run: npm install --prefix backend`. **Never fall back to the global install**, `npm root -g`, `%APPDATA%\npm`, or `NVM_SYMLINK`. Doing so reintroduces exactly the bug this plan exists to prevent. **No `execFileSync` at module scope** — resolution happens inside the function, called from `start()`.
- `buildChildEnv(extra)` — implements Q9 Layer 2. Start from `{}`, copy the allowlist, then apply the Layer-1 MiMo variables, then `extra`. Finally assert no key matches `/(_API_KEY|_TOKEN|_SECRET)$/` except the deliberate `MIMOCODE_SERVER_PASSWORD`; throw `MimoEnvLeakError` listing offending names (names only, never values) if one survives. Also set `CHCP=65001`, `PYTHONIOENCODING=utf-8`, `LANG=en_US.UTF-8`, `LC_ALL=en_US.UTF-8` — the existing code sets these and they must be preserved for Windows UTF-8 output.
- `pickFreePort()` — `net.createServer().listen(0,'127.0.0.1')`, read `address().port`, close, resolve. Accept `MIMO_SERVE_PORT` when non-zero and honour it verbatim.
- `generateServePassword()` — `crypto.randomBytes(32).toString('hex')`. Fresh per process start. **Never logged.** If `env.mimoServerPassword` is set, use it (test determinism) but warn once.
- `assertPathInsideRuntime(p)` — `path.resolve` both, compare with `startsWith` + separator guard; case-insensitive when `process.platform === 'win32'`. Throws `MimoIsolationError`.

**Edge cases:** repo moved/renamed mid-session → path detection re-validates on each `start()`; a space in `C:\Users\Atrin ay\…` → always pass paths as argv/env values, never interpolate into a shell string, and keep `shell: false`; `.mimo-runtime` existing as a *file* → throw with a clear message.

**Unchanged:** nothing yet — this file is new.

### Step 2 — `backend/src/mimo/client.ts` **(new)**

**Responsibility:** typed HTTP access to the running project-local instance. The only module that knows the serve URL and Basic credentials.

```ts
export class MimoLocalClient {
  constructor(baseUrl: string, password: string);
  getProviders(): Promise<MimoProvidersResponse>;   // GET /config/providers
  putAuth(providerId: string, cred: MimoCredential): Promise<boolean>; // PUT /auth/:id
  deleteAuth(providerId: string): Promise<boolean>; // DELETE /auth/:id — probe first
  ping(): Promise<boolean>;
}
export interface MimoProvidersResponse {
  providers: Array<{ id: string; name: string; env: string[];
    options: Record<string, unknown>; source: string;
    models: Record<string, MimoModel>; }>;
  default: Record<string, string>;
}
```

- Auth header: `Basic base64("mimocode:" + password)`. Username is fixed `mimocode` (verified §1.4). Honour `MIMOCODE_SERVER_USERNAME` if the project ever sets it.
- Validate every response with **zod** (already a backend dependency). A shape change in a future CLI version must surface as a typed error, not `undefined` deep in a mapper.
- 10 s timeout via `AbortSignal.timeout(10_000)`; one retry on `ECONNREFUSED` only (covers the race just after spawn).
- `deleteAuth`: `DELETE /auth/:id` was **not verified** in inspection. Probe it at implementation time. If it does not exist, implement removal by rewriting `auth.json` minus that key (path checked with `assertPathInsideRuntime`) and restarting the serve child. **Report which path you took.**
- Errors: never include the request body in an error message — bodies carry keys.

### Step 3 — `backend/src/config/env.ts` **(modify)**

**Currently:** at import time reads `data/admin-overrides.json` and splats string values into `process.env` (`:8-23`); `loadEnv()` builds `EnvConfig` with `AI_PROVIDER` default `'mimo-serve'`, `MIMO_BASE_URL` default `'https://api.siliconflow.cn/v1'`, `MIMO_MODEL` default `'Qwen/Qwen3-8B'`.

**Changes:**
1. **Remove the `admin-overrides.json` env-splat block (`:8-23`) entirely.** It is the mechanism by which a stored provider key re-enters `process.env` on every boot — incompatible with Q5. Keep reading the file only if a non-secret override is still needed; if kept, hard-filter to a known non-secret allowlist and never accept `*_API_KEY`.
2. Add to `EnvConfig`: `mimoRuntimeDir: string` (default `''`), `mimoBinaryPath: string` (default `''`), `mimoAuthInMemory: boolean` (default `false`), `mimoServeStartupTimeoutMs: number` (default `120000`).
3. Leave `mimoServePort` and `mimoServerPassword` as they are.
4. Keep `mimoApiKey`/`mimoBaseUrl`/`mimoModel` fields for now — `MiMoProvider` still uses them — but they are no longer the chat path. Do not extend them.

**Must not change:** the `EnvConfig` interface's existing field names (widely imported), and the `aiProvider === 'mimo' && !mimoApiKey → 'mimo-serve'` guard at `:71-74`.

### Step 4 — `backend/src/providers/MimoServeProvider.ts` **(modify — the core change)**

**4a. Delete `findMimoBinary()` (`:44-80`).** Replace all uses with `resolveMimoBinary()`. This removes the `execFileSync('npm root -g')` at import time and every global search path.

**4b. Constructor (`:131-150`) — stop doing I/O at construction.** Currently `findMimoBinary()` runs and `this.start()` is fired from the constructor, so merely *importing* the module launches a subprocess and shells out to npm. Change to: assign fields, create `readyPromise`, **do not** resolve the binary, **do not** call `start()`. Add `async init(): Promise<void>` that resolves the binary, calls `ensureRuntimeDirs()`, then `start()`. `backend/src/index.ts` awaits it (Step 6).

*Why this is required, not cosmetic:* `modelService` imports `getProvider()`, so a model listing could previously spawn `mimo serve` as a side effect, before any isolation was configured.

**4c. `start()` (`:158-219`) — the isolation change.**

```ts
const paths = getRuntimePaths();
ensureRuntimeDirs();
const port = await pickFreePort();
this.servePassword = generateServePassword();
const args = ['serve', '--port', String(port), '--hostname', '127.0.0.1'];
this.serveProcess = spawn(this.binary, args, {
  cwd: paths.repoRoot,                                   // was USERPROFILE
  shell: false,
  env: buildChildEnv({ MIMOCODE_SERVER_PASSWORD: this.servePassword }),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
this.expectedPort = port;
```

- `cwd` becomes the repo root (`:165`). MiMo's agent then operates on this project, and project-scoped config resolution points here rather than at the user's home.
- `env` comes from `buildChildEnv()` — never `{...process.env}` (`:167-173`).
- Port is explicit, so readiness can be *verified* rather than scraped.

**4d. `checkForReady()` (`:240-252`) — strict matching.** Replace `/(?:listening on\s+)?(https?:\/\/[^\s\n]+)/` with:

```ts
const m = output.match(/mimocode server listening on\s+(https?:\/\/\S+)/);
```

Then assert the matched port equals `this.expectedPort`; mismatch → do not mark ready. The old regex matches any URL MiMo prints, including inside a stack trace or an update notice, so the provider could report "ready" pointing at a URL that is not the server.

**4e. Startup timeout (`:210-215`) — raise to `env.mimoServeStartupTimeoutMs` (default 120 000).** 15 s is shorter than the observed ~20 s first-run DB migration (§1.9), so the first launch after this change would fail. Also: on timeout, **reject** `readyPromise` rather than only emitting `error` — currently `await this.readyPromise` hangs forever if the URL never appears, because nothing rejects it.

**4f. Add the isolation assertion.** After ready, before resolving `readyPromise`: call `client.getProviders()`, then `assertPathInsideRuntime(paths.authFile)` and verify `existsSync(paths.dataDir)`. If any provider's `source` indicates an environment-derived credential, log `fatal` and reject with `provider_isolation_violated`. Store `isolationVerified: boolean` and expose it on `healthCheck()`.

**4g. `stop()` (`:224-235`).** Keep `SIGTERM`, add: kill the SSE reader, `unref()` the child, and a 5 s escalation to `SIGKILL` (`taskkill /T /F` on Windows) so a stuck child does not outlive the backend and hold the SQLite WAL.

**Must not change:** `translateEvent()`, `sendMessageStream()`, `sendMessage()`, `waitForCompletion()`, `sessionMap`/`sessionLastUsed`/sweep logic, the SSE parsing loop, HTTP Basic scheme, `/session/:id/prompt_async` body shape.

**Explicitly out of scope here:** `buildPrompt()`'s context concatenation (`:916-935`). That is Plan 03's subject. Leave it exactly as it is so the two plans do not collide.

### Step 5 — `backend/src/services/modelService.ts` **(rewrite the internals)**

**Currently:** `fetchModelsFromCli()` calls `provider.runCommand(['models'])` — a method that exists only on `MimoCliProvider`, while the default provider is `mimo-serve`. The call throws `TypeError: provider.runCommand is not a function`, the `catch` at `:48-51` swallows it, and `getDefaultModels()` returns the 4 hardcoded models. **The hardcoded list wins on every single call.** That is the bug.

**New responsibility:** own the catalog cache and the selected model; read only from `MimoLocalClient`.

```ts
export interface ModelCatalog {
  providers: ProviderWithModels[];
  default: Record<string, string>;
  fetchedAt: number;
}
export const modelService = {
  getCatalog(): Promise<ModelCatalog>,      // cache, TTL 5 min
  invalidate(): void,
  getCurrentModel(): Promise<string>,       // now async — DB-backed
  setCurrentModel(id: string): Promise<void>,
  resolveModel(id?: string): Promise<{ providerID: string; modelID: string }>,
  isKnownModel(id: string): Promise<boolean>,
};
```

- `getCatalog()` — on cache miss, `client.getProviders()`; map each provider's `models` record into an array; canonical `id = \`${providerID}/${modelID}\``; carry `name`, `status`, `limit.context → contextLimit`, `limit.output → outputLimit`, `capabilities`, `cost`. Sort providers by `name`; within a provider, `status === 'active'` before `beta`, then by `name`.
- **Delete** `getDefaultModels()`, `getModelDescription()`, `formatModelName()`, `DEFAULT_MODEL`, `fetchModelsFromCli()`. On failure, **throw** a typed `ProviderNotReadyError` — the controller maps it to 503. No fallback list, ever.
- `resolveModel()` — split at the **first** `/` (Q8). Empty `providerID` or `modelID` → `InvalidModelIdError`. Unknown pair → `UnknownModelError`. When `id` is undefined, use the persisted selection; if none, derive from the catalog's `default` map, preferring a provider that has a credential.
- `getCurrentModel()`/`setCurrentModel()` become **async and DB-backed** (`modelService.ts:85`'s module variable resets on every restart). Add to `initSchema()`:

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Key `selected_model`. **This is the only schema addition in this plan; alter no existing table.**

**Callers to update because of the async change:** `routes/modelRoutes.ts:19-22`, `chatController.ts:127`/`:157` (already async), and any `chatService` model resolution. Grep `getCurrentModel|resolveModel|setCurrentModel` and fix every call site.

### Step 6 — `backend/src/index.ts` **(modify)**

**Currently:** `initSchema()` then `app.listen()`; the provider starts implicitly at import; `SIGINT`/`SIGTERM` handlers call `getProvider().stop()` behind a `typeof` check.

**Changes:**
1. Convert startup to an async `main()`:
   ```
   initSchema()
   → const provider = getProvider()
   → if (typeof provider.init === 'function') await provider.init()
   → app.listen(port)
   ```
2. If `init()` rejects: log `fatal`, **still start the HTTP server**, and record the failure so `/health` and `GET /api/models` report `provider_not_ready` with the real reason. Do **not** `process.exit()` — the user must be able to reach Settings to fix credentials. This is the one place where degraded startup is correct; everywhere else, fail loudly.
3. `/health` (`:45-47`) returns:
   ```json
   { "status": "ok", "provider": { "name": "mimo-serve", "state": "ready|starting|failed",
     "isolationVerified": true, "runtimeDir": "<repoRoot>/.mimo-runtime", "reason": null } }
   ```
   `runtimeDir` is deliberately included — it is how a human confirms isolation at a glance. Never include the serve password or any key.
4. Shutdown: `await provider.stop()` with a 5 s cap, then exit. Add `beforeExit` as a backstop so the MiMo child is not orphaned.

**Must not change:** middleware order (`express.json` → `cors` → `requestLogger` → routes → `notFound` → `errorHandler`), the `etag` disable at `:33`, existing route mounts.

### Step 7 — `backend/src/services/providerService.ts` **(new)**

**Responsibility:** the only module that mutates credentials.

```ts
export const providerService = {
  listProviders(): Promise<ProviderSummary[]>,     // {id,name,hasCredential,source,modelCount}
  setCredential(providerId: string, key: string): Promise<void>,
  removeCredential(providerId: string): Promise<void>,
  refreshCatalog(): Promise<{ modelCount: number }>,
};
```

- `setCredential` — validate `providerId` against `/^[a-z0-9][a-z0-9._-]{0,63}$/` (it becomes a URL path segment); validate `key` non-empty, length 8–2048 (reuse the existing bounds from `adminController.ts:41`), and reject control characters. Then `client.putAuth(id, {type:'api', key})`. On success: `chmod(authFile, 0o600)` best-effort, run `mimo models --refresh` once (isolated env, stdout discarded, 60 s timeout, failure logged at `warn` and swallowed — a cold catalog is not a failed credential), then `modelService.invalidate()`.
- **Never** log or return `key`. Log `{ providerId, keyHash: sha256(key).slice(0,8) }`.
- `refreshCatalog()` — the same refresh + invalidate, exposed for a manual "Refresh models" button.
- If `env.mimoAuthInMemory` is true: hold keys in a module-level `Map`, pass them via `MIMOCODE_AUTH_CONTENT` on the next spawn, and restart the serve child instead of calling `putAuth`. Document that keys are lost on restart.

### Step 8 — `backend/src/controllers/providerController.ts` + `backend/src/routes/providerRoutes.ts` **(new)**

```
GET    /api/providers                    → list (no auth; no secrets in response)
POST   /api/providers/:id/credential     → set   (requireAdminAuth)
DELETE /api/providers/:id/credential     → remove(requireAdminAuth)
POST   /api/providers/refresh            → warm catalog (requireAdminAuth)
```

- Mount with `router.use(requireAdminAuth)` **only on the mutating routes** — reuse `middleware/adminAuth.ts` unchanged.
- `POST .../credential` body `{ "key": "<string>" }`. Response `{ data: { id, hasCredential: true } }`. **Never** echo the key.
- Error mapping: `ProviderNotReadyError`→503 `provider_not_ready`; validation→400 `invalid_input`; upstream refusal→502 `provider_rejected`; `MimoIsolationError`→500 `provider_isolation_violated`.
- Register in `backend/src/index.ts`: `app.use('/api/providers', providerRoutes)`.

### Step 9 — `backend/src/controllers/adminController.ts` + `adminRoutes.ts` **(modify)**

**Currently:** `setApiKey` mutates `process.env.MIMO_API_KEY`, forces `AI_PROVIDER='mimo'`, `@ts-ignore`-mutates the frozen-by-convention `env` object (`:56-71`), calls `resetProvider()`, and persists the key to `data/admin-overrides.json` — which `env.ts:8-23` then splats back into `process.env` on every boot.

**Changes:**
1. **Delete `setApiKey` and the `POST /api/admin/api-key` route.** Its job now belongs to `POST /api/providers/:id/credential`.
2. Keep `keyHash()` — move it to `providerService`.
3. If `data/admin-overrides.json` exists at boot and contains `MIMO_API_KEY`, log a `warn` once instructing the user to re-enter the key in Settings, and **do not** load it. Do not auto-migrate a secret into the new store: the value's provider is unknown (`MIMO_BASE_URL` defaults to a SiliconFlow URL while `MIMO_MODEL` defaults to a Qwen model — the pairing is unreliable), and silently re-homing a credential is the wrong default.
4. `adminRoutes.ts` keeps `router.use(requireAdminAuth)`; if no routes remain, keep the router mounted and empty rather than removing the mount.

**Must not change:** `middleware/adminAuth.ts`, and `data/admin.token` generation/format.

### Step 10 — `backend/src/routes/modelRoutes.ts` **(modify)**

**Currently:** `GET /` returns `{data: models}` (flat) and swallows every error into a generic 500 (`:12-15`); `GET /current` and `POST /current` are sync.

**Changes:**
- `GET /` → grouped catalog (Q7). Map `ProviderNotReadyError` → **503** `{error:{code:'provider_not_ready', message:<real reason>}}`. Distinguishing 503 from 500 is what makes "no models" diagnosable instead of silent.
- `GET /current` → `await modelService.getCurrentModel()`.
- `POST /current` → validate with `isKnownModel()`; unknown → **400** `unknown_model`. Currently it accepts any string, so the UI can select a model that cannot run.
- `POST /refresh` → delegate to `providerService.refreshCatalog()` (admin-authenticated).

### Step 11 — `backend/src/routes/mimoRoutes.ts` + `controllers/mimoController.ts` **(modify — security)**

**Currently:** `POST /api/mimo/run` accepts `{args: string[]}` and executes it, guarded only by a blocklist of `['rm','rmdir','del','format','shutdown','reboot']` (`mimoController.ts:57-58`). `mimoRoutes.ts` applies **no authentication**. Any process that can reach `localhost:3001` can run `["run","--dangerously-skip-permissions","<arbitrary instruction>"]` — the blocklist matches none of those tokens.

**Changes:**
1. **Delete the `POST /run` route and `runCommand()`.** No allowlisted replacement — the legitimate needs (models, providers, auth) are all covered by typed endpoints.
2. **Delete `GET /config` and `getConfig()`** — it calls the non-existent `mimo config --json` (§1.7); it can only ever 500 or 501.
3. Keep `GET /version` and `GET /health`; point them at the project-local instance.
4. Add `requireAdminAuth` to what remains.

### Step 12 — `backend/src/providers/MimoCliProvider.ts` **(modify)**

Demote to a non-default diagnostic path; do not delete the file (`providers/index.ts` maps `'mimo-cli'` and tests may reference it).

1. **Delete `getConfig()`** — dead (§1.7).
2. Replace `cliCwd()` (returns `USERPROFILE`/`HOME`) with `getRuntimePaths().repoRoot`, and `cliEnv()` with `buildChildEnv()`. Even a diagnostic path must not touch global config.
3. Use `resolveMimoBinary()`; delete its own discovery logic.
4. **Delete the `console.log('[MimoCliProvider DEBUG] …')` statements**, including `buildCliArgs()`'s dump of full args + model and the spawn log at `:285`. They print prompts and arguments to stdout, outside the pino logger and its redaction.
5. Keep `runCommand()` — `providerService` uses it for `models --refresh`. Constrain it to an internal allowlist: `['models','providers','version']` with only `--refresh`/`--verbose`/`--json` flags. It is no longer reachable from HTTP after Step 11.

**Must not change:** `sendMessageStream()`'s NDJSON parsing, and `buildPrompt()` (Plan 03's territory).

### Step 13 — `backend/package.json` **(modify)**

1. Add to `dependencies`: `"@mimo-ai/cli": "0.1.10"` — **exact, no caret.** The provider/model API shape (`GET /config/providers`, `PUT /auth/:id`) is verified against 0.1.10 only; a floating range can change it under you.
2. Add scripts:
   - `"mimo:paths": "ts-node src/scripts/printRuntimePaths.ts"` — prints resolved paths and the binary; the first thing to run when isolation is suspect.
   - `"mimo:doctor": "ts-node src/scripts/doctor.ts"` — runs the V-series checks in §6.
3. Note in the README that `npm install` now downloads a ~130 MB platform binary.

### Step 14 — Frontend

**14a. `frontend/src/api.ts` (modify)**
- Replace the hardcoded `API_BASE` (`:1`) and the separately hardcoded health URL (`:214`) with `import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'`. Two hardcoded hosts that must agree are a latent bug; this also unblocks Plan 02 Step 12.
- Add: `listProviders()`, `setProviderCredential(id, key)`, `removeProviderCredential(id)`, `refreshModels()`, and a `getModelCatalog()` returning the grouped shape.
- Admin-authenticated calls need `Authorization: Bearer <token>`. **The token lives in `backend/data/admin.token` and there is currently no endpoint that serves it.** Resolve it exactly one of these ways and state which in the PR:
  - (a) read `VITE_ADMIN_TOKEN` from the frontend env (dev-only), or
  - (b) add `GET /api/admin/token` bound to `127.0.0.1` **only**, guarded by an origin check.
  
  Do **not** put the token in `localStorage` unprefixed, and do not ship (b) without the loopback bind.
- **Remove `setApiKey()`** — the endpoint is gone (Step 9).
- Do not change `streamChat()`.

**14b. `frontend/src/hooks/useModels.ts` (rewrite)**
- **Delete `DEFAULT_MODELS` (`:9-14`) and the fallback at `:40-44`.** With a fallback list the UI shows four models that may not be usable and hides the real failure — the same failure mode as the backend's.
- Return `{ catalog, providers, model, setModel, loading, error, refresh }`. `error` must be a real, rendered state (`provider_not_ready` → "MiMo is starting…", with a retry).
- Remove the hardcoded `useState('mimo/mimo-auto')` (`:25`); initialise from the server's `default`.
- `setModel` currently sets local state before the server confirms (`:52-59`) and only records the error. Keep the optimistic update, but **revert on failure** so the UI cannot claim a model the backend rejected.

**14c. `frontend/src/hooks/useProviders.ts` (new)** — `{ providers, loading, error, addCredential, removeCredential, refreshing }`. `addCredential` must clear the key from component state immediately after the request resolves.

**14d. `frontend/src/components/SettingsSection.tsx` (modify)**

**Currently:** a single `mimoApiKey` input (`:151`, `:396-397`) that on save writes the key **and** the base URL and model to **`localStorage`** (`:433-435`) and then calls `setApiKey()` (`:438-439`).

Changes:
1. **Delete the `localStorage.setItem('mimo_api_key', …)` write and the matching read at `:167`.** A provider API key in `localStorage` is readable by any script in the page and survives indefinitely. This is the most serious client-side issue in the current design and it must not survive the refactor.
2. Replace the single-key form with a provider list from `useProviders`: each row shows name, `hasCredential`, model count, and an add/replace/remove action. The key input is `type="password"`, `autoComplete="off"`, cleared on submit, and never re-populated from the server (the server cannot return it).
3. The model dropdown reads the grouped catalog — `<optgroup>` per provider, showing `name`, `status` badge for `beta`, and context window from `contextLimit`.
4. Keep `mimo_model` in `localStorage` only as a UI preference **if** the server has no persisted selection; the server value (Step 5) wins.

**Must not change:** the component's existing layout/animation structure, and its bilingual string handling (Plan 01's territory — do not start migrating i18n here).

### Step 15 — `.gitignore` (repo root) **(new)**

```
node_modules/
dist/
.env
.env.*
!.env.example
.mimo-runtime/
backend/data/
backend/admin.json
backend/session.json
*.log
```

Then, as a separate step the user must confirm before you run it: `git rm --cached backend/admin.json backend/session.json`. `.mimo-runtime/` **must** be ignored before the first run — otherwise `auth.json` can be committed. Add the ignore entry in the same commit as Step 1.

### Step 16 — `backend/.env.example` **(modify)**

Add, with comments:

```
# ─── Project-local MiMo Code ─────────────────────────────────────────────
# Runtime root (config + credentials + db). Absolute path. Default: <repo>/.mimo-runtime
# MIMO_RUNTIME_DIR=
# Explicit binary path. Escape hatch only — normally resolved from backend/node_modules.
# MIMO_BINARY_PATH=
# 0 = pick a free port automatically (recommended)
MIMO_SERVE_PORT=0
# Startup timeout (ms). First run performs a one-time DB migration (~20s+).
MIMO_SERVE_STARTUP_TIMEOUT_MS=120000
# Hold provider keys in memory only; nothing written to auth.json. Keys reset on restart.
MIMO_AUTH_IN_MEMORY=false
```

Also fix the misleading current comments: `AI_PROVIDER=mock` with a comment that omits `mimo-serve` — which is the actual default in `env.ts:66`. And `MIMO_BASE_URL=https://api.xiaomi.com/v1` / `MIMO_MODEL=MiMo-7B-RL` in the example disagree with the code defaults (`https://api.siliconflow.cn/v1`, `Qwen/Qwen3-8B`). Align them.

---

## 5. Implementation order and dependencies

```
1  runtime.ts ─────────┬──> 2  client.ts ──┬──> 5  modelService
   + Step 15 .gitignore│                   │
                       │                   ├──> 7  providerService ──> 8  provider routes
3  env.ts ─────────────┤                   │
                       └──> 4  MimoServeProvider ──> 6  index.ts
                                                        │
   10 modelRoutes ──────────────────────────────────────┤
   9  adminController (delete) ─────────────────────────┤
   11 mimoRoutes (security) ────────────────────────────┤
   12 MimoCliProvider ─────────────────────────────────┘
   13 package.json (before any run)
                          │
                          └──> 14a api.ts ──> 14b useModels ──> 14c useProviders ──> 14d Settings
                          └──> 16 .env.example
```

**Hard ordering constraints:**
- **Step 15 (`.gitignore`) and Step 13 (pin the CLI) come first.** Ignore `.mimo-runtime/` before it can exist; install the local binary before anything tries to resolve it.
- Step 1 blocks 2, 4, 12 — they all need the paths and child env.
- Step 4 blocks 6 (`init()` must exist before it is awaited).
- Step 5 blocks 10; Step 7 blocks 8.
- Backend Steps 5, 8, 10 must land before frontend 14b–14d, or the UI calls endpoints that do not exist.
- Step 11 (security) is independent — land it early; it is a small deletion with no dependencies.

**Suggested commits:** (1) ignore + pin + runtime.ts + client.ts; (2) provider isolation in MimoServeProvider + index.ts wiring; (3) model catalog rewrite; (4) provider credential API; (5) delete admin key path + `/api/mimo/run`; (6) frontend.

Do not defer verification to the end. After commit 2, run V1–V4; they are the whole point of the change.

---

## 6. Verification plan

Each check states what to run and what proves success. **V1–V4 are the acceptance gate for isolation.**

**V1 — The runtime is where we think it is.** `npm --prefix backend run mimo:paths`. Assert the printed binary path is under `backend/node_modules`, and `configHome`/`dataHome` are under `<repoRoot>/.mimo-runtime`. **No printed path may contain `.config\mimocode`, `.local\share\mimocode`, `AppData\Roaming\npm`, or the repo-root `.mimocode`.**

**V2 — Zero credentials on a cold start.** Delete `.mimo-runtime/`, boot the backend, `GET /api/providers`. Expect every provider `hasCredential: false`, and exactly the 4 built-in models from §1.5 in `GET /api/models`. Confirm `.mimo-runtime/data/mimocode/auth.json` is absent or `{}`. If the user's 3 global credentials appear, isolation has failed — stop.

**V3 — Environment canary (the regression test that matters).** With `ANTHROPIC_API_KEY=canary-should-not-appear` set in the parent shell, boot and `GET /api/providers`. Expect **no `anthropic` provider**. Automate this as a vitest that asserts `buildChildEnv()`'s output contains no key matching `/(_API_KEY|_TOKEN|_SECRET)$/` except `MIMOCODE_SERVER_PASSWORD`. This is the check that catches a future `{...process.env}` creeping back in — §1.2 showed `MIMOCODE_DISABLE_PROVIDER_ENV` will not save you.

**V4 — The global environment is untouched.** Record `sha256` of `~/.local/share/mimocode/auth.json`, `~/.config/mimocode/mimocode.jsonc`, and a recursive listing of `~/.mimocode`, before and after a full run including adding a credential and a chat turn. **All hashes identical.** The global malformed config stays malformed — we do not touch it.

**V5 — Credential round-trip grows the catalog.** With a real key: `POST /api/providers/openrouter/credential` → 200. Then `GET /api/models` shows a large `openrouter` group (§1.5 saw 339). Confirm the key is written **only** to `.mimo-runtime/data/mimocode/auth.json`, and appears in **no** log line, no HTTP response, and not in `localStorage`. Grep the backend log for the key's first 6 characters → 0 hits.

**V6 — Model selection reaches the provider.** Select an `openrouter/...` model, send a message, and confirm the outgoing `/session/:id/prompt_async` body carries `model: {providerID:'openrouter', modelID:'<rest>'}` with the id split at the **first** slash. Use a model whose id contains a slash (e.g. `openrouter/qwen/qwen3-8b`) — that is what a naive `split('/')` breaks on.

**V7 — Streaming is unchanged.** A chat turn still renders incrementally, tool calls still appear, and `streamEventReducer` receives the same event `type`s as before. Diff a captured event sequence against a pre-change capture; the vocabulary must match.

**V8 — Failure surfaces, never silently degrades.** Stop the MiMo child mid-session: `GET /api/models` → **503 `provider_not_ready`** (not 200 with 4 models). `GET /health` → `state: 'failed'` with a reason. `POST /api/models/current` with `bogus/model` → **400 `unknown_model`**.

**V9 — Persistence.** Select a model, restart the backend, `GET /api/models/current` returns the same id (proves the DB-backed setting replaced the in-memory variable).

**V10 — Build and existing tests.** `npm --prefix backend run build && npm --prefix backend run lint && npm --prefix backend test`; same for `frontend`. Update `frontend/src/hooks/__tests__/useModels.test.ts` — it asserts the old fallback behaviour and **will** fail; rewrite it to assert the error state instead of a hardcoded list. Do not delete the test to make it pass.

**V11 — First-run timing.** With `.mimo-runtime/` deleted, time startup. Expect the one-time DB migration (§1.9) to complete inside the 120 s timeout, with a user-visible "starting" state throughout.

---

## 7. Failure cases and required handling

| # | Failure | Required behaviour |
|---|---|---|
| F1 | Binary not found in `backend/node_modules` | Throw `MimoBinaryNotFoundError`; `/health` `state:'failed'`, reason = remediation (`npm install --prefix backend`). **Never fall back to the global install.** |
| F2 | `mimo serve` exits immediately | Capture last 50 lines of stdout+stderr, log at `error`, `state:'failed'` with that tail. Retry at most twice with backoff, then stop. |
| F3 | Serve never prints the listening line | Reject `readyPromise` at the timeout (Step 4e) — do not hang. Currently nothing rejects it. |
| F4 | Serve prints a URL on an unexpected port | Do not mark ready (Step 4d port assertion). Log both ports. |
| F5 | First-run DB migration exceeds the timeout | Surface `state:'starting'` with elapsed seconds; do not kill the child before the timeout. |
| F6 | `GET /config/providers` shape changed by a CLI upgrade | zod validation fails → `ProviderNotReadyError` naming the offending field → 503. Never coerce with `as any`. |
| F7 | `PUT /auth/:id` returns non-`true` | 502 `provider_rejected`; do not cache a success; do not write anything locally. |
| F8 | `models --refresh` fails (offline) | Log `warn`, keep the credential (it is valid), serve the un-refreshed catalog. A cold catalog is not a failed credential. |
| F9 | `auth.json` unreadable/corrupt | Log `error`, report the provider list as empty with `provider_not_ready`. **Do not delete or rewrite the file** — a human must inspect it. |
| F10 | Isolation assertion fails (auth path outside the runtime dir) | `fatal` log, `provider_isolation_violated`, **refuse to serve chat**. Never auto-repair. |
| F11 | Port taken between `pickFreePort()` and spawn | Detect via F4/F2, retry with a fresh port, max 3 attempts. |
| F12 | Two backend instances on one repo | Both spawn MiMo children against one SQLite file. Take a lockfile at `.mimo-runtime/backend.lock` (pid + timestamp); on a live lock, refuse to start with `runtime_locked`. |
| F13 | MiMo child orphaned after a backend crash | On start, if the lock is stale, kill the recorded pid if it is still a `mimo` process, then reclaim. |
| F14 | Repo path contains a space (`C:\Users\Atrin ay\…`) | Always argv/env, never shell interpolation; keep `shell: false`. Add a test with a spaced path. |
| F15 | Model id containing extra slashes | First-slash split (Q8) with a unit test on `openrouter/qwen/qwen3-8b`. |
| F16 | User has no credentials at all | `GET /api/models` returns the 4 built-ins; UI shows a "Add a provider key in Settings" affordance rather than an error. This is a valid state, not a failure. |

---

## 8. Security considerations

**S1 — Unauthenticated arbitrary command execution (fix in Step 11, land it first).** `POST /api/mimo/run` executes any `args` array with no authentication on the route and a blocklist of six words. `["run","--dangerously-skip-permissions","<instruction>"]` passes the filter. This is remote code execution for anything that can reach `localhost:3001` — including a browser page via a simple `fetch` if CORS or origin checks are loose. Delete the route.

**S2 — Provider key in `localStorage` (fix in Step 14d).** `SettingsSection.tsx:433` stores the API key in `localStorage`, readable by any script in the origin and persistent. Remove the write and the read; never round-trip a key to the client.

**S3 — Key re-injected into `process.env` on every boot (fix in Steps 3 + 9).** `adminController` writes `MIMO_API_KEY` into `data/admin-overrides.json`; `env.ts:8-23` splats it into `process.env` at import. Because the child env was `{...process.env}`, the key then propagated into every spawned MiMo process. Both halves must go.

**S4 — Credential storage.** `auth.json` is the only at-rest location; `0o600`; inside gitignored `.mimo-runtime/`. The backend keeps no copy. **Note honestly:** this is *not* encryption at rest — it is filesystem permissions plus MiMo's own storage. It matches how MiMo Code itself stores credentials, which is the stated requirement (reuse MiMo's real auth system). If encryption at rest is later required, that is a change to MiMo Code, not a parallel store in this project — building one would violate the "no parallel auth system" constraint.

**S5 — Serve password.** 32 random bytes per process, passed only via the child env, never logged, never returned by `/health`. Do not reuse the user's `MIMOCODE_SERVER_PASSWORD`.

**S6 — Bind loopback only.** `--hostname 127.0.0.1` explicitly. Never `--no-auth`. Never `--mdns` (it advertises the instance on the local network).

**S7 — Log redaction.** Configure pino `redact` for `key`, `apiKey`, `mimoApiKey`, `authorization`, `password`, `MIMOCODE_SERVER_PASSWORD`, `MIMOCODE_AUTH_CONTENT`. Delete the `console.log` debug statements in `MimoCliProvider` (Step 12.4) — they bypass pino entirely.

**S8 — Secrets currently in git.** `backend/admin.json` and `backend/session.json` are tracked. Add the ignore, `git rm --cached` them (confirm with the user first), and **rotate anything they contained** — history retains the values.

**S9 — Admin token exposure.** Whichever option Step 14a picks, the token must not reach a third-party origin. If `GET /api/admin/token` is added, bind it to loopback and check `Origin`.

**S10 — Path traversal via `providerId`.** It becomes a URL path segment in `PUT /auth/:id`; enforce `/^[a-z0-9][a-z0-9._-]{0,63}$/` before use (Step 7).

**S11 — `--dangerously-skip-permissions` must never be passed** by this project's code. Grep for it in the final diff; expect zero hits outside documentation.

---

## 9. Migration and compatibility

**M1 — No automatic credential migration.** Do not copy anything from `~/.local/share/mimocode/auth.json`. The user re-enters keys in Settings. Rationale: the global store belongs to the user's own MiMo Code, silently copying secrets between trust domains is wrong, and the global config is malformed anyway (§1.1). Show a one-time notice: *"MiMo Desktop now uses its own isolated MiMo Code environment. Add your provider keys in Settings — your global MiMo Code setup is untouched."*

**M2 — `admin-overrides.json`.** On boot, if it contains `MIMO_API_KEY`, log one `warn` and ignore it (Step 9.3). Leave the file in place; do not delete a file that holds the user's only copy of a key. Document manual cleanup.

**M3 — The selected model may vanish.** A persisted `xiaomi/mimo-v2.5` remains valid (built-in), but any model that existed only because of a global credential will not resolve. On startup, validate the persisted selection; if unknown, fall back to the catalog default and log at `info`. Do not error.

**M4 — First run is slow.** ~20 s+ of one-time DB migration (§1.9). The UI must show a "MiMo is starting" state rather than an empty model list or an error.

**M5 — Disk.** `npm install` now pulls a ~130 MB platform binary into `backend/node_modules`, plus `.mimo-runtime/` (DB, logs, models cache). Note both in the README.

**M6 — Version pinning.** `@mimo-ai/cli` pinned to `0.1.10` exactly, and `MIMOCODE_DISABLE_AUTOUPDATE=1` on the child so it cannot self-upgrade out from under the verified API. Upgrading is a deliberate change: re-run V1–V8, since `GET /config/providers` and `PUT /auth/:id` are unversioned.

**M7 — Existing sessions.** Rows in `backend/data/mimo.db` are unaffected. But MiMo-side session ids in `MimoServeProvider.sessionMap` referred to sessions in the **global** `mimocode.db`; after isolation they no longer exist. The map is in-memory and rebuilt per process, so no migration is needed — but a resumed conversation starts a fresh MiMo session. State this in the release note.

**M8 — Cross-platform.** `resolveMimoBinary()` handles `windows|darwin|linux` × `x64|arm64`. Only `windows-x64` was verified here; the XDG variables are native on macOS/Linux, so isolation is expected to hold, but mark other platforms unverified until tested.

**M9 — Plan interaction.** This plan deliberately does not touch `buildPrompt()` (Plan 03), `streamEventReducer`/error surfacing (Plan 02), or i18n strings (Plan 01). Two shared touchpoints:
- `api.ts` `API_BASE` — done here (Step 14a); Plan 02 Step 12 becomes a no-op.
- `useModels` error state — this plan introduces a real `error`; Plan 02's error-rendering work should render it. Land this plan first, or expect a conflict in `useModels.ts`.

---

## 10. Definition of done

- [ ] V1–V11 all pass, including the V4 before/after hashes of the global MiMo directories.
- [ ] `grep -rn "getDefaultModels\|DEFAULT_MODELS" backend/src frontend/src` → **0**.
- [ ] `grep -rn "npm root -g\|APPDATA.*npm\|NVM_SYMLINK" backend/src` → **0**.
- [ ] `grep -rn "\.\.\.process\.env" backend/src/providers backend/src/mimo` → **0**.
- [ ] `grep -rn "localStorage.setItem('mimo_api_key'" frontend/src` → **0**.
- [ ] `grep -rn "api/mimo/run" backend/src frontend/src` → **0**.
- [ ] `grep -rn "dangerously-skip-permissions" backend/src` → **0**.
- [ ] `.mimo-runtime/` is gitignored; `git status --porcelain` shows no runtime or secret files.
- [ ] `/health` reports `provider.isolationVerified === true` and a `runtimeDir` inside the repo.
- [ ] Both packages build, lint, and test clean.
- [ ] The user's global MiMo Code environment is byte-identical to before the change.
