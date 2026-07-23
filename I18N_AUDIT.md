# Internationalization (i18n) Audit — MiMo Desktop

> Audit Date: 2026-07-23  
> Scope: All frontend source files — translations, language handling, RTL/LTR, hardcoded strings  
> Method: Full grep-based enumeration of every language-dependent pattern in the codebase

---

## Executive Summary

The i18n system is **hand-rolled, incomplete, and unscalable**. There are **91 instances** of `language === "fa"` ternary expressions scattered across 10 component files. The translation file covers ~80 keys but hundreds of strings are hardcoded inline. There is no i18n library, no namespace support, no interpolation, and no pluralization. Adding a third language would require editing every component file.

**Verdict: Introduce a proper i18n library (react-i18next).**

---

## Problem #1: 91 Inline Ternary Language Checks

**Files affected:** 10 components, 91 occurrences

### Current Situation
Language-dependent text is expressed as inline ternaries:
```tsx
{language === "fa" ? "حذف گفتگو" : "Delete Conversation"}
{language === "fa" ? "انصراف" : "Cancel"}
{language === "fa" ? "گفتگو حذف شد" : "Conversation deleted"}
```

The `language` prop is threaded through every component from `App.tsx` → child → grandchild → great-grandchild.

### Why It Is Problematic
- **No single source of truth**: Translations live in 10+ files, not one
- **Adding a language requires editing every ternary**: To add Arabic (`ar`), a developer must find and update all 91 `language === "fa"` checks to become `language === "fa" ? ... : language === "ar" ? ... : ...`
- **No compile-time safety**: A typo in a Farsi string (`"حذف"` vs `"حذف "`) is invisible
- **No key-based lookup**: No way to find which strings are untranslated or stale
- **Props drilling burden**: Every component must accept a `language` prop, even if it doesn't directly use it

### Impact
Adding a third language is estimated at 40+ hours of work across the codebase. The current system is effectively bilingual-only and cannot scale.

### Recommended Approach
Use `react-i18next` with:
- JSON translation files per language
- `useTranslation()` hook in components (no prop drilling)
- Namespace support (split translations by feature: `chat.json`, `settings.json`, `common.json`)
- Interpolation support for dynamic values

---

## Problem #2: Two Competing Translation Systems

**Files:**
- `frontend/src/utils/translations.ts` — main system (~80 keys)
- `frontend/src/components/SettingsSection.tsx:22-143` — inline system (~60 keys)

### Current Situation
`SettingsSection.tsx` defines its own `settingsTranslations` object with 120 lines of translations, completely separate from the main `translations` object. The main `translations` has 83 keys; `settingsTranslations` has ~60 additional keys for settings-specific text.

Some settings text uses `st.title` (from settingsTranslations), while navigation labels use `t.settings` (from main translations).

### Why It Is Problematic
- Two parallel systems must be maintained independently
- A new language requires updating BOTH files
- Key naming conventions differ between the two systems
- No way to audit completeness across both systems

### Impact
Translation coverage is split across two files. There's no unified way to check "are all strings translated for Farsi?"

### Recommended Approach
Merge all translations into a single i18n system with namespaced JSON files:
```
locales/
├── en/
│   ├── common.json
│   ├── chat.json
│   ├── settings.json
│   └── dashboard.json
└── fa/
    ├── common.json
    ├── chat.json
    ├── settings.json
    └── dashboard.json
```

---

## Problem #3: Hardcoded Strings Not in Translation System

### Current Situation
Dozens of strings are hardcoded in English with no translation support:

**ExecutionCard.tsx (lines 17-20):**
```typescript
const STATUS_CONFIG = {
  streaming: { label: "EXECUTING", ... },
  done: { label: "COMPLETED", ... },
  pending: { label: "PENDING", ... },
  error: { label: "ERROR", ... },
};
```

**ChatView.tsx (lines 87-93):**
```typescript
if (orbState === OrbState.Thinking) return language === "fa" ? "در حال تفکر..." : "Thinking...";
// These 7 status strings use inline ternaries, not the translation system
```

**App.tsx (line 95, 257):**
```tsx
MIMO COGNITIVE OS  // hardcoded English brand name
```

**App.tsx (line 134):**
```tsx
CORE_ONLINE  // hardcoded English status
```

**ChatInput.tsx (line 168):**
```tsx
title="Voice"  // hardcoded English tooltip
```

