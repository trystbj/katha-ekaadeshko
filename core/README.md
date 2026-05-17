## `core/`

This folder is the **runtime-agnostic app core** used by both Web and Desktop builds.

- **No DOM assumptions**
- **No framework coupling** (React is in `shared/`)
- **Pure domain + adapters**: persistence, render queue, asset manager, story/character/narrator models

Migration note: the current repo still contains legacy folders (`backend/`, `src/renderer/`, `src/web/`).
New code should be added here and wired through adapters without changing UI layout.

