# English-only UI — cleanup report

**Project:** Katha Ekadeshko  
**Date:** 2026-05-10  

## Goal

- Single UI language: **English** everywhere for menus, controls, and copy.
- **No** app-language picker (removed from Story Monitor title bar).
- **Branding unchanged:** `appTitle` / `BRAND_TITLE_TEXT` remains **कथा एकादेशको** (Nepali script only for the product name).
- **Story** region/language picker (`StoryLocalePicker`) **unchanged** — story generation pipeline preserved.

## Changes made

| Area | Change |
|------|--------|
| `src/renderer/src/i18n/resources.ts` | English-only `resources`; `AppUiLanguageCode` = `'en'`; `normalizeUiLanguageCode()` always returns `'en'`; removed `LANGUAGE_OPTIONS` and Nepali bundle import. |
| `src/renderer/src/i18n/localizationEngine.ts` | Removed Nepali bundle merge, AI translation, and localStorage caches for `ne`. `ensureUiLanguageBundle()` is a no-op that resolves to `'en'`; `localeTagForUiLanguage()` → `en-GB`. |
| `src/renderer/src/i18n/config.ts` | `supportedLngs: ['en']`; import cleanup. |
| `src/renderer/src/i18n/LanguageProvider.tsx` | Removed dev-only `console.debug`. |
| `src/renderer/src/i18n/translations/en.ts` | Removed unused keys: `appLanguage`, `uiLangEnglish`, `uiLangNepali`, `appLanguageInSettings`, `appLanguageSettingsOnly`. |
| `src/renderer/src/App.tsx` | Removed `UiLocalePicker`; kept empty `studio-mock-monitor-title__locale` slot (`aria-hidden`) for layout stability. |
| `src/renderer/src/content/userGuideSections.ts` | Help sections always English; removed Nepali sections import. |

## Deleted files

- `src/renderer/src/components/UiLocalePicker.tsx`
- `src/renderer/src/i18n/translations/ne.ts`
- `src/renderer/src/content/userGuideSections.ne.ts`

## Unchanged (by design)

- Layout CSS classes for monitor title row (`studio-mock-monitor-title__locale` kept as empty node).
- Store fields `uiLanguage` / `setUiLanguage` / persistence — still normalize to `'en'`.
- Project field `uiLanguage` in types — legacy `'ne'` values normalize on load.
- `api/ui-i18n-bundle.js` — not removed (optional backend feature); client no longer requests Nepali UI bundles.

## Verification

Commands run successfully:

- `npm run typecheck`
- `npm run lint` (includes `scripts/i18n-audit.mjs`)
- `npm run web:build`

## Notes

- **`checklistAppLanguage`** remains in `en.ts` for potential onboarding copy; label still reads “App language” if surfaced — could be renamed later to “English interface” if that checklist becomes visible.