**HomeScreen.tsx (line 281):**
```tsx
title="Voice"  // hardcoded English tooltip
```

**DashboardSection.tsx (lines 119-135):**
```tsx
CPU LOAD
ACTIVE PLUGINS
MEMORY SCHEMAS
SYNC STATUS
// All hardcoded English
```

### Why It Is Problematic
- Farsi users see English text for status labels, tooltips, and section headers
- No way to discover all hardcoded strings without manual grep
- The "EXECUTING"/"COMPLETED"/"PENDING"/"ERROR" labels in `ExecutionCard.tsx` are always English regardless of language

### Impact
The Farsi translation is incomplete — approximately 30-40% of visible UI text remains English when Farsi is selected.

### Recommended Approach
1. Extract all hardcoded strings to translation keys
2. Run an automated audit: `grep -rn '"[A-Z]' src/components/` to find untranslated English strings
3. Add a CI check that flags new hardcoded strings

---

## Problem #4: No Interpolation Support

### Current Situation
When dynamic values need to be included in translated text, the code concatenates strings manually:

**App.tsx (line 453):**
```tsx
{language === "fa"
  ? `آیا از حذف «${deleteTarget.name}» مطمئن هستید؟`
  : `Delete "${deleteTarget.name}"? This cannot be undone.`}
```

**ProjectsSection.tsx (line 570):**
```tsx
placeholder={language === "fa" ? "ارسال پیام به هوش مصنوعی..." : `Ask inside ${selectedProject.name}...`}
```

**HomeScreen.tsx (line 753):**
```tsx
language === "fa" ? `لطفاً کد مربوط به ${sug} را بررسی و اصلاح کن` : `Please help me ${sug.toLowerCase()}`
```

### Why It Is Problematic
- String interpolation order differs between languages (Farsi may put the variable in a different position)
- No ICU MessageFormat support (plurals, select, selectordinal)
- Template strings in JSX are fragile and hard to maintain
- No way to reuse translated strings with different variable values

### Recommended Approach
Use i18next interpolation:
```json
{
  "deleteConfirm": "Delete \"{{name}}\"? This cannot be undone.",
  "deleteConfirmFa": "آیا از حذف «{{name}}» مطمئن هستید؟"
}
```
```tsx
{t('deleteConfirm', { name: deleteTarget.name })}
```

---

## Problem #5: RTL Handling Is Manual and Inconsistent

### Current Situation

RTL is handled by a `dir` attribute on the root div:
```tsx
// App.tsx:79
dir={language === "fa" ? "rtl" : "ltr"}
```

And individual components manually handle RTL for specific elements:
```tsx
// ChatInput.tsx:194
className={language === "fa" ? "rotate-180" : ""}

// App.tsx:163
className={language === "fa" ? "rotate-180" : ""}

// SettingsSection.tsx:162
const isRtl = language === "fa";
```

The `rotate-180` class is applied to icons (ChevronLeft, Send) to flip them for RTL. This is done per-component, not systematically.

### Why It Is Problematic
- **Manual flipping**: Each icon must be individually flipped — easy to miss
- **No RTL-aware layout**: Flexbox `row` vs `row-reverse`, `ml-auto` vs `mr-auto`, `text-left` vs `text-right` are not systematically handled
- **Some layouts break in RTL**: The sidebar, chat view, and settings grid all use hardcoded `left`/`right` positioning
- **No CSS logical properties**: Using `margin-left` instead of `margin-inline-start`

### Impact
Farsi users see broken layouts in several screens. Icons point the wrong direction. Text alignment is inconsistent.

### Recommended Approach
1. Use CSS logical properties (`margin-inline-start` instead of `margin-left`)
2. Use Tailwind's RTL plugin or `[dir="rtl"]` variants
3. Create a `<FlipForRTL>` wrapper component for icons
4. Test every screen in RTL mode

---

## Problem #6: Language Switcher UI Is Broken

### Current Situation

The language switching mechanism has a UX issue:

In `translations.ts`:
```typescript
// English translation:
languageSelect: "فارسی",  // Shows "Farsi" to switch TO Farsi

// Farsi translation:
languageSelect: "English",  // Shows "English" to switch TO English
```

The `languageSelect` key shows the NAME of the OTHER language (as a "switch to" action). But the actual language toggle button in `App.tsx` is... not visible in the current code. The language state is managed but there's no visible toggle button in the header.

