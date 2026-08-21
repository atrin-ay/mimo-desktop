Provider Layer

- `AIProvider` interface defines `sendMessage` and `healthCheck`.
- `MockProvider` implements `AIProvider` for offline development and testing.
- `MiMoProvider` implements `AIProvider` by calling the MiMo-compatible HTTP chat API (requires `MIMO_API_KEY`).
- `MimoCliProvider` implements `AIProvider` by spawning the local `mimo` CLI binary.
- `MimoServeProvider` implements `AIProvider` by connecting to a local `mimo serve` instance (recommended).
- Use `getProvider()` from `providers/index.ts` to obtain the active provider based on `AI_PROVIDER`.

**Provider selection:**
- Default (when `AI_PROVIDER` is unset): `mimo-serve` — works out of the box with MiMo CLI installed, no API key required.
- `AI_PROVIDER=mimo-serve` — local `mimo serve` backend (default, recommended).
- `AI_PROVIDER=mimo-cli` — local `mimo` CLI binary (spawns per request).
- `AI_PROVIDER=mimo` — direct MiMo HTTP API (optional, requires `MIMO_API_KEY` to be configured).
- `AI_PROVIDER=mock` — offline mock provider for development.
