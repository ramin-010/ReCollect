# Archived frontend code

Code removed from the app but kept for reference (not compiled: `_archive` is excluded in tsconfig.json).

- `editor-v1/Columns.ts`: side-by-side columns for the TipTap doc editor. Removed on 2026-11-14 (the owner: no columns; they also caused the "contentMatchAt on a node with invalid content" corruption). The server flattens stored column rows (`backend/src/services/docs/docRepair.ts`).