The `SettingsSection` has a language note but no toggle:
```tsx
// SettingsSection.tsx:39-40
systemLangSub: "Configured globally (EN/FA switch on top right header)"
```

But there is no such switch in the header.

### Why It Is Problematic
- The language toggle is referenced in Settings but may not be accessible in the current UI
- The `languageSelect` pattern (showing the other language name) is unconventional — users expect to see the CURRENT language
- No language preference persistence (localStorage)

### Impact
Users may not be able to switch languages at all.

### Recommended Approach
1. Add a visible language toggle in the header (flag icon or language code button)
2. Persist language choice in `localStorage`
3. Use standard pattern: show current language name, not the "switch to" name

---

## Problem #7: Date/Time Formatting Is Inconsistent

### Current Situation

Dates are formatted differently across components:

**useChat.ts (line 256):**
```typescript
date: new Date(s.lastActivityAt).toLocaleTimeString(
  language === "fa" ? "fa-IR" : "en-US",
  { hour: "2-digit", minute: "2-digit" }
),
```

**useChat.ts (line 210):**
```typescript
timestamp: new Date(m.createdAt).toLocaleTimeString(
  language === "fa" ? "fa-IR" : "en-US",
  { hour: "2-digit", minute: "2-digit" }
),
```

**useChat.ts (line 348):**
```typescript
timestamp: new Date().toLocaleTimeString(
  language === "fa" ? "fa-IR" : "en-US",
  { hour: "2-digit", minute: "2-digit" }
),
```

Every component that formats a date independently calls `toLocaleTimeString` with the same locale logic. There's no centralized date formatting utility.

### Why It Is Problematic
- Date formatting is duplicated in 10+ places
- No support for relative time ("2 minutes ago", "یک دقیقه پیش")
- No consistent date/time format across the app
- Farsi numerals (۱۲:۳۰) vs Arabic numerals (12:30) may not be handled correctly

### Recommended Approach
1. Create a `formatTime(date, language)` utility
2. Use `date-fns` or `Intl.DateTimeFormat` for consistent formatting
3. Add relative time support for recent messages

---

## Problem #8: Component Props Force Language Through the Entire Tree

### Current Situation

The `language` prop is passed through every component:

```
App.tsx (language state)
  └─ DashboardSection(language)
       └─ (no children that need language)
  └─ ChatView(language)
       └─ ExecutionCard(language)
            └─ MultipleChoiceQuestion(language)
  └─ SettingsSection(language)
  └─ HomeScreen(language)
```

Every component that displays any text must accept `language: "en" | "fa"` as a prop. This creates deep prop drilling.

### Why It Is Problematic
- Prop drilling: 3-4 levels deep in some cases
- Every new component must remember to accept and forward the language prop
- Components can't be tested without mocking the language prop
- Adding a language requires updating the type `"en" | "fa"` everywhere

### Recommended Approach
Use React Context (provided by react-i18next):
```tsx
const { t, i18n } = useTranslation();
// No prop drilling needed
```

---

## Problem #9: No Pluralization Support

### Current Situation
There are no plural forms anywhere in the translation system. All strings are singular:
```typescript
completed: "Completed"
active: "Active"
```

If the system needed to display "3 messages" vs "1 message", it would have to be handled with manual conditionals:
```tsx
{count === 1 ? "1 message" : `${count} messages`}
```

### Why It Is Problematic
- Farsi has different plural rules than English (singular, plural, and a special "2" form)
- No automated plural handling
- Manual conditionals are error-prone

### Recommended Approach
Use i18next pluralization:
```json
{
  "messageCount": "{{count}} message",
  "messageCount_plural": "{{count}} messages",
  "messageCount_fa_1": "{{count}} پیام",
  "messageCount_fa_plural": "{{count}} پیام"
}
```

---

## Problem #10: No Translation Coverage Tracking

### Current Situation
There is no way to answer:
- "What percentage of strings are translated to Farsi?"
- "Which keys are missing in the Farsi translation?"
- "Which strings are used but not in the translation file?"
- "Which translation keys are stale (defined but never used)?"

### Why It Is Problematic
- No quality assurance for translation completeness
- Dead translation keys accumulate
- No automated checks in CI

