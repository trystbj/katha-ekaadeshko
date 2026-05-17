## `shared/`

Shared UI layer used by both Web and Desktop shells.

- React components
- shared hooks
- view-model helpers
- styling (kept visually identical)

Migration note: legacy UI currently lives in `src/renderer/src/`. New shared UI should be added here first, or re-exported from here during migration.

