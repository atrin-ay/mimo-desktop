# Plan 1 — i18n foundation (react-i18next)

**Goal:** one translation system, no language logic inside components, RTL handled by the document, and backend errors that *can* be translated.

## Current state

- No i18n library at all. `frontend/src/utils/translations.ts` is a hand-maintained `TranslationSet` interface (83 keys) plus two literal objects.
- **101 inline `language === "fa" ? … : …` ternaries across 13 files**, so Persian copy lives in two places at once: `SettingsSection` 19, `ProjectsSection` 15, `DashboardSection` 12, `App` 11, `HomeScreen` 9, `Workspace` 8, `ChatView` 7, `ChatInput` 6, `useSessions` 4, `useChat` 4, `MultipleChoiceQuestion` 3, `ExecutionCard` 2, `ThinkingIndicator` 1.
- `language` is `useState<"en"|"fa">("en")` in `App.tsx:36`, prop-drilled into every component and into `useChat(language)` / `useSessions(language)`. Not persisted — resets to English on every reload.
- Direction is applied by hand in two unrelated places (`App.tsx:80`, `SettingsSection.tsx:229`), never on `<html>`. Mirroring is faked with `language === "fa" ? "rotate-180" : ""`.
- No interpolation, no plurals. Persian digits are baked into the strings (`"۱۶ هسته اختصاصی"`, `"۴.۲ میلیارد گره"`).
- Localization leaked into the domain model: `Subject` carries both `date` and `dateFa` (`types.ts:113-114`), and timestamps are frozen at creation time via `toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US")` (`useChat.ts:154,177`).
- Backend error text is hardcoded English (`chatService.ts:67,70,73,76`). The backend *does* send a stable `code`, but `api.ts:29-43` throws the code away and keeps only the English string — so errors can never be localized.

## Steps

1. `npm i i18next react-i18next` in `frontend`, pinned to exact versions.
2. `src/i18n/index.ts` — init with `fallbackLng: 'en'`, `supportedLngs: ['en','fa']`, detection order `localStorage → navigator`, `interpolation.escapeValue: false`.
3. `src/i18n/locales/{en,fa}/common.json` — port all 83 keys out of `translations.ts` into namespaces: `nav.*`, `home.*`, `chat.*`, `projects.*`, `settings.*`, `workspace.*`, `errors.*`. Replace baked-in numerals with interpolated values (`"{{count}} dedicated cores"`).
4. `useDocumentDirection()` — one effect setting `document.documentElement.lang` and `dir` from `i18n.language`. Delete both hand-rolled `dir=` sites.
5. Migrate components leaf-first (`ThinkingIndicator` → … → `App`): drop the `language` prop, use `useTranslation()`. Every ternary in the table above goes.
6. Mirroring: replace the `rotate-180` conditionals with Tailwind logical utilities (`ms-*`/`me-*`/`ps-*`/`pe-*`) and `rtl:` variants. No JS branching on language for layout.
7. Remove `language` from the `useChat` / `useSessions` signatures. Store ISO timestamps and format at render with `Intl.DateTimeFormat` / `Intl.NumberFormat`.
8. Drop `dateFa` from `Subject`; keep one ISO `updatedAt`.
9. Add `errors.<CODE>` keys (`TIMEOUT`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `PROVIDER_ERROR`, `NOT_FOUND`, `EMPTY_RESPONSE`). The backend `message` becomes a developer fallback only. Plan 2 delivers the code to the UI.
10. Delete `src/utils/translations.ts`.
11. Guard against regression: a vitest that fails if `language === "fa"` or a Persian literal (`/[؀-ۿ]/`) appears anywhere in `src/**/*.tsx`.

## Acceptance

- `grep -rn 'language === "fa"' frontend/src` → 0 hits; the guard test passes.
- Switching language updates the UI without a reload, and survives a reload.
- `<html dir>` flips; no component branches on language for layout.
- `npm run lint` (`tsc --noEmit`) and `npm test` pass.

## Out of scope

Localizing backend response bodies beyond emitting codes. Adding a third locale — but after this plan that should be a file drop, not a code change.
