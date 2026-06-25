Provider Layer

- `AIProvider` interface defines `sendMessage` and `healthCheck`.
- `MockProvider` implements `AIProvider` for offline development.
- Use `getProvider()` from `providers/index.ts` to obtain the active provider.
