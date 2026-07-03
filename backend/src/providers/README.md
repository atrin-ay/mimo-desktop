Provider Layer

- `AIProvider` interface defines `sendMessage` and `healthCheck`.
- `MockProvider` implements `AIProvider` for offline development and testing.
- `MiMoProvider` implements `AIProvider` by calling the MiMo-compatible HTTP chat API.
- Use `getProvider()` from `providers/index.ts` to obtain the active provider based on `AI_PROVIDER`.
- Set `AI_PROVIDER=mock` to run without a real MiMo key, or `AI_PROVIDER=mimo` to use the HTTP MiMo backend.
