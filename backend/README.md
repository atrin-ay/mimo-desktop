# MIMO Backend — Phase 1

Core Chat + Sessions backend for the MIMO desktop assistant (Phase 1).

Features:
- Session management (create/get/delete)
- Chat endpoint that persists messages and calls a provider
- SQLite storage with simple repositories
- Provider abstraction layer with MockProvider

Quick start:

1. Copy `.env.example` to `.env` and adjust values.
2. Install dependencies:

```bash
npm install
```

3. Run in development:

```bash
npm run dev
```

API docs: see `docs/api.md`.