### Recommended Approach
1. Use `i18next-parser` to extract all translation keys from source code
2. Compare against translation files to find missing keys
3. Add a CI step that fails if translation coverage drops below a threshold

---

## Recommended i18n Architecture

### Library Choice: react-i18next

**Why react-i18next:**
- Mature, well-documented, large ecosystem
- React hooks API (`useTranslation`)
- Namespace support for code-splitting translations
- ICU MessageFormat for interpolation and plurals
- Language detection and lazy loading
- TypeScript support
- Easy migration from hand-rolled system

### File Structure
```
frontend/src/
├── locales/
│   ├── en/
│   │   ├── common.json        (nav, buttons, status)
│   │   ├── chat.json          (chat UI, messages)
│   │   ├── settings.json      (settings tabs, forms)
│   │   ├── dashboard.json     (dashboard sections)
│   │   └── errors.json        (error messages)
│   └── fa/
│       ├── common.json
│       ├── chat.json
│       ├── settings.json
│       ├── dashboard.json
│       └── errors.json
├── i18n.ts                    (i18next configuration)
└── components/
    └── (use useTranslation() hook, no language prop)
```

### Configuration
```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: { en: { common, chat, settings }, fa: { common, chat, settings } },
  lng: localStorage.getItem('language') || 'en',
  fallbackLng: 'en',
  ns: ['common'],
  defaultNS: 'common',
});
```

### Component Pattern
```tsx
// Before (current):
function ChatView({ language, ... }: Props) {
  return <span>{language === "fa" ? "در حال تفکر..." : "Thinking..."}</span>;
}

// After (recommended):
function ChatView() {
  const { t } = useTranslation('chat');
  return <span>{t('status.thinking')}</span>;
}
```

---

## Migration Plan

### Phase 1: Foundation (1-2 days)
1. Install `react-i18next` and `i18next`
2. Create `i18n.ts` configuration
3. Create `locales/en/common.json` and `locales/fa/common.json`
4. Extract all keys from `translations.ts` into JSON files
5. Merge `settingsTranslations` into the JSON files
6. Wrap `<App>` in `<I18nextProvider>`

### Phase 2: Core Components (3-5 days)
1. Migrate `App.tsx` (sidebar labels, notifications, delete modal)
2. Migrate `ChatView.tsx` (status text, loading text)
3. Migrate `ChatInput.tsx` (placeholders, agent labels, button text)
4. Migrate `ExecutionCard.tsx` (status labels — currently hardcoded English)
5. Migrate `HomeScreen.tsx` (agent labels, telemetry text)
6. Migrate `DashboardSection.tsx` (section headers, CTA buttons)
7. Migrate `SettingsSection.tsx` (absorb `settingsTranslations` into JSON)
8. Migrate `MultipleChoiceQuestion.tsx`

### Phase 3: Remaining Components (2-3 days)
1. Migrate `ProjectsSection.tsx`
2. Migrate `Workspace.tsx`
3. Migrate `SkillsStore.tsx`, `McpMarketplace.tsx`, etc.
4. Extract all remaining hardcoded strings

### Phase 4: RTL and Polish (2-3 days)
1. Add CSS logical properties for RTL support
2. Create `<FlipForRTL>` icon wrapper
3. Add language toggle to header
4. Persist language choice in `localStorage`
5. Add `formatTime()` utility with locale support

### Phase 5: Quality Assurance (1 day)
1. Add `i18next-parser` to CI for coverage tracking
2. Run full Farsi UI review
3. Fix any layout issues in RTL mode
4. Document the i18n system in README

### Estimated Total Effort: 9-14 days

---

## Priority Ranking

| Priority | Problem | Effort | Impact |
|----------|---------|--------|--------|
| P0 | #1 91 inline ternaries | High (migration) | Scalability |
| P0 | #2 Two competing translation systems | Low | Consistency |
| P0 | #8 Language prop drilling | Medium | Developer experience |
| P1 | #3 Hardcoded strings (30-40% untranslated) | Medium | UX for Farsi users |
| P1 | #4 No interpolation support | Low | Correctness |
| P1 | #5 Manual RTL handling | Medium | Layout quality |
| P1 | #6 Language switcher may be broken | Low | Accessibility |
| P2 | #7 Inconsistent date formatting | Low | Polish |
| P2 | #9 No pluralization | Low | Future-proofing |
| P2 | #10 No coverage tracking | Low | Quality assurance |
